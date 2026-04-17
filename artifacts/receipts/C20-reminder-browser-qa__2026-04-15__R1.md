# C20 Reminder Browser QA

- Date: 2026-04-15
- Operator: Codex
- Environment:
  - Base URL: `https://thetaframe.mrksylvstr.com`
  - Browser: Playwright Chromium
  - Auth modes used: saved user + admin storage state
  - User storage state: `test-results/auth/thetaframe-user.json`
  - User storage state captured at: `2026-04-15T22:01:40.563Z`
  - Admin storage state: `test-results/auth/thetaframe-admin.json`
  - Admin storage state captured at: `2026-04-15T22:03:18.323Z`
  - Build / deploy:
    - `https://thetaframe-h6vmne0hq-marks-projects-f03fd1cc.vercel.app`
    - `https://thetaframe.vercel.app`

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

## Observed Product Truth

- The signed-out and authenticated browser lanes remain healthy after the reminder activation slice.
- The `events` execution board still mounts under authenticated access.
- Reminder controls are usable directly on event cards and persist through the real production API.
- Browser proof was split into:
  - route/surface proof from the repo-native `qa:browser` harness
  - targeted reminder-control proof from a signed-in Playwright session on the production domain

## Evidence Gathered

### Browser-verified behavior

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS
- Route/surface proof remained green for:
  - `/`
  - `/sign-in`
  - signed-out `/daily` fallback
  - authenticated `/daily`
  - authenticated `/weekly`
  - authenticated `/vision`
  - authenticated `/life-ledger?tab=events`
  - authenticated `/reach`
  - admin `/life-ledger?tab=baby`

Targeted reminder UI proof also passed in a signed-in Playwright run:
- created a fresh manual event through the production API
- opened `/life-ledger?tab=events`
- dismissed the transient overlay state that was covering the board
- clicked `7 / 2 / 0` reminder preset on the created event card
- verified the card text updated to the normalized reminder summary
- clicked `Clear`
- verified the card text returned to `Reminders off`
- cleaned up the temporary event afterward

### API-only verified behavior

Production reminder API smoke passed using a live Clerk token obtained from the saved browser auth state:
- manual event create
- reminder set `[7,2,0]`
- reminder update `[0]`
- reminder clear
- reminder state after event completion
- Baby-derived reminder synchronization and restore

### Blocked / manual signoff items

- `qa:browser:headed` was not run in this slice
- no mobile or notification delivery behavior exists yet, so no delivery-side signoff was possible

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [x] Authenticated lane sweep
- [x] Admin-only sweep
- [x] Secondary API smoke where needed
- [x] Reminder event-card controls visibly mutate production UI state

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the first targeted reminder UI run initially hit an open dialog overlay intercepting clicks on the event board; rerunning with explicit dismissal closed that as a UI-state condition rather than a route or reminder-control defect
  - reminder delivery itself is still intentionally out of scope for `C20`
