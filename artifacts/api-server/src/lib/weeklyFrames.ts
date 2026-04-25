import { db, weeklyFramesTable } from "@workspace/db";
import { UpsertWeeklyFrameBody } from "@workspace/api-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod";

type UpsertWeeklyFrameBodyType = z.infer<typeof UpsertWeeklyFrameBody>;
type WeeklyFrameRecord = typeof weeklyFramesTable.$inferSelect;
type WeeklyStepRecord = UpsertWeeklyFrameBodyType["steps"][number];

export class WeeklyFrameValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizeWeeklyStepArray(
  value: unknown,
  preserveCompletion: boolean,
): WeeklyStepRecord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: typeof record.id === "string" && record.id.trim() ? record.id : randomUUID(),
      text: typeof record.text === "string" ? record.text : "",
      completed: preserveCompletion && typeof record.completed === "boolean" ? record.completed : false,
      emoji: typeof record.emoji === "string" || record.emoji === null ? record.emoji : null,
    };
  });
}

function normalizeWeeklyFrameInput(data: unknown) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;

  return {
    theme: record.theme,
    steps: normalizeWeeklyStepArray(record.steps, true),
    nonNegotiables: normalizeWeeklyStepArray(record.nonNegotiables, false),
    recoveryPlan: record.recoveryPlan,
  };
}

export function validateWeeklyFrameUpsertData(data: unknown): UpsertWeeklyFrameBodyType {
  const parsed = UpsertWeeklyFrameBody.safeParse(normalizeWeeklyFrameInput(data));

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

export function normalizeWeeklyFrameRecord<T extends Pick<WeeklyFrameRecord, "steps" | "nonNegotiables">>(
  frame: T,
): Omit<T, "steps" | "nonNegotiables"> & {
  steps: WeeklyStepRecord[];
  nonNegotiables: WeeklyStepRecord[];
} {
  return {
    ...frame,
    steps: normalizeWeeklyStepArray(frame.steps, true) ?? [],
    nonNegotiables: normalizeWeeklyStepArray(frame.nonNegotiables, false) ?? [],
  };
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
  const normalizedData = validateWeeklyFrameUpsertData(data);
  const [frame] = await db
    .insert(weeklyFramesTable)
    .values({
      userId,
      weekStart,
      theme: normalizedData.theme ?? null,
      steps: normalizedData.steps,
      nonNegotiables: normalizedData.nonNegotiables,
      recoveryPlan: normalizedData.recoveryPlan ?? null,
    })
    .onConflictDoUpdate({
      target: [weeklyFramesTable.userId, weeklyFramesTable.weekStart],
      set: {
        theme: normalizedData.theme ?? null,
        steps: normalizedData.steps,
        nonNegotiables: normalizedData.nonNegotiables,
        recoveryPlan: normalizedData.recoveryPlan ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return normalizeWeeklyFrameRecord(frame);
}
