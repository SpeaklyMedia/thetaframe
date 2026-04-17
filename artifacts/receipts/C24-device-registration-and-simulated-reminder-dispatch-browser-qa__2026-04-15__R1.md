# C24 Device Registration and Simulated Reminder Dispatch Browser QA

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
    - `https://thetaframe-alqypz368-marks-projects-f03fd1cc.vercel.app`
    - `https://thetaframe.vercel.app`

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/api-server run build` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

## Observed Product Truth

- The `events` page now exposes a compact device simulator on top of the existing reminder delivery-status block.
- The simulator can register browser-local iPhone / Android endpoints and dispatch the next queued reminder without leaving the Events lane.
- The signed-out, authenticated, and admin browser sweeps remain healthy after the new simulator surface landed.

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
- opened `/life-ledger?tab=events`
- dismissed the transient open-dialog overlay before interaction
- created a temporary queued reminder event through the production API
- clicked `Register iPhone` inside the simulator
- verified a `Simulated iPhone` device row appeared
- clicked `Dispatch next queued reminder`
- verified a newer sent outbox item targeted `Simulated iPhone`
- captured screenshots:
  - `test-results/thetaframe-browser-qa/c24-device-registration.png`
  - `test-results/thetaframe-browser-qa/c24-simulated-dispatch.png`
- deleted the temporary UI proof event afterward
- deactivated the temporary simulated device afterward

### API-only verified behavior

Authenticated production API smoke passed through a signed-in browser context:
- iOS registration upsert behavior
- Android registration ordering by `lastSeenAt`
- explicit dispatch with `deviceId`
- fallback dispatch to most-recent active device
- `409` when no active devices remain
- `409` for completed / cancelled reminder rows

### Blocked / manual signoff items

- `qa:browser:headed` was not run in this slice
- no real APNs / FCM transport exists yet, so no native-device signoff was possible

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [x] Authenticated lane sweep
- [x] Admin-only sweep
- [x] Secondary API smoke where needed
- [x] Mobile Delivery Simulator visible on the live Events page
- [x] UI registration path proven on production
- [x] UI simulated-dispatch path proven on production
- [x] Existing `C22` queue and `C23` outbox surfaces remained intact

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the transient dialog overlay seen in earlier signed-in proofs was present here too; dismissing it isolated the simulator from unrelated modal state
  - this slice proves endpoint registration and transport simulation only; real provider transport and OS permission handling remain intentionally out of scope
