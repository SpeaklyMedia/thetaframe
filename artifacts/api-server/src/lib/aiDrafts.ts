import { randomUUID } from "node:crypto";
import { aiDraftsTable, db } from "@workspace/db";
import {
  buildThetaObjectId,
  getInitialAIDraftReviewState,
  thetaAIActionDefinitions,
  thetaAIDraftApprovalRequirements,
  thetaAIDraftRecordSchema,
  thetaCoreIntegrationMetadataSchema,
  type ThetaAIDraftKind,
  type ThetaAIConfidenceMode,
  type ThetaAIIntakeChannel,
  type ThetaAIDraftSourceRef,
  type ThetaLane,
} from "@workspace/integration-contracts";
import { serializeDates } from "./serialize.js";

type DraftRecordShape = {
  thetaObjectId: string;
  targetLane: string;
  targetObjectType: string;
  approvalRequired: string;
  reviewState: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  reviewedAt: Date | string | null;
  reviewedBy: string | null;
  metadata: unknown;
};

export function hydrateDraftMetadata(
  record: DraftRecordShape,
  envelopeMetadata?: unknown,
) {
  const base = (record.metadata && typeof record.metadata === "object"
    ? record.metadata
    : {}) as Record<string, unknown>;

  const hydrated = {
    ...base,
    ...(envelopeMetadata ?? {}),
    thetaObjectId: record.thetaObjectId,
    lane: record.targetLane,
    objectType: "ai-draft",
    approvalRequired: record.approvalRequired,
    reviewStatus: record.reviewState,
    createdAt:
      record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
    updatedAt:
      record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
    reviewedAt:
      record.reviewedAt instanceof Date
        ? record.reviewedAt.toISOString()
        : record.reviewedAt ?? null,
    reviewedBy: record.reviewedBy ?? null,
  };

  return thetaCoreIntegrationMetadataSchema.parse(hydrated);
}

export function hydrateDraftRecord(
  record: typeof aiDraftsTable.$inferSelect,
  envelopeMetadata?: unknown,
) {
  return thetaAIDraftRecordSchema.parse({
    ...serializeDates(record),
    metadata: hydrateDraftMetadata(record, envelopeMetadata),
  });
}

export async function createStoredAIDraft(args: {
  userId: string;
  draftKind: ThetaAIDraftKind;
  confidenceMode: ThetaAIConfidenceMode;
  inputChannels: ThetaAIIntakeChannel[];
  proposedPayload: Record<string, unknown>;
  sourceRefs: ThetaAIDraftSourceRef[];
  targetSurfaceKey?: string | null;
  reviewNotes?: string | null;
  metadata?: unknown;
}) {
  const definition = thetaAIActionDefinitions[args.draftKind];
  const approvalRequired = thetaAIDraftApprovalRequirements[args.draftKind];
  const reviewState = getInitialAIDraftReviewState(args.draftKind);
  const thetaObjectId = buildThetaObjectId(definition.targetLane as ThetaLane, "ai-draft", randomUUID());
  const now = new Date();
  const metadata = hydrateDraftMetadata(
    {
      thetaObjectId,
      targetLane: definition.targetLane,
      targetObjectType: definition.targetObjectType,
      approvalRequired,
      reviewState,
      createdAt: now,
      updatedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      metadata: args.metadata,
    },
    args.metadata,
  );

  const [created] = await db
    .insert(aiDraftsTable)
    .values({
      thetaObjectId,
      userId: args.userId,
      draftKind: args.draftKind,
      targetLane: definition.targetLane,
      targetSurfaceKey: args.targetSurfaceKey ?? null,
      targetObjectType: definition.targetObjectType,
      mutationRisk: definition.mutationRisk,
      approvalRequired,
      reviewState,
      confidenceMode: args.confidenceMode,
      commitTool: definition.commitTool,
      metadata,
      inputChannels: args.inputChannels,
      proposedPayload: args.proposedPayload,
      sourceRefs: args.sourceRefs,
      reviewNotes: args.reviewNotes ?? null,
      appliedAt: null,
      appliedBy: null,
      appliedTargetRef: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return hydrateDraftRecord(created, metadata);
}
