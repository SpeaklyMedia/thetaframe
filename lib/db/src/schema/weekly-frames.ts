import { pgTable, text, serial, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

type WeeklyStepRecord = {
  id: string;
  text: string;
  completed: boolean;
  emoji?: string | null;
};

export const weeklyFramesTable = pgTable("weekly_frames", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  weekStart: text("week_start").notNull(),
  theme: text("theme"),
  steps: jsonb("steps").$type<WeeklyStepRecord[]>().notNull().default([]),
  nonNegotiables: jsonb("non_negotiables").$type<WeeklyStepRecord[]>().notNull().default([]),
  recoveryPlan: text("recovery_plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("weekly_frames_user_week_idx").on(table.userId, table.weekStart),
]);

export const insertWeeklyFrameSchema = createInsertSchema(weeklyFramesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeeklyFrame = z.infer<typeof insertWeeklyFrameSchema>;
export type WeeklyFrame = typeof weeklyFramesTable.$inferSelect;
