import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userModesTable = pgTable("user_modes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  mode: text("mode").notNull().default("explore"),
  colourState: text("colour_state").notNull().default("green"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserModeSchema = createInsertSchema(userModesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserMode = z.infer<typeof insertUserModeSchema>;
export type UserMode = typeof userModesTable.$inferSelect;
