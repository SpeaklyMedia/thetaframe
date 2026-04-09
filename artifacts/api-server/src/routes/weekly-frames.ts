import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, weeklyFramesTable } from "@workspace/db";
import {
  ListWeeklyFramesResponse,
  CreateWeeklyFrameBody,
  CreateWeeklyFrameResponse,
  GetWeeklyFrameParams,
  GetWeeklyFrameResponse,
  UpsertWeeklyFrameParams,
  UpsertWeeklyFrameBody,
  UpsertWeeklyFrameResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { serializeDates, isValidDateString } from "../lib/serialize";

const router: IRouter = Router();

router.get("/weekly-frames", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const frames = await db
    .select()
    .from(weeklyFramesTable)
    .where(eq(weeklyFramesTable.userId, userId))
    .orderBy(desc(weeklyFramesTable.weekStart));

  res.json(ListWeeklyFramesResponse.parse(frames.map(serializeDates)));
});

router.post("/weekly-frames", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateWeeklyFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [frame] = await db
    .insert(weeklyFramesTable)
    .values({
      userId,
      weekStart: body.data.weekStart,
      theme: body.data.theme ?? null,
      steps: body.data.steps,
      nonNegotiables: body.data.nonNegotiables,
      recoveryPlan: body.data.recoveryPlan ?? null,
    })
    .onConflictDoUpdate({
      target: [weeklyFramesTable.userId, weeklyFramesTable.weekStart],
      set: {
        theme: body.data.theme ?? null,
        steps: body.data.steps,
        nonNegotiables: body.data.nonNegotiables,
        recoveryPlan: body.data.recoveryPlan ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(CreateWeeklyFrameResponse.parse(serializeDates(frame)));
});

router.get("/weekly-frames/:weekStart", requireAuth, async (req: Request, res: Response): Promise<void> => {
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

  res.json(GetWeeklyFrameResponse.parse(serializeDates(frame)));
});

router.put("/weekly-frames/:weekStart", requireAuth, async (req: Request, res: Response): Promise<void> => {
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

  const body = UpsertWeeklyFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [frame] = await db
    .insert(weeklyFramesTable)
    .values({
      userId,
      weekStart: params.data.weekStart,
      theme: body.data.theme ?? null,
      steps: body.data.steps,
      nonNegotiables: body.data.nonNegotiables,
      recoveryPlan: body.data.recoveryPlan ?? null,
    })
    .onConflictDoUpdate({
      target: [weeklyFramesTable.userId, weeklyFramesTable.weekStart],
      set: {
        theme: body.data.theme ?? null,
        steps: body.data.steps,
        nonNegotiables: body.data.nonNegotiables,
        recoveryPlan: body.data.recoveryPlan ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(UpsertWeeklyFrameResponse.parse(serializeDates(frame)));
});

export default router;
