# Verification Matrix

Date: 2026-04-15

## Preferred Proof Order

For UI-facing ThetaFrame work, verification should proceed in this order:

1. Static/build checks
   - `pnpm run typecheck`
   - `pnpm --filter @workspace/thetaframe run build`
2. Repo-native browser QA
   - `pnpm run qa:browser`
   - `pnpm run qa:browser:headed` for manual signoff only
3. Authenticated API smoke
   - use when browser proof is blocked, incomplete, or inefficient for lifecycle verification

## Evidence Classification

- Browser-verified
  - route health
  - visible lane composition
  - auth-gated shell behavior
  - admin-only UI visibility when storage state is available
- API-only verified
  - approval/apply pipelines
  - admin lifecycle/state transitions
  - non-visual persistence invariants
- Blocked/manual signoff
  - browser coverage requiring an interactive session not available to automation
  - auth/browser constraints that cannot be closed from the current environment

## Browser Auth Blocker Standard

A non-TTY failure from an auth-capture command is not evidence that browser auth is blocked when the Linux workspace has a display and Chrome. If `$DISPLAY` is present, agents must try the PTY-backed Chrome capture path before recording an authenticated browser QA blocker:

```bash
BROWSER_AUTOMATION_BIN=$HOME/.local/opt/chrome-for-testing/stable/chrome \
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
pnpm run qa:browser:auth:capture:basic
```

For Codex, run the command with `tty: true`. Only classify the proof as blocked after that headed Chrome attempt fails for a concrete reason such as missing display, missing browser binary, Clerk login failure, or the QA account having the wrong access profile.

## Receipt Structure

Future UI-heavy receipts should include:

- Environment
- Preconditions
- Observed product truth
- Evidence gathered
- Checklist result with `PASS`, `FAIL`, or `BLOCKED`
- Explicit sections for:
  - browser-verified behavior
  - API-only verified behavior
  - blocked/manual signoff items

## Policy

- UI-facing work is not fully closed by API smoke alone when browser proof is feasible.
- Authenticated API smoke remains valid secondary evidence and should not be removed.
- Non-TTY auth-capture failures should be corrected with the PTY + Chrome runbook before being recorded as blockers.
- Receipts remain under `artifacts/receipts/`.
