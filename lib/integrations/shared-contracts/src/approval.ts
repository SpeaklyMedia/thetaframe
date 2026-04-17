import type { ThetaApprovalRequired, ThetaMutationRisk } from "./enums";
import type { ThetaApprovalPolicyRule } from "./schemas";

export const thetaApprovalPolicyMatrix: readonly ThetaApprovalPolicyRule[] = [
  {
    risk: "low",
    approvalRequired: "one_tap",
    examples: ["daily draft refinement", "reach file summary", "weekly compression draft"],
  },
  {
    risk: "medium",
    approvalRequired: "explicit_review",
    examples: ["life ledger entry classification", "bizdev follow-up suggestion", "calendar import merge choice"],
  },
  {
    risk: "high",
    approvalRequired: "two_step_review",
    examples: ["external calendar export", "money/obligation changes", "durable record edits", "Baby KB promotion"],
  },
  {
    risk: "critical",
    approvalRequired: "two_step_review",
    neverAutoCommit: true,
    examples: ["commitments affecting external parties", "deletion/destructive edits", "silent schedule changes"],
  },
] as const;

const approvalByRisk: Readonly<Record<ThetaMutationRisk, ThetaApprovalRequired>> = {
  low: "one_tap",
  medium: "explicit_review",
  high: "two_step_review",
  critical: "two_step_review",
};

export function getApprovalRequirementForRisk(risk: ThetaMutationRisk): ThetaApprovalRequired {
  return approvalByRisk[risk];
}
