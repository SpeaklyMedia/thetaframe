import { clerkClient } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { aiDraftsTable, babyKbAssignmentsTable, db, lifeLedgerBabyTable, parentPacketMaterializationsTable, parentPacketPromotionsTable } from "@workspace/db";
import { detectEnvironment, ensureEnvironmentModules, getUserAndMaybeBootstrap } from "./access.js";
import {
  BABY_ASSIGNMENT_PROJECTION_POLICIES,
  BABY_ASSIGNMENT_CADENCES,
  validateBabyKbAssignmentDraftCreateData,
} from "./babyKbAssignments.js";
import { isValidDateString } from "./serialize.js";

const aiSuggestionResponseSchema = z.object({
  assigneeUserId: z.string().min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  cadence: z.enum(BABY_ASSIGNMENT_CADENCES).nullable(),
  projectionPolicy: z.enum(BABY_ASSIGNMENT_PROJECTION_POLICIES),
  assignmentNotes: z.string().min(1).max(4000),
  rationale: z.string().min(1).max(1000),
});

type EligibleAssignee = {
  id: string;
  label: string;
  email: string;
};

export class BabyAssignmentSuggestionEligibilityError extends Error {}
export class BabyAssignmentSuggestionProviderUnavailableError extends Error {}
export class BabyAssignmentSuggestionGenerationError extends Error {}

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new BabyAssignmentSuggestionProviderUnavailableError(
      "OPENAI_API_KEY is not configured for Baby assignment suggestions.",
    );
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
  };
}

function hasVerificationConflict(tags: unknown) {
  const list = Array.isArray(tags) ? tags.map((value) => String(value)) : [];
  return list.includes("Needs verification") || !list.includes("Verified personal truth");
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  if (Array.isArray(record.output)) {
    const parts: string[] = [];
    for (const item of record.output) {
      if (!item || typeof item !== "object") continue;
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const text = (part as Record<string, unknown>).text;
        if (typeof text === "string" && text.trim()) {
          parts.push(text.trim());
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  return null;
}

function parseProviderJsonOutput(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw error;
  }
}

async function listEligibleAssignees(): Promise<EligibleAssignee[]> {
  const environment = detectEnvironment();
  const users = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await clerkClient.users.getUserList({ limit, offset });
    users.push(...page.data);
    if (page.data.length < limit) break;
    offset += limit;
  }

  const eligible: EligibleAssignee[] = [];
  for (const user of users) {
    await getUserAndMaybeBootstrap(user.id);
    const modules = await ensureEnvironmentModules(user.id, environment);
    if (!modules.includes("life-ledger")) {
      continue;
    }

    const email = user.emailAddresses[0]?.emailAddress ?? "";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    eligible.push({
      id: user.id,
      label: name || email || user.id,
      email,
    });
  }

  return eligible;
}

async function getSuggestionContext(
  adminUserId: string,
  sourceEntryId: number,
  options?: {
    skipPendingDraftCheck?: boolean;
    excludeDraftId?: number | null;
  },
) {
  const [sourceEntry] = await db
    .select()
    .from(lifeLedgerBabyTable)
    .where(and(eq(lifeLedgerBabyTable.id, sourceEntryId), eq(lifeLedgerBabyTable.userId, adminUserId)));

  if (!sourceEntry) {
    throw new BabyAssignmentSuggestionEligibilityError("Baby KB source entry not found.");
  }

  if (hasVerificationConflict(sourceEntry.tags)) {
    throw new BabyAssignmentSuggestionEligibilityError(
      "Only verified Baby KB entries without verification conflicts may generate AI assignment suggestions.",
    );
  }

  const assignments = await db
    .select()
    .from(babyKbAssignmentsTable)
    .where(eq(babyKbAssignmentsTable.sourceEntryId, sourceEntry.id));

  const hasActiveAssignment = assignments.some(
    (assignment) => assignment.lifecycleState !== "completed" && assignment.lifecycleState !== "superseded",
  );
  if (hasActiveAssignment) {
    throw new BabyAssignmentSuggestionEligibilityError(
      "This Baby KB entry already has an active assignment and is not eligible for another AI assignment suggestion.",
    );
  }

  if (!options?.skipPendingDraftCheck) {
    const existingDrafts = await db
      .select()
      .from(aiDraftsTable)
      .where(
        and(
          eq(aiDraftsTable.userId, adminUserId),
          eq(aiDraftsTable.targetLane, "baby-kb"),
          eq(aiDraftsTable.draftKind, "baby_kb_assignment_draft"),
        ),
      );

    const hasPendingDraft = existingDrafts.some((draft) => {
      if (options?.excludeDraftId != null && draft.id === options.excludeDraftId) return false;
      if (draft.reviewState === "applied" || draft.reviewState === "rejected") return false;
      if (!draft.proposedPayload || typeof draft.proposedPayload !== "object") return false;
      return (draft.proposedPayload as Record<string, unknown>).sourceEntryId === sourceEntry.id;
    });

    if (hasPendingDraft) {
      throw new BabyAssignmentSuggestionEligibilityError(
        "A Baby assignment suggestion draft already exists for this entry.",
      );
    }
  }

  const [materialization] = await db
    .select()
    .from(parentPacketMaterializationsTable)
    .where(
      and(
        eq(parentPacketMaterializationsTable.targetEntryId, sourceEntry.id),
        eq(parentPacketMaterializationsTable.uploaderUserId, sourceEntry.userId),
      ),
    );

  const promotions = await db
    .select()
    .from(parentPacketPromotionsTable)
    .where(eq(parentPacketPromotionsTable.sourceEntryId, sourceEntry.id));

  const assignees = await listEligibleAssignees();
  if (assignees.length === 0) {
    throw new BabyAssignmentSuggestionEligibilityError(
      "No Life Ledger-enabled assignees are currently available for Baby assignment suggestions.",
    );
  }

  return {
    sourceEntry,
    materialization: materialization ?? null,
    promotions,
    assignments,
    assignees,
  };
}

async function callOpenAIForSuggestion(input: {
  sourceEntryName: string;
  sourceNotes: string | null;
  sourceTags: string[];
  sourcePath: string | null;
  sourceRecordKey: string | null;
  materializationMetadata: Record<string, unknown> | null;
  promotions: Array<{ targetSurface: string; targetContainerKey: string }>;
  assignees: EligibleAssignee[];
}) {
  const config = getOpenAIConfig();
  const today = new Date().toISOString().slice(0, 10);
  const system = [
    "You are generating one Baby KB assignment suggestion for ThetaFrame.",
    "Return JSON only.",
    "Choose exactly one assigneeUserId from the provided eligible assignees.",
    "effectiveDate and dueDate must use YYYY-MM-DD when present.",
    "cadence must be null or one of daily, weekly, monthly, quarterly, yearly.",
    "projectionPolicy must be one of hold, event_only, event_and_heroes.",
    "assignmentNotes should be a short admin-facing rationale for why this work should be assigned now.",
    "rationale should briefly explain the suggestion in plain language.",
    "If timing is unclear, set dueDate to null and cadence to null.",
    "Do not invent users or fields outside the requested JSON shape.",
  ].join(" ");

  const user = JSON.stringify({
    today,
    sourceEntry: {
      name: input.sourceEntryName,
      notes: input.sourceNotes,
      tags: input.sourceTags,
      sourcePath: input.sourcePath,
      sourceRecordKey: input.sourceRecordKey,
      metadata: input.materializationMetadata,
      currentPromotions: input.promotions,
    },
    eligibleAssignees: input.assignees,
    outputShape: {
      assigneeUserId: "string",
      effectiveDate: "YYYY-MM-DD",
      dueDate: "YYYY-MM-DD | null",
      cadence: "daily | weekly | monthly | quarterly | yearly | null",
      projectionPolicy: "hold | event_only | event_and_heroes",
      assignmentNotes: "string",
      rationale: "string",
    },
  });

  const response = await fetch(`${config.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: system }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: user }],
        },
      ],
    }),
  });

  if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
    throw new BabyAssignmentSuggestionProviderUnavailableError(
      `OpenAI suggestion request failed with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new BabyAssignmentSuggestionGenerationError(
      `OpenAI suggestion request failed with HTTP ${response.status}.`,
    );
  }

  const payload = await response.json();
  const text = extractOutputText(payload);
  if (!text) {
    throw new BabyAssignmentSuggestionGenerationError("The AI provider returned no usable text output.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = parseProviderJsonOutput(text);
  } catch {
    throw new BabyAssignmentSuggestionGenerationError("The AI provider returned non-JSON output.");
  }

  try {
    return {
      provider: "openai",
      model: config.model,
      suggestion: aiSuggestionResponseSchema.parse(parsedJson),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BabyAssignmentSuggestionGenerationError(
        "The AI provider returned a Baby assignment suggestion that did not match the expected contract.",
      );
    }
    throw error;
  }
}

export async function generateBabyAssignmentSuggestionDraftInput(adminUserId: string, sourceEntryId: number) {
  const context = await getSuggestionContext(adminUserId, sourceEntryId);

  const ai = await callOpenAIForSuggestion({
    sourceEntryName: context.sourceEntry.name,
    sourceNotes: context.sourceEntry.notes ?? null,
    sourceTags: Array.isArray(context.sourceEntry.tags) ? (context.sourceEntry.tags as string[]).map(String) : [],
    sourcePath: context.materialization?.sourcePath ?? null,
    sourceRecordKey: context.materialization?.sourceRecordKey ?? null,
    materializationMetadata:
      context.materialization?.metadata && typeof context.materialization.metadata === "object"
        ? (context.materialization.metadata as Record<string, unknown>)
        : null,
    promotions: context.promotions.map((promotion) => ({
      targetSurface: promotion.targetSurface,
      targetContainerKey: promotion.targetContainerKey,
    })),
    assignees: context.assignees,
  });

  const assignee = context.assignees.find((candidate) => candidate.id === ai.suggestion.assigneeUserId);
  if (!assignee) {
    throw new BabyAssignmentSuggestionGenerationError(
      "The AI provider selected an assignee outside the eligible account set.",
    );
  }

  if (!isValidDateString(ai.suggestion.effectiveDate) || (ai.suggestion.dueDate && !isValidDateString(ai.suggestion.dueDate))) {
    throw new BabyAssignmentSuggestionGenerationError(
      "The AI provider returned an invalid date format for the Baby assignment suggestion.",
    );
  }

  const proposedPayload = validateBabyKbAssignmentDraftCreateData({
    sourceEntryId: context.sourceEntry.id,
    assigneeUserId: ai.suggestion.assigneeUserId,
    effectiveDate: ai.suggestion.effectiveDate,
    dueDate: ai.suggestion.dueDate,
    cadence: ai.suggestion.cadence,
    projectionPolicy: ai.suggestion.projectionPolicy,
    assignmentNotes: ai.suggestion.assignmentNotes,
  });

  return {
    proposedPayload,
    metadata: {
      title: context.sourceEntry.name,
      summary: ai.suggestion.rationale,
      provenanceSource: "assistant_draft" as const,
      captureChannel: "assistant_dock" as const,
      rationale: ai.suggestion.rationale,
      createdBy: adminUserId,
      updatedBy: adminUserId,
      sourceExcerpt: context.sourceEntry.notes?.slice(0, 600) ?? null,
      sourcePayloadRef: context.materialization?.sourcePath ?? `baby-kb:${context.sourceEntry.id}`,
      suggestionProvider: ai.provider,
      suggestionModel: ai.model,
      sourceEntryId: context.sourceEntry.id,
      sourceEntryName: context.sourceEntry.name,
      suggestedAssigneeLabel: assignee.label,
    },
    reviewNotes: ai.suggestion.rationale,
    sourceRefs: [
      {
        sourceType: "existing_theta_object" as const,
        ref: `baby-kb:${context.sourceEntry.id}`,
        label: context.sourceEntry.name,
      },
    ],
  };
}

export async function assertBabyAssignmentSuggestionStillEligible(
  adminUserId: string,
  sourceEntryId: number,
  options?: {
    skipPendingDraftCheck?: boolean;
    excludeDraftId?: number | null;
  },
) {
  await getSuggestionContext(adminUserId, sourceEntryId, options);
}
