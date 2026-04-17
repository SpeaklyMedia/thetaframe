import { db, weeklyFramesTable } from "@workspace/db";
import { UpsertWeeklyFrameBody } from "@workspace/api-zod";
import { z } from "zod";

type UpsertWeeklyFrameBodyType = z.infer<typeof UpsertWeeklyFrameBody>;

export class WeeklyFrameValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateWeeklyFrameUpsertData(data: unknown): UpsertWeeklyFrameBodyType {
  const parsed = UpsertWeeklyFrameBody.safeParse(data);

  if (!parsed.success) {
    throw new WeeklyFrameValidationError(422, parsed.error.message);
  }

  if (parsed.data.steps.length > 3) {
    throw new WeeklyFrameValidationError(422, "Steps may not contain more than 3 items.");
  }

  if (parsed.data.nonNegotiables.length > 5) {
    throw new WeeklyFrameValidationError(422, "Non-negotiables may not contain more than 5 items.");
  }

  return parsed.data;
}

export async function upsertWeeklyFrameForUser({
  userId,
  weekStart,
  data,
}: {
  userId: string;
  weekStart: string;
  data: UpsertWeeklyFrameBodyType;
}) {
  const [frame] = await db
    .insert(weeklyFramesTable)
    .values({
      userId,
      weekStart,
      theme: data.theme ?? null,
      steps: data.steps,
      nonNegotiables: data.nonNegotiables,
      recoveryPlan: data.recoveryPlan ?? null,
    })
    .onConflictDoUpdate({
      target: [weeklyFramesTable.userId, weeklyFramesTable.weekStart],
      set: {
        theme: data.theme ?? null,
        steps: data.steps,
        nonNegotiables: data.nonNegotiables,
        recoveryPlan: data.recoveryPlan ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return frame;
}
