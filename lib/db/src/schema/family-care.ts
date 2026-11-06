import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type FamilyCareEventData = Record<string, unknown>;
export type FamilyCareEventSnapshot = {
  id: number;
  clientEventId: string;
  kind: string;
  observedAt: string;
  endedAt: string | null;
  sourceClass: string;
  data: FamilyCareEventData;
  deletedAt: string | null;
};

export const familyCareContextsTable = pgTable(
  "family_care_contexts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    displayLabel: text("display_label").notNull().default("Family Care"),
    timezone: text("timezone").notNull().default("UTC"),
    caregiverALabel: text("caregiver_a_label").notNull().default("Caregiver A"),
    caregiverBLabel: text("caregiver_b_label").notNull().default("Caregiver B"),
    nightStartMinute: integer("night_start_minute").notNull().default(1200),
    handoffMinute: integer("handoff_minute").notNull().default(0),
    morningWakeMinute: integer("morning_wake_minute").notNull().default(240),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("family_care_contexts_user_idx").on(table.userId),
    check("family_care_contexts_night_start_check", sql`${table.nightStartMinute} between 0 and 1439`),
    check("family_care_contexts_handoff_check", sql`${table.handoffMinute} between 0 and 1439`),
    check("family_care_contexts_wake_check", sql`${table.morningWakeMinute} between 0 and 1439`),
  ],
);

export const familyCareEventsTable = pgTable(
  "family_care_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    clientEventId: text("client_event_id").notNull(),
    kind: text("kind").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    sourceClass: text("source_class").notNull().default("caregiver_observation"),
    data: jsonb("data").$type<FamilyCareEventData>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("family_care_events_user_client_idx").on(table.userId, table.clientEventId),
    index("family_care_events_user_observed_idx").on(table.userId, table.observedAt),
    check("family_care_events_kind_check", sql`${table.kind} in ('feed', 'diaper', 'sleep', 'pump', 'note')`),
    check("family_care_events_source_check", sql`${table.sourceClass} = 'caregiver_observation'`),
    check("family_care_events_time_check", sql`${table.endedAt} is null or ${table.endedAt} > ${table.observedAt}`),
  ],
);

export const familyCareEventRevisionsTable = pgTable(
  "family_care_event_revisions",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before").$type<FamilyCareEventSnapshot | null>(),
    after: jsonb("after").$type<FamilyCareEventSnapshot | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("family_care_event_revisions_owner_event_idx").on(table.userId, table.eventId),
    check("family_care_event_revisions_action_check", sql`${table.action} in ('create', 'update', 'delete')`),
  ],
);

export const familyCareHandoffsTable = pgTable(
  "family_care_handoffs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    currentCaregiverLabel: text("current_caregiver_label"),
    lastConfirmedAction: text("last_confirmed_action"),
    nextAction: text("next_action"),
    watchFor: text("watch_for"),
    canWait: text("can_wait"),
    supportNeeded: text("support_needed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("family_care_handoffs_user_idx").on(table.userId)],
);

export const insertFamilyCareContextSchema = createInsertSchema(familyCareContextsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFamilyCareEventSchema = createInsertSchema(familyCareEventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFamilyCareHandoffSchema = createInsertSchema(familyCareHandoffsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FamilyCareContext = typeof familyCareContextsTable.$inferSelect;
export type FamilyCareEvent = typeof familyCareEventsTable.$inferSelect;
export type FamilyCareHandoff = typeof familyCareHandoffsTable.$inferSelect;
export type InsertFamilyCareContext = z.infer<typeof insertFamilyCareContextSchema>;
export type InsertFamilyCareEvent = z.infer<typeof insertFamilyCareEventSchema>;
export type InsertFamilyCareHandoff = z.infer<typeof insertFamilyCareHandoffSchema>;
