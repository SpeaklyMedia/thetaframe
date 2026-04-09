import { pgTable, text, serial, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const bizdevBrandsTable = pgTable("bizdev_brands", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  brand: text("brand").notNull(),
  phase: text("phase").notNull().default("COLD"),
  humanStatus: text("human_status"),
  nextAction: text("next_action"),
  nextTouchDate: text("next_touch_date"),
  nextTouchChannel: text("next_touch_channel"),
  owner: text("owner"),
  blocker: text("blocker"),
  moneyOpen: doublePrecision("money_open"),
  moneyNotes: text("money_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type BizdevBrand = typeof bizdevBrandsTable.$inferSelect;
