# C55 Console Route And Layout Foundation

Date: 2026-04-23
Status: PASS
Production target: `https://thetaframe.mrksylvstr.com`

## Summary

C55 ships the first authenticated `/console` slice for ThetaFrame.

This slice adds a real signed-in Console route, signed-in desktop/mobile navigation entry, dedicated Console shell atmosphere, responsive preview layout buckets, stable browser QA markers, and a permission-aware `Lane Atlas`.

`/dashboard` remains the canonical default signed-in home. No existing lane route, first-allowed-lane logic, access-matrix rule, AI write behavior, or browser auth contract was replaced.

## Commits And Deployment

| Item | Value |
| --- | --- |
| Base git commit | `1fac2c15c02da39c49d6597632ff5255358884cc` |
| Workspace state deployed | dirty local workspace for C55 slice |
| Production deployment ID | `dpl_8R1mTQmLEJQfboRbjfBmu9Hx1FPP` |
| Production deployment URL | `https://thetaframe-ihxlp4qoa-marks-projects-f03fd1cc.vercel.app` |
| Vercel inspect URL | `https://vercel.com/marks-projects-f03fd1cc/thetaframe/8R1mTQmLEJQfboRbjfBmu9Hx1FPP` |
| Canonical production target | `https://thetaframe.mrksylvstr.com` |

## Implemented Changes

### Route And Access

- Added `/console` beside `/dashboard` in the signed-in router.
- `/console` uses the same signed-in-only route model as Dashboard:
  - signed-out users redirect to `/`
  - signed-in users can open `/console` regardless of optional module grants
- Signed-in `/` still redirects to `/dashboard`.

### Signed-In Navigation

- Added `Console` to the signed-in desktop nav with stable test id `link-console`.
- Added `Console` to the signed-in mobile nav with stable test id `link-console-mobile`.
- Kept `Dashboard` visible and unchanged in both nav contexts.

### Console Shell

- Added `artifacts/thetaframe/src/pages/console.tsx`.
- Extended the shared shell atmosphere model with `data-lane="console"` and a dedicated Console background treatment.
- Implemented the first responsive Console layout buckets:
  - phone: single-column overview
  - tablet/small desktop: hero plus support stack
  - desktop: dominant primary region plus support rail
  - first ultrawide pass: constrained centered reading field

### Console Content Depth

- Added stable placeholder regions for:
  - `Now Frame`
  - `System Health`
  - `Week Vector`
  - `Constraint Horizon`
  - `Lane Atlas`
  - `Assistant Review`
  - `Continuity`
- Each region now renders contract-aligned explanatory copy and a clear preview-shell state.
- `Lane Atlas` is the only live module in this slice and exposes permission-aware lane links only.
- No derived counts, reminder totals, queue totals, live calendar projections, or review/apply actions were moved into Console.

### Browser QA Hardening

- Extended `scripts/src/runThetaFrameBrowserQa.ts` to cover:
  - signed-out `/console` fallback to public home
  - signed-in `/console` shell render
  - Console desktop, mobile, and ultrawide evidence
  - Basic, Select Authorized, and Admin access to `/console`
  - Console nav visibility on desktop and mobile
- Refreshed the four Playwright storage states on 2026-04-23 using short-lived Clerk sign-in-token URLs and PTY-backed Chrome for Testing:
  - `test-results/auth/thetaframe-user.json`
  - `test-results/auth/thetaframe-admin.json`
  - `test-results/auth/thetaframe-basic.json`
  - `test-results/auth/thetaframe-select-authorized.json`
- The temporary production env pull used to mint sign-in tokens was kept under `/tmp` and removed after capture.

### Durable Docs

- Updated `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md` for the implemented preview-shell state.
- Updated `_AI_SYSTEM/EXECUTIVE_CONSOLE_CONTRACT.md` so `/console` is no longer treated as planning-only.
- Updated `_AI_SYSTEM/RUNBOOKS.md` route checklist for `/console`.
- Updated `_AI_SYSTEM/PROJECT_INDEX.md`, `_AI_SYSTEM/RECEIPT_INDEX.md`, and `THETAFRAME_UI_REBUILD_ROADMAP.md` so future agents see the shipped C55 state.

## Browser-Verified Behavior

- Signed-out `/console` redirects to the public home.
- Signed-in `/` still lands on `/dashboard`.
- Signed-in `/console` renders the Console preview shell and the expected placeholder regions.
- Signed-in desktop nav shows both `Dashboard` and `Console`.
- Signed-in mobile nav shows both `Dashboard` and `Console`.
- `Lane Atlas` shows real lane links while respecting Basic, Select Authorized, Admin, and full non-admin access.
- `/console` loads for:
  - default authenticated full non-admin user
  - Basic user
  - Select Authorized user
  - Admin user

Console evidence captured:

- `scripts/test-results/thetaframe-browser-qa/c55-console-route-and-layout-foundation/c55-console-desktop.png`
- `scripts/test-results/thetaframe-browser-qa/c55-console-route-and-layout-foundation/c55-console-mobile.png`
- `scripts/test-results/thetaframe-browser-qa/c55-console-route-and-layout-foundation/c55-console-ultrawide.png`

## Unchanged Behavior

- `/dashboard` remains the default signed-in landing path.
- Existing lane routes, access-denied behavior, admin gating, and first-allowed-lane logic remain unchanged.
- No app API contract, OpenAPI output, database schema, migration, or saved-data shape changed.
- No heavy editing, AI review/apply workflow, or operational queue moved into Console.
- Baby KB remains absent from the user-visible Console surface.

## Deferred Console Modules

- real `Now Frame` data and Daily object reuse
- real `System Health` chips and sync/reminder signals
- real `Week Vector` reuse
- real `Constraint Horizon` reuse and projection logic
- real `Assistant Review` queue data
- real `Continuity` reuse from Vision
- wider-display polish beyond the first centered ultrawide pass
- any decision to replace `/dashboard` as the default signed-in home

## Verification

| Check | Result |
| --- | --- |
| `git diff --check` | PASS |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/scripts run typecheck` | PASS |
| `pnpm --filter @workspace/thetaframe run build` | PASS with existing Vite sourcemap/chunk warnings |
| `vercel deploy --prod --yes` | PASS: `dpl_8R1mTQmLEJQfboRbjfBmu9Hx1FPP` |
| `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` | PASS: `{"status":"ok"}` |
| `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c55-console-route-and-layout-foundation pnpm run qa:browser` | PASS: `passes=19`, `skips=0` |

## Notes

- The first production browser attempt failed because the April 16 storage states were stale.
- C55 resolved that by minting fresh short-lived Clerk sign-in-token URLs through the backend API and recapturing all four role states without writing token URLs into the repo.
- The generic authenticated `thetaframe-user.json` state was recaptured from the existing full non-admin access profile rather than the owner-admin account so pre-existing Life Ledger order assertions remained valid.

## Exclusions

Not changed:

- `/` redirect behavior;
- dashboard default-home behavior;
- lane data models or apply flows;
- browser auth capture helper semantics;
- paid lanes or billing;
- unrestricted global assistant behavior.

Not committed:

- raw browser evidence under `scripts/test-results/`;
- refreshed auth storage state under `test-results/auth/`;
- temporary `/tmp` env pull;
- `.env*`;
- `.vercel/`;
- build output.
