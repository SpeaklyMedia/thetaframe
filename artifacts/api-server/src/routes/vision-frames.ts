import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, visionFramesTable } from "@workspace/db";
import {
  GetVisionFrameResponse,
  GetVisionFrameCollectionResponse,
  CreateVisionFrameBody,
  CreateVisionFrameResponse,
  UpsertVisionFrameBody,
  UpsertVisionFrameResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

const upsertVision = async (userId: string, goals: unknown, nextSteps: unknown) => {
  const [frame] = await db
    .insert(visionFramesTable)
    .values({ userId, goals, nextSteps })
    .onConflictDoUpdate({
      target: [visionFramesTable.userId],
      set: { goals, nextSteps, updatedAt: new Date() },
    })
    .returning();
  return frame;
};

router.get("/vision-frames", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const [frame] = await db
    .select()
    .from(visionFramesTable)
    .where(eq(visionFramesTable.userId, userId));

  if (!frame) {
    res.status(404).json({ error: "Vision frame not found" });
    return;
  }

  res.json(GetVisionFrameCollectionResponse.parse(serializeDates(frame)));
});

router.post("/vision-frames", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateVisionFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.goals.length > 3) {
    res.status(400).json({ error: "Goals may not contain more than 3 items." });
    return;
  }
  if (body.data.nextSteps.length > 3) {
    res.status(400).json({ error: "Next steps may not contain more than 3 items." });
    return;
  }

  const frame = await upsertVision(userId, body.data.goals, body.data.nextSteps);
  res.json(CreateVisionFrameResponse.parse(serializeDates(frame)));
});

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

  res.json(GetVisionFrameResponse.parse(serializeDates(frame)));
});

router.put("/vision-frames/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = UpsertVisionFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.goals.length > 3) {
    res.status(400).json({ error: "Goals may not contain more than 3 items." });
    return;
  }
  if (body.data.nextSteps.length > 3) {
    res.status(400).json({ error: "Next steps may not contain more than 3 items." });
    return;
  }

  const frame = await upsertVision(userId, body.data.goals, body.data.nextSteps);
  res.json(UpsertVisionFrameResponse.parse(serializeDates(frame)));
});

export default router;
