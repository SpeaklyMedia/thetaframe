import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const parentPacketPromotionsTable = pgTable(
  "parent_packet_promotions",
  {
    id: serial("id").primaryKey(),
    sourceEntryId: integer("source_entry_id").notNull(),
    sourceMaterializationId: integer("source_materialization_id"),
    targetSurface: text("target_surface").notNull(),
    targetContainerKey: text("target_container_key").notNull(),
    targetRecordId: integer("target_record_id").notNull(),
    targetItemId: text("target_item_id").notNull(),
    status: text("status").notNull().default("linked"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    sourceTargetUnique: uniqueIndex("parent_packet_promotions_source_target_idx").on(
      table.sourceEntryId,
      table.targetSurface,
      table.targetContainerKey,
    ),
  }),
);

export type ParentPacketPromotion = typeof parentPacketPromotionsTable.$inferSelect;
