# C21 Mobile Reminder Browser QA

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
    - `https://thetaframe-6xre1n6ck-marks-projects-f03fd1cc.vercel.app`
    - `https://thetaframe.vercel.app`

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/api-server run build` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

## Observed Product Truth

- The signed-out and authenticated browser lanes remain healthy after the `C21` mobile-return slice.
- The Life Ledger `events` page now shows a live reminder-return card instead of a static mobile placeholder.
- Reminder preview items and the primary route link both return to:
  - `/life-ledger?tab=events`
- The mobile reminder card reflects active queue state without introducing a separate reminders surface.

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

Targeted signed-in Playwright proof also passed on production:
- created a fresh manual event through the production API
- enabled reminder policy `[2,0]`
- opened `/life-ledger?tab=events`
- verified the live mobile reminder card at:
  - `data-testid=\"mobile-placeholder-life-ledger-events\"`
- verified visible reminder-return summary text:
  - `Reminder-return queue`
  - `Active reminders:`
- verified the preview item rendered for the created event:
  - `data-testid=\"mobile-reminder-preview-<id>\"`
- verified both the preview link and the primary card link resolved to:
  - `/life-ledger?tab=events`
- captured evidence screenshot:
  - `test-results/thetaframe-browser-qa/c21-mobile-reminder-card.png`
- cleaned up the temporary event afterward

### API-only verified behavior

Production reminder-queue API smoke passed using a live Clerk token obtained from the saved browser auth state:
- queue includes only reminder-active items
- queue ordering prefers `nextReminderAt`
- completed event rows are excluded
- returned queue items expose:
  - `route=/life-ledger?tab=events`
  - `deepLink=thetaframe://life-ledger/new`
  - `notificationCategory=life_ledger_due`
- Baby-derived projected event reminders can appear in the same queue via `sourceType=baby_kb_assignment`

### Blocked / manual signoff items

- `qa:browser:headed` was not run in this slice
- no mobile delivery, notification permissions, or push plumbing exists yet, so there was no delivery-side manual signoff

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [x] Authenticated lane sweep
- [x] Admin-only sweep
- [x] Secondary API smoke where needed
- [x] Live reminder-return card renders queue-backed mobile status
- [x] Reminder preview items link back to Events

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the first targeted run showed that `getByRole` was less reliable than direct anchor inspection for the `Open Events` link inside this card under Playwright; the DOM itself was correct and the final proof used anchor inspection plus visible text and preview-link assertions
  - this slice is a route/deep-link readiness activation only; notification delivery remains intentionally out of scope
