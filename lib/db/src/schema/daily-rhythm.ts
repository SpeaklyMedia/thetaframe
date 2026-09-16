import {
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const routineSessionsTable = pgTable(
  "routine_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    routineKey: text("routine_key").notNull(),
    mode: text("mode").notNull().default("full"),
    completedStepKeys: jsonb("completed_step_keys")
      .$type<string[]>()
      .notNull()
      .default([]),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completionState: text("completion_state").notNull().default("not_started"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("routine_sessions_user_date_key_idx").on(
      table.userId,
      table.date,
      table.routineKey,
    ),
  ],
);

export const dailyReflectionsTable = pgTable(
  "daily_reflections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    slipped: text("slipped"),
    learned: text("learned"),
    firstActionTomorrow: text("first_action_tomorrow"),
    prepNote: text("prep_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("daily_reflections_user_date_idx").on(table.userId, table.date),
  ],
);

export const insertRoutineSessionSchema = createInsertSchema(
  routineSessionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyReflectionSchema = createInsertSchema(
  dailyReflectionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertRoutineSession = z.infer<typeof insertRoutineSessionSchema>;
export type RoutineSession = typeof routineSessionsTable.$inferSelect;
export type InsertDailyReflection = z.infer<typeof insertDailyReflectionSchema>;
export type DailyReflection = typeof dailyReflectionsTable.$inferSelect;
