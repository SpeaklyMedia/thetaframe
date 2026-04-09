import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, visionFramesTable } from "@workspace/db";
import {
  GetVisionFrameResponse,
  UpsertVisionFrameBody,
  UpsertVisionFrameResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/vision-frames/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const [frame] = await db
    .select()
    .from(visionFramesTable)
    .where(eq(visionFramesTable.userId, userId));

  if (!frame) {
    res.status(404).json({ error: "Vision frame not found" });
    return;
  }

  res.json(GetVisionFrameResponse.parse(frame));
});

router.put("/vision-frames/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = UpsertVisionFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [frame] = await db
    .insert(visionFramesTable)
    .values({
      userId,
      goals: body.data.goals,
      nextSteps: body.data.nextSteps,
    })
    .onConflictDoUpdate({
      target: [visionFramesTable.userId],
      set: {
        goals: body.data.goals,
        nextSteps: body.data.nextSteps,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(UpsertVisionFrameResponse.parse(frame));
});

export default router;
