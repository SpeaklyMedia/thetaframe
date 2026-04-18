import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  aiDraftsTable,
  dailyFramesTable,
  db,
  visionFramesTable,
  weeklyFramesTable,
} from "@workspace/db";
import type {
  ThetaAIDraftRecord,
  ThetaAIDraftSourceRef,
} from "@workspace/integration-contracts";
import {
  buildDefaultDailyFrameUpsertData,
  validateDailyFrameUpsertData,
} from "./dailyFrames.js";
import { createStoredAIDraftWithClient, hydrateDraftRecord } from "./aiDrafts.js";
import { validateWeeklyFrameUpsertData } from "./weeklyFrames.js";
import { validateVisionFrameUpsertData } from "./visionFrames.js";
import {
  getOpenAIConfig,
  OpenAIGenerationError,
  OpenAIProviderUnavailableError,
  requestOpenAIJson,
} from "./openAiProvider.js";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const basicBrainDumpBodySchema = z.object({
  rawText: z.string().trim().min(20).max(6000),
  date: dateStringSchema,
  weekStart: dateStringSchema,
  refinementInstruction: z.string().trim().max(1000).optional(),
  refineFromDraftIds: z.array(z.number().int().positive()).max(12).optional(),
});

export type BasicBrainDumpBody = z.infer<typeof basicBrainDumpBodySchema>;

const providerTextItemSchema = z.union([
  z.string(),
  z.object({
    text: z.string().optional(),
    title: z.string().optional(),
    action: z.string().optional(),
    name: z.string().optional(),
  }),
]).transform((value) => {
  if (typeof value === "string") return value.trim();
  return (value.text ?? value.title ?? value.action ?? value.name ?? "").trim();
});

const providerTimeBlockSchema = z.union([
  z.string(),
  z.object({
    startTime: z.string().optional(),
    time: z.string().optional(),
    action: z.string().optional(),
    text: z.string().optional(),
    title: z.string().optional(),
  }),
]).transform((value) => {
  if (typeof value === "string") {
    return { startTime: "09:00", action: value.trim() };
  }

  return {
    startTime: (value.startTime ?? value.time ?? "09:00").trim(),
    action: (value.action ?? value.text ?? value.title ?? "").trim(),
  };
});

const providerResponseSchema = z.object({
  daily: z.object({
    colourState: z.enum(["green", "yellow", "red", "blue", "purple"]).optional(),
    tierA: z.array(providerTextItemSchema).default([]),
    tierB: z.array(providerTextItemSchema).default([]),
    timeBlocks: z.array(providerTimeBlockSchema).default([]),
    microWin: z.string().trim().max(500).nullable().optional(),
    rationale: z.string().trim().max(1000).nullable().optional(),
  }),
  weekly: z.object({
    theme: z.string().trim().max(500).nullable().optional(),
    steps: z.array(providerTextItemSchema).default([]),
    nonNegotiables: z.array(providerTextItemSchema).default([]),
    recoveryPlan: z.string().trim().max(1000).nullable().optional(),
    rationale: z.string().trim().max(1000).nullable().optional(),
  }),
  vision: z.object({
    goals: z.array(providerTextItemSchema).default([]),
    nextSteps: z.array(providerTextItemSchema).default([]),
    rationale: z.string().trim().max(1000).nullable().optional(),
  }),
  overallRationale: z.string().trim().max(1500).nullable().optional(),
});

type BrainDumpProviderResponse = z.infer<typeof providerResponseSchema>;

export class BasicBrainDumpProviderUnavailableError extends OpenAIProviderUnavailableError {}
export class BasicBrainDumpGenerationError extends OpenAIGenerationError {}
export class BasicBrainDumpRefinementError extends Error {}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function existingTextItems(
  value: unknown,
  max: number,
): Array<{ id: string; text: string; completed?: boolean; emoji?: string | null }> {
  return asRecordArray(value)
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : randomUUID(),
      text: typeof item.text === "string" ? item.text : "",
      completed: typeof item.completed === "boolean" ? item.completed : undefined,
      emoji: typeof item.emoji === "string" || item.emoji === null ? item.emoji : undefined,
    }))
    .filter((item) => item.text.trim().length > 0)
    .slice(0, max);
}

function generatedTasks(items: string[], max: number) {
  return items.filter((text) => text.trim().length > 0).slice(0, max).map((text) => ({
    id: randomUUID(),
    text,
    completed: false,
  }));
}

function generatedSteps(items: string[], max: number) {
  return items.filter((text) => text.trim().length > 0).slice(0, max).map((text) => ({
    id: randomUUID(),
    text,
    emoji: null,
  }));
}

function generatedTimeBlocks(items: BrainDumpProviderResponse["daily"]["timeBlocks"]) {
  return items
    .filter((item) => item.action.trim().length > 0)
    .slice(0, 8)
    .map((item, index) => ({
      id: randomUUID(),
      startTime: normalizeTimeLabel(item.startTime, index),
      action: item.action,
    }));
}

function compactJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function normalizeProviderOutputShape(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const daily = (record.daily ?? record.today ?? record.todayCanvas ?? {}) as Record<string, unknown>;
  const weekly = (record.weekly ?? record.week ?? record.thisWeek ?? record.weekCanvas ?? {}) as Record<string, unknown>;
  const vision = (record.vision ?? record.goals ?? record.goalsCanvas ?? {}) as Record<string, unknown>;

  return {
    daily: {
      colourState: daily.colourState ?? daily.colorState ?? daily.energy ?? daily.energyState,
      tierA: daily.tierA ?? daily.mustDo ?? daily.mustDoToday ?? daily.mustDos ?? daily.must_do ?? [],
      tierB: daily.tierB ?? daily.canWait ?? daily.later ?? daily.canDoLater ?? daily.can_wait ?? [],
      timeBlocks: daily.timeBlocks ?? daily.timeShape ?? daily.schedule ?? daily.time_shape ?? [],
      microWin: daily.microWin ?? daily.smallWin ?? daily.win ?? daily.small_win,
      rationale: daily.rationale ?? daily.summary ?? daily.why,
    },
    weekly: {
      theme: weekly.theme ?? weekly.weekTheme ?? weekly.weeklyTheme,
      steps: weekly.steps ?? weekly.protectedSteps ?? weekly.weekSteps ?? weekly.protected_steps ?? [],
      nonNegotiables: weekly.nonNegotiables ?? weekly.mustKeepSupports ?? weekly.mustKeep ?? weekly.supports ?? weekly.non_negotiables ?? [],
      recoveryPlan: weekly.recoveryPlan ?? weekly.backupPlan ?? weekly.ifThingsGetHard ?? weekly.recovery_plan,
      rationale: weekly.rationale ?? weekly.summary ?? weekly.why,
    },
    vision: {
      goals: vision.goals ?? vision.goal ?? vision.outcomes ?? [],
      nextSteps: vision.nextSteps ?? vision.nextVisibleSteps ?? vision.visibleSteps ?? vision.next_steps ?? [],
      rationale: vision.rationale ?? vision.summary ?? vision.why,
    },
    overallRationale: record.overallRationale ?? record.rationale ?? record.summary ?? null,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeKey(value: string): string {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitRawText(rawText: string): string[] {
  return rawText
    .split(/\n|[.;•]+/g)
    .map((item) => normalizeText(item.replace(/^[-*\d.)\s]+/, "")))
    .filter((item) => item.length >= 4 && !/^c\d+-provider-proof-/i.test(item))
    .slice(0, 20);
}

function fallbackItems(rawText: string, max: number): string[] {
  const items = splitRawText(rawText);
  if (items.length > 0) return items.slice(0, max);
  return [normalizeText(rawText).slice(0, 180)].filter(Boolean).slice(0, max);
}

function normalizeTimeLabel(value: string, index: number): string {
  const trimmed = value.trim().toLowerCase();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const hourMinute = trimmed.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (hourMinute) {
    const suffix = hourMinute[3];
    let hour = Number(hourMinute[1]);
    const minute = hourMinute[2] ?? "00";
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(2, "0")}:${minute.padStart(2, "0").slice(0, 2)}`;
    }
  }

  if (trimmed.includes("morning")) return "09:00";
  if (trimmed.includes("lunch") || trimmed.includes("midday") || trimmed.includes("noon")) return "12:00";
  if (trimmed.includes("afternoon")) return "14:00";
  if (trimmed.includes("evening")) return "18:00";

  return `${String(Math.min(17, 9 + index)).padStart(2, "0")}:00`;
}

function mergeTaskTexts(primary: string[], secondary: Array<{ text: string }>, max: number) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const text of [...primary, ...secondary.map((item) => item.text)]) {
    const normalized = normalizeText(text);
    const key = dedupeKey(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
    if (merged.length >= max) break;
  }
  return merged;
}

function mergeStepTexts(primary: string[], secondary: Array<{ text: string }>, max: number) {
  return mergeTaskTexts(primary, secondary, max);
}

async function getExistingContext(userId: string, date: string, weekStart: string) {
  const [dailyFrame] = await db
    .select()
    .from(dailyFramesTable)
    .where(and(eq(dailyFramesTable.userId, userId), eq(dailyFramesTable.date, date)));

  const [weeklyFrame] = await db
    .select()
    .from(weeklyFramesTable)
    .where(and(eq(weeklyFramesTable.userId, userId), eq(weeklyFramesTable.weekStart, weekStart)));

  const [visionFrame] = await db
    .select()
    .from(visionFramesTable)
    .where(eq(visionFramesTable.userId, userId));

  const dailyBase = dailyFrame
    ? {
        colourState: dailyFrame.colourState,
        tierA: existingTextItems(dailyFrame.tierA, 3).map((item) => ({
          id: item.id,
          text: item.text,
          completed: Boolean(item.completed),
        })),
        tierB: existingTextItems(dailyFrame.tierB, 12).map((item) => ({
          id: item.id,
          text: item.text,
          completed: Boolean(item.completed),
        })),
        timeBlocks: asRecordArray(dailyFrame.timeBlocks).map((item) => ({
          id: typeof item.id === "string" && item.id.trim() ? item.id : randomUUID(),
          startTime: typeof item.startTime === "string" ? item.startTime : "",
          action: typeof item.action === "string" ? item.action : "",
        })),
        microWin: dailyFrame.microWin ?? null,
        skipProtocolUsed: dailyFrame.skipProtocolUsed,
        skipProtocolChoice: dailyFrame.skipProtocolChoice,
      }
    : buildDefaultDailyFrameUpsertData();

  const weeklyBase = weeklyFrame
    ? {
        theme: weeklyFrame.theme ?? null,
        steps: existingTextItems(weeklyFrame.steps, 3).map(({ id, text, emoji }) => ({ id, text, emoji: emoji ?? null })),
        nonNegotiables: existingTextItems(weeklyFrame.nonNegotiables, 5).map(({ id, text, emoji }) => ({ id, text, emoji: emoji ?? null })),
        recoveryPlan: weeklyFrame.recoveryPlan ?? null,
      }
    : {
        theme: null,
        steps: [],
        nonNegotiables: [],
        recoveryPlan: null,
      };

  const visionBase = visionFrame
    ? {
        goals: existingTextItems(visionFrame.goals, 3).map(({ id, text, emoji }) => ({ id, text, emoji: emoji ?? null })),
        nextSteps: existingTextItems(visionFrame.nextSteps, 3).map(({ id, text, emoji }) => ({ id, text, emoji: emoji ?? null })),
      }
    : {
        goals: [],
        nextSteps: [],
      };

  return {
    daily: dailyBase,
    weekly: weeklyBase,
    vision: visionBase,
  };
}

async function getRefinementDrafts(userId: string, draftIds: number[] | undefined) {
  if (!draftIds || draftIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(draftIds));
  const rows = await db
    .select()
    .from(aiDraftsTable)
    .where(and(eq(aiDraftsTable.userId, userId), inArray(aiDraftsTable.id, uniqueIds)));

  if (rows.length !== uniqueIds.length) {
    throw new BasicBrainDumpRefinementError("One or more prior drafts were not found.");
  }

  const allowedKinds = new Set(["daily_frame_draft", "weekly_frame_draft", "vision_alignment_draft"]);
  if (rows.some((row) => !allowedKinds.has(row.draftKind))) {
    throw new BasicBrainDumpRefinementError("Refinement can only use prior Basic brain-dump drafts.");
  }

  return rows.map((row) => hydrateDraftRecord(row));
}

async function callProvider(args: {
  rawText: string;
  date: string;
  weekStart: string;
  existingContext: Awaited<ReturnType<typeof getExistingContext>>;
  refinementInstruction?: string;
  priorDrafts: ThetaAIDraftRecord[];
}) {
  let config;
  try {
    config = getOpenAIConfig("Basic brain dump setup");
  } catch (error) {
    if (error instanceof OpenAIProviderUnavailableError) {
      throw new BasicBrainDumpProviderUnavailableError(error.message);
    }
    throw error;
  }

  const system = [
    "You are sorting one ThetaFrame Basic user's messy brain dump into reviewable planning drafts.",
    "Return JSON only.",
    "Create complete proposed values for Today, This Week, and Goals.",
    "Respect the user's current saved context by keeping useful existing items unless the input clearly supersedes them.",
    "Do not write live data. These outputs become drafts that the user must approve and apply.",
    "Use calm, concrete language. Avoid shame, urgency spikes, diagnosis, or overloading the user.",
    "Keep Today small: at most 3 must-do tasks, later tasks separated, optional time blocks, and one small win.",
    "Keep This Week small: one theme, at most 3 protected steps, at most 5 must-keep supports, and one backup plan.",
    "Keep Goals small: at most 3 goals and at most 3 next visible steps.",
    "Use YYYY-MM-DD dates only if a date appears inside text; otherwise do not invent dated commitments.",
    "Output shape: { daily: { colourState, tierA, tierB, timeBlocks, microWin, rationale }, weekly: { theme, steps, nonNegotiables, recoveryPlan, rationale }, vision: { goals, nextSteps, rationale }, overallRationale }.",
  ].join(" ");

  const user = JSON.stringify({
    rawText: args.rawText,
    date: args.date,
    weekStart: args.weekStart,
    refinementInstruction: args.refinementInstruction ?? null,
    existingContext: compactJson(args.existingContext),
    priorDrafts: args.priorDrafts.map((draft) => ({
      id: draft.id,
      draftKind: draft.draftKind,
      reviewState: draft.reviewState,
      proposedPayload: draft.proposedPayload,
      reviewNotes: draft.reviewNotes,
    })),
  });

  let parsedJson: unknown;
  try {
    parsedJson = await requestOpenAIJson({
      config,
      system,
      user,
      featureLabel: "Basic brain dump setup",
    });
  } catch (error) {
    if (error instanceof OpenAIProviderUnavailableError) {
      throw new BasicBrainDumpProviderUnavailableError(error.message);
    }
    if (error instanceof OpenAIGenerationError) {
      throw new BasicBrainDumpGenerationError(error.message);
    }
    throw error;
  }

  try {
    return {
      provider: "openai",
      model: config.model,
      output: providerResponseSchema.parse(normalizeProviderOutputShape(parsedJson)),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BasicBrainDumpGenerationError(
        "The Basic brain dump provider returned output that did not match the expected contract.",
      );
    }
    throw error;
  }
}

function buildDraftPayloads(
  providerOutput: BrainDumpProviderResponse,
  existingContext: Awaited<ReturnType<typeof getExistingContext>>,
  rawText: string,
) {
  const fallback = fallbackItems(rawText, 6);
  const primaryDailyTasks = mergeTaskTexts(
    providerOutput.daily.tierA.length > 0 ? providerOutput.daily.tierA : fallback.slice(0, 3),
    existingContext.daily.tierA,
    3,
  );
  const dailyTierAOverflow = providerOutput.daily.tierA.slice(primaryDailyTasks.length);
  const dailyTierBTexts = mergeTaskTexts(
    providerOutput.daily.tierB.length > 0 ? [...dailyTierAOverflow, ...providerOutput.daily.tierB] : fallback.slice(3),
    [...existingContext.daily.tierA, ...existingContext.daily.tierB],
    12,
  );
  const weeklyStepTexts = mergeStepTexts(
    providerOutput.weekly.steps.length > 0 ? providerOutput.weekly.steps : fallback.slice(0, 3),
    existingContext.weekly.steps,
    3,
  );
  const weeklySupportTexts = mergeStepTexts(
    providerOutput.weekly.nonNegotiables.length > 0
      ? providerOutput.weekly.nonNegotiables
      : ["Protect one quiet block", "Keep the basics visible"],
    existingContext.weekly.nonNegotiables,
    5,
  );
  const visionGoalTexts = mergeStepTexts(
    providerOutput.vision.goals.length > 0 ? providerOutput.vision.goals : ["Build a calmer routine"],
    existingContext.vision.goals,
    3,
  );
  const visionNextStepTexts = mergeStepTexts(
    providerOutput.vision.nextSteps.length > 0 ? providerOutput.vision.nextSteps : fallback.slice(0, 3),
    existingContext.vision.nextSteps,
    3,
  );
  const dailyPayload = validateDailyFrameUpsertData({
    colourState: providerOutput.daily.colourState ?? existingContext.daily.colourState ?? "green",
    tierA: generatedTasks(primaryDailyTasks, 3),
    tierB: generatedTasks(dailyTierBTexts, 12),
    timeBlocks:
      providerOutput.daily.timeBlocks.length > 0
        ? generatedTimeBlocks(providerOutput.daily.timeBlocks)
        : existingContext.daily.timeBlocks,
    microWin: providerOutput.daily.microWin ?? existingContext.daily.microWin ?? "One small piece is visible now.",
    skipProtocolUsed: existingContext.daily.skipProtocolUsed,
    skipProtocolChoice: existingContext.daily.skipProtocolChoice,
  });

  const weeklyPayload = validateWeeklyFrameUpsertData({
    theme: providerOutput.weekly.theme ?? existingContext.weekly.theme ?? "Make the week smaller and more visible.",
    steps: generatedSteps(weeklyStepTexts, 3),
    nonNegotiables: generatedSteps(weeklySupportTexts, 5),
    recoveryPlan:
      providerOutput.weekly.recoveryPlan ??
      existingContext.weekly.recoveryPlan ??
      "If energy drops, keep the smallest next step and move the rest to later.",
  });

  const visionPayload = validateVisionFrameUpsertData({
    goals: generatedSteps(visionGoalTexts, 3),
    nextSteps: generatedSteps(visionNextStepTexts, 3),
  });

  return {
    dailyPayload,
    weeklyPayload,
    visionPayload,
  };
}

export async function generateBasicBrainDumpDraftBatch(userId: string, body: BasicBrainDumpBody) {
  const priorDrafts = await getRefinementDrafts(userId, body.refineFromDraftIds);
  const existingContext = await getExistingContext(userId, body.date, body.weekStart);
  const ai = await callProvider({
    rawText: body.rawText,
    date: body.date,
    weekStart: body.weekStart,
    existingContext,
    refinementInstruction: body.refinementInstruction,
    priorDrafts,
  });

  const batchId = randomUUID();
  const createdAt = new Date().toISOString();
  const rawInputExcerpt = body.rawText.slice(0, 600);
  const sourceRefs: ThetaAIDraftSourceRef[] = [
    {
      sourceType: "raw_input",
      ref: `dashboard-brain-dump:${batchId}`,
      label: "Dashboard brain dump",
    },
  ];
  const { dailyPayload, weeklyPayload, visionPayload } = buildDraftPayloads(ai.output, existingContext, body.rawText);

  const baseMetadata = {
    provenanceSource: "assistant_draft" as const,
    captureChannel: "assistant_dock" as const,
    confidence: "medium" as const,
    sourcePayloadRef: `dashboard-brain-dump:${batchId}`,
    sourceExcerpt: rawInputExcerpt,
    brainDumpBatchId: batchId,
    brainDumpSource: "dashboard_setup_lane",
    rawInputExcerpt,
    refinementInstruction: body.refinementInstruction ?? null,
    refineFromDraftIds: body.refineFromDraftIds ?? [],
    provider: ai.provider,
    model: ai.model,
    generatedAt: createdAt,
  };

  const draftInputs = [
    {
      draftKind: "daily_frame_draft" as const,
      targetSurfaceKey: body.date,
      proposedPayload: dailyPayload,
      reviewNotes: ai.output.daily.rationale ?? ai.output.overallRationale ?? "Dashboard brain dump sorted into a Today draft.",
      metadata: {
        ...baseMetadata,
        title: "Today brain dump draft",
        summary: ai.output.daily.rationale ?? "AI sorted the messy input into Today's must-do, can-wait, time shape, and small win.",
        rationale: ai.output.daily.rationale ?? ai.output.overallRationale ?? null,
      },
    },
    {
      draftKind: "weekly_frame_draft" as const,
      targetSurfaceKey: body.weekStart,
      proposedPayload: weeklyPayload,
      reviewNotes: ai.output.weekly.rationale ?? ai.output.overallRationale ?? "Dashboard brain dump sorted into a Week draft.",
      metadata: {
        ...baseMetadata,
        title: "Week brain dump draft",
        summary: ai.output.weekly.rationale ?? "AI sorted the messy input into this week's theme, steps, supports, and backup plan.",
        rationale: ai.output.weekly.rationale ?? ai.output.overallRationale ?? null,
      },
    },
    {
      draftKind: "vision_alignment_draft" as const,
      targetSurfaceKey: "me",
      proposedPayload: visionPayload,
      reviewNotes: ai.output.vision.rationale ?? ai.output.overallRationale ?? "Dashboard brain dump sorted into a Goals draft.",
      metadata: {
        ...baseMetadata,
        title: "Goals brain dump draft",
        summary: ai.output.vision.rationale ?? "AI sorted the messy input into goals and next visible steps.",
        rationale: ai.output.vision.rationale ?? ai.output.overallRationale ?? null,
      },
    },
  ];

  const drafts = await db.transaction(async (tx) => {
    const created: ThetaAIDraftRecord[] = [];
    for (const input of draftInputs) {
      created.push(
        await createStoredAIDraftWithClient(tx as unknown as Parameters<typeof createStoredAIDraftWithClient>[0], {
          userId,
          draftKind: input.draftKind,
          confidenceMode: "suggest_only",
          inputChannels: ["typed_text"],
          sourceRefs,
          targetSurfaceKey: input.targetSurfaceKey,
          proposedPayload: input.proposedPayload,
          reviewNotes: input.reviewNotes,
          metadata: input.metadata,
        }),
      );
    }
    return created;
  });

  return {
    batchId,
    drafts,
    createdAt,
  };
}
