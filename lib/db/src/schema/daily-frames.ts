import { pgTable, text, serial, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyFramesTable = pgTable("daily_frames", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  colourState: text("colour_state").notNull().default("green"),
  tierA: jsonb("tier_a").notNull().default([]),
  tierB: jsonb("tier_b").notNull().default([]),
  timeBlocks: jsonb("time_blocks").notNull().default([]),
  microWin: text("micro_win"),
  skipProtocolUsed: boolean("skip_protocol_used").notNull().default(false),
  skipProtocolChoice: text("skip_protocol_choice"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("daily_frames_user_date_idx").on(table.userId, table.date),
]);

export const insertDailyFrameSchema = createInsertSchema(dailyFramesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyFrame = z.infer<typeof insertDailyFrameSchema>;
export type DailyFrame = typeof dailyFramesTable.$inferSelect;
