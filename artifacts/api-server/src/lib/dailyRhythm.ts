import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { dailyReflectionsTable, db, routineSessionsTable } from "@workspace/db";

export const routineKeySchema = z.enum(["morning", "night"]);
export const routineModeSchema = z.enum(["full", "short", "minimum"]);
export const routineCompletionStateSchema = z.enum([
  "not_started",
  "in_progress",
  "complete",
]);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dailyRhythmDateParamsSchema = z.object({
  date: dateStringSchema,
});

export const routineSessionParamsSchema = z.object({
  date: dateStringSchema,
  routineKey: routineKeySchema,
});

export const upsertRoutineSessionBodySchema = z.object({
  mode: routineModeSchema,
  completedStepKeys: z.array(z.string().min(1)).default([]),
  completionState: routineCompletionStateSchema,
});

export const upsertDailyReflectionBodySchema = z.object({
  win: z.string().max(500).nullable().optional(),
  slipped: z.string().max(500).nullable().optional(),
  learned: z.string().max(500).nullable().optional(),
  firstActionTomorrow: z.string().max(500).nullable().optional(),
  prepNote: z.string().max(500).nullable().optional(),
});

type UpsertRoutineSessionBody = z.infer<typeof upsertRoutineSessionBodySchema>;
type UpsertDailyReflectionBody = z.infer<
  typeof upsertDailyReflectionBodySchema
>;

function previousDateString(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function normalizeNullableText(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniqueStepKeys(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export async function getDailyRhythmForUser(userId: string, date: string) {
  const [routineSessions, [reflection], [previousReflection]] =
    await Promise.all([
      db
        .select()
        .from(routineSessionsTable)
        .where(
          and(
            eq(routineSessionsTable.userId, userId),
            eq(routineSessionsTable.date, date),
          ),
        ),
      db
        .select()
        .from(dailyReflectionsTable)
        .where(
          and(
            eq(dailyReflectionsTable.userId, userId),
            eq(dailyReflectionsTable.date, date),
          ),
        ),
      db
        .select()
        .from(dailyReflectionsTable)
        .where(
          and(
            eq(dailyReflectionsTable.userId, userId),
            eq(dailyReflectionsTable.date, previousDateString(date)),
          ),
        ),
    ]);

  return {
    date,
    routineSessions,
    reflection: reflection ?? null,
    previousReflection: previousReflection ?? null,
  };
}

export async function upsertRoutineSessionForUser(args: {
  userId: string;
  date: string;
  routineKey: z.infer<typeof routineKeySchema>;
  data: UpsertRoutineSessionBody;
}) {
  const now = new Date();
  const completionState = args.data.completionState;
  const completedStepKeys = uniqueStepKeys(args.data.completedStepKeys);
  const completedAt = completionState === "complete" ? now : null;

  const [session] = await db
    .insert(routineSessionsTable)
    .values({
      userId: args.userId,
      date: args.date,
      routineKey: args.routineKey,
      mode: args.data.mode,
      completedStepKeys,
      startedAt: now,
      completedAt,
      completionState,
    })
    .onConflictDoUpdate({
      target: [
        routineSessionsTable.userId,
        routineSessionsTable.date,
        routineSessionsTable.routineKey,
      ],
      set: {
        mode: args.data.mode,
        completedStepKeys,
        completedAt,
        completionState,
        updatedAt: now,
      },
    })
    .returning();

  return session;
}

export async function upsertDailyReflectionForUser(args: {
  userId: string;
  date: string;
  data: UpsertDailyReflectionBody;
}) {
  const now = new Date();
  const values = {
    win: normalizeNullableText(args.data.win),
    slipped: normalizeNullableText(args.data.slipped),
    learned: normalizeNullableText(args.data.learned),
    firstActionTomorrow: normalizeNullableText(args.data.firstActionTomorrow),
    prepNote: normalizeNullableText(args.data.prepNote),
  };

  const [reflection] = await db
    .insert(dailyReflectionsTable)
    .values({
      userId: args.userId,
      date: args.date,
      ...values,
    })
    .onConflictDoUpdate({
      target: [dailyReflectionsTable.userId, dailyReflectionsTable.date],
      set: {
        ...values,
        updatedAt: now,
      },
    })
    .returning();

  return reflection;
}
