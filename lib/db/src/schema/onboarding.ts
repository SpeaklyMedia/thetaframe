import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const onboardingProgressTable = pgTable("onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  surface: text("surface").notNull(),
  completionState: text("completion_state").notNull().default("pending"),
  firstShownAt: timestamp("first_shown_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("onboarding_progress_user_surface_idx").on(table.userId, table.surface),
]);

export type OnboardingProgress = typeof onboardingProgressTable.$inferSelect;
