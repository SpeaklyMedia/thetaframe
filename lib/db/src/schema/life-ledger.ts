import { pgTable, text, serial, timestamp, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const lifeLedgerTable = pgTable("life_ledger", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  tab: text("tab").notNull(),
  name: text("name").notNull(),
  tags: jsonb("tags").notNull().default([]),
  impactLevel: text("impact_level"),
  reviewWindow: text("review_window"),
  dueDate: text("due_date"),
  notes: text("notes"),
  amount: doublePrecision("amount"),
  currency: text("currency"),
  isEssential: boolean("is_essential"),
  billingCycle: text("billing_cycle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type LifeLedgerEntry = typeof lifeLedgerTable.$inferSelect;
