import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPreferencesTable = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  reducedStimulation: text("reduced_stimulation").notNull().default("default"),
  density: text("density").notNull().default("comfortable"),
  reminderTone: text("reminder_tone").notNull().default("gentle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferencesTable.$inferSelect;
