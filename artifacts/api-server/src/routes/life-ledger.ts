import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, lifeLedgerTable } from "@workspace/db";
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

const VALID_TABS = ["people", "events", "financial", "subscriptions", "travel"] as const;
type Tab = typeof VALID_TABS[number];

const router: IRouter = Router();

router.get("/life-ledger/next-90-days", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 90);
  const windowEndStr = windowEnd.toISOString().split("T")[0];
  const nowStr = now.toISOString().split("T")[0];

  const allEntries = await db
    .select()
    .from(lifeLedgerTable)
    .where(eq(lifeLedgerTable.userId, userId));

  const upcoming = allEntries
    .filter((e) => e.dueDate && e.dueDate >= nowStr && e.dueDate <= windowEndStr)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .map((e) => ({
      id: e.id,
      tab: e.tab,
      name: e.name,
      dueDate: e.dueDate as string,
      impactLevel: e.impactLevel,
      notes: e.notes,
    }));

  res.json({ entries: upcoming, windowEnd: windowEndStr });
});

router.get("/life-ledger/subscription-audit", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const subs = await db
    .select()
    .from(lifeLedgerTable)
    .where(and(eq(lifeLedgerTable.userId, userId), eq(lifeLedgerTable.tab, "subscriptions")));

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

  const tab = params.data.tab as Tab;
  if (!VALID_TABS.includes(tab)) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const entries = await db
    .select()
    .from(lifeLedgerTable)
    .where(and(eq(lifeLedgerTable.userId, userId), eq(lifeLedgerTable.tab, tab)))
    .orderBy(lifeLedgerTable.name);

  res.json(entries.map(serializeDates));
});

router.post("/life-ledger/:tab", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = CreateLifeLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const tab = params.data.tab as Tab;
  if (!VALID_TABS.includes(tab)) {
    res.status(400).json({ error: `tab must be one of: ${VALID_TABS.join(", ")}` });
    return;
  }

  const body = CreateLifeLedgerEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .insert(lifeLedgerTable)
    .values({ userId, tab, ...body.data })
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

  const [entry] = await db
    .select()
    .from(lifeLedgerTable)
    .where(and(eq(lifeLedgerTable.userId, userId), eq(lifeLedgerTable.id, params.data.id)));

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

  const body = UpdateLifeLedgerEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .update(lifeLedgerTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(and(eq(lifeLedgerTable.userId, userId), eq(lifeLedgerTable.id, params.data.id)))
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

  await db
    .delete(lifeLedgerTable)
    .where(and(eq(lifeLedgerTable.userId, userId), eq(lifeLedgerTable.id, params.data.id)));

  res.status(204).send();
});

export default router;
