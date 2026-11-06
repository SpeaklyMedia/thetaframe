import assert from "node:assert/strict";
const modulePath = process.env.FAMILY_CARE_QA_MODULE;
if (!modulePath) throw new Error("FAMILY_CARE_QA_MODULE is required");

const {
  forwardMinutes,
  millilitersToOunces,
  ouncesToMilliliters,
  summarizeFamilyCareEvents,
  timelinePieces,
} = await import(modulePath);

assert.equal(ouncesToMilliliters("3"), 89);
assert.equal(millilitersToOunces(89), "3");
assert.equal(forwardMinutes(19 * 60, 0), 5 * 60);
assert.equal(forwardMinutes(0, 5 * 60), 5 * 60);
assert.equal(
  Math.round(timelinePieces(19 * 60, 0).reduce((total, piece) => total + piece.width, 0) * 10),
  Math.round((5 / 24) * 100 * 10),
);

const base = {
  clientEventId: "synthetic-qa-event",
  sourceClass: "caregiver_observation",
  createdAt: "2026-11-05T12:00:00.000Z",
  updatedAt: "2026-11-05T12:00:00.000Z",
  deletedAt: null,
};
const now = new Date("2026-11-05T12:00:00.000Z");
const summary = summarizeFamilyCareEvents(
  [
    { ...base, id: 1, kind: "feed", observedAt: "2026-11-05T11:00:00.000Z", endedAt: null, data: { method: "bottle", offeredMl: 90, consumedMl: 75 } },
    { ...base, id: 2, kind: "feed", observedAt: "2026-11-05T10:00:00.000Z", endedAt: null, data: { method: "nursing", consumedMl: null } },
    { ...base, id: 3, kind: "diaper", observedAt: "2026-11-05T09:00:00.000Z", endedAt: null, data: { wet: true, stool: true } },
    { ...base, id: 4, kind: "pump", observedAt: "2026-11-05T08:00:00.000Z", endedAt: null, data: { expressedMl: 55 } },
    { ...base, id: 5, kind: "sleep", observedAt: "2026-11-05T05:20:00.000Z", endedAt: "2026-11-05T07:05:00.000Z", data: {} },
    { ...base, id: 6, kind: "sleep", observedAt: "2026-11-05T08:00:00.000Z", endedAt: null, data: {} },
    { ...base, id: 7, kind: "feed", observedAt: "2026-11-04T10:00:00.000Z", endedAt: null, data: { method: "bottle", consumedMl: 999 } },
  ],
  now,
);
assert.deepEqual(summary, {
  feedCount: 2,
  bottleConsumedMl: 75,
  pumpedMl: 55,
  wetCount: 1,
  stoolCount: 1,
  completedSleepMinutes: 105,
});

const dst = summarizeFamilyCareEvents(
  [
    { ...base, id: 8, kind: "sleep", observedAt: "2026-03-08T01:30:00-05:00", endedAt: "2026-03-08T03:30:00-04:00", data: {} },
    { ...base, id: 9, kind: "sleep", observedAt: "2026-11-01T01:30:00-04:00", endedAt: "2026-11-01T01:30:00-05:00", data: {} },
  ],
  new Date("2026-11-01T08:00:00.000Z"),
);
assert.equal(dst.completedSleepMinutes, 60, "fall-back repeated hour uses absolute instants");

console.log("[family-care-contract] PASS checks=11 synthetic_only=true");
