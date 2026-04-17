import { pgTable, text, serial, timestamp, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const parentPacketImportRunsTable = pgTable("parent_packet_import_runs", {
  id: serial("id").primaryKey(),
  uploaderUserId: text("uploader_user_id").notNull(),
  sourceReachFileId: integer("source_reach_file_id").notNull(),
  sourceReachFileName: text("source_reach_file_name").notNull(),
  sourceObjectPath: text("source_object_path").notNull(),
  packetKey: text("packet_key").notNull(),
  packetVersion: text("packet_version").notNull(),
  importScope: text("import_scope").notNull(),
  status: text("status").notNull().default("completed"),
  summary: jsonb("summary").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const parentPacketMaterializationsTable = pgTable(
  "parent_packet_materializations",
  {
    id: serial("id").primaryKey(),
    uploaderUserId: text("uploader_user_id").notNull(),
    latestImportRunId: integer("latest_import_run_id").notNull(),
    sourceReachFileId: integer("source_reach_file_id").notNull(),
    packetKey: text("packet_key").notNull(),
    sourcePath: text("source_path").notNull(),
    sourceRecordKey: text("source_record_key").notNull().default(""),
    targetKind: text("target_kind").notNull(),
    targetTab: text("target_tab").notNull(),
    targetEntryId: integer("target_entry_id").notNull(),
    contentType: text("content_type").notNull(),
    status: text("status").notNull().default("materialized"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    sourceUnique: uniqueIndex("parent_packet_materializations_source_idx").on(
      table.uploaderUserId,
      table.packetKey,
      table.sourcePath,
      table.sourceRecordKey,
    ),
  }),
);

export type ParentPacketImportRun = typeof parentPacketImportRunsTable.$inferSelect;
export type ParentPacketMaterialization = typeof parentPacketMaterializationsTable.$inferSelect;
