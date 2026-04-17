import { z } from "zod";
import { getApprovalRequirementForRisk } from "./approval";
import {
  thetaConfidenceSchema,
  thetaIntegrationObjectTypeSchema,
  thetaLaneSchema,
  thetaMutationRiskSchema,
} from "./enums";
import { thetaCoreIntegrationMetadataSchema } from "./schemas";

export const thetaAIDraftKinds = [
  "daily_frame_draft",
  "weekly_frame_draft",
  "vision_alignment_draft",
  "life_ledger_classification_draft",
  "reach_file_summary",
  "bizdev_followup_draft",
  "baby_kb_promotion_draft",
  "baby_kb_assignment_draft",
] as const;

export const thetaAIIntakeChannels = [
  "typed_text",
  "voice_transcript",
  "screenshot_or_photo",
  "pasted_message_or_email",
  "share_sheet_capture",
  "calendar_import",
  "reach_upload",
] as const;

export const thetaAIConfidenceModes = [
  "suggest_only",
  "one_tap_approve",
  "auto_draft",
] as const;

export const thetaAIDraftReviewStates = [
  "draft",
  "needs_review",
  "approval_gated",
  "approved",
  "applied",
  "rejected",
] as const;

export const thetaAIDraftKindSchema = z.enum(thetaAIDraftKinds);
export const thetaAIIntakeChannelSchema = z.enum(thetaAIIntakeChannels);
export const thetaAIConfidenceModeSchema = z.enum(thetaAIConfidenceModes);
export const thetaAIDraftReviewStateSchema = z.enum(thetaAIDraftReviewStates);

export type ThetaAIDraftKind = (typeof thetaAIDraftKinds)[number];
export type ThetaAIIntakeChannel = (typeof thetaAIIntakeChannels)[number];
export type ThetaAIConfidenceMode = (typeof thetaAIConfidenceModes)[number];
export type ThetaAIDraftReviewState = (typeof thetaAIDraftReviewStates)[number];

export const thetaAIActionDefinitionSchema = z.object({
  draftKind: thetaAIDraftKindSchema,
  targetLane: thetaLaneSchema,
  targetObjectType: thetaIntegrationObjectTypeSchema,
  commitTool: z.string().min(1),
  mutationRisk: thetaMutationRiskSchema,
  allowedConfidenceModes: z.array(thetaAIConfidenceModeSchema).min(1),
});

export type ThetaAIActionDefinition = z.infer<typeof thetaAIActionDefinitionSchema>;

export const thetaAIDraftSourceRefSchema = z.object({
  sourceType: z.enum([
    "raw_input",
    "reach_file",
    "calendar_event",
    "mobile_capture",
    "message_excerpt",
    "image_capture",
    "existing_theta_object",
  ]),
  ref: z.string().min(1),
  label: z.string().min(1).nullable().optional(),
});

export const thetaAIDraftEnvelopeSchema = z.object({
  metadata: thetaCoreIntegrationMetadataSchema.extend({
    objectType: z.literal("ai-draft"),
    confidence: thetaConfidenceSchema.nullable().optional(),
  }),
  draftKind: thetaAIDraftKindSchema,
  targetLane: thetaLaneSchema,
  targetSurfaceKey: z.string().min(1).nullable().optional(),
  targetObjectType: thetaIntegrationObjectTypeSchema,
  mutationRisk: thetaMutationRiskSchema,
  confidenceMode: thetaAIConfidenceModeSchema,
  commitTool: z.string().min(1),
  inputChannels: z.array(thetaAIIntakeChannelSchema).min(1),
  proposedPayload: z.record(z.string(), z.unknown()),
  sourceRefs: z.array(thetaAIDraftSourceRefSchema).min(1),
  reviewNotes: z.string().nullable().optional(),
});

export type ThetaAIDraftSourceRef = z.infer<typeof thetaAIDraftSourceRefSchema>;
export type ThetaAIDraftEnvelope = z.infer<typeof thetaAIDraftEnvelopeSchema>;

export const thetaCreateAIDraftBodySchema = thetaAIDraftEnvelopeSchema;
export type ThetaCreateAIDraftBody = z.infer<typeof thetaCreateAIDraftBodySchema>;

export const thetaUpdateAIDraftReviewStateBodySchema = z.object({
  reviewState: thetaAIDraftReviewStateSchema,
  reviewNotes: z.string().nullable().optional(),
});
export type ThetaUpdateAIDraftReviewStateBody = z.infer<typeof thetaUpdateAIDraftReviewStateBodySchema>;

const thetaDateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const thetaDailyFrameTierTaskSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  completed: z.boolean(),
});

const thetaDailyFrameTimeBlockSchema = z.object({
  id: z.string().min(1),
  startTime: z.string(),
  action: z.string(),
});

const thetaAppliedDailyFrameSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  date: thetaDateStringSchema,
  colourState: z.enum(["green", "yellow", "red", "blue", "purple"]),
  tierA: z.array(thetaDailyFrameTierTaskSchema),
  tierB: z.array(thetaDailyFrameTierTaskSchema),
  timeBlocks: z.array(thetaDailyFrameTimeBlockSchema),
  microWin: z.string().nullable().optional(),
  skipProtocolUsed: z.boolean(),
  skipProtocolChoice: z.enum(["micro-win", "intentional-recovery"]).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const thetaWeeklyFrameStepSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  emoji: z.string().nullable().optional(),
});

const thetaAppliedWeeklyFrameSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  weekStart: thetaDateStringSchema,
  theme: z.string().nullable().optional(),
  steps: z.array(thetaWeeklyFrameStepSchema),
  nonNegotiables: z.array(thetaWeeklyFrameStepSchema),
  recoveryPlan: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const thetaVisionGoalSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  emoji: z.string().nullable().optional(),
});

const thetaAppliedVisionFrameSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  goals: z.array(thetaVisionGoalSchema),
  nextSteps: z.array(thetaVisionGoalSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const thetaAppliedReachFileSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  name: z.string().min(1),
  fileType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nullable().optional(),
  objectPath: z.string().min(1),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const thetaAppliedLifeLedgerEntrySchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  tab: z.enum(["people", "events", "financial", "subscriptions", "travel"]),
  name: z.string().min(1),
  tags: z.array(z.string()),
  impactLevel: z.enum(["low", "medium", "high"]).nullable().optional(),
  reviewWindow: z.enum(["annual", "quarterly", "monthly", "situational"]).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  isEssential: z.boolean().nullable().optional(),
  billingCycle: z.enum(["monthly", "annual"]).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const thetaAppliedBabyKbAssignmentSchema = z.object({
  id: z.number().int().positive(),
  sourceEntryId: z.number().int().positive(),
  sourceMaterializationId: z.number().int().positive().nullable().optional(),
  assigneeUserId: z.string().min(1),
  lifecycleState: z.enum(["captured", "verified", "assigned", "scheduled", "due_soon", "in_motion", "completed", "superseded"]),
  effectiveLifecycleState: z.enum(["captured", "verified", "assigned", "scheduled", "due_soon", "in_motion", "completed", "superseded"]),
  effectiveDate: thetaDateStringSchema,
  dueDate: z.string().nullable().optional(),
  cadence: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).nullable().optional(),
  projectionPolicy: z.enum(["hold", "event_only", "event_and_heroes"]),
  assignmentNotes: z.string().nullable().optional(),
  reminderPolicy: z.record(z.string(), z.unknown()),
  projectedEventId: z.number().int().positive().nullable().optional(),
  createdBy: z.string().min(1),
  updatedBy: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  supersededAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  sourceEntryName: z.string().nullable().optional(),
  sourceEntryNotes: z.string().nullable().optional(),
  sourceTags: z.unknown().optional(),
  sourcePath: z.string().nullable().optional(),
  sourceRecordKey: z.string().nullable().optional(),
});

export const thetaApplyAIDraftBodySchema = z.object({
  date: thetaDateStringSchema.optional(),
  weekStart: thetaDateStringSchema.optional(),
  reachFileId: z.number().int().positive().optional(),
});
export type ThetaApplyAIDraftBody = z.infer<typeof thetaApplyAIDraftBodySchema>;

export const thetaApplyAIDraftResponseSchema = z.object({
  draft: z.lazy(() => thetaAIDraftRecordSchema),
  dailyFrame: thetaAppliedDailyFrameSchema.optional(),
  weeklyFrame: thetaAppliedWeeklyFrameSchema.optional(),
  visionFrame: thetaAppliedVisionFrameSchema.optional(),
  reachFile: thetaAppliedReachFileSchema.optional(),
  lifeLedgerEntry: thetaAppliedLifeLedgerEntrySchema.optional(),
  babyAssignment: thetaAppliedBabyKbAssignmentSchema.optional(),
});
export type ThetaApplyAIDraftResponse = z.infer<typeof thetaApplyAIDraftResponseSchema>;

export const thetaAIDraftRecordSchema = thetaAIDraftEnvelopeSchema.extend({
  id: z.number().int().positive(),
  thetaObjectId: z.string().min(1),
  userId: z.string().min(1),
  approvalRequired: z.enum(["none", "one_tap", "explicit_review", "two_step_review"]),
  reviewState: thetaAIDraftReviewStateSchema,
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  appliedAt: z.string().nullable(),
  appliedBy: z.string().nullable(),
  appliedTargetRef: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ThetaAIDraftRecord = z.infer<typeof thetaAIDraftRecordSchema>;

export const thetaAIActionDefinitions: Readonly<Record<ThetaAIDraftKind, ThetaAIActionDefinition>> = {
  daily_frame_draft: {
    draftKind: "daily_frame_draft",
    targetLane: "daily",
    targetObjectType: "daily-frame",
    commitTool: "upsertDailyFrame",
    mutationRisk: "low",
    allowedConfidenceModes: ["suggest_only", "one_tap_approve"],
  },
  weekly_frame_draft: {
    draftKind: "weekly_frame_draft",
    targetLane: "weekly",
    targetObjectType: "weekly-frame",
    commitTool: "upsertWeeklyFrame",
    mutationRisk: "low",
    allowedConfidenceModes: ["suggest_only", "one_tap_approve"],
  },
  vision_alignment_draft: {
    draftKind: "vision_alignment_draft",
    targetLane: "vision",
    targetObjectType: "vision-frame",
    commitTool: "upsertVisionFrame",
    mutationRisk: "medium",
    allowedConfidenceModes: ["suggest_only", "one_tap_approve"],
  },
  life_ledger_classification_draft: {
    draftKind: "life_ledger_classification_draft",
    targetLane: "life-ledger",
    targetObjectType: "life-ledger-entry",
    commitTool: "createLifeLedgerEntry",
    mutationRisk: "medium",
    allowedConfidenceModes: ["suggest_only", "one_tap_approve"],
  },
  reach_file_summary: {
    draftKind: "reach_file_summary",
    targetLane: "reach",
    targetObjectType: "reach-file",
    commitTool: "optional_metadata_update_only",
    mutationRisk: "low",
    allowedConfidenceModes: ["suggest_only", "one_tap_approve", "auto_draft"],
  },
  bizdev_followup_draft: {
    draftKind: "bizdev_followup_draft",
    targetLane: "bizdev",
    targetObjectType: "bizdev-item",
    commitTool: "updateBizdevBrand",
    mutationRisk: "medium",
    allowedConfidenceModes: ["suggest_only", "one_tap_approve"],
  },
  baby_kb_promotion_draft: {
    draftKind: "baby_kb_promotion_draft",
    targetLane: "baby-kb",
    targetObjectType: "baby-kb-item",
    commitTool: "promoteBabyKbEntry",
    mutationRisk: "high",
    allowedConfidenceModes: ["suggest_only"],
  },
  baby_kb_assignment_draft: {
    draftKind: "baby_kb_assignment_draft",
    targetLane: "baby-kb",
    targetObjectType: "baby-assignment",
    commitTool: "createBabyKbAssignment",
    mutationRisk: "high",
    allowedConfidenceModes: ["suggest_only"],
  },
};

export const thetaAIDraftApprovalRequirements: Readonly<Record<ThetaAIDraftKind, ReturnType<typeof getApprovalRequirementForRisk>>> =
  Object.fromEntries(
    Object.entries(thetaAIActionDefinitions).map(([draftKind, definition]) => [
      draftKind,
      getApprovalRequirementForRisk(definition.mutationRisk),
    ]),
  ) as Readonly<Record<ThetaAIDraftKind, ReturnType<typeof getApprovalRequirementForRisk>>>;

export function getInitialAIDraftReviewState(draftKind: ThetaAIDraftKind): ThetaAIDraftReviewState {
  const approvalRequired = thetaAIDraftApprovalRequirements[draftKind];

  if (approvalRequired === "one_tap") {
    return "needs_review";
  }

  if (approvalRequired === "explicit_review" || approvalRequired === "two_step_review") {
    return "approval_gated";
  }

  return "draft";
}
