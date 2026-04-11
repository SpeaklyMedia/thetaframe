import { randomUUID } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  dailyFramesTable,
  lifeLedgerBabyTable,
  parentPacketMaterializationsTable,
  parentPacketPromotionsTable,
  visionFramesTable,
  weeklyFramesTable,
} from "@workspace/db";
import { markOnboardingSurfaceComplete } from "./onboarding.js";

export type BabyPromotionSurface = "daily" | "weekly" | "vision";
export type BabyBulkOperation = "mark-verified" | "add-tag" | "remove-tag";

type TierTask = { id: string; text: string; completed: boolean };
type WeeklyStep = { id: string; text: string; emoji?: string | null };
type VisionGoal = { id: string; text: string };
type MaterializationMetadata = Record<string, unknown>;

let babyKbAdminSchemaReady: Promise<void> | null = null;

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getTierTasks(value: unknown): TierTask[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is TierTask =>
          Boolean(item && typeof item === "object" && typeof (item as TierTask).id === "string" && typeof (item as TierTask).text === "string"),
      )
    : [];
}

function getWeeklySteps(value: unknown): WeeklyStep[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is WeeklyStep =>
          Boolean(item && typeof item === "object" && typeof (item as WeeklyStep).id === "string" && typeof (item as WeeklyStep).text === "string"),
      )
    : [];
}

function getVisionGoals(value: unknown): VisionGoal[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is VisionGoal =>
          Boolean(item && typeof item === "object" && typeof (item as VisionGoal).id === "string" && typeof (item as VisionGoal).text === "string"),
      )
    : [];
}

function metadataString(metadata: MaterializationMetadata | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function humanizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.replace(/\b\w/g, (match) => match.toUpperCase());
}

function deriveLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;

  const lines = notes.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^[A-Za-z /-]+:\s*(.+)$/);
    const value = match?.[1]?.trim();
    if (value) {
      return humanizeToken(value);
    }
  }

  return null;
}

function getPromotionText(
  sourceEntry: typeof lifeLedgerBabyTable.$inferSelect,
  sourceMaterialization: typeof parentPacketMaterializationsTable.$inferSelect | undefined,
) {
  if (sourceEntry.name.trim()) {
    return humanizeToken(sourceEntry.name.trim()) ?? sourceEntry.name.trim();
  }

  const metadata = (sourceMaterialization?.metadata ?? null) as MaterializationMetadata | null;
  const sourceRecordKey = metadataString(metadata, "sourceRecordKey");
  const sourceRecordLeaf = sourceRecordKey?.split("::").reverse().find((segment) => segment.trim());
  const derived =
    humanizeToken(sourceRecordLeaf) ??
    humanizeToken(metadataString(metadata, "category")) ??
    humanizeToken(metadataString(metadata, "module")) ??
    humanizeToken(metadataString(metadata, "milestoneType")) ??
    humanizeToken(metadataString(metadata, "timingWindow")) ??
    humanizeToken(metadataString(metadata, "phase")) ??
    deriveLabelFromNotes(sourceEntry.notes);

  return derived ?? "Baby KB follow-up";
}

function fillFirstBlankStep(steps: WeeklyStep[], text: string): { steps: WeeklyStep[]; itemId: string; reusedBlank: boolean } {
  const blankIndex = steps.findIndex((step) => !step.text.trim());
  if (blankIndex !== -1) {
    const itemId = steps[blankIndex].id;
    const next = steps.map((step, index) => (index === blankIndex ? { ...step, text } : step));
    return { steps: next, itemId, reusedBlank: true };
  }

  if (steps.length >= 3) {
    throw new Error("Weekly frame already has 3 steps. Clear one before promoting another Baby KB item.");
  }

  const itemId = randomUUID();
  return {
    steps: [...steps, { id: itemId, text }],
    itemId,
    reusedBlank: false,
  };
}

function fillFirstBlankVisionStep(steps: VisionGoal[], text: string): { steps: VisionGoal[]; itemId: string; reusedBlank: boolean } {
  const blankIndex = steps.findIndex((step) => !step.text.trim());
  if (blankIndex !== -1) {
    const itemId = steps[blankIndex].id;
    const next = steps.map((step, index) => (index === blankIndex ? { ...step, text } : step));
    return { steps: next, itemId, reusedBlank: true };
  }

  if (steps.length >= 3) {
    throw new Error("Vision frame already has 3 next steps. Clear one before promoting another Baby KB item.");
  }

  const itemId = randomUUID();
  return {
    steps: [...steps, { id: itemId, text }],
    itemId,
    reusedBlank: false,
  };
}

export async function ensureBabyKbAdminSchema(): Promise<void> {
  if (!babyKbAdminSchemaReady) {
    babyKbAdminSchemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS parent_packet_promotions (
          id serial PRIMARY KEY,
          source_entry_id integer NOT NULL,
          source_materialization_id integer,
          target_surface text NOT NULL,
          target_container_key text NOT NULL,
          target_record_id integer NOT NULL,
          target_item_id text NOT NULL,
          status text NOT NULL DEFAULT 'linked',
          created_by text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS parent_packet_promotions_source_target_idx
        ON parent_packet_promotions (source_entry_id, target_surface, target_container_key)
      `);
    })().catch((error) => {
      babyKbAdminSchemaReady = null;
      throw error;
    });
  }

  await babyKbAdminSchemaReady;
}

export async function listBabyKbPromotionsForUser(userId: string) {
  await ensureBabyKbAdminSchema();

  const rows = await db
    .select({
      id: parentPacketPromotionsTable.id,
      sourceEntryId: parentPacketPromotionsTable.sourceEntryId,
      sourceMaterializationId: parentPacketPromotionsTable.sourceMaterializationId,
      targetSurface: parentPacketPromotionsTable.targetSurface,
      targetContainerKey: parentPacketPromotionsTable.targetContainerKey,
      targetRecordId: parentPacketPromotionsTable.targetRecordId,
      targetItemId: parentPacketPromotionsTable.targetItemId,
      status: parentPacketPromotionsTable.status,
      createdBy: parentPacketPromotionsTable.createdBy,
      createdAt: parentPacketPromotionsTable.createdAt,
      updatedAt: parentPacketPromotionsTable.updatedAt,
    })
    .from(parentPacketPromotionsTable)
    .innerJoin(lifeLedgerBabyTable, eq(parentPacketPromotionsTable.sourceEntryId, lifeLedgerBabyTable.id))
    .where(eq(lifeLedgerBabyTable.userId, userId))
    .orderBy(parentPacketPromotionsTable.createdAt);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function bulkUpdateBabyKbEntries(
  userId: string,
  entryIds: number[],
  operation: BabyBulkOperation,
  tag: string | null,
) {
  await ensureBabyKbAdminSchema();

  const uniqueEntryIds = Array.from(new Set(entryIds));
  if (uniqueEntryIds.length === 0) {
    return { updatedCount: 0, updatedIds: [] as number[] };
  }

  const entries = await db
    .select()
    .from(lifeLedgerBabyTable)
    .where(and(eq(lifeLedgerBabyTable.userId, userId), inArray(lifeLedgerBabyTable.id, uniqueEntryIds)));

  const updatedIds: number[] = [];

  for (const entry of entries) {
    const currentTags = getStringArray(entry.tags);
    let nextTags = currentTags;

    if (operation === "mark-verified") {
      nextTags = Array.from(new Set([...currentTags.filter((value) => value !== "Needs verification"), "Verified personal truth"]));
    }

    if (operation === "add-tag" && tag) {
      nextTags = Array.from(new Set([...currentTags, tag]));
    }

    if (operation === "remove-tag" && tag) {
      nextTags = currentTags.filter((value) => value !== tag);
    }

    await db
      .update(lifeLedgerBabyTable)
      .set({ tags: nextTags, updatedAt: new Date() })
      .where(eq(lifeLedgerBabyTable.id, entry.id));

    updatedIds.push(entry.id);
  }

  return { updatedCount: updatedIds.length, updatedIds };
}

export async function promoteBabyKbEntry(
  userId: string,
  sourceEntryId: number,
  targetSurface: BabyPromotionSurface,
  targetContainerKey: string,
) {
  await ensureBabyKbAdminSchema();

  const [sourceEntry] = await db
    .select()
    .from(lifeLedgerBabyTable)
    .where(and(eq(lifeLedgerBabyTable.id, sourceEntryId), eq(lifeLedgerBabyTable.userId, userId)));

  if (!sourceEntry) {
    throw new Error("Baby KB source entry not found.");
  }

  const [sourceMaterialization] = await db
    .select()
    .from(parentPacketMaterializationsTable)
    .where(eq(parentPacketMaterializationsTable.targetEntryId, sourceEntry.id));
  const promotionText = getPromotionText(sourceEntry, sourceMaterialization);

  const [existingPromotion] = await db
    .select()
    .from(parentPacketPromotionsTable)
    .where(
      and(
        eq(parentPacketPromotionsTable.sourceEntryId, sourceEntry.id),
        eq(parentPacketPromotionsTable.targetSurface, targetSurface),
        eq(parentPacketPromotionsTable.targetContainerKey, targetContainerKey),
      ),
    );

  if (existingPromotion) {
    return {
      ...existingPromotion,
      createdAt: existingPromotion.createdAt.toISOString(),
      updatedAt: existingPromotion.updatedAt.toISOString(),
      existing: true,
    };
  }

  if (targetSurface === "daily") {
    const [existingFrame] = await db
      .select()
      .from(dailyFramesTable)
      .where(and(eq(dailyFramesTable.userId, userId), eq(dailyFramesTable.date, targetContainerKey)));

    const nextTierB = getTierTasks(existingFrame?.tierB);
    const targetItemId = randomUUID();
    const [frame] = await db
      .insert(dailyFramesTable)
      .values({
        userId,
        date: targetContainerKey,
        colourState: existingFrame?.colourState ?? "green",
        tierA: getTierTasks(existingFrame?.tierA),
        tierB: [...nextTierB, { id: targetItemId, text: promotionText, completed: false }],
        timeBlocks: Array.isArray(existingFrame?.timeBlocks) ? existingFrame?.timeBlocks : [],
        microWin: existingFrame?.microWin ?? null,
        skipProtocolUsed: existingFrame?.skipProtocolUsed ?? false,
        skipProtocolChoice: existingFrame?.skipProtocolChoice ?? null,
      })
      .onConflictDoUpdate({
        target: [dailyFramesTable.userId, dailyFramesTable.date],
        set: {
          colourState: existingFrame?.colourState ?? "green",
          tierA: getTierTasks(existingFrame?.tierA),
          tierB: [...nextTierB, { id: targetItemId, text: promotionText, completed: false }],
          timeBlocks: Array.isArray(existingFrame?.timeBlocks) ? existingFrame?.timeBlocks : [],
          microWin: existingFrame?.microWin ?? null,
          skipProtocolUsed: existingFrame?.skipProtocolUsed ?? false,
          skipProtocolChoice: existingFrame?.skipProtocolChoice ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    const [promotion] = await db
      .insert(parentPacketPromotionsTable)
      .values({
        sourceEntryId: sourceEntry.id,
        sourceMaterializationId: sourceMaterialization?.id ?? null,
        targetSurface,
        targetContainerKey,
        targetRecordId: frame.id,
        targetItemId,
        status: "linked",
        createdBy: userId,
      })
      .returning();

    await markOnboardingSurfaceComplete(userId, "daily");

    return {
      ...promotion,
      createdAt: promotion.createdAt.toISOString(),
      updatedAt: promotion.updatedAt.toISOString(),
      existing: false,
    };
  }

  if (targetSurface === "weekly") {
    const [existingFrame] = await db
      .select()
      .from(weeklyFramesTable)
      .where(and(eq(weeklyFramesTable.userId, userId), eq(weeklyFramesTable.weekStart, targetContainerKey)));

    const steps = getWeeklySteps(existingFrame?.steps);
    const next = fillFirstBlankStep(steps, promotionText);

    const [frame] = await db
      .insert(weeklyFramesTable)
      .values({
        userId,
        weekStart: targetContainerKey,
        theme: existingFrame?.theme ?? null,
        steps: next.steps,
        nonNegotiables: getWeeklySteps(existingFrame?.nonNegotiables),
        recoveryPlan: existingFrame?.recoveryPlan ?? null,
      })
      .onConflictDoUpdate({
        target: [weeklyFramesTable.userId, weeklyFramesTable.weekStart],
        set: {
          theme: existingFrame?.theme ?? null,
          steps: next.steps,
          nonNegotiables: getWeeklySteps(existingFrame?.nonNegotiables),
          recoveryPlan: existingFrame?.recoveryPlan ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    const [promotion] = await db
      .insert(parentPacketPromotionsTable)
      .values({
        sourceEntryId: sourceEntry.id,
        sourceMaterializationId: sourceMaterialization?.id ?? null,
        targetSurface,
        targetContainerKey,
        targetRecordId: frame.id,
        targetItemId: next.itemId,
        status: "linked",
        createdBy: userId,
      })
      .returning();

    await markOnboardingSurfaceComplete(userId, "weekly");

    return {
      ...promotion,
      createdAt: promotion.createdAt.toISOString(),
      updatedAt: promotion.updatedAt.toISOString(),
      existing: false,
    };
  }

  const [existingVisionFrame] = await db
    .select()
    .from(visionFramesTable)
    .where(eq(visionFramesTable.userId, userId));

  const nextSteps = getVisionGoals(existingVisionFrame?.nextSteps);
  const next = fillFirstBlankVisionStep(nextSteps, promotionText);

  const [visionFrame] = await db
    .insert(visionFramesTable)
    .values({
      userId,
      goals: getVisionGoals(existingVisionFrame?.goals),
      nextSteps: next.steps,
    })
    .onConflictDoUpdate({
      target: [visionFramesTable.userId],
      set: {
        goals: getVisionGoals(existingVisionFrame?.goals),
        nextSteps: next.steps,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [promotion] = await db
    .insert(parentPacketPromotionsTable)
    .values({
      sourceEntryId: sourceEntry.id,
      sourceMaterializationId: sourceMaterialization?.id ?? null,
      targetSurface,
      targetContainerKey,
      targetRecordId: visionFrame.id,
      targetItemId: next.itemId,
      status: "linked",
      createdBy: userId,
    })
    .returning();

  await markOnboardingSurfaceComplete(userId, "vision");

  return {
    ...promotion,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
    existing: false,
  };
}
