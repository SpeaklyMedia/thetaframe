# Family Care V1 Contract

Date: 2026-11-05
Status: isolated feature-branch implementation contract; not production approval

## Scope lock

Family Care V1 is a protected, single-account module for four calm workflows:

- Tonight: an editable coverage/rest plan with clearly illustrative feeding bands.
- Quick Log: observed feed, diaper, infant sleep, pumping, and note events.
- Handoff: a short durable current-caregiver handoff.
- Summary: rolling 24-hour counts based only on recorded observations.

`/dashboard` remains the signed-in home. `/daily`, Daily Rhythm, Life Ledger,
admin Baby-KB, reminders, and AI draft behavior remain separate and unchanged.

## Source-to-target reuse matrix

| Existing source | Reuse | Boundary |
|---|---|---|
| Clerk `requireAuth` and Daily module access | Yes | Every API operation uses the current `userId`; Daily access is the V1 feature gate. |
| PostgreSQL + Drizzle | Yes | Additive Family Care tables only; no runtime schema creation. |
| OpenAPI + Orval clients | Yes | Contract-first protected endpoints. |
| Habit Canvas and shared controls | Yes | Calm, action-first responsive UI. |
| Dashboard | Launcher only | No home-route change or duplicate analytics store. |
| Daily Rhythm / daily frames | Link only | Never store care events as tasks, routines, or time blocks. |
| Life Ledger / admin Baby-KB | No storage reuse | Ownership and semantics do not match private care observations. |
| Mobile reminder outbox | No | Subdaily notifications are deferred. |
| Standalone planner | Visual reference only | No iframe, localStorage persistence, import, or copied private defaults. |

## Minimal persistence contract

All rows carry the authenticated owner `userId` directly.

- `family_care_contexts`: one editable private context per user, IANA timezone,
  configurable caregiver labels, and neutral plan-minute preferences.
- `family_care_events`: observed timestamp, optional end timestamp, event kind,
  validated kind-specific JSON payload, `caregiver_observation` source class,
  duplicate-safe client event id, and soft-delete timestamp.
- `family_care_event_revisions`: owner-scoped create/update/delete audit snapshots.
- `family_care_handoffs`: one current handoff per user with short typed fields.

Volume is stored as integral milliliters. Bottle offered, bottle consumed, and
pumped/produced milk are distinct. Nursing may have no measured volume. Wet and
stool are independent. Open sleep never receives a fabricated duration.

## Protected route contract

- `GET /api/family-care`
- `PUT /api/family-care/context`
- `POST /api/family-care/events`
- `PUT /api/family-care/events/{eventId}`
- `DELETE /api/family-care/events/{eventId}`
- `PUT /api/family-care/handoff`

Every route requires authentication and Daily-module access. Event lookup,
update, deletion, duplicate detection, and audit writes constrain by `userId`.
Ordinary admin status does not bypass private-row ownership.

## Explicit deferrals

Cross-account sharing, invitations, notifications, adaptive predictions,
clinical scoring/advice, medication dosing, proof ingestion, AI writes, import,
and production deployment are outside this implementation contract.
