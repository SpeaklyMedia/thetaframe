import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { dailyReflectionsTable, db, routineSessionsTable } from "@workspace/db";
import { isValidDateString } from "./serialize.js";

export const routineKeySchema = z.enum(["morning", "night"]);
export const routineModeSchema = z.enum(["full", "short", "minimum"]);
export const routineCompletionStateSchema = z.enum([
  "not_started",
  "in_progress",
  "complete",
]);

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    isValidDateString,
    "Date must be a real calendar date in YYYY-MM-DD format.",
  );

const MORNING_STEP_KEYS = [
  "hydrate",
  "outside_light",
  "move",
  "center",
  "family",
  "wealth",
  "command",
] as const;

const NIGHT_STEP_KEYS = [
  "capture",
  "review",
  "choose",
  "prepare",
  "sleep",
] as const;

const REQUIRED_MORNING_STEPS_BY_MODE: Record<
  z.infer<typeof routineModeSchema>,
  readonly string[]
> = {
  full: MORNING_STEP_KEYS,
  short: ["hydrate", "outside_light", "move", "center", "command"],
  minimum: ["hydrate", "center", "command"],
};

class DailyRhythmValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export { DailyRhythmValidationError };

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

export const patchDailyReflectionBodySchema = z
  .object({
    slipped: z.string().max(500).nullable().optional(),
    learned: z.string().max(500).nullable().optional(),
    firstActionTomorrow: z.string().max(500).nullable().optional(),
    prepNote: z.string().max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one reflection field is required.",
  });

type UpsertRoutineSessionBody = z.infer<typeof upsertRoutineSessionBodySchema>;
type PatchDailyReflectionBody = z.infer<typeof patchDailyReflectionBodySchema>;

function previousDateString(date: string): string {
  if (!isValidDateString(date)) {
    throw new DailyRhythmValidationError(
      400,
      "Date must be a real calendar date in YYYY-MM-DD format.",
    );
  }

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

function requireAllowedStepKeys(args: {
  completedStepKeys: string[];
  allowedStepKeys: readonly string[];
}) {
  const allowed = new Set(args.allowedStepKeys);
  const invalid = args.completedStepKeys.filter((key) => !allowed.has(key));
  if (invalid.length > 0) {
    throw new DailyRhythmValidationError(
      422,
      `Unsupported routine step: ${invalid[0]}.`,
    );
  }
}

function requireRequiredSteps(args: {
  completedStepKeys: string[];
  requiredStepKeys: readonly string[];
  label: string;
}) {
  const completed = new Set(args.completedStepKeys);
  const missing = args.requiredStepKeys.filter((key) => !completed.has(key));
  if (missing.length > 0) {
    throw new DailyRhythmValidationError(
      422,
      `${args.label} is missing required step: ${missing[0]}.`,
    );
  }
}

function validateRoutineSessionInput(args: {
  routineKey: z.infer<typeof routineKeySchema>;
  data: UpsertRoutineSessionBody;
}) {
  const completedStepKeys = uniqueStepKeys(args.data.completedStepKeys);

  if (args.routineKey === "morning") {
    requireAllowedStepKeys({
      completedStepKeys,
      allowedStepKeys: MORNING_STEP_KEYS,
    });

    if (args.data.completionState === "complete") {
      requireRequiredSteps({
        completedStepKeys,
        requiredStepKeys: REQUIRED_MORNING_STEPS_BY_MODE[args.data.mode],
        label: "Morning routine",
      });
    }

    return completedStepKeys;
  }

  if (args.data.mode !== "full") {
    throw new DailyRhythmValidationError(
      422,
      "Night Reset only supports full mode in V1.",
    );
  }

  requireAllowedStepKeys({
    completedStepKeys,
    allowedStepKeys: NIGHT_STEP_KEYS,
  });

  if (args.data.completionState === "complete") {
    requireRequiredSteps({
      completedStepKeys,
      requiredStepKeys: NIGHT_STEP_KEYS,
      label: "Night Reset",
    });
  }

  return completedStepKeys;
}

function hasOwnReflectionField(
  data: PatchDailyReflectionBody,
  key: keyof PatchDailyReflectionBody,
): boolean {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function buildDailyReflectionPatch(data: PatchDailyReflectionBody) {
  const values: Partial<{
    slipped: string | null;
    learned: string | null;
    firstActionTomorrow: string | null;
    prepNote: string | null;
  }> = {};

  if (hasOwnReflectionField(data, "slipped")) {
    values.slipped = normalizeNullableText(data.slipped);
  }
  if (hasOwnReflectionField(data, "learned")) {
    values.learned = normalizeNullableText(data.learned);
  }
  if (hasOwnReflectionField(data, "firstActionTomorrow")) {
    values.firstActionTomorrow = normalizeNullableText(
      data.firstActionTomorrow,
    );
  }
  if (hasOwnReflectionField(data, "prepNote")) {
    values.prepNote = normalizeNullableText(data.prepNote);
  }

  return values;
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
  const completedStepKeys = validateRoutineSessionInput({
    routineKey: args.routineKey,
    data: args.data,
  });
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

export async function patchDailyReflectionForUser(args: {
  userId: string;
  date: string;
  data: PatchDailyReflectionBody;
}) {
  const now = new Date();
  const values = buildDailyReflectionPatch(args.data);

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
