import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const aiDraftsTable = pgTable(
  "ai_drafts",
  {
    id: serial("id").primaryKey(),
    thetaObjectId: text("theta_object_id").notNull(),
    userId: text("user_id").notNull(),
    draftKind: text("draft_kind").notNull(),
    targetLane: text("target_lane").notNull(),
    targetSurfaceKey: text("target_surface_key"),
    targetObjectType: text("target_object_type").notNull(),
    mutationRisk: text("mutation_risk").notNull(),
    approvalRequired: text("approval_required").notNull(),
    reviewState: text("review_state").notNull(),
    confidenceMode: text("confidence_mode").notNull(),
    commitTool: text("commit_tool").notNull(),
    metadata: jsonb("metadata").notNull(),
    inputChannels: jsonb("input_channels").notNull(),
    proposedPayload: jsonb("proposed_payload").notNull(),
    sourceRefs: jsonb("source_refs").notNull(),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedBy: text("applied_by"),
    appliedTargetRef: text("applied_target_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("ai_drafts_theta_object_id_idx").on(table.thetaObjectId),
    index("ai_drafts_user_lane_created_at_idx").on(table.userId, table.targetLane, table.createdAt),
    index("ai_drafts_user_review_state_created_at_idx").on(table.userId, table.reviewState, table.createdAt),
  ],
);

export type AIDraft = typeof aiDraftsTable.$inferSelect;
