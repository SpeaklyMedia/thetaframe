# C23 Reminder Delivery Outbox Foundation

Date: 2026-04-15

## Summary

Implemented the next `4C` slice by turning the current reminder queue into a durable ThetaFrame-owned delivery outbox for `life_ledger_due`.

This slice keeps scope narrow:
- no device-token registration
- no APNs / FCM transport
- no Google Calendar alarms
- no new reminders product surface
- no changes to the existing `C22` queue actions

The design choice in this slice is:
- `events` remains the reminder source of truth
- reminder deliveries are now scheduled and deduplicated in a DB-backed outbox
- the outbox is route-safe and deep-link-safe
- the Events page now exposes compact delivery status without becoming an admin console

## Schema And Server Changes

Added a durable outbox table:
- `lib/db/src/schema/mobile-notification-outbox.ts`

Key fields:
- `sourceEventId`
- `notificationCategory`
- `route`
- `deepLink`
- `scheduledFor`
- `deliveryStatus`
- reminder snapshot fields for traceability

Deduping rule:
- one durable outbox row per user + event + category + scheduled reminder timestamp
- repeated reconciliation refreshes the same row instead of duplicating it

Added delivery and reconciliation logic in:
- `artifacts/api-server/src/lib/lifeLedgerEventReminders.ts`

Key behavior:
- active reminder-enabled events create or refresh queued outbox rows
- completed / superseded / reminder-disabled events cancel queued rows
- orphan queued rows for deleted events are cancelled during reconciliation
- sent / acknowledged rows are preserved as lifecycle history rather than being reinserted

Reconciliation is now triggered from:
- event create
- event update
- event delete
- event execution-state updates
- event reminder-policy updates

Added new API routes in:
- `artifacts/api-server/src/routes/mobile-notifications.ts`

New endpoints:
- `GET /api/mobile/notifications/outbox`
- `POST /api/mobile/notifications/{id}/mark-sent`
- `POST /api/mobile/notifications/{id}/acknowledge`

These routes are:
- auth-gated
- limited through Life Ledger module access
- scoped to the current route-safe reminder category

## Frontend Changes

Updated:
- `artifacts/thetaframe/src/pages/life-ledger.tsx`

Added a compact delivery-status block on the `events` tab:
- queued deliveries count
- due-now queued coverage
- due-now local-only count
- most recent sent delivery

Important behavior:
- the `C22` `Due Now / Coming Up` queue remains intact
- the new delivery block is additive only
- it reads from the generated `GET /mobile/notifications/outbox` hook
- existing event actions still invalidate:
  - reminder queue
  - outbox query
  - related event read models

## Validation

Completed:
- `pnpm --filter @workspace/db run push` using a temporary Vercel `Development` env file
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

The temporary env artifact was removed after validation.

## Runtime Proof

Production deploy:
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/EGQbZvZmetRWLSVyAjGJ1X4Ykgdu`
- Deployment: `https://thetaframe-oatx9z89k-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Base URL validated: `https://thetaframe.mrksylvstr.com`

Authenticated production outbox smoke passed using saved Playwright browser auth state and a live Clerk token.

Manual outbox assertions passed:
- created a reminder-enabled event and verified a queued outbox row was created
- repeated `GET /api/mobile/notifications/outbox` did not duplicate the queued row
- `POST /api/mobile/notifications/{id}/mark-sent` changed status to `sent`
- `POST /api/mobile/notifications/{id}/acknowledge` changed status to `acknowledged`
- completing a second queued event removed its queued row from subsequent outbox reads
- an existing Baby-derived projected reminder also appeared in the outbox

Cleanup:
- temporary proof events were deleted
- temporary Baby assignment, when created, would have been superseded after proof; in this run an existing Baby-derived row already satisfied the proof

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - this slice introduces durable delivery plumbing without introducing actual mobile transport
  - later native delivery work can now consume a stable outbox lifecycle instead of recomputing reminder state ad hoc
