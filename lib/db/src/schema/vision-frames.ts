import { pgTable, text, serial, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visionFramesTable = pgTable("vision_frames", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  goals: jsonb("goals").notNull().default([]),
  nextSteps: jsonb("next_steps").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVisionFrameSchema = createInsertSchema(visionFramesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVisionFrame = z.infer<typeof insertVisionFrameSchema>;
export type VisionFrame = typeof visionFramesTable.$inferSelect;
