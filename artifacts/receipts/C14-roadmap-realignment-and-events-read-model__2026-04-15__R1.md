# C14 Roadmap Realignment and Reminder-Aware Events Read Model

Date: 2026-04-15

## Summary

Completed two tightly coupled tasks:
- synchronized the roadmap and execution-plan docs with the repo's actual implemented state
- deepened Life Ledger `events` into the reminder-aware execution read model already implied by the persisted schema and Baby KB projection flow

This slice does not add:
- reminder delivery mechanics
- Google Calendar sync behavior
- new apply consumers outside the already-supported lanes
- event-state mutation controls in the UI
- Baby KB AI suggestion flows

## Roadmap Synchronization

Updated:
- `THETAFRAME_UI_REBUILD_ROADMAP.md`
- `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`

Normalized roadmap truth:
- R3 shell / brand baseline is complete
- `C0` through `C13A` are complete
- Baby KB `Baby-1`, `Baby-2`, and `Baby-3` are complete
- the next recommended sequence is now:
  - `C14` reminder-aware `events`
  - `C15` event-state actions only if still needed
  - `C13B` `people` apply
  - remaining Life Ledger tab apply consumers
  - `Baby-4` only under `4D`

This corrects the previous drift where the written plan still treated already-landed slices as future work.

## Events Read-Model Changes

Public schema and generated client alignment:
- extended `LifeLedgerEntry` to include:
  - `sourceType`
  - `sourceEntryId`
  - `sourceAssignmentId`
  - `nextDueDate`
  - `reminderPolicy`
  - `completionState`
  - `snoozedUntil`
- regenerated:
  - `@workspace/api-zod`
  - `@workspace/api-client-react`

Server behavior:
- `GET /api/life-ledger/next-90-days` now treats `events` as execution-state records
- for `events`, it prefers `nextDueDate`, then `dueDate`
- completed and superseded events are excluded from active planning output

Frontend behavior:
- the `events` tab no longer renders through the generic Life Ledger table
- `events` now render in grouped execution sections:
  - `Due Soon`
  - `Scheduled`
  - `In Motion`
  - `Completed / Superseded`
- event cards now surface:
  - due-state / status chip
  - provenance badge for Baby-derived events
  - next-due text
  - snoozed-until text when present
  - reminder-policy summary
- non-`events` Life Ledger tabs remain on the existing table path

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`
- `pnpm --filter @workspace/api-server run build`

Authenticated read-only smoke against a local API server on `127.0.0.1:4016` using the linked Vercel `Development` env and an owner Clerk session token:
- `GET /api/life-ledger/events` returned persisted event execution fields
- observed:
  - `events_count=2`
  - `event_fields_present=True`
  - `sample_sourceType=baby_kb_assignment`
  - `sample_completionState=scheduled`
- `GET /api/life-ledger/next-90-days` remained coherent with the current event window
  - `next90_count=2`
  - `next90_event_entries=2`

Note:
- the current Development fixtures did not include a completed or superseded event in the active window, so the exclusion rule was validated by server logic change plus static review rather than by a live completed-event sample in this receipt.

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Next Action

Keep the roadmap sequence aligned to the repo:
1. evaluate whether `C15` event-state actions are still necessary after the new `events` read model
2. if not urgent, move to `C13B` Life Ledger `people` apply
3. keep `Baby-4` deferred until `4D`
