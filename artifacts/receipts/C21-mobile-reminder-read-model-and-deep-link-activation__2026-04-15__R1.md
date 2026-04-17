# C21 Mobile Reminder Read Model And Deep-Link Activation

Date: 2026-04-15

## Summary

Implemented the first real `4C` slice by turning the `C20` reminder state on Life Ledger `events` into a mobile-consumable return surface.

This slice keeps scope narrow:
- no push or local-notification delivery
- no Google Calendar sync
- no new mobile information architecture
- no new top-level reminders module

The design choice in this slice is:
- `events` remains the reminder source of truth
- `life_ledger_due` now resolves to the `events` tab route, not the generic Life Ledger root
- mobile-ready reminder return state is exposed as a read model instead of being implied by internal event fields alone
- the existing mobile card on the `events` page is now live and queue-backed

## Shared Contracts And Routing

Updated the shared mobile contract layer in:
- `lib/integrations/shared-contracts/src/mobile.ts`

Key additions:
- `thetaMobileNotificationCategoryRoutes`
- `thetaMobileResolvedRouteSchema`
- `thetaMobileNotificationRoutes`

Important behavior:
- `life_ledger_due` still targets the `life-ledger` lane
- its resolved web return route is now explicitly:
  - `/life-ledger?tab=events`
- the Life Ledger deep link remains:
  - `thetaframe://life-ledger/new`

Frontend mobile routing now consumes the resolved shared notification routes in:
- `artifacts/thetaframe/src/lib/mobile-routing.ts`

## Reminder Queue Read Model

Added a new event-only read model in:
- `artifacts/api-server/src/lib/lifeLedgerEventReminders.ts`

New exported type:
- `LifeLedgerEventReminderQueueItem`

New helper behavior:
- serializes only reminder-active `events`
- excludes rows that do not produce:
  - `executionDate`
  - `nextReminderAt`
  - reminder state `scheduled` or `snoozed`
- returns a mobile-safe queue item shape with:
  - `id`
  - `name`
  - `executionDate`
  - `nextReminderAt`
  - `reminderState`
  - `reminderLeadDays`
  - `impactLevel`
  - `sourceType`
  - `route`
  - `deepLink`
  - `notificationCategory`
- orders by:
  - `nextReminderAt`
  - then `executionDate`

New route:
- `GET /api/life-ledger/events/reminder-queue`

Implemented in:
- `artifacts/api-server/src/routes/life-ledger.ts`

No DB schema changes were required.

## Events Page Mobile Surface

Updated the mobile placeholder content in:
- `artifacts/thetaframe/src/lib/mobile-placeholders.ts`

The `events` mobile card now reflects real reminder-return semantics:
- mode: `notification`
- notification route:
  - `/life-ledger?tab=events`
- deep link:
  - `thetaframe://life-ledger/new`

Enhanced the shared card shell in:
- `artifacts/thetaframe/src/components/shell/MobileIntegrationStatusCard.tsx`

New capabilities:
- optional `statusLabel`
- optional child content region for live queue-backed UI

Updated the Life Ledger page in:
- `artifacts/thetaframe/src/pages/life-ledger.tsx`

New live card:
- `EventReminderReturnCard`

Behavior:
- uses `useGetLifeLedgerEventReminderQueue`
- shows:
  - active reminder count
  - next reminder timing
  - direct Events route link
  - preview list of the next few reminder-active items
- preview items link back to:
  - `/life-ledger?tab=events`
- queue invalidation now runs after:
  - event create/update/delete via tab invalidation
  - event execution-state updates
  - reminder-policy updates

## API Spec And Generated Clients

Updated:
- `lib/api-spec/openapi.yaml`

Added:
- `GET /life-ledger/events/reminder-queue`
- `LifeLedgerEventReminderQueueItem`
- `LifeLedgerEventReminderQueueResponse`

Regenerated:
- `lib/api-client-react`
- `lib/api-zod`

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Runtime Proof

Production deploy:
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/2psMobYhMojkPpdeY7Y4Qrd6V76r`
- Deployment: `https://thetaframe-6xre1n6ck-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Base URL validated: `https://thetaframe.mrksylvstr.com`

Authenticated production reminder-queue smoke passed using the saved Playwright browser auth state and a live Clerk token:

Manual event assertions passed:
- created two reminder-enabled manual events
- `GET /api/life-ledger/events/reminder-queue` returned both
- returned items were ordered by `nextReminderAt`
- returned route fields were:
  - `route=/life-ledger?tab=events`
  - `deepLink=thetaframe://life-ledger/new`
  - `notificationCategory=life_ledger_due`
- after marking one created event `completed`, it was removed from the queue while the still-active comparison event remained
- cleanup deleted the temporary manual events

Baby-derived compatibility passed:
- the production reminder queue already contained an active projected row with:
  - `sourceType=baby_kb_assignment`
- that queue item resolved to the same route and notification category as manual event reminders

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - this slice activates route-safe mobile reminder return semantics without adding delivery infrastructure
  - `events` is now ready to serve as the first mobile reminder consumer for future `4C` work
