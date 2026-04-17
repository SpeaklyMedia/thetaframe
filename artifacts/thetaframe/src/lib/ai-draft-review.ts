import type { AIDraft, ListAiDraftsParams } from "@workspace/api-client-react";
import { buildSourceRefLabel, resolveAIDraftDescriptor } from "@/lib/ai-draft-mapping";

export type LifeLedgerDraftSurfaceKey = "people" | "events" | "financial" | "subscriptions" | "travel";

type AIDraftReviewPanelCopy = {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
};

const DRAFT_KIND_LABELS: Record<AIDraft["draftKind"], string> = {
  daily_frame_draft: "Daily frame draft",
  weekly_frame_draft: "Weekly rhythm draft",
  vision_alignment_draft: "Vision alignment draft",
  life_ledger_classification_draft: "Life Ledger classification draft",
  reach_file_summary: "REACH file summary",
  bizdev_followup_draft: "BizDev follow-up draft",
  baby_kb_promotion_draft: "Baby KB promotion draft",
  baby_kb_assignment_draft: "Baby KB assignment suggestion",
};

const CONFIDENCE_MODE_LABELS: Record<AIDraft["confidenceMode"], string> = {
  suggest_only: "Suggest only",
  one_tap_approve: "One tap approve",
  auto_draft: "Auto draft",
};

const REVIEW_STATE_LABELS: Record<AIDraft["reviewState"], string> = {
  draft: "Draft",
  needs_review: "Needs review",
  approval_gated: "Approval gated",
  approved: "Approved",
  applied: "Applied",
  rejected: "Rejected",
};

const dailyReviewPanelCopy: AIDraftReviewPanelCopy = {
  title: "Daily AI review",
  emptyTitle: "No Daily drafts yet",
  emptyDescription:
    "Persisted Daily drafts will appear here for review without changing your live Daily frame until a later apply flow exists.",
};

const weeklyReviewPanelCopy: AIDraftReviewPanelCopy = {
  title: "Weekly AI review",
  emptyTitle: "No Weekly drafts yet",
  emptyDescription:
    "Weekly rhythm drafts will appear here as stored review objects so theme, steps, and recovery suggestions stay inspectable before any commit flow is added.",
};

const visionReviewPanelCopy: AIDraftReviewPanelCopy = {
  title: "Vision AI review",
  emptyTitle: "No Vision drafts yet",
  emptyDescription:
    "Long-horizon drafts will appear here for explicit review before they can affect your active Vision frame.",
};

const reachReviewPanelCopy: AIDraftReviewPanelCopy = {
  title: "REACH AI review",
  emptyTitle: "No REACH drafts yet",
  emptyDescription:
    "Stored file summaries and routing drafts will appear here so REACH can surface reviewable AI output without committing anything downstream yet.",
};

const babyAssignmentReviewPanelCopy: AIDraftReviewPanelCopy = {
  title: "Baby KB AI assignment review",
  emptyTitle: "No Baby assignment suggestions yet",
  emptyDescription:
    "Single-entry AI assignment suggestions will appear here for explicit admin review before they can create a real Baby assignment.",
};

const lifeLedgerReviewPanelCopy: Record<LifeLedgerDraftSurfaceKey, AIDraftReviewPanelCopy> = {
  people: {
    title: "Life Ledger people review",
    emptyTitle: "No people drafts yet",
    emptyDescription:
      "Structured people-entry drafts will appear here for review before they become durable records.",
  },
  events: {
    title: "Life Ledger events review",
    emptyTitle: "No event drafts yet",
    emptyDescription:
      "Appointments and obligation drafts will appear here so they can be reviewed before they affect your record of dated commitments.",
  },
  financial: {
    title: "Life Ledger financial review",
    emptyTitle: "No financial drafts yet",
    emptyDescription:
      "Financial obligation drafts will appear here with explicit review preserved before anything touches your durable money records.",
  },
  subscriptions: {
    title: "Life Ledger subscriptions review",
    emptyTitle: "No subscription drafts yet",
    emptyDescription:
      "Recurring-service drafts will appear here as stored review objects instead of jumping straight into your ledger.",
  },
  travel: {
    title: "Life Ledger travel review",
    emptyTitle: "No travel drafts yet",
    emptyDescription:
      "Travel-entry drafts will appear here for review so plans and bookings can be structured without silent commits.",
  },
};

export const dailyAIDraftListParams: ListAiDraftsParams = {
  lane: "daily",
  draftKind: "daily_frame_draft",
  limit: 5,
};

export const weeklyAIDraftListParams: ListAiDraftsParams = {
  lane: "weekly",
  draftKind: "weekly_frame_draft",
  limit: 5,
};

export const visionAIDraftListParams: ListAiDraftsParams = {
  lane: "vision",
  draftKind: "vision_alignment_draft",
  limit: 5,
};

export const reachAIDraftListParams: ListAiDraftsParams = {
  lane: "reach",
  draftKind: "reach_file_summary",
  limit: 5,
};

export const babyAssignmentAIDraftListParams: ListAiDraftsParams = {
  lane: "baby-kb",
  draftKind: "baby_kb_assignment_draft",
  limit: 5,
};

export function getLifeLedgerAIDraftListParams(activeTab: LifeLedgerDraftSurfaceKey): ListAiDraftsParams {
  return {
    lane: "life-ledger",
    draftKind: "life_ledger_classification_draft",
    targetSurfaceKey: activeTab,
    limit: 5,
  };
}

export function getDailyAIDraftReviewPanelCopy(): AIDraftReviewPanelCopy {
  return dailyReviewPanelCopy;
}

export function getWeeklyAIDraftReviewPanelCopy(): AIDraftReviewPanelCopy {
  return weeklyReviewPanelCopy;
}

export function getVisionAIDraftReviewPanelCopy(): AIDraftReviewPanelCopy {
  return visionReviewPanelCopy;
}

export function getReachAIDraftReviewPanelCopy(): AIDraftReviewPanelCopy {
  return reachReviewPanelCopy;
}

export function getBabyAssignmentAIDraftReviewPanelCopy(): AIDraftReviewPanelCopy {
  return babyAssignmentReviewPanelCopy;
}

export function getLifeLedgerAIDraftReviewPanelCopy(activeTab: LifeLedgerDraftSurfaceKey): AIDraftReviewPanelCopy {
  return lifeLedgerReviewPanelCopy[activeTab];
}

function getStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getFirstArrayText(
  value: unknown,
  preferredKeys: readonly string[],
): string | null {
  if (!Array.isArray(value)) return null;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    for (const key of preferredKeys) {
      const candidate = getStringValue(record[key]);
      if (candidate) return candidate;
    }
  }

  return null;
}

export function getAIDraftPayloadSummary(draft: AIDraft): string {
  const payload = draft.proposedPayload as Record<string, unknown>;

  switch (draft.draftKind) {
    case "daily_frame_draft":
      return (
        getStringValue(payload.microWin) ??
        getFirstArrayText(payload.tierA, ["text"]) ??
        getFirstArrayText(payload.timeBlocks, ["action", "startTime"]) ??
        "Drafted Daily structure is ready for review."
      );
    case "weekly_frame_draft":
      return (
        getStringValue(payload.theme) ??
        getFirstArrayText(payload.steps, ["text"]) ??
        getFirstArrayText(payload.nonNegotiables, ["text"]) ??
        "Drafted Weekly rhythm is ready for review."
      );
    case "vision_alignment_draft":
      return (
        getFirstArrayText(payload.goals, ["text"]) ??
        getFirstArrayText(payload.nextSteps, ["text"]) ??
        "Drafted Vision alignment is ready for review."
      );
    case "life_ledger_classification_draft":
      return (
        getStringValue(payload.name) ??
        getStringValue(payload.dueDate) ??
        getStringValue(payload.notes) ??
        "Drafted Life Ledger entry is ready for review."
      );
    case "reach_file_summary":
      return (
        getStringValue(payload.title) ??
        getStringValue(payload.summary) ??
        draft.sourceRefs.map(buildSourceRefLabel)[0] ??
        "Drafted REACH summary is ready for review."
      );
    case "baby_kb_assignment_draft":
      return (
        getStringValue((draft.metadata as unknown as Record<string, unknown> | undefined)?.suggestedAssigneeLabel) ??
        getStringValue(payload.assignmentNotes) ??
        getStringValue((draft.metadata as unknown as Record<string, unknown> | undefined)?.sourceEntryName) ??
        "Drafted Baby KB assignment suggestion is ready for review."
      );
    default:
      return "Stored AI draft is ready for review.";
  }
}

export function getAIDraftKindLabel(draft: AIDraft): string {
  return DRAFT_KIND_LABELS[draft.draftKind];
}

export function getAIDraftReviewStateLabel(draft: AIDraft): string {
  return REVIEW_STATE_LABELS[draft.reviewState];
}

export function getAIDraftConfidenceModeLabel(draft: AIDraft): string {
  return CONFIDENCE_MODE_LABELS[draft.confidenceMode];
}

export function getAIDraftTargetSurfaceLabel(draft: AIDraft): string {
  return resolveAIDraftDescriptor(draft.draftKind).targetSurfaceLabel;
}

export function getAIDraftApprovalBadgeCopy(draft: AIDraft): string {
  return resolveAIDraftDescriptor(draft.draftKind).approvalBadgeCopy;
}

export function getAIDraftCommitPolicyLabel(draft: AIDraft): string {
  return resolveAIDraftDescriptor(draft.draftKind).commitPolicyLabel;
}

export function getAIDraftSourceRefChips(draft: AIDraft): string[] {
  const base = draft.sourceRefs.slice(0, 2).map(buildSourceRefLabel);
  const remainder = draft.sourceRefs.length - base.length;

  if (remainder > 0) {
    base.push(`+${remainder} more`);
  }

  return base;
}
