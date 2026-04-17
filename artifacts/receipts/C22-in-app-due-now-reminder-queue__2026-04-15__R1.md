# C22 In-App Due-Now Reminder Queue For Life Ledger Events

Date: 2026-04-15

## Summary

Implemented the next `4C` slice by turning the `C21` reminder queue into a real in-app execution surface on `life-ledger?tab=events`.

This slice keeps scope narrow:
- no new API route
- no push or local-notification delivery
- no Google Calendar sync
- no Daily / Weekly / Vision expansion
- no snooze action

The design choice in this slice is:
- reuse the existing reminder-queue read model
- derive urgency client-side
- keep `events` as the source of truth
- make reminder items actionable directly from the queue surface without replacing the existing execution board

## Frontend Changes

Updated:
- `artifacts/thetaframe/src/pages/life-ledger.tsx`

Main changes:
- upgraded `EventReminderReturnCard` from a lightweight mobile-return card into a richer in-app queue surface
- kept the surface above the `events` execution board and `Next 90 Days`
- preserved the route and deep-link context from `C21`, but made it secondary to the actionable queue itself

New behavior:
- derives two client-side sections from the existing queue data:
  - `Due Now`
  - `Coming Up`
- `Due Now` means:
  - overdue items
  - or reminder timestamps within the next 24 hours
- queue rows resolve against loaded `events` entries by `id`
- matched rows reuse existing event execution-state actions:
  - `Mark in motion`
  - `Back to scheduled`
  - `Complete`
- unmatched rows degrade safely to route-only reminder items instead of failing the whole queue

Visible queue state now includes:
- active reminder count
- due-now count
- coming-up count
- next reminder timestamp
- route and deep-link context
- reminder source badge:
  - `Manual event`
  - `Baby-derived`

## API And Data Model

No server or schema changes were required for this slice.

Reused as-is:
- `GET /api/life-ledger/events/reminder-queue`
- existing execution-state mutation routes
- existing reminder-policy mutation route

Important implementation choice:
- urgency grouping stays on the client for now
- queue ordering still comes from the server:
  - `nextReminderAt`
  - then execution date

## Validation

Completed:
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Runtime Proof

Production deploy:
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/54mMPMUbCJShAf6LHLProwdHTg5Q`
- Deployment: `https://thetaframe-cwx0772el-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Base URL validated: `https://thetaframe.mrksylvstr.com`

Authenticated production proof passed using saved Playwright browser auth state and a live Clerk token.

API-backed assertions passed:
- created two manual reminder-enabled events:
  - one due-now queue item
  - one coming-up queue item
- confirmed both were returned by:
  - `GET /api/life-ledger/events/reminder-queue`
- confirmed route/deep-link values remained:
  - `route=/life-ledger?tab=events`
  - `deepLink=thetaframe://life-ledger/new`
- confirmed an existing Baby-derived projected reminder item was also present in the same queue

Cleanup:
- temporary queue-proof events were deleted after verification

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the first proof attempt showed that a same-day `[0]` reminder can already be outside the active queue window if its timestamp has passed; the final proof used a tomorrow-due item for the due-now bucket
  - this slice deepens in-app reminder execution without starting delivery plumbing
