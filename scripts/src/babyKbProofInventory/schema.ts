export const proofSourceClasses = [
  "verified_local_proof",
  "candidate_source",
  "caregiver_observation",
  "draft_or_unverified",
  "rejected_or_retired",
] as const;

export const proofReviewStates = [
  "candidate",
  "needs_redaction",
  "verified",
  "rejected",
  "retired",
] as const;

export const proofStorageBoundaries = [
  "public_repo_contract",
  "private_local_source",
  "local_runtime_state",
  "private_object_storage",
  "production_user_data",
] as const;

export const proofRedactionStatuses = [
  "not_needed",
  "pending",
  "required",
  "complete",
  "not_safe_to_store",
] as const;

export type ProofSourceClass = (typeof proofSourceClasses)[number];
export type ProofReviewState = (typeof proofReviewStates)[number];
export type ProofStorageBoundary = (typeof proofStorageBoundaries)[number];
export type ProofRedactionStatus = (typeof proofRedactionStatuses)[number];

export interface ProofInventoryEntry {
  sourceId: string;
  title: string;
  sourceClass: ProofSourceClass;
  reviewState: ProofReviewState;
  storageBoundary: ProofStorageBoundary;
  containsPrivateData: boolean;
  redactionStatus: ProofRedactionStatus;
  citationLabel?: string;
  sourcePath?: string;
  sourceHash?: string;
  admittedBy?: string;
  admittedAt?: string;
  reviewedAt?: string;
  expiresAt?: string;
  notes?: string;
  answerEligible?: boolean;
}

export interface ProofInventory {
  version: number;
  generatedAt: string;
  privateRootClass: "local_private";
  entries: ProofInventoryEntry[];
}

export interface ProofInventoryValidationError {
  sourceId?: string;
  field?: string;
  message: string;
}

export interface ProofInventorySummary {
  totalEntries: number;
  bySourceClass: Record<string, number>;
  byReviewState: Record<string, number>;
  byRedactionStatus: Record<string, number>;
  answerEligibleCount: number;
  blockedEntryIds: string[];
}

export interface SafeProofInventoryReport {
  version: number;
  generatedAt: string;
  privateRootClass: "local_private";
  reportGeneratedAt: string;
  summary: ProofInventorySummary;
  entries: Array<{
    sourceId: string;
    sourceClass: ProofSourceClass;
    reviewState: ProofReviewState;
    storageBoundary: ProofStorageBoundary;
    redactionStatus: ProofRedactionStatus;
    containsPrivateData: boolean;
    citationLabel?: string;
    answerEligible: boolean;
  }>;
}

export function isAllowedValue<T extends readonly string[]>(
  allowedValues: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && allowedValues.includes(value);
}
