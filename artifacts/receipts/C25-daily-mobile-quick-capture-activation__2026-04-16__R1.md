# C25 Daily Mobile Quick Capture Activation

Date: 2026-04-16

## Summary

Implemented the next `4C` slice by activating the first live mobile quick-capture path, scoped to `current_work -> Daily`.

This slice keeps scope narrow:
- no share-sheet capture
- no widget entry
- no cross-lane classifier
- no AI classification
- no new capture inbox

The path now proven end to end is:
- mobile shortcut capture request
- lane-safe route resolution
- direct write into today’s Daily frame
- immediate Tier B visibility on `/daily`

## Server Changes

Updated:
- `artifacts/api-server/src/lib/dailyFrames.ts`
- `artifacts/api-server/src/routes/mobile-notifications.ts`

Added a Daily quick-capture helper in:
- `captureDailyQuickTaskForUser(...)`

Key behavior:
- trims input and rejects blank text with `400`
- loads today’s frame when it exists
- otherwise creates a default frame with:
  - `colourState = green`
  - `tierA = []`
  - `tierB = []`
  - `timeBlocks = []`
  - `microWin = null`
  - `skipProtocolUsed = false`
  - `skipProtocolChoice = null`
- prepends a new Tier B task with:
  - server-generated UUID
  - captured text
  - `completed = false`
- reuses the existing Daily frame upsert contract and validation

Added a new route in the existing mobile route family:
- `POST /api/mobile/quick-capture`

Request rules:
- `intent` must be `current_work`
- `captureChannel` must be `ios_shortcut` or `android_shortcut`
- `text` must be non-empty after trimming
- Daily auth/module access still gates the route

Response shape:
- `lane = daily`
- `route = /daily`
- `deepLink = thetaframe://daily/new`
- `dailyFrame`
- `capturedTaskId`

## Contract Changes

Updated:
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`

Added:
- `POST /mobile/quick-capture`
- `MobileQuickCaptureIntent`
- `MobileQuickCaptureChannel`
- `MobileQuickCaptureBody`
- `MobileQuickCaptureResponse`

## Frontend Changes

Updated:
- `artifacts/thetaframe/src/pages/daily.tsx`

Replaced the dormant Daily mobile placeholder with a live quick-capture simulator card on `/daily`.

Visible card state now includes:
- resolved target lane
- resolved route
- Daily deep link
- supported shortcut channels
- last captured task preview

Added controls:
- free-text quick-capture input
- `Capture via iPhone Shortcut`
- `Capture via Android Shortcut`

Successful capture behavior:
- calls the new mobile quick-capture API
- hydrates the returned Daily frame into local page state
- updates the React Query Daily frame cache
- invalidates onboarding progress
- clears the text input
- leaves the captured task visible in Tier B immediately

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
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/EY3yUpekgTUonJdNfDWawLi9LPmw`
- Deployment: `https://thetaframe-gbj4bz6fa-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Base URL validated: `https://thetaframe.mrksylvstr.com`

Authenticated production API smoke passed through a signed-in browser context:
- initial `GET /api/daily-frames/2026-04-16` returned `404`
- first quick capture via `ios_shortcut` created today’s frame from defaults and inserted the first Tier B task
- response returned `daily`, `/daily`, and `thetaframe://daily/new`
- second quick capture via `android_shortcut` prepended another Tier B task
- blank text returned `400`
- unsupported `intent` returned `400`
- unsupported `captureChannel` returned `400`

Proof state handling:
- after smoke, today’s frame was restored to an empty default frame through the existing Daily upsert route
- quick capture marks the Daily onboarding surface complete for the proof user, and that completion state was not reverted

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - this slice proves live shortcut capture into Daily without introducing a second planning surface
  - Tier B remains the low-risk landing zone for first-pass current-work capture
