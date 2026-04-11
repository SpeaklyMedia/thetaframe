import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gte, lte, isNotNull, sql } from "drizzle-orm";
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
import { serializeDates } from "../lib/serialize.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";

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

  res.json(entries.map(serializeDates));
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

  const [entry] = await db
    .insert(table)
    .values({ userId, tab: params.data.tab, ...body.data })
    .returning();

  await markOnboardingSurfaceComplete(userId, "life-ledger");
  res.status(201).json(serializeDates(entry));
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

  res.json(serializeDates(entry));
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

  res.json(serializeDates(entry));
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

  await db
    .delete(table)
    .where(and(eq(table.userId, userId), eq(table.id, params.data.id)));

  res.status(204).send();
});

export default router;
