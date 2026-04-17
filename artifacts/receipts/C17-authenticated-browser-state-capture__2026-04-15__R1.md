# Authenticated Browser State Capture for ThetaFrame QA

- Date: 2026-04-15
- Operator: Codex
- Environment:
  - Base URL used for browser verification: `https://thetaframe.mrksylvstr.com`
  - Automation browser: Playwright Chromium
  - Auth capture default paths:
    - user: `test-results/auth/thetaframe-user.json`
    - admin: `test-results/auth/thetaframe-admin.json`

## Summary

This slice adds a repo-native headed auth capture helper so ThetaFrame browser QA can use durable local Playwright storage-state files instead of ad hoc env wiring.

The browser harness now:

- auto-discovers default user/admin auth-state files when they exist
- keeps missing auth state as an explicit `skip`
- fails authenticated lane checks with a recapture instruction when the saved state is stale or invalid

## Commands Added

- `pnpm run qa:browser:auth:capture`
- `pnpm run qa:browser:auth:capture:admin`

## Auth-State File Policy

- auth-state files are local-only under `test-results/auth/`
- `test-results/` is now gitignored
- env vars still override the default user/admin state file paths when needed
- no raw Clerk tokens or secrets are written into tracked repo files

## Validation

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS
  - signed-out checks passed
  - authenticated/admin checks skipped because no auth-state files were present
- stale-state behavior — PASS
  - a temporary empty Playwright storage-state file was written to `test-results/auth/thetaframe-user.json`
  - `pnpm run qa:browser` then failed on the first authenticated route with:
    - `The saved browser auth state appears stale or invalid. Re-run 'pnpm run qa:browser:auth:capture' and try again.`
  - the temporary file was removed afterward
- `pnpm run qa:browser:auth:capture` from this non-interactive shell — BLOCKED AS EXPECTED
  - the helper rejected the environment with:
    - `Interactive auth capture requires a TTY.`

## First Authenticated Browser Sweep Result

- user capture: not completed in this session
- admin capture: not completed in this session
- reason:
  - this Codex shell does not provide the human interactive browser login needed to mint Playwright storage-state files against the production Clerk flow

Current status after implementation:

- signed-out browser QA is closed
- missing auth-state behavior is closed
- stale auth-state failure behavior is closed
- interactive user/admin auth capture is implemented but still awaiting a normal headed terminal/browser session

## Notes

- The next verification step is to run:
  - `pnpm run qa:browser:auth:capture`
  - `pnpm run qa:browser:auth:capture:admin`
  - `pnpm run qa:browser`
- Expected non-failing frontend build noise remained present:
  - Vite sourcemap warnings in `tooltip.tsx` and `dropdown-menu.tsx`
  - current chunk-size warning
