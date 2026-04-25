import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, weeklyFramesTable } from "@workspace/db";
import {
  ListWeeklyFramesResponse,
  CreateWeeklyFrameResponse,
  GetWeeklyFrameParams,
  GetWeeklyFrameResponse,
  UpsertWeeklyFrameParams,
  UpsertWeeklyFrameResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates, isValidDateString } from "../lib/serialize.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";
import {
  normalizeWeeklyFrameRecord,
  WeeklyFrameValidationError,
  upsertWeeklyFrameForUser,
  validateWeeklyFrameUpsertData,
} from "../lib/weeklyFrames.js";

const router: IRouter = Router();
router.use("/weekly-frames", requireAuth, requireModuleAccess("weekly"));

router.get("/weekly-frames", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const frames = await db
    .select()
    .from(weeklyFramesTable)
    .where(eq(weeklyFramesTable.userId, userId))
    .orderBy(desc(weeklyFramesTable.weekStart));

  res.json(ListWeeklyFramesResponse.parse(frames.map((frame) => serializeDates(normalizeWeeklyFrameRecord(frame)))));
});

router.post("/weekly-frames", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const record = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : null;
  if (!record) {
    res.status(400).json({ error: "Request body must be an object." });
    return;
  }
  const weekStart = typeof record.weekStart === "string" ? record.weekStart : "";
  if (!isValidDateString(weekStart)) {
    res.status(400).json({ error: "weekStart must be in YYYY-MM-DD format." });
    return;
  }
  let frame;
  try {
    const data = validateWeeklyFrameUpsertData({
      theme: record.theme,
      steps: record.steps,
      nonNegotiables: record.nonNegotiables,
      recoveryPlan: record.recoveryPlan,
    });
    frame = await upsertWeeklyFrameForUser({
      userId,
      weekStart,
      data,
    });
  } catch (error) {
    if (error instanceof WeeklyFrameValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  await markOnboardingSurfaceComplete(userId, "weekly");
  res.json(CreateWeeklyFrameResponse.parse(serializeDates(frame)));
});

router.get("/weekly-frames/:weekStart", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetWeeklyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!isValidDateString(params.data.weekStart)) {
    res.status(400).json({ error: "weekStart must be in YYYY-MM-DD format." });
    return;
  }

  const [frame] = await db
    .select()
    .from(weeklyFramesTable)
    .where(
      and(
        eq(weeklyFramesTable.userId, userId),
        eq(weeklyFramesTable.weekStart, params.data.weekStart),
      )
    );

  if (!frame) {
    res.status(404).json({ error: "Weekly frame not found" });
    return;
  }

  res.json(GetWeeklyFrameResponse.parse(serializeDates(normalizeWeeklyFrameRecord(frame))));
});

router.put("/weekly-frames/:weekStart", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpsertWeeklyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!isValidDateString(params.data.weekStart)) {
    res.status(400).json({ error: "weekStart must be in YYYY-MM-DD format." });
    return;
  }

  let frame;
  try {
    const data = validateWeeklyFrameUpsertData(req.body);
    frame = await upsertWeeklyFrameForUser({
      userId,
      weekStart: params.data.weekStart,
      data,
    });
  } catch (error) {
    if (error instanceof WeeklyFrameValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  await markOnboardingSurfaceComplete(userId, "weekly");
  res.json(UpsertWeeklyFrameResponse.parse(serializeDates(frame)));
});

export default router;
