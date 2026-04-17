import { index, pgTable, serial, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";

export const mobileDevicesTable = pgTable(
  "mobile_devices",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    installationId: text("installation_id").notNull(),
    deviceLabel: text("device_label").notNull(),
    platform: text("platform").notNull(),
    deliveryProvider: text("delivery_provider").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    userLastSeenIdx: index("mobile_devices_user_last_seen_idx").on(table.userId, table.lastSeenAt),
    userInstallUidx: uniqueIndex("mobile_devices_user_installation_uidx").on(table.userId, table.installationId),
  }),
);

export type MobileDevice = typeof mobileDevicesTable.$inferSelect;
