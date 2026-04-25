# C56 Live Console Now Frame And System Health

Date: 2026-04-23
Status: PASS
Production target: `https://thetaframe.mrksylvstr.com`

## Summary

C56 turns the shipped `/console` preview shell into a first useful Console surface by activating two live read-only modules:

- `Now Frame` now surfaces one real Daily-derived object
- `System Health` now surfaces a minimal review-and-safety chip band

`/dashboard` remains the default signed-in home. No existing lane route, AI apply workflow, reminder queue, or edit surface moved into Console.

## Commits And Deployment

| Item | Value |
| --- | --- |
| Base git commit | `1fac2c15c02da39c49d6597632ff5255358884cc` |
| Workspace state deployed | dirty local workspace for C56 slice |
| Production deployment ID | `dpl_5miU1AugLEUeNrRjbPmqR71hYrFX` |
| Production deployment URL | `https://thetaframe-or6hfptr9-marks-projects-f03fd1cc.vercel.app` |
| Vercel inspect URL | `https://vercel.com/marks-projects-f03fd1cc/thetaframe/5miU1AugLEUeNrRjbPmqR71hYrFX` |
| Canonical production target | `https://thetaframe.mrksylvstr.com` |

## Implemented Changes

### Now Frame

- Replaced the `Now Frame` placeholder with one real Daily-derived hero object inside the existing Console shell.
- Reused the existing Daily frame read model; no Console-specific API was added.
- The Console now resolves the displayed object in this exact order:
  - first incomplete `tierA` task
  - first incomplete `tierB` task
  - first non-empty time block
  - non-empty `microWin`
  - calm empty state
- Added stable QA markers for:
  - live `Now Frame` container
  - source-type marker
  - empty-state marker
  - primary CTA
- Kept the module read-only. No checkbox mutation, inline editing, review controls, or apply actions were moved into Console.

### System Health

- Replaced the `System Health` placeholder with a compact live support band.
- Scope is intentionally limited to:
  - actionable AI review pressure
  - safe status chips
- Reused existing per-lane AI draft queries already proven in Dashboard:
  - Daily
  - Weekly
  - Vision
  - Life Ledger Events when allowed
  - REACH when allowed
- Added stable QA markers for:
  - live `System Health` container
  - review-count chip
  - lane-access chip
  - console-state chip
- Kept reminders, mobile/outbox/device status, sync telemetry, and BI-style metrics out of Console.

### Unchanged Console Behavior

- `/console` route, nav entry, shell atmosphere, and responsive layout buckets remain intact from C55.
- `Lane Atlas` remains live and permission-aware.
- `Week Vector`, `Constraint Horizon`, `Assistant Review`, and `Continuity` remain placeholders.
- `/dashboard` remains the canonical default signed-in home.

### Browser QA Hardening

- Extended the existing Console harness assertions to require the live markers for:
  - `Now Frame`
  - `System Health`
  - `Now Frame` source-type resolution
- Kept the existing C55 route/access matrix coverage unchanged.

### Durable Docs

- Updated `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md` for the live `Now Frame` and `System Health` state.
- Updated `_AI_SYSTEM/EXECUTIVE_CONSOLE_CONTRACT.md` so those two modules are no longer described as placeholders.
- Updated `_AI_SYSTEM/RECEIPT_INDEX.md` with this receipt.

## Browser-Verified Behavior

- Signed-in `/` still lands on `/dashboard`.
- Signed-in `/console` renders the live `Now Frame` and live `System Health` markers.
- Console still loads for:
  - default authenticated full non-admin user
  - Basic user
  - Select Authorized user
  - Admin user
- Existing Console mobile and ultrawide proof still passes.
- Existing role-based route/access matrix behavior remains unchanged.

Evidence directory:

- `scripts/test-results/thetaframe-browser-qa/c56-live-console-now-frame-and-system-health/`

Console evidence in that directory:

- `c55-console-desktop.png`
- `c55-console-mobile.png`
- `c55-console-ultrawide.png`

## Unchanged Behavior

- No new route, API, schema, migration, or OpenAPI change.
- No new write path from Console.
- No reminder queue, outbox, device transport, or calendar-home data in `System Health`.
- No edit/apply workflow moved out of Daily or other lane routes.
- No change to `/` redirect behavior or module access rules.
- Baby KB remains absent from the user-visible Console.

## Deferred Console Modules

- `Week Vector`
- `Constraint Horizon`
- `Assistant Review`
- `Continuity`
- reminder/mobile/outbox/device signals inside Console `System Health`
- wider-display Console polish beyond the first centered ultrawide pass
- any decision to replace `/dashboard` as the default signed-in home

## Verification

| Check | Result |
| --- | --- |
| `git diff --check` | PASS |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/scripts run typecheck` | PASS |
| `pnpm --filter @workspace/thetaframe run build` | PASS with existing Vite sourcemap/chunk warnings |
| `vercel deploy --prod --yes` | PASS: `dpl_5miU1AugLEUeNrRjbPmqR71hYrFX` |
| `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` | PASS: `{"status":"ok"}` |
| `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c56-live-console-now-frame-and-system-health pnpm run qa:browser` | PASS: `passes=19`, `skips=0` |

## Exclusions

Not changed:

- Dashboard default-home behavior
- Daily data model or apply flow
- reminder queue and mobile transport behavior
- browser auth capture semantics
- paid lanes or billing
- unrestricted assistant behavior

Not committed:

- raw browser evidence under `scripts/test-results/`
- auth storage state under `test-results/auth/`
- `.env*`
- `.vercel/`
- build output
