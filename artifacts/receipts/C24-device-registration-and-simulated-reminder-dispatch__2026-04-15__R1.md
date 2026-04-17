# C24 Device Registration and Simulated Reminder Dispatch

Date: 2026-04-15

## Summary

Implemented the next `4C` slice by adding the first device-facing layer on top of the existing reminder outbox.

This slice keeps scope narrow:
- no APNs / FCM transport
- no push token registration
- no mobile permission model
- no quick-capture changes
- no separate reminders product surface

The chain now proven in-product is:
- reminder-active Life Ledger event
- queued outbox row
- active simulated mobile endpoint
- simulated dispatch to a chosen or fallback device

## Schema And Server Changes

Added a durable simulated-device table:
- `lib/db/src/schema/mobile-devices.ts`

Key fields:
- `installationId`
- `deviceLabel`
- `platform`
- `deliveryProvider`
- `isActive`
- `lastSeenAt`

Upsert rule:
- one device row per user + installation id
- repeated registration refreshes the existing row, reactivates it, and updates `lastSeenAt`

Extended the outbox table in:
- `lib/db/src/schema/mobile-notification-outbox.ts`

Added dispatch-target fields:
- `deliveredDeviceId`
- `deliveredDeviceLabel`
- `deliveryProvider`

Updated reminder / outbox logic in:
- `artifacts/api-server/src/lib/lifeLedgerEventReminders.ts`

Key behavior:
- list simulated devices ordered by `lastSeenAt desc`
- register devices with provider derived from platform
- deactivate devices without deleting history
- simulate dispatch only for queued outbox rows
- explicit `deviceId` wins when provided
- otherwise the most recently seen active device is selected
- missing active devices or non-queued rows return `409`

Added API routes in:
- `artifacts/api-server/src/routes/mobile-notifications.ts`

New endpoints:
- `GET /api/mobile/devices`
- `POST /api/mobile/devices/register`
- `POST /api/mobile/devices/{id}/deactivate`
- `POST /api/mobile/notifications/{id}/simulate-dispatch`

## Frontend Changes

Updated:
- `artifacts/thetaframe/src/pages/life-ledger.tsx`

Extended the existing reminder delivery-status block on the `events` tab with a compact Mobile Delivery Simulator section.

Visible simulator state now includes:
- active registered device count
- most recent active device
- queued deliveries eligible for dispatch
- most recent dispatched device / provider

Added UI controls:
- `Register iPhone`
- `Register Android`
- `Deactivate`
- `Dispatch next queued reminder`

Browser behavior:
- installation ids are generated once per browser profile + platform and stored in local storage
- simulator actions invalidate the existing outbox/device queries
- the `C22` Due Now / Coming Up queue and execution board remain unchanged

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
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/Bc27s2VY68BQ9FbzeaLhNxNzjVZX`
- Deployment: `https://thetaframe-alqypz368-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Base URL validated: `https://thetaframe.mrksylvstr.com`

Authenticated production API smoke passed through a signed-in browser context:
- iOS registration created a simulated device row
- repeated iOS registration upserted the same installation id
- Android registration created a second device and sorted first by `lastSeenAt`
- explicit simulated dispatch targeted the provided iOS device id
- fallback simulated dispatch targeted the most-recent active Android device
- deactivating both devices caused simulated dispatch to return `409`
- completing a queued reminder row made it non-dispatchable and returned `409`

Cleanup:
- temporary proof events were deleted
- temporary proof devices were deactivated after the run
- sent outbox history rows were intentionally preserved

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - this slice proves device registration and single-target simulated dispatch without introducing real native transport
  - the next delivery step can now layer real provider transport or token registration on top of stable endpoint and outbox models
