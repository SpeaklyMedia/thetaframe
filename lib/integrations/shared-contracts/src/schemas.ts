import { z } from "zod";
import {
  thetaApprovalRequiredSchema,
  thetaCaptureChannelSchema,
  thetaConfidenceSchema,
  thetaExternalProviderSchema,
  thetaIntegrationObjectTypeSchema,
  thetaLaneSchema,
  thetaProjectionStatusSchema,
  thetaProvenanceSourceSchema,
  thetaReminderChannelSchema,
  thetaReminderOwnerSchema,
  thetaReminderScheduleBasisSchema,
  thetaReviewStatusSchema,
  thetaSyncDirectionSchema,
} from "./enums";

export const thetaExternalLinkRefSchema = z.object({
  provider: thetaExternalProviderSchema,
  resourceType: z.string().min(1),
  externalId: z.string().min(1),
  calendarId: z.string().min(1).nullable().optional(),
  eventId: z.string().min(1).nullable().optional(),
  direction: thetaSyncDirectionSchema,
  projectionStatus: thetaProjectionStatusSchema,
  lastSyncedAt: z.string().datetime().nullable().optional(),
  lastRemoteRevision: z.string().min(1).nullable().optional(),
  lastLocalRevision: z.string().min(1).nullable().optional(),
  linkedLane: thetaLaneSchema.nullable().optional(),
  linkedThetaObjectId: z.string().min(1).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const thetaReminderPolicySchema = z.object({
  owner: thetaReminderOwnerSchema,
  channels: z.array(thetaReminderChannelSchema),
  scheduleBasis: thetaReminderScheduleBasisSchema,
  exportToCalendar: z.boolean(),
  quietHoursRespected: z.boolean(),
  snoozeAllowed: z.boolean(),
  notes: z.string().nullable().optional(),
});

export const thetaWorkspaceMoodColourStates = ["green", "yellow", "red", "blue", "purple"] as const;
export const thetaWorkspaceMoodLabels = [
  "calm/ready",
  "anxious/scattered",
  "overwhelmed",
  "low/flat",
  "creative/energized",
] as const;
export const thetaWorkspaceMoodSupportModes = [
  "steady",
  "reduce_choices",
  "recovery_first",
  "low_energy",
  "capture_then_choose",
] as const;
export const thetaWorkspaceMoodSources = ["user_mode", "daily_frame", "fallback"] as const;

export const thetaWorkspaceMoodContextSchema = z.object({
  colourState: z.enum(thetaWorkspaceMoodColourStates),
  label: z.enum(thetaWorkspaceMoodLabels),
  supportMode: z.enum(thetaWorkspaceMoodSupportModes),
  source: z.enum(thetaWorkspaceMoodSources),
});

export const thetaCoreIntegrationMetadataSchema = z.object({
  thetaObjectId: z.string().min(1),
  lane: thetaLaneSchema,
  objectType: thetaIntegrationObjectTypeSchema,
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  provenanceSource: thetaProvenanceSourceSchema,
  captureChannel: thetaCaptureChannelSchema,
  reviewStatus: thetaReviewStatusSchema,
  confidence: thetaConfidenceSchema.nullable().optional(),
  approvalRequired: thetaApprovalRequiredSchema,
  externalLinkRefs: z.array(thetaExternalLinkRefSchema).default([]),
  reminderPolicy: thetaReminderPolicySchema.optional(),
  sourcePayloadRef: z.string().nullable().optional(),
  sourcePayloadHash: z.string().nullable().optional(),
  sourceExcerpt: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  workspaceMoodContext: thetaWorkspaceMoodContextSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
}).passthrough();

export const thetaApprovalPolicyRuleSchema = z.object({
  risk: z.enum(["low", "medium", "high", "critical"]),
  approvalRequired: thetaApprovalRequiredSchema,
  examples: z.array(z.string()),
  neverAutoCommit: z.boolean().optional(),
});

export type ThetaExternalLinkRef = z.infer<typeof thetaExternalLinkRefSchema>;
export type ThetaReminderPolicy = z.infer<typeof thetaReminderPolicySchema>;
export type ThetaWorkspaceMoodColourState = (typeof thetaWorkspaceMoodColourStates)[number];
export type ThetaWorkspaceMoodSource = (typeof thetaWorkspaceMoodSources)[number];
export type ThetaWorkspaceMoodContext = z.infer<typeof thetaWorkspaceMoodContextSchema>;
export type ThetaCoreIntegrationMetadata = z.infer<typeof thetaCoreIntegrationMetadataSchema>;
export type ThetaApprovalPolicyRule = z.infer<typeof thetaApprovalPolicyRuleSchema>;

const thetaWorkspaceMoodContextByColour: Record<
  ThetaWorkspaceMoodColourState,
  Pick<ThetaWorkspaceMoodContext, "label" | "supportMode">
> = {
  green: { label: "calm/ready", supportMode: "steady" },
  yellow: { label: "anxious/scattered", supportMode: "reduce_choices" },
  red: { label: "overwhelmed", supportMode: "recovery_first" },
  blue: { label: "low/flat", supportMode: "low_energy" },
  purple: { label: "creative/energized", supportMode: "capture_then_choose" },
};

export function buildThetaWorkspaceMoodContext(args: {
  colourState: ThetaWorkspaceMoodColourState;
  source: ThetaWorkspaceMoodSource;
}): ThetaWorkspaceMoodContext {
  return thetaWorkspaceMoodContextSchema.parse({
    colourState: args.colourState,
    ...thetaWorkspaceMoodContextByColour[args.colourState],
    source: args.source,
  });
}
