import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, aiDraftsTable } from "@workspace/db";
import {
  thetaApplyAIDraftBodySchema,
  thetaApplyAIDraftResponseSchema,
  thetaAIActionDefinitions,
  thetaAIDraftKindSchema,
  thetaAIDraftReviewStateSchema,
  thetaCreateAIDraftBodySchema,
  thetaLaneSchema,
  thetaUpdateAIDraftReviewStateBodySchema,
  type ThetaLane,
} from "@workspace/integration-contracts";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { isValidDateString, serializeDates } from "../lib/serialize.js";
import {
  detectEnvironment,
  ensureEnvironmentModules,
  getUserAndMaybeBootstrap,
  isAdminUser,
  type AppModule,
} from "../lib/access.js";
import { DailyFrameValidationError, upsertDailyFrameForUser, validateDailyFrameUpsertData } from "../lib/dailyFrames.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";
import { WeeklyFrameValidationError, upsertWeeklyFrameForUser, validateWeeklyFrameUpsertData } from "../lib/weeklyFrames.js";
import { VisionFrameValidationError, upsertVisionFrameForUser, validateVisionFrameUpsertData } from "../lib/visionFrames.js";
import {
  applyReachFileMetadataForUser,
  ReachFileApplyValidationError,
  validateReachFileMetadataApplyData,
} from "../lib/reachFiles.js";
import {
  createLifeLedgerEventForUser,
  LifeLedgerEventValidationError,
  validateLifeLedgerEventCreateData,
} from "../lib/lifeLedgerEvents.js";
import {
  createLifeLedgerPersonForUser,
  LifeLedgerPeopleValidationError,
  validateLifeLedgerPeopleCreateData,
} from "../lib/lifeLedgerPeople.js";
import {
  createLifeLedgerFinancialEntryForUser,
  LifeLedgerFinancialValidationError,
  validateLifeLedgerFinancialCreateData,
} from "../lib/lifeLedgerFinancial.js";
import {
  createLifeLedgerSubscriptionForUser,
  LifeLedgerSubscriptionsValidationError,
  validateLifeLedgerSubscriptionsCreateData,
} from "../lib/lifeLedgerSubscriptions.js";
import {
  createLifeLedgerTravelEntryForUser,
  LifeLedgerTravelValidationError,
  validateLifeLedgerTravelCreateData,
} from "../lib/lifeLedgerTravel.js";
import { serializeLifeLedgerEntry } from "../lib/lifeLedgerEventReminders.js";
import { createStoredAIDraft, hydrateDraftMetadata, hydrateDraftRecord } from "../lib/aiDrafts.js";
import { assertBabyAssignmentSuggestionStillEligible } from "../lib/babyKbAssignmentSuggestions.js";
import { createBabyKbAssignment, validateBabyKbAssignmentDraftCreateData } from "../lib/babyKbAssignments.js";

const router: IRouter = Router();
router.use("/ai-drafts", requireAuth);

const listAiDraftsQuerySchema = z.object({
  lane: thetaLaneSchema.optional(),
  draftKind: thetaAIDraftKindSchema.optional(),
  reviewState: thetaAIDraftReviewStateSchema.optional(),
  targetSurfaceKey: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

const aiDraftIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const laneToModuleMap: Partial<Record<ThetaLane, AppModule>> = {
  daily: "daily",
  weekly: "weekly",
  vision: "vision",
  bizdev: "bizdev",
  "life-ledger": "life-ledger",
  reach: "reach",
};

async function getDraftAccessContext(userId: string, req: Request) {
  const environment = detectEnvironment();
  const user = await getUserAndMaybeBootstrap(userId, req.log);
  const modules = await ensureEnvironmentModules(userId, environment);
  const accessibleLanes: ThetaLane[] = modules.map((module) => {
    switch (module) {
      case "daily":
        return "daily";
      case "weekly":
        return "weekly";
      case "vision":
        return "vision";
      case "bizdev":
        return "bizdev";
      case "life-ledger":
        return "life-ledger";
      case "reach":
        return "reach";
    }
  });

  if (isAdminUser(user) && modules.includes("life-ledger")) {
    accessibleLanes.push("baby-kb");
  }

  return {
    modules,
    isAdmin: isAdminUser(user),
    accessibleLanes: Array.from(new Set(accessibleLanes)),
  };
}

function canAccessLane(lane: ThetaLane, modules: AppModule[], isAdmin: boolean): boolean {
  if (lane === "baby-kb") {
    return isAdmin && modules.includes("life-ledger");
  }

  if (lane === "admin") {
    return false;
  }

  const requiredModule = laneToModuleMap[lane];
  return Boolean(requiredModule && modules.includes(requiredModule));
}

async function getOwnedDraftById(id: number, userId: string) {
  const [row] = await db
    .select()
    .from(aiDraftsTable)
    .where(and(eq(aiDraftsTable.id, id), eq(aiDraftsTable.userId, userId)));

  return row;
}

router.get("/ai-drafts", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const query = listAiDraftsQuerySchema.safeParse(req.query);

  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const access = await getDraftAccessContext(userId, req);

  if (query.data.lane && !canAccessLane(query.data.lane, access.modules, access.isAdmin)) {
    res.status(403).json({ error: "Forbidden", lane: query.data.lane });
    return;
  }

  if (access.accessibleLanes.length === 0) {
    res.json([]);
    return;
  }

  const filters = [
    eq(aiDraftsTable.userId, userId),
    inArray(aiDraftsTable.targetLane, access.accessibleLanes),
  ];

  if (query.data.lane) {
    filters.push(eq(aiDraftsTable.targetLane, query.data.lane));
  }

  if (query.data.draftKind) {
    filters.push(eq(aiDraftsTable.draftKind, query.data.draftKind));
  }

  if (query.data.reviewState) {
    filters.push(eq(aiDraftsTable.reviewState, query.data.reviewState));
  }

  if (query.data.targetSurfaceKey) {
    filters.push(eq(aiDraftsTable.targetSurfaceKey, query.data.targetSurfaceKey));
  }

  const rows = await db
    .select()
    .from(aiDraftsTable)
    .where(and(...filters))
    .orderBy(desc(aiDraftsTable.createdAt))
    .limit(query.data.limit ?? 10);

  res.json(rows.map((row) => hydrateDraftRecord(row)));
});

router.get("/ai-drafts/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = aiDraftIdParamsSchema.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const row = await getOwnedDraftById(params.data.id, userId);

  if (!row) {
    res.status(404).json({ error: "AI draft not found" });
    return;
  }

  const access = await getDraftAccessContext(userId, req);

  if (!canAccessLane(row.targetLane as ThetaLane, access.modules, access.isAdmin)) {
    res.status(403).json({ error: "Forbidden", lane: row.targetLane });
    return;
  }

  res.json(hydrateDraftRecord(row));
});

router.post("/ai-drafts", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const body = thetaCreateAIDraftBodySchema.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const definition = thetaAIActionDefinitions[body.data.draftKind];

  if (
    body.data.targetLane !== definition.targetLane ||
    body.data.targetObjectType !== definition.targetObjectType ||
    body.data.commitTool !== definition.commitTool ||
    body.data.mutationRisk !== definition.mutationRisk
  ) {
    res.status(400).json({ error: "Draft body drifted from the registered AI action definition." });
    return;
  }

  const access = await getDraftAccessContext(userId, req);

  if (!canAccessLane(body.data.targetLane, access.modules, access.isAdmin)) {
    res.status(403).json({ error: "Forbidden", lane: body.data.targetLane });
    return;
  }

  const created = await createStoredAIDraft({
    userId,
    draftKind: body.data.draftKind,
    targetSurfaceKey: body.data.targetSurfaceKey ?? null,
    confidenceMode: body.data.confidenceMode,
    inputChannels: body.data.inputChannels,
    proposedPayload: body.data.proposedPayload,
    sourceRefs: body.data.sourceRefs,
    reviewNotes: body.data.reviewNotes ?? null,
    metadata: body.data.metadata,
  });

  res.status(201).json(created);
});

router.patch("/ai-drafts/:id/review-state", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = aiDraftIdParamsSchema.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = thetaUpdateAIDraftReviewStateBodySchema.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getOwnedDraftById(params.data.id, userId);

  if (!existing) {
    res.status(404).json({ error: "AI draft not found" });
    return;
  }

  const access = await getDraftAccessContext(userId, req);

  if (!canAccessLane(existing.targetLane as ThetaLane, access.modules, access.isAdmin)) {
    res.status(403).json({ error: "Forbidden", lane: existing.targetLane });
    return;
  }

  if (existing.reviewState === "applied") {
    res.status(409).json({ error: "Applied drafts are immutable in this slice." });
    return;
  }

  if (body.data.reviewState === "applied") {
    res.status(409).json({ error: "Applied state may only be set through the apply route." });
    return;
  }

  const reviewedAt = new Date();
  const updatedMetadata = hydrateDraftMetadata(
    {
      ...existing,
      approvalRequired: existing.approvalRequired,
      reviewState: body.data.reviewState,
      updatedAt: reviewedAt,
      reviewedAt,
      reviewedBy: userId,
    },
  );

  const [updated] = await db
    .update(aiDraftsTable)
    .set({
      reviewState: body.data.reviewState,
      reviewNotes: body.data.reviewNotes ?? null,
      reviewedAt,
      reviewedBy: userId,
      updatedAt: reviewedAt,
      metadata: updatedMetadata,
    })
    .where(and(eq(aiDraftsTable.id, params.data.id), eq(aiDraftsTable.userId, userId)))
    .returning();

  res.json(hydrateDraftRecord(updated));
});

router.post("/ai-drafts/:id/apply", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = aiDraftIdParamsSchema.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = thetaApplyAIDraftBodySchema.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getOwnedDraftById(params.data.id, userId);

  if (!existing) {
    res.status(404).json({ error: "AI draft not found" });
    return;
  }

  const access = await getDraftAccessContext(userId, req);

  if (!canAccessLane(existing.targetLane as ThetaLane, access.modules, access.isAdmin)) {
    res.status(403).json({ error: "Forbidden", lane: existing.targetLane });
    return;
  }

  if (!["needs_review", "approved"].includes(existing.reviewState)) {
    res.status(409).json({ error: `Drafts in state ${existing.reviewState} cannot be applied.` });
    return;
  }

  let appliedFrame: unknown;
  let appliedTargetRef: string;

  if (existing.draftKind === "daily_frame_draft" && existing.targetLane === "daily") {
    if (!body.data.date || !isValidDateString(body.data.date)) {
      res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
      return;
    }

    let dailyData;
    try {
      dailyData = validateDailyFrameUpsertData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof DailyFrameValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await upsertDailyFrameForUser({
      userId,
      date: body.data.date,
      data: dailyData,
    });
    await markOnboardingSurfaceComplete(userId, "daily");
    appliedTargetRef = `daily:${body.data.date}`;
  } else if (existing.draftKind === "weekly_frame_draft" && existing.targetLane === "weekly") {
    if (!body.data.weekStart || !isValidDateString(body.data.weekStart)) {
      res.status(400).json({ error: "weekStart must be in YYYY-MM-DD format." });
      return;
    }

    let weeklyData;
    try {
      weeklyData = validateWeeklyFrameUpsertData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof WeeklyFrameValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await upsertWeeklyFrameForUser({
      userId,
      weekStart: body.data.weekStart,
      data: weeklyData,
    });
    await markOnboardingSurfaceComplete(userId, "weekly");
    appliedTargetRef = `weekly:${body.data.weekStart}`;
  } else if (existing.draftKind === "vision_alignment_draft" && existing.targetLane === "vision") {
    let visionData;
    try {
      visionData = validateVisionFrameUpsertData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof VisionFrameValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await upsertVisionFrameForUser({
      userId,
      data: visionData,
    });
    await markOnboardingSurfaceComplete(userId, "vision");
    appliedTargetRef = "vision:me";
  } else if (existing.draftKind === "reach_file_summary" && existing.targetLane === "reach") {
    if (!body.data.reachFileId) {
      res.status(400).json({ error: "reachFileId is required for REACH draft apply." });
      return;
    }

    let reachMetadata;
    try {
      reachMetadata = validateReachFileMetadataApplyData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof ReachFileApplyValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await applyReachFileMetadataForUser({
      userId,
      reachFileId: body.data.reachFileId,
      data: reachMetadata,
    });

    if (!appliedFrame) {
      res.status(404).json({ error: "REACH file not found" });
      return;
    }

    await markOnboardingSurfaceComplete(userId, "reach");
    appliedTargetRef = `reach:${body.data.reachFileId}`;
  } else if (
    existing.draftKind === "baby_kb_assignment_draft" &&
    existing.targetLane === "baby-kb"
  ) {
    let assignmentData;
    try {
      assignmentData = validateBabyKbAssignmentDraftCreateData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    try {
      await assertBabyAssignmentSuggestionStillEligible(userId, assignmentData.sourceEntryId, {
        skipPendingDraftCheck: true,
        excludeDraftId: existing.id,
      });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : "The Baby KB suggestion can no longer be applied." });
      return;
    }

    appliedFrame = await createBabyKbAssignment(userId, assignmentData);
    await markOnboardingSurfaceComplete(userId, "life-ledger");
    appliedTargetRef = `baby-kb:assignment:${(appliedFrame as { id: number }).id}`;
  } else if (
    existing.draftKind === "life_ledger_classification_draft" &&
    existing.targetLane === "life-ledger" &&
    existing.targetSurfaceKey === "events"
  ) {
    let eventData;
    try {
      eventData = validateLifeLedgerEventCreateData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof LifeLedgerEventValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await createLifeLedgerEventForUser({
      userId,
      data: eventData,
    });

    await markOnboardingSurfaceComplete(userId, "life-ledger");
    appliedTargetRef = `life-ledger:events:${(appliedFrame as { id: number }).id}`;
  } else if (
    existing.draftKind === "life_ledger_classification_draft" &&
    existing.targetLane === "life-ledger" &&
    existing.targetSurfaceKey === "people"
  ) {
    let peopleData;
    try {
      peopleData = validateLifeLedgerPeopleCreateData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof LifeLedgerPeopleValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await createLifeLedgerPersonForUser({
      userId,
      data: peopleData,
    });

    await markOnboardingSurfaceComplete(userId, "life-ledger");
    appliedTargetRef = `life-ledger:people:${(appliedFrame as { id: number }).id}`;
  } else if (
    existing.draftKind === "life_ledger_classification_draft" &&
    existing.targetLane === "life-ledger" &&
    existing.targetSurfaceKey === "financial"
  ) {
    let financialData;
    try {
      financialData = validateLifeLedgerFinancialCreateData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof LifeLedgerFinancialValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await createLifeLedgerFinancialEntryForUser({
      userId,
      data: financialData,
    });

    await markOnboardingSurfaceComplete(userId, "life-ledger");
    appliedTargetRef = `life-ledger:financial:${(appliedFrame as { id: number }).id}`;
  } else if (
    existing.draftKind === "life_ledger_classification_draft" &&
    existing.targetLane === "life-ledger" &&
    existing.targetSurfaceKey === "subscriptions"
  ) {
    let subscriptionsData;
    try {
      subscriptionsData = validateLifeLedgerSubscriptionsCreateData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof LifeLedgerSubscriptionsValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await createLifeLedgerSubscriptionForUser({
      userId,
      data: subscriptionsData,
    });

    await markOnboardingSurfaceComplete(userId, "life-ledger");
    appliedTargetRef = `life-ledger:subscriptions:${(appliedFrame as { id: number }).id}`;
  } else if (
    existing.draftKind === "life_ledger_classification_draft" &&
    existing.targetLane === "life-ledger" &&
    existing.targetSurfaceKey === "travel"
  ) {
    let travelData;
    try {
      travelData = validateLifeLedgerTravelCreateData(existing.proposedPayload);
    } catch (error) {
      if (error instanceof LifeLedgerTravelValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
      throw error;
    }

    appliedFrame = await createLifeLedgerTravelEntryForUser({
      userId,
      data: travelData,
    });

    await markOnboardingSurfaceComplete(userId, "life-ledger");
    appliedTargetRef = `life-ledger:travel:${(appliedFrame as { id: number }).id}`;
  } else {
    res.status(409).json({ error: "Only daily_frame_draft, weekly_frame_draft, vision_alignment_draft, reach_file_summary, life_ledger_classification_draft for people, events, financial, subscriptions, or travel, and baby_kb_assignment_draft may be applied in this slice." });
    return;
  }

  const appliedAt = new Date();
  const updatedMetadata = hydrateDraftMetadata({
    ...existing,
    approvalRequired: existing.approvalRequired,
    reviewState: "applied",
    updatedAt: appliedAt,
    reviewedAt: existing.reviewedAt,
    reviewedBy: existing.reviewedBy,
  });

  const [updated] = await db
    .update(aiDraftsTable)
    .set({
      reviewState: "applied",
      appliedAt,
      appliedBy: userId,
      appliedTargetRef,
      updatedAt: appliedAt,
      metadata: updatedMetadata,
    })
    .where(and(eq(aiDraftsTable.id, params.data.id), eq(aiDraftsTable.userId, userId)))
    .returning();

  res.json(
    thetaApplyAIDraftResponseSchema.parse({
      draft: hydrateDraftRecord(updated),
      dailyFrame:
        existing.draftKind === "daily_frame_draft" ? serializeDates(appliedFrame as Record<string, unknown>) : undefined,
      weeklyFrame:
        existing.draftKind === "weekly_frame_draft" ? serializeDates(appliedFrame as Record<string, unknown>) : undefined,
      visionFrame:
        existing.draftKind === "vision_alignment_draft" ? serializeDates(appliedFrame as Record<string, unknown>) : undefined,
      reachFile:
        existing.draftKind === "reach_file_summary" ? serializeDates(appliedFrame as Record<string, unknown>) : undefined,
      lifeLedgerEntry:
        existing.draftKind === "life_ledger_classification_draft"
        && existing.targetLane === "life-ledger"
        && (
          existing.targetSurfaceKey === "events"
          || existing.targetSurfaceKey === "people"
          || existing.targetSurfaceKey === "financial"
          || existing.targetSurfaceKey === "subscriptions"
          || existing.targetSurfaceKey === "travel"
        )
          ? serializeLifeLedgerEntry(appliedFrame as Record<string, unknown>)
          : undefined,
      babyAssignment:
        existing.draftKind === "baby_kb_assignment_draft" && existing.targetLane === "baby-kb"
          ? serializeDates(appliedFrame as Record<string, unknown>)
          : undefined,
    }),
  );
});

export default router;
