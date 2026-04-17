import {
  getApprovalRequirementForRisk,
  thetaAIActionDefinitions,
  thetaAIDraftApprovalRequirements,
  type ThetaAIDraftKind,
  type ThetaAIDraftSourceRef,
} from "@workspace/integration-contracts";

type AIDraftDescriptor = {
  draftKind: ThetaAIDraftKind;
  route: string;
  targetSurfaceLabel: string;
  approvalBadgeCopy: string;
  provenanceChipCopy: string;
  commitPolicyLabel: string;
};

const SURFACE_LABELS: Record<ThetaAIDraftKind, string> = {
  daily_frame_draft: "Daily Frame",
  weekly_frame_draft: "Weekly Rhythm",
  vision_alignment_draft: "Vision Tracker",
  life_ledger_classification_draft: "Life Ledger",
  reach_file_summary: "REACH",
  bizdev_followup_draft: "BizDev",
  baby_kb_promotion_draft: "Baby KB",
  baby_kb_assignment_draft: "Baby KB",
};

const ROUTES: Record<ThetaAIDraftKind, string> = {
  daily_frame_draft: "/daily",
  weekly_frame_draft: "/weekly",
  vision_alignment_draft: "/vision",
  life_ledger_classification_draft: "/life-ledger",
  reach_file_summary: "/reach",
  bizdev_followup_draft: "/bizdev",
  baby_kb_promotion_draft: "/life-ledger?tab=baby",
  baby_kb_assignment_draft: "/life-ledger?tab=baby",
};

const APPROVAL_COPY: Record<(typeof thetaAIDraftApprovalRequirements)[ThetaAIDraftKind], string> = {
  none: "Approval: none",
  one_tap: "Approval: one tap",
  explicit_review: "Approval: explicit review",
  two_step_review: "Approval: two-step review",
};

export function resolveAIDraftDescriptor(draftKind: ThetaAIDraftKind): AIDraftDescriptor {
  const action = thetaAIActionDefinitions[draftKind];
  const approvalRequired = thetaAIDraftApprovalRequirements[draftKind];

  return {
    draftKind,
    route: ROUTES[draftKind],
    targetSurfaceLabel: SURFACE_LABELS[draftKind],
    approvalBadgeCopy: APPROVAL_COPY[approvalRequired],
    provenanceChipCopy: "Provenance required",
    commitPolicyLabel: `Commit policy: ${action.commitTool}`,
  };
}

export function getApprovalBadgeCopyForRisk(draftKind: ThetaAIDraftKind): string {
  const risk = thetaAIActionDefinitions[draftKind].mutationRisk;
  return APPROVAL_COPY[getApprovalRequirementForRisk(risk)];
}

export function buildSourceRefLabel(sourceRef: ThetaAIDraftSourceRef): string {
  return sourceRef.label ? `${sourceRef.sourceType}: ${sourceRef.label}` : `Source: ${sourceRef.sourceType}`;
}
