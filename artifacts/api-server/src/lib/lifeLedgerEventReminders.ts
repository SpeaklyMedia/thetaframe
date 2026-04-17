import { and, desc, eq, inArray } from "drizzle-orm";
import { db, lifeLedgerEventsTable, mobileDevicesTable, mobileNotificationOutboxTable } from "@workspace/db";
import {
  thetaMobileNotificationRoutes,
  thetaMobileRequiredDeepLinks,
  type ThetaMobileNotificationCategory,
} from "@workspace/integration-contracts";
import { serializeDates } from "./serialize.js";
import {
  ensureBabyKbAssignmentSchema,
  syncBabyKbAssignmentReminderPolicyForAssignee,
} from "./babyKbAssignments.js";

export const LIFE_LEDGER_EVENT_REMINDER_STATE_VALUES = [
  "inactive",
  "scheduled",
  "snoozed",
 ] as const;

export type LifeLedgerEventReminderState =
  (typeof LIFE_LEDGER_EVENT_REMINDER_STATE_VALUES)[number];

export class LifeLedgerEventReminderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type LifeLedgerEventReminderQueueItem = {
  id: number;
  name: string;
  executionDate: string;
  nextReminderAt: string;
  reminderState: Extract<LifeLedgerEventReminderState, "scheduled" | "snoozed">;
  reminderLeadDays: number[];
  impactLevel: string | null | undefined;
  sourceType: string | null | undefined;
  route: string;
  deepLink: string;
  notificationCategory: ThetaMobileNotificationCategory;
};

export const MOBILE_NOTIFICATION_DELIVERY_STATUS_VALUES = [
  "queued",
  "sent",
  "cancelled",
  "acknowledged",
] as const;

export type MobileNotificationDeliveryStatus =
  (typeof MOBILE_NOTIFICATION_DELIVERY_STATUS_VALUES)[number];

export type MobileNotificationOutboxItem = {
  id: number;
  sourceLane: string;
  sourceEventId: number;
  notificationCategory: ThetaMobileNotificationCategory;
  route: string;
  deepLink: string;
  eventName: string;
  executionDate: string | null;
  sourceType: string | null;
  reminderState: Extract<LifeLedgerEventReminderState, "scheduled" | "snoozed">;
  reminderLeadDays: number[];
  scheduledFor: string;
  deliveryStatus: MobileNotificationDeliveryStatus;
  deliveredDeviceId: number | null;
  deliveredDeviceLabel: string | null;
  deliveryProvider: string | null;
  sentAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const MOBILE_DEVICE_PLATFORM_VALUES = ["ios", "android"] as const;
export type MobileDevicePlatform = (typeof MOBILE_DEVICE_PLATFORM_VALUES)[number];

export const MOBILE_DEVICE_DELIVERY_PROVIDER_VALUES = [
  "ios_local_notification",
  "android_notification",
] as const;
export type MobileDeviceDeliveryProvider =
  (typeof MOBILE_DEVICE_DELIVERY_PROVIDER_VALUES)[number];

export type MobileDeviceItem = {
  id: number;
  installationId: string;
  deviceLabel: string;
  platform: MobileDevicePlatform;
  deliveryProvider: MobileDeviceDeliveryProvider;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

const LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY: ThetaMobileNotificationCategory = "life_ledger_due";
const LIFE_LEDGER_DUE_ROUTE = thetaMobileNotificationRoutes[LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY].route;
const LIFE_LEDGER_DEEP_LINK =
  thetaMobileRequiredDeepLinks.find((deepLink) => deepLink.lane === "life-ledger")?.uri ?? "thetaframe://life-ledger/new";
const LIFE_LEDGER_OUTBOX_SOURCE_LANE = "life-ledger";

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toReminderTimestamp(date: string): string {
  return new Date(`${date}T09:00:00.000Z`).toISOString();
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getLifeLedgerExecutionDate(entry: {
  nextDueDate?: string | null;
  dueDate?: string | null;
}): string | null {
  if (isDateString(entry.nextDueDate)) return entry.nextDueDate;
  if (isDateString(entry.dueDate)) return entry.dueDate;
  return null;
}

export function normalizeReminderLeadDays(reminderPolicy: unknown): number[] {
  if (!reminderPolicy || typeof reminderPolicy !== "object" || Array.isArray(reminderPolicy)) {
    return [];
  }

  const rawLeadDays = (reminderPolicy as Record<string, unknown>).leadDays;
  if (!Array.isArray(rawLeadDays)) return [];

  return [...new Set(
    rawLeadDays
      .filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 30),
  )].sort((a, b) => b - a);
}

function getNextReminderAt(args: {
  executionDate: string;
  leadDays: number[];
  snoozedUntil?: string | null;
  now?: Date;
}): string | null {
  const now = args.now ?? new Date();

  if (isDateString(args.snoozedUntil) && args.snoozedUntil >= getTodayDateString()) {
    return toReminderTimestamp(args.snoozedUntil);
  }

  for (const leadDay of args.leadDays) {
    const reminderDate = new Date(`${args.executionDate}T09:00:00.000Z`);
    reminderDate.setUTCDate(reminderDate.getUTCDate() - leadDay);
    if (reminderDate >= now) {
      return reminderDate.toISOString();
    }
  }

  return null;
}

export function getLifeLedgerReminderFields(entry: {
  reminderPolicy?: unknown;
  nextDueDate?: string | null;
  dueDate?: string | null;
  completionState?: string | null;
  snoozedUntil?: string | null;
}) {
  const reminderLeadDays = normalizeReminderLeadDays(entry.reminderPolicy);
  const executionDate = getLifeLedgerExecutionDate(entry);
  const reminderEnabled = reminderLeadDays.length > 0 && Boolean(executionDate);

  if (
    !reminderEnabled ||
    !executionDate ||
    entry.completionState === "completed" ||
    entry.completionState === "superseded"
  ) {
    return {
      reminderEnabled,
      reminderLeadDays,
      nextReminderAt: null,
      reminderState: "inactive" as LifeLedgerEventReminderState,
    };
  }

  if (isDateString(entry.snoozedUntil) && entry.snoozedUntil >= getTodayDateString()) {
    return {
      reminderEnabled,
      reminderLeadDays,
      nextReminderAt: toReminderTimestamp(entry.snoozedUntil),
      reminderState: "snoozed" as LifeLedgerEventReminderState,
    };
  }

  const nextReminderAt = getNextReminderAt({
    executionDate,
    leadDays: reminderLeadDays,
    snoozedUntil: entry.snoozedUntil,
  });

  return {
    reminderEnabled,
    reminderLeadDays,
    nextReminderAt,
    reminderState: nextReminderAt ? ("scheduled" as LifeLedgerEventReminderState) : ("inactive" as LifeLedgerEventReminderState),
  };
}

export function serializeLifeLedgerEntry(entry: Record<string, unknown>) {
  const serialized = serializeDates(entry) as Record<string, unknown>;
  return {
    ...serialized,
    ...getLifeLedgerReminderFields(serialized),
  };
}

export function serializeLifeLedgerEventReminderQueueItem(
  entry: Record<string, unknown>,
): LifeLedgerEventReminderQueueItem | null {
  const serialized = serializeLifeLedgerEntry(entry) as Record<string, unknown>;
  const executionDate = getLifeLedgerExecutionDate(serialized);
  const nextReminderAt = typeof serialized.nextReminderAt === "string" ? serialized.nextReminderAt : null;
  const reminderState =
    serialized.reminderState === "scheduled" || serialized.reminderState === "snoozed"
      ? serialized.reminderState
      : null;
  const reminderLeadDays = Array.isArray(serialized.reminderLeadDays)
    ? serialized.reminderLeadDays.filter((value): value is number => typeof value === "number")
    : [];

  if (!executionDate || !nextReminderAt || !reminderState || reminderLeadDays.length === 0) {
    return null;
  }

  return {
    id: Number(serialized.id),
    name: String(serialized.name),
    executionDate,
    nextReminderAt,
    reminderState,
    reminderLeadDays,
    impactLevel: typeof serialized.impactLevel === "string" ? serialized.impactLevel : null,
    sourceType: typeof serialized.sourceType === "string" ? serialized.sourceType : null,
    route: LIFE_LEDGER_DUE_ROUTE,
    deepLink: LIFE_LEDGER_DEEP_LINK,
    notificationCategory: LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY,
  };
}

function normalizeScheduledFor(value: Date | string): string {
  const next = value instanceof Date ? value : new Date(value);
  return next.toISOString();
}

function serializeMobileNotificationOutboxItem(
  row: typeof mobileNotificationOutboxTable.$inferSelect,
): MobileNotificationOutboxItem {
  const reminderLeadDays = Array.isArray(row.reminderLeadDays)
    ? row.reminderLeadDays.filter((value): value is number => typeof value === "number")
    : [];

  return {
    id: row.id,
    sourceLane: row.sourceLane,
    sourceEventId: row.sourceEventId,
    notificationCategory: row.notificationCategory as ThetaMobileNotificationCategory,
    route: row.route,
    deepLink: row.deepLink,
    eventName: row.eventName,
    executionDate: row.executionDate ?? null,
    sourceType: row.sourceType ?? null,
    reminderState: row.reminderState as Extract<LifeLedgerEventReminderState, "scheduled" | "snoozed">,
    reminderLeadDays,
    scheduledFor: row.scheduledFor.toISOString(),
    deliveryStatus: row.deliveryStatus as MobileNotificationDeliveryStatus,
    deliveredDeviceId: row.deliveredDeviceId ?? null,
    deliveredDeviceLabel: row.deliveredDeviceLabel ?? null,
    deliveryProvider: row.deliveryProvider ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeMobileDeviceItem(
  row: typeof mobileDevicesTable.$inferSelect,
): MobileDeviceItem {
  return {
    id: row.id,
    installationId: row.installationId,
    deviceLabel: row.deviceLabel,
    platform: row.platform as MobileDevicePlatform,
    deliveryProvider: row.deliveryProvider as MobileDeviceDeliveryProvider,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getDeliveryProviderForPlatform(platform: MobileDevicePlatform): MobileDeviceDeliveryProvider {
  return platform === "ios" ? "ios_local_notification" : "android_notification";
}

async function cancelQueuedOutboxRowsForEvent(userId: string, eventId: number) {
  await db
    .update(mobileNotificationOutboxTable)
    .set({
      deliveryStatus: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mobileNotificationOutboxTable.userId, userId),
        eq(mobileNotificationOutboxTable.sourceLane, LIFE_LEDGER_OUTBOX_SOURCE_LANE),
        eq(mobileNotificationOutboxTable.sourceEventId, eventId),
        eq(mobileNotificationOutboxTable.notificationCategory, LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY),
        eq(mobileNotificationOutboxTable.deliveryStatus, "queued"),
      ),
    );
}

export async function reconcileLifeLedgerEventReminderOutboxForEntry(
  entry: typeof lifeLedgerEventsTable.$inferSelect,
) {
  if (entry.tab !== "events") {
    await cancelQueuedOutboxRowsForEvent(entry.userId, entry.id);
    return;
  }

  const queueItem = serializeLifeLedgerEventReminderQueueItem(entry);
  const existingRows = await db
    .select()
    .from(mobileNotificationOutboxTable)
    .where(
      and(
        eq(mobileNotificationOutboxTable.userId, entry.userId),
        eq(mobileNotificationOutboxTable.sourceLane, LIFE_LEDGER_OUTBOX_SOURCE_LANE),
        eq(mobileNotificationOutboxTable.sourceEventId, entry.id),
        eq(mobileNotificationOutboxTable.notificationCategory, LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY),
      ),
    );

  if (!queueItem) {
    await cancelQueuedOutboxRowsForEvent(entry.userId, entry.id);
    return;
  }

  const scheduledFor = normalizeScheduledFor(queueItem.nextReminderAt);
  const timestampMismatchedRows = existingRows.filter(
    (row) => row.deliveryStatus === "queued" && normalizeScheduledFor(row.scheduledFor) !== scheduledFor,
  );

  if (timestampMismatchedRows.length > 0) {
    await db
      .update(mobileNotificationOutboxTable)
      .set({
        deliveryStatus: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        inArray(
          mobileNotificationOutboxTable.id,
          timestampMismatchedRows.map((row) => row.id),
        ),
      );
  }

  const matchingRow = existingRows.find((row) => normalizeScheduledFor(row.scheduledFor) === scheduledFor);

  const snapshot = {
    route: queueItem.route,
    deepLink: queueItem.deepLink,
    eventName: queueItem.name,
    executionDate: queueItem.executionDate,
    sourceType: queueItem.sourceType ?? null,
    reminderState: queueItem.reminderState,
    reminderLeadDays: queueItem.reminderLeadDays,
    scheduledFor: new Date(queueItem.nextReminderAt),
    updatedAt: new Date(),
  };

  if (!matchingRow) {
    await db.insert(mobileNotificationOutboxTable).values({
      userId: entry.userId,
      sourceLane: LIFE_LEDGER_OUTBOX_SOURCE_LANE,
      sourceEventId: entry.id,
      notificationCategory: LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY,
      deliveryStatus: "queued",
      ...snapshot,
    });
    return;
  }

  const nextStatus =
    matchingRow.deliveryStatus === "cancelled"
      ? "queued"
      : (matchingRow.deliveryStatus as MobileNotificationDeliveryStatus);

  await db
    .update(mobileNotificationOutboxTable)
    .set({
      ...snapshot,
      deliveryStatus: nextStatus,
      cancelledAt: nextStatus === "queued" ? null : matchingRow.cancelledAt,
    })
    .where(eq(mobileNotificationOutboxTable.id, matchingRow.id));
}

export async function reconcileLifeLedgerEventReminderOutboxForUserEvent(args: {
  userId: string;
  eventId: number;
}) {
  const [entry] = await db
    .select()
    .from(lifeLedgerEventsTable)
    .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)));

  if (!entry) {
    await cancelQueuedOutboxRowsForEvent(args.userId, args.eventId);
    return;
  }

  await reconcileLifeLedgerEventReminderOutboxForEntry(entry);
}

export async function reconcileLifeLedgerEventReminderOutboxForUser(userId: string) {
  const eventRows = await db
    .select()
    .from(lifeLedgerEventsTable)
    .where(eq(lifeLedgerEventsTable.userId, userId));

  const eventIds = new Set(eventRows.map((row) => row.id));
  const queuedOutboxRows = await db
    .select()
    .from(mobileNotificationOutboxTable)
    .where(
      and(
        eq(mobileNotificationOutboxTable.userId, userId),
        eq(mobileNotificationOutboxTable.sourceLane, LIFE_LEDGER_OUTBOX_SOURCE_LANE),
        eq(mobileNotificationOutboxTable.notificationCategory, LIFE_LEDGER_DUE_NOTIFICATION_CATEGORY),
        eq(mobileNotificationOutboxTable.deliveryStatus, "queued"),
      ),
    );

  const orphanQueuedIds = queuedOutboxRows
    .filter((row) => !eventIds.has(row.sourceEventId))
    .map((row) => row.id);

  if (orphanQueuedIds.length > 0) {
    await db
      .update(mobileNotificationOutboxTable)
      .set({
        deliveryStatus: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(mobileNotificationOutboxTable.id, orphanQueuedIds));
  }

  for (const row of eventRows) {
    await reconcileLifeLedgerEventReminderOutboxForEntry(row);
  }
}

export async function listMobileNotificationOutboxForUser(userId: string): Promise<MobileNotificationOutboxItem[]> {
  await reconcileLifeLedgerEventReminderOutboxForUser(userId);

  const rows = await db
    .select()
    .from(mobileNotificationOutboxTable)
    .where(
      and(
        eq(mobileNotificationOutboxTable.userId, userId),
        eq(mobileNotificationOutboxTable.sourceLane, LIFE_LEDGER_OUTBOX_SOURCE_LANE),
        inArray(mobileNotificationOutboxTable.deliveryStatus, ["queued", "sent", "acknowledged"]),
      ),
    );

  return rows
    .sort((left, right) => {
      if (left.deliveryStatus === "queued" && right.deliveryStatus !== "queued") return -1;
      if (left.deliveryStatus !== "queued" && right.deliveryStatus === "queued") return 1;
      if (left.deliveryStatus === "queued" && right.deliveryStatus === "queued") {
        return left.scheduledFor.getTime() - right.scheduledFor.getTime();
      }

      const leftRecent = left.sentAt ?? left.acknowledgedAt ?? left.updatedAt;
      const rightRecent = right.sentAt ?? right.acknowledgedAt ?? right.updatedAt;
      return rightRecent.getTime() - leftRecent.getTime();
    })
    .map(serializeMobileNotificationOutboxItem);
}

export async function markMobileNotificationOutboxItemSentForUser(args: {
  userId: string;
  outboxId: number;
}) {
  const [existingRow] = await db
    .select()
    .from(mobileNotificationOutboxTable)
    .where(
      and(
        eq(mobileNotificationOutboxTable.id, args.outboxId),
        eq(mobileNotificationOutboxTable.userId, args.userId),
      ),
    );

  if (!existingRow) {
    throw new LifeLedgerEventReminderError(404, "Mobile notification outbox item not found.");
  }

  if (existingRow.deliveryStatus !== "queued") {
    throw new LifeLedgerEventReminderError(409, "Only queued mobile notification outbox items can be marked sent.");
  }

  const [updatedRow] = await db
    .update(mobileNotificationOutboxTable)
    .set({
      deliveryStatus: "sent",
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mobileNotificationOutboxTable.id, args.outboxId),
        eq(mobileNotificationOutboxTable.userId, args.userId),
      ),
    )
    .returning();

  return serializeMobileNotificationOutboxItem(updatedRow);
}

export async function acknowledgeMobileNotificationOutboxItemForUser(args: {
  userId: string;
  outboxId: number;
}) {
  const [existingRow] = await db
    .select()
    .from(mobileNotificationOutboxTable)
    .where(
      and(
        eq(mobileNotificationOutboxTable.id, args.outboxId),
        eq(mobileNotificationOutboxTable.userId, args.userId),
      ),
    );

  if (!existingRow) {
    throw new LifeLedgerEventReminderError(404, "Mobile notification outbox item not found.");
  }

  if (existingRow.deliveryStatus !== "sent") {
    throw new LifeLedgerEventReminderError(409, "Only sent mobile notification outbox items can be acknowledged.");
  }

  const [updatedRow] = await db
    .update(mobileNotificationOutboxTable)
    .set({
      deliveryStatus: "acknowledged",
      acknowledgedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mobileNotificationOutboxTable.id, args.outboxId),
        eq(mobileNotificationOutboxTable.userId, args.userId),
      ),
    )
    .returning();

  return serializeMobileNotificationOutboxItem(updatedRow);
}

export async function listMobileDevicesForUser(userId: string): Promise<MobileDeviceItem[]> {
  const rows = await db
    .select()
    .from(mobileDevicesTable)
    .where(eq(mobileDevicesTable.userId, userId))
    .orderBy(desc(mobileDevicesTable.lastSeenAt), desc(mobileDevicesTable.updatedAt), desc(mobileDevicesTable.id));

  return rows.map(serializeMobileDeviceItem);
}

export async function registerMobileDeviceForUser(args: {
  userId: string;
  installationId: string;
  deviceLabel: string;
  platform: MobileDevicePlatform;
}) {
  const deliveryProvider = getDeliveryProviderForPlatform(args.platform);
  const [existingDevice] = await db
    .select()
    .from(mobileDevicesTable)
    .where(
      and(
        eq(mobileDevicesTable.userId, args.userId),
        eq(mobileDevicesTable.installationId, args.installationId),
      ),
    );

  if (existingDevice) {
    const [updatedDevice] = await db
      .update(mobileDevicesTable)
      .set({
        deviceLabel: args.deviceLabel,
        platform: args.platform,
        deliveryProvider,
        isActive: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mobileDevicesTable.id, existingDevice.id))
      .returning();

    return serializeMobileDeviceItem(updatedDevice);
  }

  const [createdDevice] = await db
    .insert(mobileDevicesTable)
    .values({
      userId: args.userId,
      installationId: args.installationId,
      deviceLabel: args.deviceLabel,
      platform: args.platform,
      deliveryProvider,
      isActive: true,
      lastSeenAt: new Date(),
    })
    .returning();

  return serializeMobileDeviceItem(createdDevice);
}

export async function deactivateMobileDeviceForUser(args: {
  userId: string;
  deviceId: number;
}) {
  const [updatedDevice] = await db
    .update(mobileDevicesTable)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mobileDevicesTable.id, args.deviceId),
        eq(mobileDevicesTable.userId, args.userId),
      ),
    )
    .returning();

  if (!updatedDevice) {
    throw new LifeLedgerEventReminderError(404, "Mobile device not found.");
  }

  return serializeMobileDeviceItem(updatedDevice);
}

export async function simulateDispatchMobileNotificationOutboxItemForUser(args: {
  userId: string;
  outboxId: number;
  deviceId?: number;
}) {
  await reconcileLifeLedgerEventReminderOutboxForUser(args.userId);

  const [outboxRow] = await db
    .select()
    .from(mobileNotificationOutboxTable)
    .where(
      and(
        eq(mobileNotificationOutboxTable.id, args.outboxId),
        eq(mobileNotificationOutboxTable.userId, args.userId),
      ),
    );

  if (!outboxRow) {
    throw new LifeLedgerEventReminderError(404, "Mobile notification outbox item not found.");
  }

  if (outboxRow.deliveryStatus !== "queued") {
    throw new LifeLedgerEventReminderError(409, "Only queued mobile notification outbox items can be dispatched.");
  }

  const activeDevices = await db
    .select()
    .from(mobileDevicesTable)
    .where(and(eq(mobileDevicesTable.userId, args.userId), eq(mobileDevicesTable.isActive, true)))
    .orderBy(desc(mobileDevicesTable.lastSeenAt), desc(mobileDevicesTable.updatedAt), desc(mobileDevicesTable.id));

  let targetDevice = args.deviceId
    ? activeDevices.find((device) => device.id === args.deviceId)
    : activeDevices[0];

  if (!targetDevice && args.deviceId) {
    const [deviceRow] = await db
      .select()
      .from(mobileDevicesTable)
      .where(
        and(
          eq(mobileDevicesTable.id, args.deviceId),
          eq(mobileDevicesTable.userId, args.userId),
        ),
      );

    if (!deviceRow) {
      throw new LifeLedgerEventReminderError(404, "Mobile device not found.");
    }

    throw new LifeLedgerEventReminderError(409, "The selected mobile device is inactive.");
  }

  if (!targetDevice) {
    throw new LifeLedgerEventReminderError(409, "Register an active mobile device before dispatching reminders.");
  }

  const [updatedRow] = await db
    .update(mobileNotificationOutboxTable)
    .set({
      deliveryStatus: "sent",
      sentAt: new Date(),
      deliveredDeviceId: targetDevice.id,
      deliveredDeviceLabel: targetDevice.deviceLabel,
      deliveryProvider: targetDevice.deliveryProvider,
      updatedAt: new Date(),
    })
    .where(eq(mobileNotificationOutboxTable.id, outboxRow.id))
    .returning();

  return serializeMobileNotificationOutboxItem(updatedRow);
}

export async function listLifeLedgerEventReminderQueueForUser(userId: string): Promise<LifeLedgerEventReminderQueueItem[]> {
  const rows = await db
    .select()
    .from(lifeLedgerEventsTable)
    .where(eq(lifeLedgerEventsTable.userId, userId));

  return rows
    .filter((row) => row.tab === "events")
    .map((row) => serializeLifeLedgerEventReminderQueueItem(row))
    .filter((item): item is LifeLedgerEventReminderQueueItem => item !== null)
    .sort((left, right) => {
      const reminderCompare = left.nextReminderAt.localeCompare(right.nextReminderAt);
      if (reminderCompare !== 0) return reminderCompare;
      return left.executionDate.localeCompare(right.executionDate);
    });
}

function buildReminderPolicy(enabled: boolean, leadDays: number[]) {
  if (!enabled || leadDays.length === 0) {
    return {};
  }

  return {
    kind: "dated_event",
    leadDays,
  };
}

export async function updateLifeLedgerEventReminderPolicyForUser(args: {
  userId: string;
  eventId: number;
  enabled: boolean;
  leadDays: number[];
}) {
  await ensureBabyKbAssignmentSchema();

  const [existingEvent] = await db
    .select()
    .from(lifeLedgerEventsTable)
    .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)));

  if (!existingEvent) {
    throw new LifeLedgerEventReminderError(404, "Life Ledger event not found.");
  }

  if (existingEvent.tab !== "events") {
    throw new LifeLedgerEventReminderError(400, "Reminder updates are only available for Life Ledger events.");
  }

  if (args.enabled && !getLifeLedgerExecutionDate(existingEvent)) {
    throw new LifeLedgerEventReminderError(409, "Events need a due date or next due date before reminders can be enabled.");
  }

  const reminderPolicy = buildReminderPolicy(args.enabled, args.leadDays);

  if (existingEvent.sourceType === "baby_kb_assignment" && existingEvent.sourceAssignmentId) {
    await syncBabyKbAssignmentReminderPolicyForAssignee({
      assigneeUserId: args.userId,
      assignmentId: existingEvent.sourceAssignmentId,
      reminderPolicy,
    });

    const [updatedProjectedEvent] = await db
      .select()
      .from(lifeLedgerEventsTable)
      .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)));

    if (!updatedProjectedEvent) {
      throw new LifeLedgerEventReminderError(404, "Projected Baby event not found after reminder update.");
    }

    await reconcileLifeLedgerEventReminderOutboxForEntry(updatedProjectedEvent);

    return updatedProjectedEvent;
  }

  const [updatedEvent] = await db
    .update(lifeLedgerEventsTable)
    .set({
      reminderPolicy,
      snoozedUntil: args.enabled ? existingEvent.snoozedUntil : null,
      updatedAt: new Date(),
    })
    .where(and(eq(lifeLedgerEventsTable.id, args.eventId), eq(lifeLedgerEventsTable.userId, args.userId)))
    .returning();

  if (!updatedEvent) {
    throw new LifeLedgerEventReminderError(404, "Life Ledger event not found.");
  }

  await reconcileLifeLedgerEventReminderOutboxForEntry(updatedEvent);

  return updatedEvent;
}
