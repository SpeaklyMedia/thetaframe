import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, weeklyFramesTable } from "@workspace/db";
import {
  GetWeeklyFrameParams,
  GetWeeklyFrameResponse,
  UpsertWeeklyFrameParams,
  UpsertWeeklyFrameBody,
  UpsertWeeklyFrameResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/weekly-frames/:weekStart", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetWeeklyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  res.json(GetWeeklyFrameResponse.parse(frame));
});

router.put("/weekly-frames/:weekStart", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpsertWeeklyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  res.json(UpsertWeeklyFrameResponse.parse(frame));
});

export default router;
