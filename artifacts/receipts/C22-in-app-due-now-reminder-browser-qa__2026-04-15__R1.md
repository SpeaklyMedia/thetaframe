# C22 In-App Due-Now Reminder Browser QA

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
    - `https://thetaframe-cwx0772el-marks-projects-f03fd1cc.vercel.app`
    - `https://thetaframe.vercel.app`

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/api-server run build` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

## Observed Product Truth

- The signed-out and authenticated browser lanes remain healthy after the `C22` queue surface slice.
- The `events` page now shows a real in-app reminder queue with:
  - `Due Now`
  - `Coming Up`
- Reminder queue rows are actionable directly from the queue and stay aligned with the existing execution-state model.
- The execution board below the queue still mounts and remains unchanged in structure.

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
- created two fresh manual reminder-active events through the production API
- opened `/life-ledger?tab=events`
- verified the new queue surface:
  - `data-testid=\"events-reminder-queue-surface\"`
- verified both sections render:
  - `Due Now`
  - `Coming Up`
- verified both created reminder items render in the queue
- clicked the due-now row action:
  - `Mark in motion`
- verified the same row then exposed:
  - `Back to scheduled`
- clicked:
  - `Complete`
- verified the completed due-now row disappeared from the queue while the coming-up row remained
- captured evidence screenshot:
  - `test-results/thetaframe-browser-qa/c22-due-now-queue.png`
- cleaned up the temporary queue-proof events afterward

### API-only verified behavior

Production queue API proof passed using a live Clerk token obtained from the saved browser auth state:
- created queue-proof events appeared in `GET /api/life-ledger/events/reminder-queue`
- queue items preserved:
  - `route=/life-ledger?tab=events`
  - `deepLink=thetaframe://life-ledger/new`
- Baby-derived projected reminders could still coexist in the same queue

### Blocked / manual signoff items

- `qa:browser:headed` was not run in this slice
- no delivery-side mobile or push behavior exists yet, so there was no notification signoff path

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [x] Authenticated lane sweep
- [x] Admin-only sweep
- [x] Secondary API smoke where needed
- [x] `Due Now` and `Coming Up` render on the live Events page
- [x] Inline queue actions mutate live reminder items correctly
- [x] Execution board still mounts below the queue

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the first queue-interaction run hit the same transient open dialog overlay that has appeared in earlier signed-in proofs; dismissing it before interaction isolated the queue behavior and the final proof passed cleanly
  - this slice stops at in-app execution. Delivery plumbing remains intentionally out of scope
