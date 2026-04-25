# C64 Shared User Preference Controls

Date: 2026-04-23
Status: Production complete

## Summary

C64 adds a shared persisted user-preferences foundation for ThetaFrame. Signed-in users now have one `Display + reminders` entry point that controls reduced stimulation, density, and reminder tone across Dashboard, Console, and the core Daily/Weekly/Vision signed-in lanes.

This slice does not change `/` routing, does not replace `/dashboard` as the default signed-in home, and does not add new Console modules or write-paths inside Console.

## Delivered

- Added persisted `user_preferences` storage with one row per Clerk `userId`.
- Added authenticated `GET /api/user-preferences` and `PUT /api/user-preferences`.
- Added generated OpenAPI/client/Zod types for the new preference surface.
- Added shared frontend preference helpers and `useUserPreferences`.
- Added the signed-in `Display + reminders` dialog in the header.
- Applied shell-level preference attributes:
  - `data-density`
  - `data-reduced-stimulation`
  - `data-reminder-tone`
- Applied the first shared preference behaviors across:
  - `/dashboard`
  - `/console`
  - `/daily`
  - `/weekly`
  - `/vision`

## Preference Contract

Current enums:

- `reducedStimulation`: `default`, `reduced`
- `density`: `comfortable`, `compact`
- `reminderTone`: `gentle`, `standard`

Current defaults:

- `reducedStimulation=default`
- `density=comfortable`
- `reminderTone=gentle`

Read behavior:

- if no saved row exists yet, `GET /api/user-preferences` returns the stable default object
- first write upserts the row

## Production Fixes During Closeout

- The first implementation exposed a production React render-loop when opening the preferences dialog.
- Root cause: the resolved preference object changed identity on every render, which retriggered dialog-local state sync.
- Final fix: memoize resolved preferences in `useUserPreferences` so dialog open/save behavior stays stable.
- Browser QA was also hardened to dismiss the signed-in onboarding modal deterministically before opening the new preferences dialog.

## Verification

Static and build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Database:

- `pnpm --filter @workspace/db run push`

Production:

- deploy id: `dpl_56mUL5iNCKi1fhkAN6P3jCdN68f2`
- health: `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` -> `{"status":"ok"}`

Browser proof:

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c64-shared-user-preference-controls pnpm run qa:browser`
- result: `passes=19`, `skips=0`
- Console viewport manifest:
  - `scripts/test-results/thetaframe-browser-qa/c64-shared-user-preference-controls/c64-console-viewport-manifest.json`

Preference proof coverage:

- opens the `Display + reminders` dialog
- saves the opposite of the user’s current reduced-stimulation/density/reminder-tone values
- verifies persisted API readback
- verifies shell data attributes after reload
- verifies density change at the dashboard shell
- verifies reduced-stimulation blur change at the header
- verifies reminder-tone copy change on Dashboard and Console
- restores the user’s original saved preference state before leaving the session

## Unchanged

- `/dashboard` remains the default signed-in home
- `/console` remains additive
- `user_modes` still owns helper mode and workspace color only
- no permissions, lane ordering, or review/apply ownership rules changed
- no new Console module behavior shipped
