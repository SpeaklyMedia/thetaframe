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
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates } from "../lib/serialize.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";
import {
  upsertVisionFrameForUser,
  validateVisionFrameUpsertData,
  VisionFrameValidationError,
} from "../lib/visionFrames.js";

const router: IRouter = Router();
router.use("/vision-frames", requireAuth, requireModuleAccess("vision"));

router.get("/vision-frames", async (req: Request, res: Response): Promise<void> => {
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

router.post("/vision-frames", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateVisionFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  let visionData;
  try {
    visionData = validateVisionFrameUpsertData(body.data);
  } catch (error) {
    if (error instanceof VisionFrameValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const frame = await upsertVisionFrameForUser({ userId, data: visionData });
  await markOnboardingSurfaceComplete(userId, "vision");
  res.json(CreateVisionFrameResponse.parse(serializeDates(frame)));
});

router.get("/vision-frames/me", async (req: Request, res: Response): Promise<void> => {
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

router.put("/vision-frames/me", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = UpsertVisionFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  let visionData;
  try {
    visionData = validateVisionFrameUpsertData(body.data);
  } catch (error) {
    if (error instanceof VisionFrameValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const frame = await upsertVisionFrameForUser({ userId, data: visionData });
  await markOnboardingSurfaceComplete(userId, "vision");
  res.json(UpsertVisionFrameResponse.parse(serializeDates(frame)));
});

export default router;
