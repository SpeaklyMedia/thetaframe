import { db, visionFramesTable } from "@workspace/db";
import { UpsertVisionFrameBody } from "@workspace/api-zod";

type VisionFrameUpsertData = {
  goals: Array<{
    id: string;
    text: string;
    emoji?: string | null;
  }>;
  nextSteps: Array<{
    id: string;
    text: string;
    emoji?: string | null;
  }>;
};

export class VisionFrameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionFrameValidationError";
  }
}

export function validateVisionFrameUpsertData(payload: unknown): VisionFrameUpsertData {
  const parsed = UpsertVisionFrameBody.safeParse(payload);

  if (!parsed.success) {
    throw new VisionFrameValidationError(parsed.error.message);
  }

  if (parsed.data.goals.length > 3) {
    throw new VisionFrameValidationError("Goals may not contain more than 3 items.");
  }

  if (parsed.data.nextSteps.length > 3) {
    throw new VisionFrameValidationError("Next steps may not contain more than 3 items.");
  }

  return parsed.data;
}

export async function upsertVisionFrameForUser({
  userId,
  data,
}: {
  userId: string;
  data: VisionFrameUpsertData;
}) {
  const [frame] = await db
    .insert(visionFramesTable)
    .values({
      userId,
      goals: data.goals,
      nextSteps: data.nextSteps,
    })
    .onConflictDoUpdate({
      target: [visionFramesTable.userId],
      set: {
        goals: data.goals,
        nextSteps: data.nextSteps,
        updatedAt: new Date(),
      },
    })
    .returning();

  return frame;
}
