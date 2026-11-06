import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  familyCareContextsTable,
  familyCareEventRevisionsTable,
  familyCareEventsTable,
  familyCareHandoffsTable,
  type FamilyCareEvent,
  type FamilyCareEventSnapshot,
} from "@workspace/db";

const minuteSchema = z.number().int().min(0).max(1439);
const shortText = z.string().trim().max(120);
const noteText = z.string().trim().max(1000);
const optionalShortText = shortText.nullable().optional();
const optionalNoteText = noteText.nullable().optional();
const volumeMlSchema = z.number().int().min(0).max(2000);
const isoInstantSchema = z.string().datetime({ offset: true });

export const familyCareContextBodySchema = z
  .object({
    displayLabel: z.string().trim().min(1).max(80),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      }, "Timezone must be a valid IANA timezone."),
    caregiverALabel: z.string().trim().min(1).max(80),
    caregiverBLabel: z.string().trim().min(1).max(80),
    nightStartMinute: minuteSchema,
    handoffMinute: minuteSchema,
    morningWakeMinute: minuteSchema,
  })
  .strict();

const feedDataSchema = z
  .object({
    method: z.enum(["nursing", "bottle", "other"]),
    contents: z.enum(["breast_milk", "formula", "other", "unknown"]).optional(),
    offeredMl: volumeMlSchema.nullable().optional(),
    consumedMl: volumeMlSchema.nullable().optional(),
    continuation: z.boolean().optional(),
    notes: noteText.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.method === "nursing" && (value.offeredMl != null || value.consumedMl != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nursing volume must remain unknown; do not record it as zero or an estimate.",
      });
    }
    if (value.offeredMl != null && value.consumedMl != null && value.consumedMl > value.offeredMl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Consumed volume cannot exceed offered volume.",
      });
    }
  });

const diaperDataSchema = z
  .object({
    wet: z.boolean(),
    stool: z.boolean(),
    color: optionalShortText,
    consistency: optionalShortText,
    notes: optionalNoteText,
  })
  .strict()
  .refine((value) => value.wet || value.stool, "Select wet and/or stool.");

const sleepDataSchema = z.object({ notes: optionalNoteText }).strict();

const pumpDataSchema = z
  .object({
    expressedMl: volumeMlSchema.nullable().optional(),
    durationMinutes: z.number().int().min(1).max(240).nullable().optional(),
    side: z.enum(["left", "right", "both", "not_recorded"]).optional(),
    notes: optionalNoteText,
  })
  .strict();

const generalNoteDataSchema = z
  .object({
    category: z.enum(["general", "medicine", "supplement", "milestone", "meal"]),
    title: z.string().trim().min(1).max(120),
    notes: optionalNoteText,
  })
  .strict();

const baseEventFields = {
  observedAt: isoInstantSchema,
  endedAt: isoInstantSchema.nullable().optional(),
};

export const familyCareEventInputSchema = z
  .discriminatedUnion("kind", [
    z.object({ ...baseEventFields, kind: z.literal("feed"), data: feedDataSchema }).strict(),
    z.object({ ...baseEventFields, kind: z.literal("diaper"), data: diaperDataSchema }).strict(),
    z.object({ ...baseEventFields, kind: z.literal("sleep"), data: sleepDataSchema }).strict(),
    z.object({ ...baseEventFields, kind: z.literal("pump"), data: pumpDataSchema }).strict(),
    z.object({ ...baseEventFields, kind: z.literal("note"), data: generalNoteDataSchema }).strict(),
  ])
  .superRefine((value, ctx) => {
    const observedAt = new Date(value.observedAt);
    const futureLimit = Date.now() + 5 * 60 * 1000;
    if (observedAt.getTime() > futureLimit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Observed time cannot be in the future." });
    }
    if (value.kind !== "sleep" && value.endedAt != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only sleep events may include an end time." });
    }
    if (value.endedAt && new Date(value.endedAt) <= observedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sleep end must be after sleep start." });
    }
    if (value.endedAt && new Date(value.endedAt).getTime() > futureLimit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sleep end cannot be in the future." });
    }
  });

export const createFamilyCareEventBodySchema = z
  .object({
    clientEventId: z.string().trim().min(8).max(120),
    kind: z.unknown(),
    observedAt: z.unknown(),
    endedAt: z.unknown().optional(),
    data: z.unknown(),
  })
  .strict()
  .transform((value, ctx) => {
    const { clientEventId, ...eventCandidate } = value;
    const event = familyCareEventInputSchema.safeParse(eventCandidate);
    if (!event.success) {
      for (const issue of event.error.issues) {
        ctx.addIssue(issue);
      }
      return z.NEVER;
    }
    return { clientEventId, ...event.data };
  });

export const familyCareEventIdParamsSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

export const familyCareHandoffBodySchema = z
  .object({
    currentCaregiverLabel: optionalShortText,
    lastConfirmedAction: optionalNoteText,
    nextAction: optionalNoteText,
    watchFor: optionalNoteText,
    canWait: optionalNoteText,
    supportNeeded: optionalNoteText,
  })
  .strict();

export class FamilyCareValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function eventSnapshot(event: FamilyCareEvent): FamilyCareEventSnapshot {
  return {
    id: event.id,
    clientEventId: event.clientEventId,
    kind: event.kind,
    observedAt: event.observedAt.toISOString(),
    endedAt: event.endedAt?.toISOString() ?? null,
    sourceClass: event.sourceClass,
    data: event.data,
    deletedAt: event.deletedAt?.toISOString() ?? null,
  };
}

function defaultContext() {
  return {
    id: null,
    displayLabel: "Family Care",
    timezone: "UTC",
    caregiverALabel: "Caregiver A",
    caregiverBLabel: "Caregiver B",
    nightStartMinute: 1200,
    handoffMinute: 0,
    morningWakeMinute: 240,
    createdAt: null,
    updatedAt: null,
  };
}

function defaultHandoff() {
  return {
    id: null,
    currentCaregiverLabel: null,
    lastConfirmedAction: null,
    nextAction: null,
    watchFor: null,
    canWait: null,
    supportNeeded: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function getFamilyCareForUser(userId: string) {
  const [[context], events, [handoff]] = await Promise.all([
    db.select().from(familyCareContextsTable).where(eq(familyCareContextsTable.userId, userId)),
    db
      .select()
      .from(familyCareEventsTable)
      .where(and(eq(familyCareEventsTable.userId, userId), isNull(familyCareEventsTable.deletedAt)))
      .orderBy(desc(familyCareEventsTable.observedAt))
      .limit(200),
    db.select().from(familyCareHandoffsTable).where(eq(familyCareHandoffsTable.userId, userId)),
  ]);

  return {
    context: context ?? defaultContext(),
    events,
    handoff: handoff ?? defaultHandoff(),
    accessNotice: "Private to this account. Shared household access is not enabled yet.",
  };
}

export async function upsertFamilyCareContextForUser(
  userId: string,
  data: z.infer<typeof familyCareContextBodySchema>,
) {
  const [context] = await db
    .insert(familyCareContextsTable)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: [familyCareContextsTable.userId],
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return context;
}

export async function createFamilyCareEventForUser(
  userId: string,
  data: z.infer<typeof createFamilyCareEventBodySchema>,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(familyCareEventsTable)
      .values({
        userId,
        clientEventId: data.clientEventId,
        kind: data.kind,
        observedAt: new Date(data.observedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
        data: data.data,
      })
      .onConflictDoNothing({
        target: [familyCareEventsTable.userId, familyCareEventsTable.clientEventId],
      })
      .returning();

    if (created) {
      await tx.insert(familyCareEventRevisionsTable).values({
        eventId: created.id,
        userId,
        action: "create",
        before: null,
        after: eventSnapshot(created),
      });
      return created;
    }

    const [existing] = await tx
      .select()
      .from(familyCareEventsTable)
      .where(
        and(
          eq(familyCareEventsTable.userId, userId),
          eq(familyCareEventsTable.clientEventId, data.clientEventId),
          isNull(familyCareEventsTable.deletedAt),
        ),
      );
    if (!existing) {
      throw new FamilyCareValidationError(409, "The duplicate event id refers to a deleted event.");
    }
    return existing;
  });
}

async function requireOwnedEvent(
  executor: Pick<typeof db, "select">,
  userId: string,
  eventId: number,
) {
  const [event] = await executor
    .select()
    .from(familyCareEventsTable)
    .where(
      and(
        eq(familyCareEventsTable.id, eventId),
        eq(familyCareEventsTable.userId, userId),
        isNull(familyCareEventsTable.deletedAt),
      ),
    );
  if (!event) {
    throw new FamilyCareValidationError(404, "Care event not found.");
  }
  return event;
}

export async function updateFamilyCareEventForUser(args: {
  userId: string;
  eventId: number;
  data: z.infer<typeof familyCareEventInputSchema>;
}) {
  return db.transaction(async (tx) => {
    const before = await requireOwnedEvent(tx, args.userId, args.eventId);
    const [updated] = await tx
      .update(familyCareEventsTable)
      .set({
        kind: args.data.kind,
        observedAt: new Date(args.data.observedAt),
        endedAt: args.data.endedAt ? new Date(args.data.endedAt) : null,
        data: args.data.data,
        updatedAt: new Date(),
      })
      .where(and(eq(familyCareEventsTable.id, args.eventId), eq(familyCareEventsTable.userId, args.userId)))
      .returning();
    await tx.insert(familyCareEventRevisionsTable).values({
      eventId: updated.id,
      userId: args.userId,
      action: "update",
      before: eventSnapshot(before),
      after: eventSnapshot(updated),
    });
    return updated;
  });
}

export async function deleteFamilyCareEventForUser(userId: string, eventId: number) {
  return db.transaction(async (tx) => {
    const before = await requireOwnedEvent(tx, userId, eventId);
    const [deleted] = await tx
      .update(familyCareEventsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(familyCareEventsTable.id, eventId), eq(familyCareEventsTable.userId, userId)))
      .returning();
    await tx.insert(familyCareEventRevisionsTable).values({
      eventId: deleted.id,
      userId,
      action: "delete",
      before: eventSnapshot(before),
      after: eventSnapshot(deleted),
    });
  });
}

export async function upsertFamilyCareHandoffForUser(
  userId: string,
  data: z.infer<typeof familyCareHandoffBodySchema>,
) {
  const values = {
    currentCaregiverLabel: cleanText(data.currentCaregiverLabel),
    lastConfirmedAction: cleanText(data.lastConfirmedAction),
    nextAction: cleanText(data.nextAction),
    watchFor: cleanText(data.watchFor),
    canWait: cleanText(data.canWait),
    supportNeeded: cleanText(data.supportNeeded),
  };
  const [handoff] = await db
    .insert(familyCareHandoffsTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [familyCareHandoffsTable.userId],
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return handoff;
}
