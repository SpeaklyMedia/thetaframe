import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gte, lte, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  lifeLedgerBabyTable,
  lifeLedgerPeopleTable,
  lifeLedgerEventsTable,
  lifeLedgerFinancialTable,
  lifeLedgerSubscriptionsTable,
  lifeLedgerTravelTable,
} from "@workspace/db";
import {
  ListLifeLedgerEntriesParams,
  CreateLifeLedgerEntryParams,
  CreateLifeLedgerEntryBody,
  GetLifeLedgerEntryParams,
  UpdateLifeLedgerEntryParams,
  UpdateLifeLedgerEntryBody,
  DeleteLifeLedgerEntryParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { getUserAndMaybeBootstrap, isAdminUser } from "../lib/access.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";
import { getBabyKbHeroConsequencesForUser } from "../lib/babyKbAssignments.js";
import {
  createLifeLedgerEventForUser,
  LifeLedgerEventValidationError,
  validateLifeLedgerEventCreateData,
} from "../lib/lifeLedgerEvents.js";
import {
  createLifeLedgerPersonForUser,
  LifeLedgerPeopleValidationError,
  validateLifeLedgerPeopleCreateData,
} from "../lib/lifeLedgerPeople.js";
import {
  createLifeLedgerFinancialEntryForUser,
  LifeLedgerFinancialValidationError,
  validateLifeLedgerFinancialCreateData,
} from "../lib/lifeLedgerFinancial.js";
import {
  createLifeLedgerSubscriptionForUser,
  LifeLedgerSubscriptionsValidationError,
  validateLifeLedgerSubscriptionsCreateData,
} from "../lib/lifeLedgerSubscriptions.js";
import {
  createLifeLedgerTravelEntryForUser,
  LifeLedgerTravelValidationError,
  validateLifeLedgerTravelCreateData,
} from "../lib/lifeLedgerTravel.js";
import {
  LIFE_LEDGER_EVENT_EXECUTION_ACTIONS,
  LifeLedgerEventExecutionError,
  updateLifeLedgerEventExecutionStateForUser,
} from "../lib/lifeLedgerEventExecution.js";
import {
  LifeLedgerEventReminderError,
  listLifeLedgerEventReminderQueueForUser,
  reconcileLifeLedgerEventReminderOutboxForEntry,
  reconcileLifeLedgerEventReminderOutboxForUserEvent,
  serializeLifeLedgerEntry,
  updateLifeLedgerEventReminderPolicyForUser,
} from "../lib/lifeLedgerEventReminders.js";

type Tab = "people" | "events" | "financial" | "subscriptions" | "travel" | "baby";

const VALID_TABS: Tab[] = ["people", "events", "financial", "subscriptions", "travel", "baby"];
const NEXT_90_DAY_TABS: Array<Exclude<Tab, "baby">> = ["people", "events", "financial", "subscriptions", "travel"];

const TABLE_MAP = {
  people: lifeLedgerPeopleTable,
  events: lifeLedgerEventsTable,
  financial: lifeLedgerFinancialTable,
  subscriptions: lifeLedgerSubscriptionsTable,
  travel: lifeLedgerTravelTable,
  baby: lifeLedgerBabyTable,
} as const;

type AnyLedgerTable = (typeof TABLE_MAP)[keyof typeof TABLE_MAP];

const router: IRouter = Router();
router.use("/life-ledger", requireAuth, requireModuleAccess("life-ledger"));

const updateLifeLedgerEventExecutionStateParams = z.object({
  id: z.coerce.number().int().positive(),
});

const updateLifeLedgerEventExecutionStateBody = z.object({
  action: z.enum(LIFE_LEDGER_EVENT_EXECUTION_ACTIONS),
});

const updateLifeLedgerEventReminderPolicyParams = z.object({
  id: z.coerce.number().int().positive(),
});

const updateLifeLedgerEventReminderPolicyBody = z.object({
  enabled: z.boolean(),
  leadDays: z.array(z.number().int().min(0).max(30)).optional(),
});

let babyLedgerSchemaReady: Promise<void> | null = null;

async function ensureBabyLedgerSchema(): Promise<void> {
  if (!babyLedgerSchemaReady) {
    babyLedgerSchemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS life_ledger_baby (
          id serial PRIMARY KEY,
          user_id text NOT NULL,
          tab text NOT NULL,
          name text NOT NULL,
          tags jsonb NOT NULL DEFAULT '[]'::jsonb,
          impact_level text,
          review_window text,
          due_date text,
          notes text,
          amount double precision,
          currency text,
          is_essential boolean,
          billing_cycle text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS life_ledger_baby_user_id_idx
        ON life_ledger_baby (user_id)
      `);
    })().catch((error) => {
      babyLedgerSchemaReady = null;
      throw error;
    });
  }

  await babyLedgerSchemaReady;
}

function resolveTable(tab: string): AnyLedgerTable | null {
  if (!VALID_TABS.includes(tab as Tab)) return null;
  return TABLE_MAP[tab as Tab] as AnyLedgerTable;
}

async function ensureTabAccess(req: Request, res: Response, tab: Tab): Promise<boolean> {
  if (tab !== "baby") return true;

  await ensureBabyLedgerSchema();

  const userId = (req as AuthenticatedRequest).userId;
  const user = await getUserAndMaybeBootstrap(userId, req.log);

  if (!isAdminUser(user)) {
    res.status(403).json({ error: "Forbidden: admin access required for Baby KB" });
    return false;
  }

  return true;
}

router.get("/life-ledger/next-90-days", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 90);
  const windowEndStr = windowEnd.toISOString().split("T")[0];
  const nowStr = now.toISOString().split("T")[0];

  const tabEntries = await Promise.all(
    NEXT_90_DAY_TABS.map(async (tab) => {
      const table = TABLE_MAP[tab];
      if (tab === "events") {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.userId, userId));

        return rows
          .filter((row) => row.completionState !== "completed" && row.completionState !== "superseded")
          .map((row) => {
            const executionDate = row.nextDueDate ?? row.dueDate;
            return {
              id: row.id,
              tab,
              name: row.name,
              dueDate: executionDate,
              impactLevel: row.impactLevel,
              notes: row.notes,
            };
          })
          .filter((row) => row.dueDate && row.dueDate >= nowStr && row.dueDate <= windowEndStr);
      }

      const rows = await db
        .select()
        .from(table)
        .where(
          and(
            eq(table.userId, userId),
            isNotNull(table.dueDate),
            gte(table.dueDate, nowStr),
            lte(table.dueDate, windowEndStr),
          ),
        );
      return rows.map((row) => ({ id: row.id, tab, name: row.name, dueDate: row.dueDate, impactLevel: row.impactLevel, notes: row.notes }));
    }),
  );

  const allEntries = tabEntries.flat();
  allEntries.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  res.json({ entries: allEntries, windowEnd: windowEndStr });
});

router.get("/life-ledger/subscription-audit", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const subs = await db.select().from(lifeLedgerSubscriptionsTable).where(eq(lifeLedgerSubscriptionsTable.userId, userId));

  let totalMonthlyEssential = 0;
  let totalMonthlyNonEssential = 0;

  const items = subs.map((s) => {
    const amount = s.amount ?? 0;
    const monthly = s.billingCycle === "annual" ? amount / 12 : amount;
    const annual = s.billingCycle === "monthly" ? amount * 12 : amount;

    if (s.isEssential) totalMonthlyEssential += monthly;
    else totalMonthlyNonEssential += monthly;

    return {
      id: s.id,
      name: s.name,
      isEssential: s.isEssential,
      billingCycle: s.billingCycle,
      amount: s.amount,
      currency: s.currency,
      monthlyEquivalent: monthly > 0 ? monthly : null,
      annualEquivalent: annual > 0 ? annual : null,
    };
  });

  res.json({
    items,
    totalMonthlyEssential,
    totalMonthlyNonEssential,
    totalMonthly: totalMonthlyEssential + totalMonthlyNonEssential,
  });
});

router.get("/life-ledger/baby-kb-hero-rollups", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rollups = await getBabyKbHeroConsequencesForUser(userId);
  res.json(rollups);
});

router.get("/life-ledger/events/reminder-queue", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const items = await listLifeLedgerEventReminderQueueForUser(userId);
  res.json({ items });
});

router.get("/life-ledger/:tab", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = ListLifeLedgerEntriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await ensureTabAccess(req, res, params.data.tab))) {
    return;
  }

  const table = resolveTable(params.data.tab);
  if (!table) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const entries = await db
    .select()
    .from(table)
    .where(eq(table.userId, userId))
    .orderBy(table.name);

  res.json(entries.map((entry) => serializeLifeLedgerEntry(entry)));
});

router.post("/life-ledger/:tab", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = CreateLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await ensureTabAccess(req, res, params.data.tab))) {
    return;
  }

  const table = resolveTable(params.data.tab);
  if (!table) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const body = CreateLifeLedgerEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  let entry;
  if (params.data.tab === "events") {
    try {
      const data = validateLifeLedgerEventCreateData(body.data);
      entry = await createLifeLedgerEventForUser({ userId, data });
    } catch (error) {
      if (error instanceof LifeLedgerEventValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  } else if (params.data.tab === "people") {
    try {
      const data = validateLifeLedgerPeopleCreateData(body.data);
      entry = await createLifeLedgerPersonForUser({ userId, data });
    } catch (error) {
      if (error instanceof LifeLedgerPeopleValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  } else if (params.data.tab === "financial") {
    try {
      const data = validateLifeLedgerFinancialCreateData(body.data);
      entry = await createLifeLedgerFinancialEntryForUser({ userId, data });
    } catch (error) {
      if (error instanceof LifeLedgerFinancialValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  } else if (params.data.tab === "subscriptions") {
    try {
      const data = validateLifeLedgerSubscriptionsCreateData(body.data);
      entry = await createLifeLedgerSubscriptionForUser({ userId, data });
    } catch (error) {
      if (error instanceof LifeLedgerSubscriptionsValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  } else if (params.data.tab === "travel") {
    try {
      const data = validateLifeLedgerTravelCreateData(body.data);
      entry = await createLifeLedgerTravelEntryForUser({ userId, data });
    } catch (error) {
      if (error instanceof LifeLedgerTravelValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  } else {
    [entry] = await db
      .insert(table)
      .values({ userId, tab: params.data.tab, ...body.data })
      .returning();
  }

  await markOnboardingSurfaceComplete(userId, "life-ledger");
  if (params.data.tab === "events") {
    await reconcileLifeLedgerEventReminderOutboxForEntry(entry);
  }
  res.status(201).json(serializeLifeLedgerEntry(entry));
});

router.post("/life-ledger/events/:id/execution-state", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = updateLifeLedgerEventExecutionStateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = updateLifeLedgerEventExecutionStateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const entry = await updateLifeLedgerEventExecutionStateForUser({
      userId,
      eventId: params.data.id,
      action: body.data.action,
    });
    res.json(serializeLifeLedgerEntry(entry));
  } catch (error) {
    if (error instanceof LifeLedgerEventExecutionError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.post("/life-ledger/events/:id/reminder-policy", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = updateLifeLedgerEventReminderPolicyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = updateLifeLedgerEventReminderPolicyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const entry = await updateLifeLedgerEventReminderPolicyForUser({
      userId,
      eventId: params.data.id,
      enabled: body.data.enabled,
      leadDays: body.data.enabled ? body.data.leadDays ?? [] : [],
    });
    res.json(serializeLifeLedgerEntry(entry));
  } catch (error) {
    if (error instanceof LifeLedgerEventReminderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get("/life-ledger/:tab/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await ensureTabAccess(req, res, params.data.tab))) {
    return;
  }

  const table = resolveTable(params.data.tab);
  if (!table) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const [entry] = await db
    .select()
    .from(table)
    .where(and(eq(table.userId, userId), eq(table.id, params.data.id)));

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  if (params.data.tab === "events") {
    await reconcileLifeLedgerEventReminderOutboxForEntry(entry);
  }

  res.json(serializeLifeLedgerEntry(entry));
});

router.put("/life-ledger/:tab/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpdateLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await ensureTabAccess(req, res, params.data.tab))) {
    return;
  }

  const table = resolveTable(params.data.tab);
  if (!table) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const body = UpdateLifeLedgerEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .update(table)
    .set({ ...body.data, updatedAt: new Date() })
    .where(and(eq(table.userId, userId), eq(table.id, params.data.id)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(serializeLifeLedgerEntry(entry));
});

router.delete("/life-ledger/:tab/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = DeleteLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await ensureTabAccess(req, res, params.data.tab))) {
    return;
  }

  const table = resolveTable(params.data.tab);
  if (!table) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const [deleted] = await db
    .delete(table)
    .where(and(eq(table.userId, userId), eq(table.id, params.data.id)))
    .returning({ id: table.id });

  if (!deleted) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  if (params.data.tab === "events") {
    await reconcileLifeLedgerEventReminderOutboxForUserEvent({
      userId,
      eventId: params.data.id,
    });
  }

  res.status(204).send();
});

export default router;
