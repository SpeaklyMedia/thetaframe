import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const mobileNotificationOutboxTable = pgTable(
  "mobile_notification_outbox",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sourceLane: text("source_lane").notNull(),
    sourceEventId: integer("source_event_id").notNull(),
    notificationCategory: text("notification_category").notNull(),
    route: text("route").notNull(),
    deepLink: text("deep_link").notNull(),
    eventName: text("event_name").notNull(),
    executionDate: text("execution_date"),
    sourceType: text("source_type"),
    reminderState: text("reminder_state").notNull(),
    reminderLeadDays: jsonb("reminder_lead_days").notNull().default([]),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    deliveryStatus: text("delivery_status").notNull().default("queued"),
    deliveredDeviceId: integer("delivered_device_id"),
    deliveredDeviceLabel: text("delivered_device_label"),
    deliveryProvider: text("delivery_provider"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    sourceEventIdx: index("mobile_notification_outbox_source_event_idx").on(table.userId, table.sourceEventId),
    statusIdx: index("mobile_notification_outbox_status_idx").on(table.userId, table.deliveryStatus, table.scheduledFor),
    uniqueSourceReminderIdx: uniqueIndex("mobile_notification_outbox_source_reminder_uidx").on(
      table.userId,
      table.sourceEventId,
      table.notificationCategory,
      table.scheduledFor,
    ),
  }),
);

export type MobileNotificationOutbox = typeof mobileNotificationOutboxTable.$inferSelect;
