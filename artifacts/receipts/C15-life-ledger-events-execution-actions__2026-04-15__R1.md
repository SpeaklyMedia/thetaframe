# C15 Life Ledger Events Execution Actions

Date: 2026-04-15

## Summary

Completed the next narrow Life Ledger slice after `C14` by adding real execution-state actions to the `events` lane.

This slice keeps scope tight:
- no reminder delivery integration
- no Google Calendar sync behavior
- no generic Life Ledger mutation broadening
- no new apply consumer beyond the already-landed `events` draft apply path

The core design decision in this slice is:
- manual `events` rows update locally in `life_ledger_events`
- Baby-derived `events` rows do **not** mutate independently
- Baby-derived `events` synchronize through the linked `baby_kb_assignments` lifecycle so the execution lane and Baby governance lane do not drift

## Server and API Changes

Added a dedicated execution-state action surface instead of overloading `PUT /api/life-ledger/:tab/:id`:

- `POST /api/life-ledger/events/{id}/execution-state`

Request body:
- `action: mark_scheduled | mark_in_motion | mark_completed | mark_superseded`

Response:
- updated `LifeLedgerEntry`

Key implementation files:
- `artifacts/api-server/src/lib/lifeLedgerEventExecution.ts`
- `artifacts/api-server/src/routes/life-ledger.ts`
- `artifacts/api-server/src/lib/babyKbAssignments.ts`
- `lib/api-spec/openapi.yaml`

Behavior:
- manual events update `completionState` directly
- Baby-derived events map action -> assignment lifecycle and then re-sync the projected event
- `mark_completed` on a Baby-derived event updates the linked assignment to `completed`
- `mark_superseded` updates the linked assignment to `superseded`
- `mark_scheduled` reopens a completed / superseded / in-motion event back to the scheduled execution lane

Internal cleanup improvement included:
- Baby assignment `completedAt` / `supersededAt` now clear when the lifecycle moves back out of those terminal states
- recurring successor creation logic was factored into a shared helper so admin assignment updates and event-driven lifecycle sync use the same follow-on behavior

## Frontend Changes

Updated the Life Ledger `events` execution board in:
- `artifacts/thetaframe/src/pages/life-ledger.tsx`

New event-card controls:
- `Mark in motion`
- `Complete`
- `Supersede`
- `Back to scheduled` when the event is already `in_motion`, `completed`, or `superseded`

UI behavior:
- actions are only available on the `events` tab
- other Life Ledger tabs remain unchanged
- per-event pending state is shown on the active button
- inline action errors render above the execution board
- successful actions invalidate:
  - `events` list
  - `next-90-days`
  - Baby KB hero rollups
  - onboarding progress

## Roadmap Synchronization

Updated:
- `THETAFRAME_UI_REBUILD_ROADMAP.md`
- `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`

Roadmap truth after this slice:
- `C14` is complete
- `C15` is complete
- the next recommended work is now `C13B` Life Ledger `people` apply
- `Baby-4` remains deferred to `4D`

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Authenticated Runtime Smoke

Authenticated smoke ran against a local API server on `127.0.0.1:4017` backed by the linked Vercel `Development` environment, using a token derived from an existing active owner Clerk session.

Manual event assertions passed:
- authenticated `POST /api/life-ledger/events` -> `201`
- authenticated `POST /api/life-ledger/events/{id}/execution-state` `mark_in_motion` -> `200`
- authenticated `POST /api/life-ledger/events/{id}/execution-state` `mark_completed` -> `200`
- authenticated `GET /api/life-ledger/next-90-days` excluded the completed manual event
- authenticated `POST /api/life-ledger/events/{id}/execution-state` `mark_scheduled` -> `200`
- authenticated `GET /api/life-ledger/next-90-days` included the reset scheduled manual event again
- authenticated `POST /api/life-ledger/events/{id}/execution-state` `mark_superseded` -> `200`
- authenticated `DELETE /api/life-ledger/events/{id}` -> `204`

Baby-derived event assertions passed:
- authenticated `POST /api/admin/baby-kb/assignments` -> `201`
- returned assignment included `projectedEventId`
- authenticated `POST /api/life-ledger/events/{projectedEventId}/execution-state` `mark_in_motion` -> `200`
- authenticated `GET /api/admin/baby-kb/assignments` reflected `lifecycleState=in_motion`
- authenticated `POST /api/life-ledger/events/{projectedEventId}/execution-state` `mark_completed` -> `200`
- authenticated `GET /api/admin/baby-kb/assignments` reflected `lifecycleState=completed`
- cleanup `PATCH /api/admin/baby-kb/assignments/{id}` `lifecycleState=superseded` -> `200`

## Next Action

Proceed to `C13B`:
- make Life Ledger `people` the next apply-capable tab
- keep `financial`, `subscriptions`, `travel`, and deeper reminder behavior deferred until `people` proves the next durable-record apply pattern
