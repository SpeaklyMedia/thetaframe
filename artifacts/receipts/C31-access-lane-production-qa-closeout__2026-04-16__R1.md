# C31 Access Lane Production QA Closeout

Date: 2026-04-16

## Scope

Closed the deploy and harness portions of the C31 access-lane proof:
- deployed the C30 access hardening build to production
- extended auth-state capture for Basic and Select Authorized QA accounts
- extended browser QA with API permission/status assertions
- documented the expanded route/API access matrix in the runbook

Changed files for this slice:
- `package.json`
- `scripts/package.json`
- `scripts/src/captureThetaFrameBrowserAuthState.ts`
- `scripts/src/runThetaFrameBrowserQa.ts`
- `_AI_SYSTEM/RUNBOOKS.md`

No paid-lane or billing logic was implemented.

## Implementation Summary

- Added capture roles:
  - `--role=basic` -> `test-results/auth/thetaframe-basic.json`
  - `--role=select-authorized` -> `test-results/auth/thetaframe-select-authorized.json`
- Added root and scripts-package commands:
  - `pnpm run qa:browser:auth:capture:basic`
  - `pnpm run qa:browser:auth:capture:select-authorized`
- Added API assertions to the Playwright QA harness:
  - Basic expects exact modules `daily`, `weekly`, `vision`, with optional/admin APIs returning `403`
  - Select Authorized default profile expects exact modules `daily`, `weekly`, `vision`, `life-ledger`, with BizDev/REACH/Admin/Baby KB APIs returning `403`
  - Admin expects all modules with `isAdmin=true`, and Admin/Baby KB APIs allowed
- Added Select Authorized UI proof that `/life-ledger?tab=baby` does not expose the Baby KB tab or admin Baby KB content.

## Preflight

- `git diff --check -- scripts/src/captureThetaFrameBrowserAuthState.ts scripts/src/runThetaFrameBrowserQa.ts scripts/src/thetaframeBrowserQaPaths.ts scripts/package.json package.json _AI_SYSTEM/RUNBOOKS.md`
  - Result: `PASS`
- `pnpm --filter @workspace/scripts run typecheck`
  - Result: `PASS`
- `pnpm run typecheck`
  - Result: `PASS`
- `pnpm --filter @workspace/api-server run build`
  - Result: `PASS`
- `pnpm --filter @workspace/thetaframe run build`
  - Result: `PASS`
  - Note: Vite emitted existing sourcemap warnings for `tooltip.tsx` and `dropdown-menu.tsx`, then completed successfully.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Result: `PASS`

Deployment:
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/DLfFLPeXskLq8hBKRV4q9xQe3oiM`
- Deployment URL: `https://thetaframe-66qfsbiv4-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Custom domain checked: `https://thetaframe.mrksylvstr.com`
- Deployment id: `dpl_DLfFLPeXskLq8hBKRV4q9xQe3oiM`
- Ready state: `READY`

## Production Browser/API QA

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/access-lanes-c31 \
pnpm run qa:browser
```

Result:
- `PASS`
- `passes=12`
- `skips=2`

Covered:
- signed-out home, sign-in, not-found, and signed-out protected fallback
- existing authenticated user Daily, Weekly, Vision, Life Ledger Events, REACH, and BizDev route checks
- admin Baby KB route check
- admin Admin route check
- admin API assertions for `/api/me/permissions`, `/api/admin/users`, and `/api/life-ledger/baby`

Skipped:
- Basic route/API matrix because `test-results/auth/thetaframe-basic.json` is not present
- Select Authorized route/API matrix because `test-results/auth/thetaframe-select-authorized.json` is not present

## Auth Capture Blocker

Commands attempted:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture:basic
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture:select-authorized
```

Result: `BLOCKED`

Blocking condition:
- This Codex shell is non-interactive and cannot complete the headed Clerk browser login.
- Both commands reached the intended guard:
  - `Interactive auth capture requires a TTY. Run this command in a normal terminal session.`

Existing storage states:
- `test-results/auth/thetaframe-user.json`
- `test-results/auth/thetaframe-admin.json`

Missing dedicated role states:
- `test-results/auth/thetaframe-basic.json`
- `test-results/auth/thetaframe-select-authorized.json`

## Remaining Operator Step

From a normal terminal/browser session:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture:basic
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture:select-authorized
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/access-lanes-c31 \
pnpm run qa:browser
```

Expected final closeout result after capture:
- Basic matrix no longer skips and passes UI/API `403` assertions
- Select Authorized Life Ledger matrix no longer skips and passes UI/API `403` assertions
- Browser smoke summary has `0` skips for the access matrices

## Status

Status: `PARTIAL / OPERATOR-AUTH BLOCKED`

Production deploy, harness implementation, admin API proof, and existing browser gate are complete. The only remaining C31 gap is capturing dedicated Basic and Select Authorized QA browser states through real Clerk sign-in.
