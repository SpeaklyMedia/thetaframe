import { and, eq } from "drizzle-orm";
import { db, lifeLedgerEventsTable } from "@workspace/db";
import {
  ensureBabyKbAssignmentSchema,
  syncBabyKbAssignmentLifecycleForAssignee,
  type BabyAssignmentLifecycleState,
} from "./babyKbAssignments.js";
import { reconcileLifeLedgerEventReminderOutboxForEntry } from "./lifeLedgerEventReminders.js";

export const LIFE_LEDGER_EVENT_EXECUTION_ACTIONS = [
  "mark_scheduled",
  "mark_in_motion",
  "mark_completed",
  "mark_superseded",
] as const;

export type LifeLedgerEventExecutionAction = (typeof LIFE_LEDGER_EVENT_EXECUTION_ACTIONS)[number];

export class LifeLedgerEventExecutionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapActionToCompletionState(action: LifeLedgerEventExecutionAction) {
  if (action === "mark_in_motion") return "in_motion";
  if (action === "mark_completed") return "completed";
  if (action === "mark_superseded") return "superseded";
  return "scheduled";
}

function mapActionToAssignmentLifecycle(
  action: LifeLedgerEventExecutionAction,
): Extract<BabyAssignmentLifecycleState, "scheduled" | "in_motion" | "completed" | "superseded"> {
  if (action === "mark_in_motion") return "in_motion";
  if (action === "mark_completed") return "completed";
  if (action === "mark_superseded") return "superseded";
  return "scheduled";
}

export async function updateLifeLedgerEventExecutionStateForUser(args: {
  userId: string;
  eventId: number;
  action: LifeLedgerEventExecutionAction;
}) {
  await ensureBabyKbAssignmentSchema();

  const [existingEvent] = await db
    .select()
    .from(lifeLedgerEventsTable)
    .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)));

  if (!existingEvent) {
    throw new LifeLedgerEventExecutionError(404, "Life Ledger event not found.");
  }

  if (existingEvent.tab !== "events") {
    throw new LifeLedgerEventExecutionError(400, "Execution actions are only available for Life Ledger events.");
  }

  if (existingEvent.sourceType === "baby_kb_assignment" && existingEvent.sourceAssignmentId) {
    await syncBabyKbAssignmentLifecycleForAssignee({
      assigneeUserId: args.userId,
      assignmentId: existingEvent.sourceAssignmentId,
      lifecycleState: mapActionToAssignmentLifecycle(args.action),
    });

    const [updatedBabyEvent] = await db
      .select()
      .from(lifeLedgerEventsTable)
      .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)));

    if (!updatedBabyEvent) {
      throw new LifeLedgerEventExecutionError(404, "Projected Baby event not found after synchronization.");
    }

    await reconcileLifeLedgerEventReminderOutboxForEntry(updatedBabyEvent);

    return updatedBabyEvent;
  }

  const [updatedEvent] = await db
    .update(lifeLedgerEventsTable)
    .set({
      completionState: mapActionToCompletionState(args.action),
      updatedAt: new Date(),
    })
    .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)))
    .returning();

  if (!updatedEvent) {
    throw new LifeLedgerEventExecutionError(404, "Life Ledger event not found.");
  }

  await reconcileLifeLedgerEventReminderOutboxForEntry(updatedEvent);

  return updatedEvent;
}
