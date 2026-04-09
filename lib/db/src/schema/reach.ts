import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const reachFilesTable = pgTable("reach_files", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  fileType: text("file_type"),
  sizeBytes: integer("size_bytes"),
  objectPath: text("object_path").notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const pendingUploadsTable = pgTable("pending_uploads", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  objectPath: text("object_path").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReachFile = typeof reachFilesTable.$inferSelect;
export type PendingUpload = typeof pendingUploadsTable.$inferSelect;
