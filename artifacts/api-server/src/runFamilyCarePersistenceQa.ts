import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pool } from "@workspace/db";
import {
  FamilyCareValidationError,
  createFamilyCareEventBodySchema,
  createFamilyCareEventForUser,
  deleteFamilyCareEventForUser,
  familyCareEventInputSchema,
  getFamilyCareForUser,
  updateFamilyCareEventForUser,
  upsertFamilyCareContextForUser,
  upsertFamilyCareHandoffForUser,
} from "./lib/familyCare";

const migrationPath = path.resolve(import.meta.dirname, "../../../lib/db/migrations/0001_family_care_v1.sql");
const rollbackPath = path.resolve(import.meta.dirname, "../../../lib/db/migrations/0001_family_care_v1.rollback.sql");

const userA = "synthetic-family-care-owner-a";
const userB = "synthetic-family-care-owner-b";
const sharedClientEventId = "synthetic-shared-event-0001";
const observedAt = "2026-11-05T20:00:00.000Z";

async function expectNotFound(operation: () => Promise<unknown>) {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof FamilyCareValidationError);
    assert.equal(error.status, 404);
    return true;
  });
}

async function run() {
  await pool.query(fs.readFileSync(migrationPath, "utf8"));

  const contextA = await upsertFamilyCareContextForUser(userA, {
    displayLabel: "Synthetic household A",
    timezone: "America/New_York",
    caregiverALabel: "Caregiver A1",
    caregiverBLabel: "Caregiver A2",
    nightStartMinute: 1200,
    handoffMinute: 0,
    morningWakeMinute: 240,
  });
  const contextB = await upsertFamilyCareContextForUser(userB, {
    displayLabel: "Synthetic household B",
    timezone: "UTC",
    caregiverALabel: "Caregiver B1",
    caregiverBLabel: "Caregiver B2",
    nightStartMinute: 1260,
    handoffMinute: 60,
    morningWakeMinute: 300,
  });
  assert.notEqual(contextA.id, contextB.id);

  const eventInput = createFamilyCareEventBodySchema.parse({
    clientEventId: sharedClientEventId,
    kind: "feed",
    observedAt,
    data: {
      method: "bottle",
      contents: "breast_milk",
      offeredMl: 120,
      consumedMl: 90,
    },
  });
  const eventA = await createFamilyCareEventForUser(userA, eventInput);
  const eventB = await createFamilyCareEventForUser(userB, eventInput);
  assert.notEqual(eventA.id, eventB.id, "the same client id must remain owner-scoped");

  const retriedEventA = await createFamilyCareEventForUser(userA, eventInput);
  assert.equal(retriedEventA.id, eventA.id, "same-owner retry must be idempotent");

  const [stateA, stateB] = await Promise.all([getFamilyCareForUser(userA), getFamilyCareForUser(userB)]);
  assert.deepEqual(stateA.events.map((event) => event.id), [eventA.id]);
  assert.deepEqual(stateB.events.map((event) => event.id), [eventB.id]);
  assert.equal(stateA.context.displayLabel, "Synthetic household A");
  assert.equal(stateB.context.displayLabel, "Synthetic household B");

  const updatedInput = familyCareEventInputSchema.parse({
    kind: "feed",
    observedAt,
    data: {
      method: "bottle",
      contents: "breast_milk",
      offeredMl: 120,
      consumedMl: 100,
      notes: "Synthetic update",
    },
  });
  await expectNotFound(() => updateFamilyCareEventForUser({ userId: userB, eventId: eventA.id, data: updatedInput }));
  await expectNotFound(() => deleteFamilyCareEventForUser(userB, eventA.id));

  const updatedEventA = await updateFamilyCareEventForUser({
    userId: userA,
    eventId: eventA.id,
    data: updatedInput,
  });
  assert.equal(updatedEventA.data.consumedMl, 100);

  await Promise.all([
    upsertFamilyCareHandoffForUser(userA, { currentCaregiverLabel: "Caregiver A1", nextAction: "Synthetic A" }),
    upsertFamilyCareHandoffForUser(userB, { currentCaregiverLabel: "Caregiver B1", nextAction: "Synthetic B" }),
  ]);
  const [handoffA, handoffB] = await Promise.all([getFamilyCareForUser(userA), getFamilyCareForUser(userB)]);
  assert.equal(handoffA.handoff.nextAction, "Synthetic A");
  assert.equal(handoffB.handoff.nextAction, "Synthetic B");

  await deleteFamilyCareEventForUser(userA, eventA.id);
  assert.equal((await getFamilyCareForUser(userA)).events.length, 0);
  assert.equal((await getFamilyCareForUser(userB)).events.length, 1);

  const revisionResult = await pool.query<{ action: string }>(
    "select action from family_care_event_revisions where user_id = $1 and event_id = $2 order by id",
    [userA, eventA.id],
  );
  assert.deepEqual(revisionResult.rows.map((row) => row.action), ["create", "update", "delete"]);

  assert.equal(
    createFamilyCareEventBodySchema.safeParse({
      clientEventId: "synthetic-invalid-0001",
      kind: "feed",
      observedAt,
      data: { method: "nursing", consumedMl: 30 },
    }).success,
    false,
    "nursing volume must not be guessed",
  );

  console.log("[qa:family-care:persistence] PASS: owner isolation, idempotency, CRUD, handoff, and audit revisions");
}

try {
  await run();
} finally {
  try {
    await pool.query(fs.readFileSync(rollbackPath, "utf8"));
  } finally {
    await pool.end();
  }
}
