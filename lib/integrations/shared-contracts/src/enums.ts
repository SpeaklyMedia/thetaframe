import { z } from "zod";

export const thetaLanes = [
  "daily",
  "weekly",
  "vision",
  "bizdev",
  "life-ledger",
  "baby-kb",
  "reach",
  "admin",
] as const;

export const thetaIntegrationObjectTypes = [
  "daily-frame",
  "weekly-frame",
  "vision-frame",
  "bizdev-item",
  "life-ledger-entry",
  "baby-kb-item",
  "baby-assignment",
  "reach-file",
  "admin-mutation",
  "calendar-link",
  "reminder-link",
  "ai-draft",
  "notification",
  "integration-job",
] as const;

export const thetaProvenanceSources = [
  "user_manual",
  "google_calendar_import",
  "mobile_share_sheet",
  "mobile_shortcut",
  "notification_action",
  "voice_transcript",
  "image_or_screenshot",
  "pasted_text",
  "reach_upload",
  "baby_kb_materialization",
  "assistant_draft",
  "system_sync",
] as const;

export const thetaCaptureChannels = [
  "web_form",
  "web_inline_edit",
  "assistant_dock",
  "desktop_upload",
  "ios_share_extension",
  "ios_shortcut",
  "ios_widget",
  "ios_notification",
  "android_share_intent",
  "android_shortcut",
  "android_widget",
  "android_notification",
  "background_sync",
  "calendar_watch",
] as const;

export const thetaReviewStatuses = [
  "raw",
  "draft",
  "needs_review",
  "approval_gated",
  "approved",
  "applied",
  "rejected",
  "synced",
  "conflicted",
  "archived",
] as const;

export const thetaConfidenceLevels = ["low", "medium", "high"] as const;

export const thetaApprovalRequirements = [
  "none",
  "one_tap",
  "explicit_review",
  "two_step_review",
] as const;

export const thetaSyncDirections = [
  "import_only",
  "export_only",
  "bidirectional_linked",
] as const;

export const thetaProjectionStatuses = [
  "none",
  "proposed",
  "queued",
  "linked",
  "synced",
  "conflicted",
  "stale",
  "disabled",
] as const;

export const thetaReminderOwners = [
  "thetaframe",
  "google_calendar",
  "dual_but_scoped",
] as const;

export const thetaMutationRisks = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const thetaExternalProviders = [
  "google_calendar",
  "ios_local_notification",
  "android_notification",
  "ios_widget",
  "android_widget",
  "ai_run",
  "reach_object",
] as const;

export const thetaReminderChannels = [
  "in_app",
  "push",
  "local_notification",
  "google_calendar_alarm",
  "email",
] as const;

export const thetaReminderScheduleBases = [
  "time_exact",
  "date_only",
  "semantic_lane_prompt",
  "none",
] as const;

export const thetaLaneSchema = z.enum(thetaLanes);
export const thetaIntegrationObjectTypeSchema = z.enum(thetaIntegrationObjectTypes);
export const thetaProvenanceSourceSchema = z.enum(thetaProvenanceSources);
export const thetaCaptureChannelSchema = z.enum(thetaCaptureChannels);
export const thetaReviewStatusSchema = z.enum(thetaReviewStatuses);
export const thetaConfidenceSchema = z.enum(thetaConfidenceLevels);
export const thetaApprovalRequiredSchema = z.enum(thetaApprovalRequirements);
export const thetaSyncDirectionSchema = z.enum(thetaSyncDirections);
export const thetaProjectionStatusSchema = z.enum(thetaProjectionStatuses);
export const thetaReminderOwnerSchema = z.enum(thetaReminderOwners);
export const thetaMutationRiskSchema = z.enum(thetaMutationRisks);
export const thetaExternalProviderSchema = z.enum(thetaExternalProviders);
export const thetaReminderChannelSchema = z.enum(thetaReminderChannels);
export const thetaReminderScheduleBasisSchema = z.enum(thetaReminderScheduleBases);

export type ThetaLane = (typeof thetaLanes)[number];
export type ThetaIntegrationObjectType = (typeof thetaIntegrationObjectTypes)[number];
export type ThetaProvenanceSource = (typeof thetaProvenanceSources)[number];
export type ThetaCaptureChannel = (typeof thetaCaptureChannels)[number];
export type ThetaReviewStatus = (typeof thetaReviewStatuses)[number];
export type ThetaConfidence = (typeof thetaConfidenceLevels)[number];
export type ThetaApprovalRequired = (typeof thetaApprovalRequirements)[number];
export type ThetaSyncDirection = (typeof thetaSyncDirections)[number];
export type ThetaProjectionStatus = (typeof thetaProjectionStatuses)[number];
export type ThetaReminderOwner = (typeof thetaReminderOwners)[number];
export type ThetaMutationRisk = (typeof thetaMutationRisks)[number];
export type ThetaExternalProvider = (typeof thetaExternalProviders)[number];
export type ThetaReminderChannel = (typeof thetaReminderChannels)[number];
export type ThetaReminderScheduleBasis = (typeof thetaReminderScheduleBases)[number];
