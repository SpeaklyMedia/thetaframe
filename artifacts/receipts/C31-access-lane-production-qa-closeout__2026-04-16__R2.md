# C31 Access Lane Production QA Closeout R2

Date: 2026-04-16

## Correction

The R1 `PARTIAL / OPERATOR-AUTH BLOCKED` status was incomplete. The Linux workspace had `$DISPLAY` and Chrome for Testing available, so headed browser auth was feasible from Codex when invoked through a PTY.

Corrected invocation pattern:

```bash
BROWSER_AUTOMATION_BIN=$HOME/.local/opt/chrome-for-testing/stable/chrome \
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
pnpm run qa:browser:auth:capture:basic
```

R2 also added support for short-lived Clerk sign-in-token auth URLs so dedicated QA users can be captured without asking the operator to manually type credentials. No secret values or token URLs were written to the repo or receipt.

## Changed Scope

- `_AI_SYSTEM/BROWSER_AUTH_RUNBOOK.md`
- `_AI_SYSTEM/PROJECT_INDEX.md`
- `_AI_SYSTEM/RUNBOOKS.md`
- `_AI_SYSTEM/VERIFICATION_MATRIX.md`
- `scripts/src/captureThetaFrameBrowserAuthState.ts`
- `scripts/src/runThetaFrameBrowserQa.ts`

No paid-lane or billing behavior changed.

## QA Accounts And States

Dedicated C31 Clerk QA users were created:

- Basic QA: `thetaframe-c31-basic-qa@mrksylvstr.com`
- Select Authorized QA: `thetaframe-c31-select-qa@mrksylvstr.com`
- Select Authorized assignment: Basic defaults plus `life-ledger` in production

Storage states captured through PTY-backed headed Chrome:

- `test-results/auth/thetaframe-basic.json` - `2026-04-16 14:18:54 +0000`
- `test-results/auth/thetaframe-select-authorized.json` - `2026-04-16 14:24:07 +0000`
- `test-results/auth/thetaframe-admin.json` - `2026-04-16 14:24:36 +0000`
- `test-results/auth/thetaframe-user.json` - `2026-04-16 14:25:03 +0000`

The capture helper now verifies exact role permissions through `/api/me/permissions` before writing Basic, Select Authorized, or Admin storage state. It rejects accidental admin sessions for Basic/Select captures.

## Production Browser/API QA

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/access-lanes-c31 \
pnpm run qa:browser
```

Result:

- `PASS`
- `passes=14`
- `skips=0`

Covered:

- Basic UI: Daily, Weekly, Vision allowed; BizDev, Life Ledger, REACH, Admin denied
- Basic API: exact modules `daily`, `weekly`, `vision`; optional/admin/Baby APIs return `403`
- Select Authorized UI: Daily, Weekly, Vision, Life Ledger Events allowed; BizDev, REACH, Admin denied; Baby KB admin UI not exposed
- Select Authorized API: exact modules `daily`, `weekly`, `vision`, `life-ledger`; BizDev, REACH, Admin, Baby KB return `403`
- Admin UI/API: all modules, Admin, and Baby KB admin tooling allowed

Evidence directory:

- `scripts/test-results/thetaframe-browser-qa/access-lanes-c31/`
- Select no-entry Life Ledger route inspection screenshot: `scripts/test-results/thetaframe-browser-qa/access-lanes-c31/select-inspect-life-ledger.png`

## Static Checks

- `git diff --check -- _AI_SYSTEM/RUNBOOKS.md _AI_SYSTEM/VERIFICATION_MATRIX.md _AI_SYSTEM/PROJECT_INDEX.md _AI_SYSTEM/BROWSER_AUTH_RUNBOOK.md scripts/src/captureThetaFrameBrowserAuthState.ts scripts/src/runThetaFrameBrowserQa.ts`
  - Result: `PASS`
- `pnpm --filter @workspace/scripts run typecheck`
  - Result: `PASS`
- `pnpm run typecheck`
  - Result: `PASS`

## Documentation Hardening

- `_AI_SYSTEM/RUNBOOKS.md` now states that workspace Chrome plus `$DISPLAY` means headed auth capture is feasible.
- `_AI_SYSTEM/VERIFICATION_MATRIX.md` classifies non-TTY auth failures as wrong invocation, not a product blocker, when display and Chrome exist.
- `_AI_SYSTEM/BROWSER_AUTH_RUNBOOK.md` records the PTY + Chrome capture pattern and links the role-state files.
- `_AI_SYSTEM/PROJECT_INDEX.md` links the browser auth runbook.

## Notes

- Temporary Vercel env pull and Clerk sign-in token files were kept under `/tmp` only and removed after use.
- The prior non-admin account touched during setup was restored to its prior full non-admin production module shape before QA states were finalized.

Status: `CLOSED / PRODUCTION PROOF PASSED`
