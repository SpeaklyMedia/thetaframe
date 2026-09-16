import path from "node:path";
import {
  type ProofInventory,
  type ProofInventoryEntry,
  type ProofInventorySummary,
  type ProofInventoryValidationError,
  type SafeProofInventoryReport,
  isAllowedValue,
  proofRedactionStatuses,
  proofReviewStates,
  proofSourceClasses,
  proofStorageBoundaries,
} from "./schema.js";

export interface ProofInventoryValidationOptions {
  repoRoot: string;
  privateRoot?: string;
  now?: Date;
}

export interface ProofInventoryValidationResult {
  ok: boolean;
  errors: ProofInventoryValidationError[];
  summary: ProofInventorySummary;
  report: SafeProofInventoryReport;
}

const credentialPattern = /(?:CLERK|DATABASE_URL|sk_live_|sk_test_|pk_live_|pk_test_|auth\.json|\.env|cookie|token)/i;
const blockedPrivateRedactionStatuses = new Set(["pending", "required", "not_safe_to_store"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countValue(record: Record<string, number>, value: string): void {
  record[value] = (record[value] ?? 0) + 1;
}

function isInside(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(parentPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveMaybePath(repoRoot: string, candidatePath: string): string {
  if (candidatePath.startsWith("~")) {
    return candidatePath;
  }
  return path.isAbsolute(candidatePath) ? path.normalize(candidatePath) : path.resolve(repoRoot, candidatePath);
}

function isAllowedRepoFixturePath(sourcePath: string, storageBoundary: string): boolean {
  return storageBoundary === "public_repo_contract" && sourcePath.includes("fixtures/");
}

export function isEntryAnswerEligible(entry: ProofInventoryEntry): boolean {
  if (entry.sourceClass !== "verified_local_proof") return false;
  if (entry.reviewState !== "verified") return false;
  if (!entry.citationLabel?.trim()) return false;
  if (entry.containsPrivateData && blockedPrivateRedactionStatuses.has(entry.redactionStatus)) return false;
  return true;
}

export function validatePrivateRoot(privateRoot: string, repoRoot: string): ProofInventoryValidationError[] {
  const errors: ProofInventoryValidationError[] = [];
  const resolvedPrivateRoot = path.resolve(privateRoot);
  const resolvedRepoRoot = path.resolve(repoRoot);

  if (!privateRoot.trim()) {
    errors.push({ field: "privateRoot", message: "Private root is required" });
    return errors;
  }

  if (isInside(resolvedRepoRoot, resolvedPrivateRoot)) {
    errors.push({
      field: "privateRoot",
      message: "Private root must not point inside the public repository",
    });
  }

  return errors;
}

function validateInventoryShape(value: unknown): { inventory?: ProofInventory; errors: ProofInventoryValidationError[] } {
  const errors: ProofInventoryValidationError[] = [];

  if (!isObject(value)) {
    return { errors: [{ message: "Inventory must be a JSON object" }] };
  }

  if (value.version !== 1) {
    errors.push({ field: "version", message: "Inventory version must be 1" });
  }

  if (typeof value.generatedAt !== "string" || !value.generatedAt.trim()) {
    errors.push({ field: "generatedAt", message: "generatedAt is required" });
  }

  if (value.privateRootClass !== "local_private") {
    errors.push({ field: "privateRootClass", message: "privateRootClass must be local_private" });
  }

  if (!Array.isArray(value.entries)) {
    errors.push({ field: "entries", message: "entries must be an array" });
    return { errors };
  }

  return { inventory: value as unknown as ProofInventory, errors };
}

function validateEntryShape(entry: unknown, index: number): ProofInventoryValidationError[] {
  const sourceId = isObject(entry) && typeof entry.sourceId === "string" ? entry.sourceId : `entry[${index}]`;
  const errors: ProofInventoryValidationError[] = [];

  if (!isObject(entry)) {
    return [{ sourceId, message: "Entry must be an object" }];
  }

  if (typeof entry.sourceId !== "string" || !entry.sourceId.trim()) {
    errors.push({ sourceId, field: "sourceId", message: "sourceId is required" });
  }

  if (typeof entry.title !== "string" || !entry.title.trim()) {
    errors.push({ sourceId, field: "title", message: "title is required" });
  }

  if (!isAllowedValue(proofSourceClasses, entry.sourceClass)) {
    errors.push({ sourceId, field: "sourceClass", message: "Unsupported source class" });
  }

  if (!isAllowedValue(proofReviewStates, entry.reviewState)) {
    errors.push({ sourceId, field: "reviewState", message: "Unsupported review state" });
  }

  if (!isAllowedValue(proofStorageBoundaries, entry.storageBoundary)) {
    errors.push({ sourceId, field: "storageBoundary", message: "Unsupported storage boundary" });
  }

  if (typeof entry.containsPrivateData !== "boolean") {
    errors.push({ sourceId, field: "containsPrivateData", message: "containsPrivateData must be boolean" });
  }

  if (!isAllowedValue(proofRedactionStatuses, entry.redactionStatus)) {
    errors.push({ sourceId, field: "redactionStatus", message: "Unsupported redaction status" });
  }

  return errors;
}

function validateEntryPolicy(entry: ProofInventoryEntry, repoRoot: string): ProofInventoryValidationError[] {
  const errors: ProofInventoryValidationError[] = [];
  const fieldsToScan = [entry.sourceId, entry.title, entry.citationLabel, entry.sourcePath, entry.notes].filter(
    (value): value is string => typeof value === "string",
  );

  if (fieldsToScan.some((value) => credentialPattern.test(value))) {
    errors.push({
      sourceId: entry.sourceId,
      message: "Entry contains credential-like or auth/env material",
    });
  }

  if (entry.sourceClass === "verified_local_proof" && entry.reviewState !== "verified") {
    errors.push({
      sourceId: entry.sourceId,
      field: "reviewState",
      message: "verified_local_proof must have reviewState verified",
    });
  }

  if (entry.reviewState === "verified" && !entry.citationLabel?.trim()) {
    errors.push({
      sourceId: entry.sourceId,
      field: "citationLabel",
      message: "Verified entries require citation metadata",
    });
  }

  if (entry.containsPrivateData && !entry.redactionStatus) {
    errors.push({
      sourceId: entry.sourceId,
      field: "redactionStatus",
      message: "Private-data entries require redaction status",
    });
  }

  const computedAnswerEligible = isEntryAnswerEligible(entry);
  if (entry.answerEligible === true && !computedAnswerEligible) {
    errors.push({
      sourceId: entry.sourceId,
      field: "answerEligible",
      message: "Entry is marked answer-eligible but does not satisfy proof eligibility gates",
    });
  }

  if (entry.sourceClass === "rejected_or_retired" && entry.answerEligible === true) {
    errors.push({
      sourceId: entry.sourceId,
      field: "answerEligible",
      message: "Rejected or retired sources must never be answer-eligible",
    });
  }

  if (entry.sourcePath?.trim()) {
    const resolvedSourcePath = resolveMaybePath(repoRoot, entry.sourcePath);
    const resolvedRepoRoot = path.resolve(repoRoot);
    if (
      !resolvedSourcePath.startsWith("~") &&
      isInside(resolvedRepoRoot, resolvedSourcePath) &&
      !isAllowedRepoFixturePath(entry.sourcePath, entry.storageBoundary)
    ) {
      errors.push({
        sourceId: entry.sourceId,
        field: "sourcePath",
        message: "Private proof source paths must not point inside the public repository",
      });
    }
  }

  return errors;
}

function buildSummary(entries: ProofInventoryEntry[]): ProofInventorySummary {
  const summary: ProofInventorySummary = {
    totalEntries: entries.length,
    bySourceClass: {},
    byReviewState: {},
    byRedactionStatus: {},
    answerEligibleCount: 0,
    blockedEntryIds: [],
  };

  for (const entry of entries) {
    countValue(summary.bySourceClass, entry.sourceClass);
    countValue(summary.byReviewState, entry.reviewState);
    countValue(summary.byRedactionStatus, entry.redactionStatus);
    if (isEntryAnswerEligible(entry)) {
      summary.answerEligibleCount += 1;
    } else {
      summary.blockedEntryIds.push(entry.sourceId);
    }
  }

  return summary;
}

function buildSafeReport(inventory: ProofInventory, summary: ProofInventorySummary, now: Date): SafeProofInventoryReport {
  return {
    version: inventory.version,
    generatedAt: inventory.generatedAt,
    privateRootClass: inventory.privateRootClass,
    reportGeneratedAt: now.toISOString(),
    summary,
    entries: inventory.entries.map((entry) => ({
      sourceId: entry.sourceId,
      sourceClass: entry.sourceClass,
      reviewState: entry.reviewState,
      storageBoundary: entry.storageBoundary,
      redactionStatus: entry.redactionStatus,
      containsPrivateData: entry.containsPrivateData,
      citationLabel: entry.citationLabel,
      answerEligible: isEntryAnswerEligible(entry),
    })),
  };
}

export function validateProofInventory(
  value: unknown,
  options: ProofInventoryValidationOptions,
): ProofInventoryValidationResult {
  const now = options.now ?? new Date();
  const shape = validateInventoryShape(value);
  const errors = [...shape.errors];

  if (!shape.inventory) {
    const emptySummary = buildSummary([]);
    return {
      ok: false,
      errors,
      summary: emptySummary,
      report: buildSafeReport(
        { version: 1, generatedAt: now.toISOString(), privateRootClass: "local_private", entries: [] },
        emptySummary,
        now,
      ),
    };
  }

  const seenSourceIds = new Set<string>();
  const validEntries: ProofInventoryEntry[] = [];

  shape.inventory.entries.forEach((entry, index) => {
    const entryErrors = validateEntryShape(entry, index);
    errors.push(...entryErrors);
    if (entryErrors.length === 0) {
      const typedEntry = entry as ProofInventoryEntry;
      if (seenSourceIds.has(typedEntry.sourceId)) {
        errors.push({
          sourceId: typedEntry.sourceId,
          field: "sourceId",
          message: "Duplicate sourceId",
        });
      }
      seenSourceIds.add(typedEntry.sourceId);
      errors.push(...validateEntryPolicy(typedEntry, options.repoRoot));
      validEntries.push(typedEntry);
    }
  });

  const summary = buildSummary(validEntries);
  const report = buildSafeReport(shape.inventory, summary, now);

  return {
    ok: errors.length === 0,
    errors,
    summary,
    report,
  };
}
