import { pgTable, text, serial, timestamp, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";

function lifeLedgerTable(tableName: string) {
  return pgTable(tableName, {
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
}

export const lifeLedgerPeopleTable = lifeLedgerTable("life_ledger_people");
export const lifeLedgerEventsTable = lifeLedgerTable("life_ledger_events");
export const lifeLedgerFinancialTable = lifeLedgerTable("life_ledger_financial");
export const lifeLedgerSubscriptionsTable = lifeLedgerTable("life_ledger_subscriptions");
export const lifeLedgerTravelTable = lifeLedgerTable("life_ledger_travel");
export const lifeLedgerBabyTable = lifeLedgerTable("life_ledger_baby");

export type LifeLedgerEntry = typeof lifeLedgerPeopleTable.$inferSelect;
