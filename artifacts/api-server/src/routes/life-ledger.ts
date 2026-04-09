import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
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
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { serializeDates } from "../lib/serialize";

type Tab = "people" | "events" | "financial" | "subscriptions" | "travel";

const VALID_TABS: Tab[] = ["people", "events", "financial", "subscriptions", "travel"];

const TABLE_MAP = {
  people: lifeLedgerPeopleTable,
  events: lifeLedgerEventsTable,
  financial: lifeLedgerFinancialTable,
  subscriptions: lifeLedgerSubscriptionsTable,
  travel: lifeLedgerTravelTable,
} as const;

type AnyLedgerTable = typeof lifeLedgerPeopleTable;

const router: IRouter = Router();

function resolveTable(tab: string): AnyLedgerTable | null {
  if (!VALID_TABS.includes(tab as Tab)) return null;
  return TABLE_MAP[tab as Tab] as AnyLedgerTable;
}

router.get("/life-ledger/next-90-days", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 90);
  const windowEndStr = windowEnd.toISOString().split("T")[0];
  const nowStr = now.toISOString().split("T")[0];

  const tabEntries = await Promise.all(
    (Object.entries(TABLE_MAP) as Array<[Tab, AnyLedgerTable]>).map(async ([tab, table]) => {
      const rows = await db
        .select()
        .from(table as typeof lifeLedgerPeopleTable)
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

router.get("/life-ledger/subscription-audit", requireAuth, async (req: Request, res: Response): Promise<void> => {
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

router.get("/life-ledger/:tab", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = ListLifeLedgerEntriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

router.post("/life-ledger/:tab", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = CreateLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  res.status(201).json(serializeDates(entry));
});

router.get("/life-ledger/:tab/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

router.put("/life-ledger/:tab/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpdateLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

router.delete("/life-ledger/:tab/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = DeleteLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
