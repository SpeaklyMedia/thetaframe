import { pgTable, text, serial, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

export const accessPermissionsTable = pgTable("access_permissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  module: text("module").notNull(),
  environment: text("environment").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  grantedBy: text("granted_by").notNull(),
}, (t) => [
  unique("uq_access_permissions_user_module_env").on(t.userId, t.module, t.environment),
]);

export const accessPresetsTable = pgTable("access_presets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").notNull().$type<Array<{ module: string; environment: string }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
});

export type AccessPermission = typeof accessPermissionsTable.$inferSelect;
export type AccessPreset = typeof accessPresetsTable.$inferSelect;
