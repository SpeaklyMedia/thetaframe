import { and, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  lifeLedgerBabyTable,
  bizdevBrandsTable,
  dailyFramesTable,
  lifeLedgerEventsTable,
  lifeLedgerFinancialTable,
  lifeLedgerPeopleTable,
  lifeLedgerSubscriptionsTable,
  lifeLedgerTravelTable,
  onboardingProgressTable,
  reachFilesTable,
  visionFramesTable,
  weeklyFramesTable,
  accessPermissionsTable,
  accessPresetsTable,
} from "@workspace/db/schema";
import { type AppModule } from "./access.js";

export const BASE_ONBOARDING_SURFACES = [
  "daily",
  "weekly",
  "vision",
  "bizdev",
  "life-ledger",
  "reach",
] as const;

export const ADMIN_ONBOARDING_SURFACE = "admin" as const;
export const ALL_ONBOARDING_SURFACES = [...BASE_ONBOARDING_SURFACES, ADMIN_ONBOARDING_SURFACE] as const;

export type OnboardingSurface = typeof ALL_ONBOARDING_SURFACES[number];

type OnboardingRow = typeof onboardingProgressTable.$inferSelect;
let onboardingSchemaReady: Promise<void> | null = null;

async function ensureOnboardingSchema(): Promise<void> {
  if (!onboardingSchemaReady) {
    onboardingSchemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS onboarding_progress (
          id serial PRIMARY KEY,
          user_id text NOT NULL,
          surface text NOT NULL,
          completion_state text NOT NULL DEFAULT 'pending',
          first_shown_at timestamptz NOT NULL DEFAULT now(),
          completed_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS onboarding_progress_user_surface_idx
        ON onboarding_progress (user_id, surface)
      `);
    })().catch((error) => {
      onboardingSchemaReady = null;
      throw error;
    });
  }

  await onboardingSchemaReady;
}

function serializeOnboardingRow(row: OnboardingRow) {
  return {
    surface: row.surface as OnboardingSurface,
    completionState: row.completionState,
    firstShownAt: row.firstShownAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    isComplete: row.completionState === "completed",
  };
}

async function hasRowsForUser(
  table:
    | typeof dailyFramesTable
    | typeof weeklyFramesTable
    | typeof visionFramesTable
    | typeof bizdevBrandsTable
    | typeof reachFilesTable
    | typeof lifeLedgerPeopleTable
    | typeof lifeLedgerEventsTable
    | typeof lifeLedgerFinancialTable
    | typeof lifeLedgerSubscriptionsTable
    | typeof lifeLedgerTravelTable
    | typeof lifeLedgerBabyTable,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.userId, userId))
    .limit(1);

  return rows.length > 0;
}

async function deriveCompletedFromExistingData(userId: string, surface: OnboardingSurface): Promise<boolean> {
  switch (surface) {
    case "daily":
      return hasRowsForUser(dailyFramesTable, userId);
    case "weekly":
      return hasRowsForUser(weeklyFramesTable, userId);
    case "vision":
      return hasRowsForUser(visionFramesTable, userId);
    case "bizdev":
      return hasRowsForUser(bizdevBrandsTable, userId);
    case "life-ledger": {
      const results = await Promise.all([
        hasRowsForUser(lifeLedgerPeopleTable, userId),
        hasRowsForUser(lifeLedgerEventsTable, userId),
        hasRowsForUser(lifeLedgerFinancialTable, userId),
        hasRowsForUser(lifeLedgerSubscriptionsTable, userId),
        hasRowsForUser(lifeLedgerTravelTable, userId),
        hasRowsForUser(lifeLedgerBabyTable, userId),
      ]);
      return results.some(Boolean);
    }
    case "reach":
      return hasRowsForUser(reachFilesTable, userId);
    case "admin": {
      const [grants, presets] = await Promise.all([
        db
          .select({ id: accessPermissionsTable.id })
          .from(accessPermissionsTable)
          .where(eq(accessPermissionsTable.grantedBy, userId))
          .limit(1),
        db
          .select({ id: accessPresetsTable.id })
          .from(accessPresetsTable)
          .where(eq(accessPresetsTable.createdBy, userId))
          .limit(1),
      ]);
      return grants.length > 0 || presets.length > 0;
    }
  }
}

export async function markOnboardingSurfaceComplete(userId: string, surface: OnboardingSurface): Promise<void> {
  await ensureOnboardingSchema();

  const [existing] = await db
    .select()
    .from(onboardingProgressTable)
    .where(
      and(
        eq(onboardingProgressTable.userId, userId),
        eq(onboardingProgressTable.surface, surface),
      ),
    );

  if (!existing) {
    await db.insert(onboardingProgressTable).values({
      userId,
      surface,
      completionState: "completed",
      firstShownAt: new Date(),
      completedAt: new Date(),
    });
    return;
  }

  if (existing.completionState === "completed") {
    return;
  }

  await db
    .update(onboardingProgressTable)
    .set({
      completionState: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(onboardingProgressTable.userId, userId),
        eq(onboardingProgressTable.surface, surface),
      ),
    );
}

export async function listOnboardingProgressForUser(
  userId: string,
  surfaces: ReadonlyArray<AppModule | "admin">,
) {
  await ensureOnboardingSchema();
  const visibleSurfaces = surfaces as OnboardingSurface[];

  const existingRows = await db
    .select()
    .from(onboardingProgressTable)
    .where(eq(onboardingProgressTable.userId, userId));

  const rowsBySurface = new Map(existingRows.map((row) => [row.surface, row]));
  const missingSurfaces = visibleSurfaces.filter((surface) => !rowsBySurface.has(surface));

  if (missingSurfaces.length > 0) {
    await db.insert(onboardingProgressTable).values(
      missingSurfaces.map((surface) => ({
        userId,
        surface,
        completionState: "pending",
        firstShownAt: new Date(),
      })),
    ).onConflictDoNothing();
  }

  const incompleteSurfaces = visibleSurfaces.filter((surface) => {
    const row = rowsBySurface.get(surface);
    return !row || row.completionState !== "completed";
  });

  const completionChecks = await Promise.all(
    incompleteSurfaces.map(async (surface) => ({
      surface,
      isComplete: await deriveCompletedFromExistingData(userId, surface),
    })),
  );

  await Promise.all(
    completionChecks
      .filter((item) => item.isComplete)
      .map((item) => markOnboardingSurfaceComplete(userId, item.surface)),
  );

  const finalRows = await db
    .select()
    .from(onboardingProgressTable)
    .where(eq(onboardingProgressTable.userId, userId));

  const finalRowsBySurface = new Map(finalRows.map((row) => [row.surface, row]));

  return visibleSurfaces
    .map((surface) => finalRowsBySurface.get(surface))
    .filter((row): row is OnboardingRow => Boolean(row))
    .map(serializeOnboardingRow);
}
