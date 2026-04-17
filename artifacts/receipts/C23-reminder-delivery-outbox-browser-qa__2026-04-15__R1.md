# C23 Reminder Delivery Outbox Browser QA

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
    - `https://thetaframe-oatx9z89k-marks-projects-f03fd1cc.vercel.app`
    - `https://thetaframe.vercel.app`

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/api-server run build` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

## Observed Product Truth

- The signed-out and authenticated browser lanes remain healthy after the `C23` outbox slice.
- The Life Ledger `events` page now shows a compact reminder delivery-status block in addition to the `C22` in-app queue.
- Delivery state is now visible in-product without creating a separate reminders surface.

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
- created reminder-enabled proof events through the production API
- opened `/life-ledger?tab=events`
- dismissed the transient open-dialog overlay before interaction
- verified the delivery-status block at:
  - `data-testid=\"events-delivery-status-block\"`
- verified the block visibly exposed:
  - queued delivery summary
  - most-recent-sent summary
- verified the block reflected the sent proof event name
- captured evidence screenshot:
  - `test-results/thetaframe-browser-qa/c23-delivery-status-block.png`
- cleaned up the temporary proof events afterward

### API-only verified behavior

Production outbox lifecycle smoke passed using a live Clerk token obtained from the saved browser auth state:
- queued outbox row created from reminder-enabled event
- repeated reconciliation did not duplicate the row
- `mark-sent` updated status to `sent`
- `acknowledge` updated status to `acknowledged`
- completing a queued source event cancelled its queued delivery
- Baby-derived projected reminders could also appear in the outbox

### Blocked / manual signoff items

- `qa:browser:headed` was not run in this slice
- no native push transport exists yet, so no device-side delivery signoff was possible

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [x] Authenticated lane sweep
- [x] Admin-only sweep
- [x] Secondary API smoke where needed
- [x] Delivery-status block visible on the live Events page
- [x] Outbox lifecycle transitions proven through the production API
- [x] `C22` queue surface remained intact

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the same transient dialog overlay seen in prior signed-in proofs was present here as well; dismissing it isolated the delivery-status surface from unrelated modal state
  - this slice proves durable scheduling and lifecycle tracking only; native device transport is still intentionally out of scope
