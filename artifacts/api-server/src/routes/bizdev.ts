import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, bizdevBrandsTable } from "@workspace/db";
import {
  CreateBizdevBrandBody,
  UpdateBizdevBrandBody,
  GetBizdevBrandParams,
  UpdateBizdevBrandParams,
  DeleteBizdevBrandParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates } from "../lib/serialize.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";

const router: IRouter = Router();
router.use(requireAuth, requireModuleAccess("bizdev"));

router.get("/bizdev/brands/summary", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const rows = await db
    .select({ phase: bizdevBrandsTable.phase, count: sql<number>`count(*)::int` })
    .from(bizdevBrandsTable)
    .where(eq(bizdevBrandsTable.userId, userId))
    .groupBy(bizdevBrandsTable.phase);

  const counts = { COLD: 0, WARM: 0, HOT: 0 };
  let total = 0;
  for (const row of rows) {
    const phase = row.phase as "COLD" | "WARM" | "HOT";
    if (phase in counts) {
      counts[phase] = row.count;
      total += row.count;
    }
  }

  res.json({ counts, total });
});

router.get("/bizdev/brands", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const brands = await db
    .select()
    .from(bizdevBrandsTable)
    .where(eq(bizdevBrandsTable.userId, userId))
    .orderBy(bizdevBrandsTable.nextTouchDate);

  res.json(brands.map(serializeDates));
});

router.post("/bizdev/brands", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateBizdevBrandBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [brand] = await db
    .insert(bizdevBrandsTable)
    .values({ userId, ...body.data })
    .returning();

  await markOnboardingSurfaceComplete(userId, "bizdev");
  res.status(201).json(serializeDates(brand));
});

router.get("/bizdev/brands/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetBizdevBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [brand] = await db
    .select()
    .from(bizdevBrandsTable)
    .where(and(eq(bizdevBrandsTable.userId, userId), eq(bizdevBrandsTable.id, params.data.id)));

  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(serializeDates(brand));
});

router.put("/bizdev/brands/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpdateBizdevBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBizdevBrandBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [brand] = await db
    .update(bizdevBrandsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(and(eq(bizdevBrandsTable.userId, userId), eq(bizdevBrandsTable.id, params.data.id)))
    .returning();

  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(serializeDates(brand));
});

router.delete("/bizdev/brands/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = DeleteBizdevBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(bizdevBrandsTable)
    .where(and(eq(bizdevBrandsTable.userId, userId), eq(bizdevBrandsTable.id, params.data.id)));

  res.status(204).send();
});

export default router;
