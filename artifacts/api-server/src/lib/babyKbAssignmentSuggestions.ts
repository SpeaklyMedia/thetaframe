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
import {
  getOpenAIConfig,
  OpenAIGenerationError,
  OpenAIProviderUnavailableError,
  requestOpenAIJson,
} from "./openAiProvider.js";

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
export class BabyAssignmentSuggestionProviderUnavailableError extends OpenAIProviderUnavailableError {}
export class BabyAssignmentSuggestionGenerationError extends OpenAIGenerationError {}

function hasVerificationConflict(tags: unknown) {
  const list = Array.isArray(tags) ? tags.map((value) => String(value)) : [];
  return list.includes("Needs verification") || !list.includes("Verified personal truth");
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
  let config;
  try {
    config = getOpenAIConfig("Baby assignment suggestions");
  } catch (error) {
    if (error instanceof OpenAIProviderUnavailableError) {
      throw new BabyAssignmentSuggestionProviderUnavailableError(error.message);
    }
    throw error;
  }
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

  let parsedJson: unknown;
  try {
    parsedJson = await requestOpenAIJson({
      config,
      system,
      user,
      featureLabel: "Baby assignment suggestion",
    });
  } catch (error) {
    if (error instanceof OpenAIProviderUnavailableError) {
      throw new BabyAssignmentSuggestionProviderUnavailableError(error.message);
    }
    if (error instanceof OpenAIGenerationError) {
      throw new BabyAssignmentSuggestionGenerationError(error.message);
    }
    throw error;
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
