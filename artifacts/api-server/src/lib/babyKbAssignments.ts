import { randomUUID } from "crypto";
import { clerkClient } from "@clerk/express";
import { and, eq, inArray, isNotNull, lte, gte, isNull, sql, ne } from "drizzle-orm";
import { z } from "zod";
import {
  babyKbAssignmentsTable,
  db,
  lifeLedgerBabyTable,
  lifeLedgerEventsTable,
  parentPacketMaterializationsTable,
  parentPacketPromotionsTable,
} from "@workspace/db";
import { detectEnvironment, ensureEnvironmentModules, getUserAndMaybeBootstrap } from "./access.js";
import { markOnboardingSurfaceComplete } from "./onboarding.js";
import { isValidDateString } from "./serialize.js";

export const BABY_ASSIGNMENT_LIFECYCLE_STATES = [
  "captured",
  "verified",
  "assigned",
  "scheduled",
  "due_soon",
  "in_motion",
  "completed",
  "superseded",
 ] as const;
export type BabyAssignmentLifecycleState = (typeof BABY_ASSIGNMENT_LIFECYCLE_STATES)[number];

export const BABY_ASSIGNMENT_CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
export type BabyAssignmentCadence = (typeof BABY_ASSIGNMENT_CADENCES)[number];

export const BABY_ASSIGNMENT_PROJECTION_POLICIES = ["hold", "event_only", "event_and_heroes"] as const;
export type BabyAssignmentProjectionPolicy = (typeof BABY_ASSIGNMENT_PROJECTION_POLICIES)[number];

export const babyAssignmentLifecycleStateSchema = z.enum(BABY_ASSIGNMENT_LIFECYCLE_STATES);
export const babyAssignmentCadenceSchema = z.enum(BABY_ASSIGNMENT_CADENCES);
export const babyAssignmentProjectionPolicySchema = z.enum(BABY_ASSIGNMENT_PROJECTION_POLICIES);

const babyAssignmentDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const babyAssignmentDraftCreateDataSchema = z.object({
  sourceEntryId: z.number().int().positive(),
  assigneeUserId: z.string().min(1),
  effectiveDate: babyAssignmentDateSchema,
  dueDate: babyAssignmentDateSchema.nullable().optional(),
  cadence: babyAssignmentCadenceSchema.nullable().optional(),
  projectionPolicy: babyAssignmentProjectionPolicySchema.optional(),
  assignmentNotes: z.string().max(4000).nullable().optional(),
});

export const babyAssignmentManualCreateDataSchema = babyAssignmentDraftCreateDataSchema.extend({
  lifecycleState: babyAssignmentLifecycleStateSchema.optional(),
  reminderPolicy: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const babyAssignmentUpdateDataSchema = z.object({
  assigneeUserId: z.string().min(1).optional(),
  effectiveDate: babyAssignmentDateSchema.optional(),
  dueDate: babyAssignmentDateSchema.nullable().optional(),
  cadence: babyAssignmentCadenceSchema.nullable().optional(),
  projectionPolicy: babyAssignmentProjectionPolicySchema.optional(),
  lifecycleState: babyAssignmentLifecycleStateSchema.optional(),
  assignmentNotes: z.string().max(4000).nullable().optional(),
  reminderPolicy: z.record(z.string(), z.unknown()).nullable().optional(),
});

type MaterializationMetadata = Record<string, unknown>;

export type CreateBabyKbAssignmentInput = {
  sourceEntryId: number;
  assigneeUserId: string;
  effectiveDate: string;
  dueDate?: string | null;
  cadence?: BabyAssignmentCadence | null;
  projectionPolicy?: BabyAssignmentProjectionPolicy;
  lifecycleState?: BabyAssignmentLifecycleState;
  assignmentNotes?: string | null;
  reminderPolicy?: Record<string, unknown> | null;
};

export type UpdateBabyKbAssignmentInput = {
  assigneeUserId?: string;
  effectiveDate?: string;
  dueDate?: string | null;
  cadence?: BabyAssignmentCadence | null;
  projectionPolicy?: BabyAssignmentProjectionPolicy;
  lifecycleState?: BabyAssignmentLifecycleState;
  assignmentNotes?: string | null;
  reminderPolicy?: Record<string, unknown> | null;
};

export function validateBabyKbAssignmentDraftCreateData(input: unknown) {
  return babyAssignmentDraftCreateDataSchema.parse(input);
}

export function validateBabyKbAssignmentManualCreateData(input: unknown) {
  return babyAssignmentManualCreateDataSchema.parse(input);
}

export function validateBabyKbAssignmentUpdateData(input: unknown) {
  return babyAssignmentUpdateDataSchema.parse(input);
}

let babyKbAssignmentSchemaReady: Promise<void> | null = null;

function metadataString(metadata: MaterializationMetadata | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function humanizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.replace(/\b\w/g, (match) => match.toUpperCase());
}

function deriveLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^[A-Za-z /-]+:\s*(.+)$/);
    const value = match?.[1]?.trim();
    if (value) {
      return humanizeToken(value);
    }
  }
  return null;
}

function getBabyAssignmentLabel(
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

function addCadence(date: string, cadence: BabyAssignmentCadence): string {
  const next = new Date(`${date}T12:00:00Z`);
  if (cadence === "daily") next.setUTCDate(next.getUTCDate() + 1);
  if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (cadence === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  if (cadence === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

function isDateWithinWindow(date: string | null | undefined, start: string, end: string): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getDateDaysFromToday(offsetDays: number): string {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + offsetDays);
  return next.toISOString().slice(0, 10);
}

function getWeekEndDateString() {
  const today = new Date();
  const day = today.getUTCDay();
  const distanceToSunday = (7 - day) % 7;
  today.setUTCDate(today.getUTCDate() + distanceToSunday);
  return today.toISOString().slice(0, 10);
}

function normalizeLifecycleState(
  requested: BabyAssignmentLifecycleState | undefined,
  dueDate: string | null | undefined,
  projectionPolicy: BabyAssignmentProjectionPolicy,
): BabyAssignmentLifecycleState {
  if (requested) return requested;
  if (dueDate && projectionPolicy !== "hold") {
    return "scheduled";
  }
  return "assigned";
}

function getEffectiveLifecycleState(state: BabyAssignmentLifecycleState, dueDate: string | null | undefined): BabyAssignmentLifecycleState {
  if ((state === "scheduled" || state === "assigned") && dueDate && dueDate <= getDateDaysFromToday(2)) {
    return "due_soon";
  }
  return state;
}

function buildReminderPolicy(reminderPolicy: Record<string, unknown> | null | undefined, dueDate: string | null | undefined) {
  if (reminderPolicy && Object.keys(reminderPolicy).length > 0) {
    return reminderPolicy;
  }
  if (!dueDate) return {};
  return {
    kind: "dated_event",
    leadDays: [7, 2, 0],
  };
}

function buildBabyEventNotes(
  sourceEntry: typeof lifeLedgerBabyTable.$inferSelect,
  sourceMaterialization: typeof parentPacketMaterializationsTable.$inferSelect | undefined,
  assignmentNotes: string | null | undefined,
) {
  const blocks = [
    "Derived from Baby KB assignment.",
    sourceMaterialization?.sourcePath ? `Source file: ${sourceMaterialization.sourcePath}` : null,
    assignmentNotes ? `Admin assignment note: ${assignmentNotes}` : null,
    sourceEntry.notes?.trim() ? `Source notes:\n${sourceEntry.notes.trim()}` : null,
  ].filter(Boolean);
  return blocks.join("\n\n");
}

function buildEventCompletionState(lifecycleState: BabyAssignmentLifecycleState) {
  if (lifecycleState === "completed") return "completed";
  if (lifecycleState === "superseded") return "superseded";
  if (lifecycleState === "in_motion") return "in_motion";
  return "scheduled";
}

async function validateAssigneeAccess(userId: string) {
  const user = await clerkClient.users.getUser(userId);
  await getUserAndMaybeBootstrap(user.id);
  const modules = await ensureEnvironmentModules(user.id, detectEnvironment());
  if (!modules.includes("life-ledger")) {
    throw new Error("Selected user does not currently have Life Ledger access.");
  }
  return user;
}

async function getOwnedSourceContext(adminUserId: string, sourceEntryId: number) {
  const [sourceEntry] = await db
    .select()
    .from(lifeLedgerBabyTable)
    .where(and(eq(lifeLedgerBabyTable.id, sourceEntryId), eq(lifeLedgerBabyTable.userId, adminUserId)));

  if (!sourceEntry) {
    throw new Error("Baby KB source entry not found.");
  }

  const [sourceMaterialization] = await db
    .select()
    .from(parentPacketMaterializationsTable)
    .where(
      and(
        eq(parentPacketMaterializationsTable.targetEntryId, sourceEntry.id),
        eq(parentPacketMaterializationsTable.uploaderUserId, adminUserId),
      ),
    );

  return { sourceEntry, sourceMaterialization };
}

async function getSourceContextByEntryId(sourceEntryId: number) {
  const [sourceEntry] = await db
    .select()
    .from(lifeLedgerBabyTable)
    .where(eq(lifeLedgerBabyTable.id, sourceEntryId));

  if (!sourceEntry) {
    throw new Error("Baby KB source entry not found.");
  }

  const [sourceMaterialization] = await db
    .select()
    .from(parentPacketMaterializationsTable)
    .where(
      and(
        eq(parentPacketMaterializationsTable.targetEntryId, sourceEntry.id),
        eq(parentPacketMaterializationsTable.uploaderUserId, sourceEntry.userId),
      ),
    );

  return { sourceEntry, sourceMaterialization };
}

async function upsertEventPromotionLink(
  sourceEntryId: number,
  sourceMaterializationId: number | null,
  assigneeUserId: string,
  dueDate: string | null | undefined,
  eventId: number,
  createdBy: string,
) {
  const targetContainerKey = `${assigneeUserId}:${dueDate ?? `event-${eventId}`}`;
  const [existingPromotion] = await db
    .select()
    .from(parentPacketPromotionsTable)
    .where(
      and(
        eq(parentPacketPromotionsTable.sourceEntryId, sourceEntryId),
        eq(parentPacketPromotionsTable.targetSurface, "events"),
        eq(parentPacketPromotionsTable.targetContainerKey, targetContainerKey),
      ),
    );

  if (existingPromotion) {
    if (existingPromotion.targetRecordId !== eventId || existingPromotion.targetItemId !== String(eventId)) {
      const [updatedPromotion] = await db
        .update(parentPacketPromotionsTable)
        .set({
          targetRecordId: eventId,
          targetItemId: String(eventId),
          updatedAt: new Date(),
        })
        .where(eq(parentPacketPromotionsTable.id, existingPromotion.id))
        .returning();
      return updatedPromotion;
    }
    return existingPromotion;
  }

  const [promotion] = await db
    .insert(parentPacketPromotionsTable)
    .values({
      sourceEntryId,
      sourceMaterializationId,
      targetSurface: "events",
      targetContainerKey,
      targetRecordId: eventId,
      targetItemId: String(eventId),
      status: "linked",
      createdBy,
    })
    .returning();

  return promotion;
}

async function findMatchingActiveAssignment(args: {
  sourceEntryId: number;
  assigneeUserId: string;
  effectiveDate: string;
  dueDate: string | null;
  projectionPolicy: BabyAssignmentProjectionPolicy;
}) {
  const rows = await db
    .select()
    .from(babyKbAssignmentsTable)
    .where(
      and(
        eq(babyKbAssignmentsTable.sourceEntryId, args.sourceEntryId),
        eq(babyKbAssignmentsTable.assigneeUserId, args.assigneeUserId),
        eq(babyKbAssignmentsTable.effectiveDate, args.effectiveDate),
        args.dueDate === null ? isNull(babyKbAssignmentsTable.dueDate) : eq(babyKbAssignmentsTable.dueDate, args.dueDate),
        eq(babyKbAssignmentsTable.projectionPolicy, args.projectionPolicy),
        ne(babyKbAssignmentsTable.lifecycleState, "completed"),
        ne(babyKbAssignmentsTable.lifecycleState, "superseded"),
      ),
    );

  return rows[0] ?? null;
}

async function createOrUpdateProjectedEvent(args: {
  assignmentId: number;
  existingEventId?: number | null;
  sourceEntry: typeof lifeLedgerBabyTable.$inferSelect;
  sourceMaterialization: typeof parentPacketMaterializationsTable.$inferSelect | undefined;
  assigneeUserId: string;
  dueDate: string;
  assignmentNotes: string | null | undefined;
  reminderPolicy: Record<string, unknown>;
  lifecycleState: BabyAssignmentLifecycleState;
}) {
  const label = getBabyAssignmentLabel(args.sourceEntry, args.sourceMaterialization);
  const eventPayload = {
    userId: args.assigneeUserId,
    tab: "events",
    name: label,
    tags: Array.from(new Set([...(Array.isArray(args.sourceEntry.tags) ? (args.sourceEntry.tags as string[]) : []), "baby_kb_assignment"])),
    impactLevel: args.sourceEntry.impactLevel,
    reviewWindow: args.sourceEntry.reviewWindow,
    dueDate: args.dueDate,
    notes: buildBabyEventNotes(args.sourceEntry, args.sourceMaterialization, args.assignmentNotes),
    sourceType: "baby_kb_assignment",
    sourceEntryId: args.sourceEntry.id,
    sourceAssignmentId: args.assignmentId,
    nextDueDate: args.dueDate,
    reminderPolicy: args.reminderPolicy,
    completionState: buildEventCompletionState(args.lifecycleState),
  };

  if (args.existingEventId) {
    const [updated] = await db
      .update(lifeLedgerEventsTable)
      .set({
        ...eventPayload,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(lifeLedgerEventsTable.id, args.existingEventId),
          eq(lifeLedgerEventsTable.userId, args.assigneeUserId),
        ),
      )
      .returning();

    if (updated) {
      return updated;
    }
  }

  const [created] = await db.insert(lifeLedgerEventsTable).values(eventPayload).returning();
  return created;
}

async function syncProjectedEventForAssignment(args: {
  assignmentId: number;
  sourceEntry: typeof lifeLedgerBabyTable.$inferSelect;
  sourceMaterialization: typeof parentPacketMaterializationsTable.$inferSelect | undefined;
  assigneeUserId: string;
  dueDate: string | null | undefined;
  assignmentNotes: string | null | undefined;
  reminderPolicy: Record<string, unknown>;
  lifecycleState: BabyAssignmentLifecycleState;
  projectionPolicy: BabyAssignmentProjectionPolicy;
  existingEventId?: number | null;
  createdBy: string;
}) {
  if (!args.dueDate || args.projectionPolicy === "hold") {
    return null;
  }

  const event = await createOrUpdateProjectedEvent({
    assignmentId: args.assignmentId,
    existingEventId: args.existingEventId,
    sourceEntry: args.sourceEntry,
    sourceMaterialization: args.sourceMaterialization,
    assigneeUserId: args.assigneeUserId,
    dueDate: args.dueDate,
    assignmentNotes: args.assignmentNotes,
    reminderPolicy: args.reminderPolicy,
    lifecycleState: args.lifecycleState,
  });

  await upsertEventPromotionLink(
    args.sourceEntry.id,
    args.sourceMaterialization?.id ?? null,
    args.assigneeUserId,
    args.dueDate,
    event.id,
    args.createdBy,
  );

  await markOnboardingSurfaceComplete(args.assigneeUserId, "life-ledger");
  return event;
}

function serializeAssignment(
  assignment: typeof babyKbAssignmentsTable.$inferSelect,
  extras?: Record<string, unknown>,
) {
  return {
    ...assignment,
    ...extras,
    effectiveLifecycleState: getEffectiveLifecycleState(assignment.lifecycleState as BabyAssignmentLifecycleState, assignment.dueDate),
    completedAt: assignment.completedAt?.toISOString() ?? null,
    supersededAt: assignment.supersededAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

async function maybeCreateSuccessorAssignment(args: {
  actorUserId: string;
  assignment: typeof babyKbAssignmentsTable.$inferSelect;
  sourceEntry: typeof lifeLedgerBabyTable.$inferSelect;
  sourceMaterialization: typeof parentPacketMaterializationsTable.$inferSelect | undefined;
}) {
  if (args.assignment.lifecycleState !== "completed" || !args.assignment.cadence || !args.assignment.dueDate) {
    return null;
  }

  const nextDueDate = addCadence(args.assignment.dueDate, args.assignment.cadence as BabyAssignmentCadence);
  const [successor] = await db
    .insert(babyKbAssignmentsTable)
    .values({
      sourceEntryId: args.assignment.sourceEntryId,
      sourceMaterializationId: args.assignment.sourceMaterializationId,
      assigneeUserId: args.assignment.assigneeUserId,
      lifecycleState: args.assignment.projectionPolicy === "hold" ? "assigned" : "scheduled",
      effectiveDate: nextDueDate,
      dueDate: nextDueDate,
      cadence: args.assignment.cadence,
      projectionPolicy: args.assignment.projectionPolicy,
      assignmentNotes: args.assignment.assignmentNotes,
      reminderPolicy: args.assignment.reminderPolicy,
      createdBy: args.actorUserId,
      updatedBy: args.actorUserId,
    })
    .returning();

  const successorEvent = await syncProjectedEventForAssignment({
    assignmentId: successor.id,
    sourceEntry: args.sourceEntry,
    sourceMaterialization: args.sourceMaterialization,
    assigneeUserId: successor.assigneeUserId,
    dueDate: successor.dueDate,
    assignmentNotes: successor.assignmentNotes,
    reminderPolicy: successor.reminderPolicy as Record<string, unknown>,
    lifecycleState: successor.lifecycleState as BabyAssignmentLifecycleState,
    projectionPolicy: successor.projectionPolicy as BabyAssignmentProjectionPolicy,
    createdBy: args.actorUserId,
  });

  if (successorEvent && successor.projectedEventId !== successorEvent.id) {
    await db
      .update(babyKbAssignmentsTable)
      .set({ projectedEventId: successorEvent.id, updatedBy: args.actorUserId, updatedAt: new Date() })
      .where(eq(babyKbAssignmentsTable.id, successor.id));
  }

  return successor;
}

export async function ensureBabyKbAssignmentSchema(): Promise<void> {
  if (!babyKbAssignmentSchemaReady) {
    babyKbAssignmentSchemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS baby_kb_assignments (
          id serial PRIMARY KEY,
          source_entry_id integer NOT NULL,
          source_materialization_id integer,
          assignee_user_id text NOT NULL,
          lifecycle_state text NOT NULL DEFAULT 'assigned',
          effective_date text NOT NULL,
          due_date text,
          cadence text,
          projection_policy text NOT NULL DEFAULT 'event_and_heroes',
          assignment_notes text,
          reminder_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
          projected_event_id integer,
          created_by text NOT NULL,
          updated_by text,
          completed_at timestamptz,
          superseded_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS baby_kb_assignments_source_entry_idx
        ON baby_kb_assignments (source_entry_id)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS baby_kb_assignments_assignee_state_idx
        ON baby_kb_assignments (assignee_user_id, lifecycle_state)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS baby_kb_assignments_assignee_due_idx
        ON baby_kb_assignments (assignee_user_id, due_date)
      `);

      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS source_type text`);
      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS source_entry_id integer`);
      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS source_assignment_id integer`);
      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS next_due_date text`);
      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS reminder_policy jsonb NOT NULL DEFAULT '{}'::jsonb`);
      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS completion_state text`);
      await db.execute(sql`ALTER TABLE life_ledger_events ADD COLUMN IF NOT EXISTS snoozed_until text`);
    })().catch((error) => {
      babyKbAssignmentSchemaReady = null;
      throw error;
    });
  }

  await babyKbAssignmentSchemaReady;
}

export async function listBabyKbAssignmentsForUser(adminUserId: string) {
  await ensureBabyKbAssignmentSchema();

  const rows = await db
    .select({
      assignment: babyKbAssignmentsTable,
      sourceEntryName: lifeLedgerBabyTable.name,
      sourceEntryNotes: lifeLedgerBabyTable.notes,
      sourceTags: lifeLedgerBabyTable.tags,
      sourcePath: parentPacketMaterializationsTable.sourcePath,
      sourceRecordKey: parentPacketMaterializationsTable.sourceRecordKey,
    })
    .from(babyKbAssignmentsTable)
    .innerJoin(lifeLedgerBabyTable, eq(babyKbAssignmentsTable.sourceEntryId, lifeLedgerBabyTable.id))
    .leftJoin(parentPacketMaterializationsTable, eq(babyKbAssignmentsTable.sourceMaterializationId, parentPacketMaterializationsTable.id))
    .where(eq(lifeLedgerBabyTable.userId, adminUserId));

  return rows
    .sort((a, b) => {
      const leftDue = a.assignment.dueDate ?? "9999-99-99";
      const rightDue = b.assignment.dueDate ?? "9999-99-99";
      return leftDue.localeCompare(rightDue) || a.assignment.id - b.assignment.id;
    })
    .map((row) =>
      serializeAssignment(row.assignment, {
        sourceEntryName: row.sourceEntryName,
        sourceEntryNotes: row.sourceEntryNotes,
        sourceTags: row.sourceTags,
        sourcePath: row.sourcePath,
        sourceRecordKey: row.sourceRecordKey,
      }),
    );
}

export async function createBabyKbAssignment(adminUserId: string, input: CreateBabyKbAssignmentInput) {
  await ensureBabyKbAssignmentSchema();

  if (!isValidDateString(input.effectiveDate)) {
    throw new Error("Effective date must be in YYYY-MM-DD format.");
  }
  if (input.dueDate && !isValidDateString(input.dueDate)) {
    throw new Error("Due date must be in YYYY-MM-DD format.");
  }

  const { sourceEntry, sourceMaterialization } = await getOwnedSourceContext(adminUserId, input.sourceEntryId);
  await validateAssigneeAccess(input.assigneeUserId);

  const projectionPolicy = input.projectionPolicy ?? "event_and_heroes";
  const lifecycleState = normalizeLifecycleState(input.lifecycleState, input.dueDate ?? null, projectionPolicy);
  const reminderPolicy = buildReminderPolicy(input.reminderPolicy, input.dueDate ?? null);

  const existingAssignment = await findMatchingActiveAssignment({
    sourceEntryId: sourceEntry.id,
    assigneeUserId: input.assigneeUserId,
    effectiveDate: input.effectiveDate,
    dueDate: input.dueDate ?? null,
    projectionPolicy,
  });

  if (existingAssignment) {
    const [updatedExisting] = await db
      .update(babyKbAssignmentsTable)
      .set({
        lifecycleState,
        cadence: input.cadence ?? existingAssignment.cadence,
        assignmentNotes: input.assignmentNotes ?? existingAssignment.assignmentNotes,
        reminderPolicy,
        updatedBy: adminUserId,
        updatedAt: new Date(),
      })
      .where(eq(babyKbAssignmentsTable.id, existingAssignment.id))
      .returning();

    const projectedEvent = await syncProjectedEventForAssignment({
      assignmentId: updatedExisting.id,
      existingEventId: updatedExisting.projectedEventId,
      sourceEntry,
      sourceMaterialization,
      assigneeUserId: updatedExisting.assigneeUserId,
      dueDate: updatedExisting.dueDate,
      assignmentNotes: updatedExisting.assignmentNotes,
      reminderPolicy: updatedExisting.reminderPolicy as Record<string, unknown>,
      lifecycleState: updatedExisting.lifecycleState as BabyAssignmentLifecycleState,
      projectionPolicy: updatedExisting.projectionPolicy as BabyAssignmentProjectionPolicy,
      createdBy: adminUserId,
    });

    const finalExisting =
      projectedEvent && updatedExisting.projectedEventId !== projectedEvent.id
        ? (
            await db
              .update(babyKbAssignmentsTable)
              .set({ projectedEventId: projectedEvent.id, updatedBy: adminUserId, updatedAt: new Date() })
              .where(eq(babyKbAssignmentsTable.id, updatedExisting.id))
              .returning()
          )[0]
        : updatedExisting;

    return serializeAssignment(finalExisting, {
      sourceEntryName: sourceEntry.name,
      sourceEntryNotes: sourceEntry.notes,
      sourceTags: sourceEntry.tags,
      sourcePath: sourceMaterialization?.sourcePath ?? null,
      sourceRecordKey: sourceMaterialization?.sourceRecordKey ?? null,
    });
  }

  const [assignment] = await db
    .insert(babyKbAssignmentsTable)
    .values({
      sourceEntryId: sourceEntry.id,
      sourceMaterializationId: sourceMaterialization?.id ?? null,
      assigneeUserId: input.assigneeUserId,
      lifecycleState,
      effectiveDate: input.effectiveDate,
      dueDate: input.dueDate ?? null,
      cadence: input.cadence ?? null,
      projectionPolicy,
      assignmentNotes: input.assignmentNotes ?? null,
      reminderPolicy,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .returning();

  const projectedEvent = await syncProjectedEventForAssignment({
    assignmentId: assignment.id,
    sourceEntry,
    sourceMaterialization,
    assigneeUserId: assignment.assigneeUserId,
    dueDate: assignment.dueDate,
    assignmentNotes: assignment.assignmentNotes,
    reminderPolicy: assignment.reminderPolicy as Record<string, unknown>,
    lifecycleState: assignment.lifecycleState as BabyAssignmentLifecycleState,
    projectionPolicy: assignment.projectionPolicy as BabyAssignmentProjectionPolicy,
    createdBy: adminUserId,
  });

  const finalAssignment =
    projectedEvent && assignment.projectedEventId !== projectedEvent.id
      ? (
          await db
            .update(babyKbAssignmentsTable)
            .set({ projectedEventId: projectedEvent.id, updatedBy: adminUserId, updatedAt: new Date() })
            .where(eq(babyKbAssignmentsTable.id, assignment.id))
            .returning()
        )[0]
      : assignment;

  return serializeAssignment(finalAssignment, {
    sourceEntryName: sourceEntry.name,
    sourceEntryNotes: sourceEntry.notes,
    sourceTags: sourceEntry.tags,
    sourcePath: sourceMaterialization?.sourcePath ?? null,
    sourceRecordKey: sourceMaterialization?.sourceRecordKey ?? null,
  });
}

export async function updateBabyKbAssignment(adminUserId: string, assignmentId: number, patch: UpdateBabyKbAssignmentInput) {
  await ensureBabyKbAssignmentSchema();

  const [existingAssignment] = await db.select().from(babyKbAssignmentsTable).where(eq(babyKbAssignmentsTable.id, assignmentId));
  if (!existingAssignment) {
    throw new Error("Baby KB assignment not found.");
  }

  const { sourceEntry, sourceMaterialization } = await getOwnedSourceContext(adminUserId, existingAssignment.sourceEntryId);
  const assigneeUserId = patch.assigneeUserId ?? existingAssignment.assigneeUserId;
  await validateAssigneeAccess(assigneeUserId);

  if (patch.effectiveDate && !isValidDateString(patch.effectiveDate)) {
    throw new Error("Effective date must be in YYYY-MM-DD format.");
  }
  if (patch.dueDate && !isValidDateString(patch.dueDate)) {
    throw new Error("Due date must be in YYYY-MM-DD format.");
  }

  const dueDate = patch.dueDate === undefined ? existingAssignment.dueDate : patch.dueDate;
  const projectionPolicy = patch.projectionPolicy ?? (existingAssignment.projectionPolicy as BabyAssignmentProjectionPolicy);
  const lifecycleState = patch.lifecycleState ?? (existingAssignment.lifecycleState as BabyAssignmentLifecycleState);
  const reminderPolicy = buildReminderPolicy(
    patch.reminderPolicy ?? (existingAssignment.reminderPolicy as Record<string, unknown>),
    dueDate,
  );

  const [updatedAssignment] = await db
    .update(babyKbAssignmentsTable)
    .set({
      assigneeUserId,
      effectiveDate: patch.effectiveDate ?? existingAssignment.effectiveDate,
      dueDate,
      cadence: patch.cadence === undefined ? existingAssignment.cadence : patch.cadence,
      projectionPolicy,
      lifecycleState,
      assignmentNotes: patch.assignmentNotes === undefined ? existingAssignment.assignmentNotes : patch.assignmentNotes,
      reminderPolicy,
      updatedBy: adminUserId,
      completedAt: lifecycleState === "completed" ? existingAssignment.completedAt ?? new Date() : null,
      supersededAt: lifecycleState === "superseded" ? existingAssignment.supersededAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(babyKbAssignmentsTable.id, assignmentId))
    .returning();

  const projectedEvent = await syncProjectedEventForAssignment({
    assignmentId: updatedAssignment.id,
    existingEventId: updatedAssignment.projectedEventId,
    sourceEntry,
    sourceMaterialization,
    assigneeUserId: updatedAssignment.assigneeUserId,
    dueDate: updatedAssignment.dueDate,
    assignmentNotes: updatedAssignment.assignmentNotes,
    reminderPolicy: updatedAssignment.reminderPolicy as Record<string, unknown>,
    lifecycleState: updatedAssignment.lifecycleState as BabyAssignmentLifecycleState,
    projectionPolicy: updatedAssignment.projectionPolicy as BabyAssignmentProjectionPolicy,
    createdBy: adminUserId,
  });

  let finalAssignment =
    projectedEvent && updatedAssignment.projectedEventId !== projectedEvent.id
      ? (
          await db
            .update(babyKbAssignmentsTable)
            .set({ projectedEventId: projectedEvent.id, updatedBy: adminUserId, updatedAt: new Date() })
            .where(eq(babyKbAssignmentsTable.id, assignmentId))
            .returning()
        )[0]
      : updatedAssignment;

  await maybeCreateSuccessorAssignment({
    actorUserId: adminUserId,
    assignment: finalAssignment,
    sourceEntry,
    sourceMaterialization,
  });

  return serializeAssignment(finalAssignment, {
    sourceEntryName: sourceEntry.name,
    sourceEntryNotes: sourceEntry.notes,
    sourceTags: sourceEntry.tags,
    sourcePath: sourceMaterialization?.sourcePath ?? null,
    sourceRecordKey: sourceMaterialization?.sourceRecordKey ?? null,
  });
}

export async function syncBabyKbAssignmentLifecycleForAssignee(args: {
  assigneeUserId: string;
  assignmentId: number;
  lifecycleState: Extract<BabyAssignmentLifecycleState, "scheduled" | "in_motion" | "completed" | "superseded">;
}) {
  await ensureBabyKbAssignmentSchema();

  const [existingAssignment] = await db
    .select()
    .from(babyKbAssignmentsTable)
    .where(
      and(
        eq(babyKbAssignmentsTable.id, args.assignmentId),
        eq(babyKbAssignmentsTable.assigneeUserId, args.assigneeUserId),
      ),
    );

  if (!existingAssignment) {
    throw new Error("Baby KB assignment not found.");
  }

  const { sourceEntry, sourceMaterialization } = await getSourceContextByEntryId(existingAssignment.sourceEntryId);

  const [updatedAssignment] = await db
    .update(babyKbAssignmentsTable)
    .set({
      lifecycleState: args.lifecycleState,
      updatedBy: args.assigneeUserId,
      completedAt: args.lifecycleState === "completed" ? existingAssignment.completedAt ?? new Date() : null,
      supersededAt: args.lifecycleState === "superseded" ? existingAssignment.supersededAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(babyKbAssignmentsTable.id, args.assignmentId))
    .returning();

  const projectedEvent = await syncProjectedEventForAssignment({
    assignmentId: updatedAssignment.id,
    existingEventId: updatedAssignment.projectedEventId,
    sourceEntry,
    sourceMaterialization,
    assigneeUserId: updatedAssignment.assigneeUserId,
    dueDate: updatedAssignment.dueDate,
    assignmentNotes: updatedAssignment.assignmentNotes,
    reminderPolicy: updatedAssignment.reminderPolicy as Record<string, unknown>,
    lifecycleState: updatedAssignment.lifecycleState as BabyAssignmentLifecycleState,
    projectionPolicy: updatedAssignment.projectionPolicy as BabyAssignmentProjectionPolicy,
    createdBy: args.assigneeUserId,
  });

  const finalAssignment =
    projectedEvent && updatedAssignment.projectedEventId !== projectedEvent.id
      ? (
          await db
            .update(babyKbAssignmentsTable)
            .set({ projectedEventId: projectedEvent.id, updatedBy: args.assigneeUserId, updatedAt: new Date() })
            .where(eq(babyKbAssignmentsTable.id, updatedAssignment.id))
            .returning()
        )[0]
      : updatedAssignment;

  await maybeCreateSuccessorAssignment({
    actorUserId: args.assigneeUserId,
    assignment: finalAssignment,
    sourceEntry,
    sourceMaterialization,
  });

  return serializeAssignment(finalAssignment, {
    sourceEntryName: sourceEntry.name,
    sourceEntryNotes: sourceEntry.notes,
    sourceTags: sourceEntry.tags,
    sourcePath: sourceMaterialization?.sourcePath ?? null,
    sourceRecordKey: sourceMaterialization?.sourceRecordKey ?? null,
  });
}

export async function syncBabyKbAssignmentReminderPolicyForAssignee(args: {
  assigneeUserId: string;
  assignmentId: number;
  reminderPolicy: Record<string, unknown>;
}) {
  await ensureBabyKbAssignmentSchema();

  const [existingAssignment] = await db
    .select()
    .from(babyKbAssignmentsTable)
    .where(
      and(
        eq(babyKbAssignmentsTable.id, args.assignmentId),
        eq(babyKbAssignmentsTable.assigneeUserId, args.assigneeUserId),
      ),
    );

  if (!existingAssignment) {
    throw new Error("Baby KB assignment not found.");
  }

  const { sourceEntry, sourceMaterialization } = await getSourceContextByEntryId(existingAssignment.sourceEntryId);

  const [updatedAssignment] = await db
    .update(babyKbAssignmentsTable)
    .set({
      reminderPolicy: args.reminderPolicy,
      updatedBy: args.assigneeUserId,
      updatedAt: new Date(),
    })
    .where(eq(babyKbAssignmentsTable.id, args.assignmentId))
    .returning();

  const projectedEvent = await syncProjectedEventForAssignment({
    assignmentId: updatedAssignment.id,
    existingEventId: updatedAssignment.projectedEventId,
    sourceEntry,
    sourceMaterialization,
    assigneeUserId: updatedAssignment.assigneeUserId,
    dueDate: updatedAssignment.dueDate,
    assignmentNotes: updatedAssignment.assignmentNotes,
    reminderPolicy: updatedAssignment.reminderPolicy as Record<string, unknown>,
    lifecycleState: updatedAssignment.lifecycleState as BabyAssignmentLifecycleState,
    projectionPolicy: updatedAssignment.projectionPolicy as BabyAssignmentProjectionPolicy,
    createdBy: args.assigneeUserId,
  });

  const finalAssignment =
    projectedEvent && updatedAssignment.projectedEventId !== projectedEvent.id
      ? (
          await db
            .update(babyKbAssignmentsTable)
            .set({ projectedEventId: projectedEvent.id, updatedBy: args.assigneeUserId, updatedAt: new Date() })
            .where(eq(babyKbAssignmentsTable.id, updatedAssignment.id))
            .returning()
        )[0]
      : updatedAssignment;

  return serializeAssignment(finalAssignment, {
    sourceEntryName: sourceEntry.name,
    sourceEntryNotes: sourceEntry.notes,
    sourceTags: sourceEntry.tags,
    sourcePath: sourceMaterialization?.sourcePath ?? null,
    sourceRecordKey: sourceMaterialization?.sourceRecordKey ?? null,
  });
}

export async function getBabyKbHeroConsequencesForUser(userId: string) {
  await ensureBabyKbAssignmentSchema();

  const today = getTodayDateString();
  const nextTwoDays = getDateDaysFromToday(2);
  const weekEnd = getWeekEndDateString();
  const nextNinetyDays = getDateDaysFromToday(90);

  const rows = await db
    .select({
      id: lifeLedgerEventsTable.id,
      name: lifeLedgerEventsTable.name,
      dueDate: lifeLedgerEventsTable.dueDate,
      completionState: lifeLedgerEventsTable.completionState,
      sourceAssignmentId: lifeLedgerEventsTable.sourceAssignmentId,
    })
    .from(lifeLedgerEventsTable)
    .where(
      and(
        eq(lifeLedgerEventsTable.userId, userId),
        eq(lifeLedgerEventsTable.sourceType, "baby_kb_assignment"),
        isNotNull(lifeLedgerEventsTable.dueDate),
        gte(lifeLedgerEventsTable.dueDate, today),
        lte(lifeLedgerEventsTable.dueDate, nextNinetyDays),
      ),
    );

  const activeRows = rows.filter((row) => row.completionState !== "completed" && row.completionState !== "superseded");
  activeRows.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return {
    daily: activeRows.filter((row) => isDateWithinWindow(row.dueDate, today, nextTwoDays)),
    weekly: activeRows.filter((row) => isDateWithinWindow(row.dueDate, today, weekEnd)),
    vision: activeRows.filter((row) => row.dueDate && row.dueDate > weekEnd),
  };
}
