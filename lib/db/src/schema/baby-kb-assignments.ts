import { integer, jsonb, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const babyKbAssignmentsTable = pgTable(
  "baby_kb_assignments",
  {
    id: serial("id").primaryKey(),
    sourceEntryId: integer("source_entry_id").notNull(),
    sourceMaterializationId: integer("source_materialization_id"),
    assigneeUserId: text("assignee_user_id").notNull(),
    lifecycleState: text("lifecycle_state").notNull().default("assigned"),
    effectiveDate: text("effective_date").notNull(),
    dueDate: text("due_date"),
    cadence: text("cadence"),
    projectionPolicy: text("projection_policy").notNull().default("event_and_heroes"),
    assignmentNotes: text("assignment_notes"),
    reminderPolicy: jsonb("reminder_policy").notNull().default({}),
    projectedEventId: integer("projected_event_id"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    sourceEntryIdx: index("baby_kb_assignments_source_entry_idx").on(table.sourceEntryId),
    assigneeStateIdx: index("baby_kb_assignments_assignee_state_idx").on(table.assigneeUserId, table.lifecycleState),
    assigneeDueIdx: index("baby_kb_assignments_assignee_due_idx").on(table.assigneeUserId, table.dueDate),
  }),
);

export type BabyKbAssignment = typeof babyKbAssignmentsTable.$inferSelect;
