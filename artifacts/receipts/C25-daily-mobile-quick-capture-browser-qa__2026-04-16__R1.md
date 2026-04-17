# C25 Daily Mobile Quick Capture Browser QA

- Date: 2026-04-16
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
    - `https://thetaframe-gbj4bz6fa-marks-projects-f03fd1cc.vercel.app`
    - `https://thetaframe.vercel.app`

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/api-server run build` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

## Observed Product Truth

- The `/daily` lane now exposes a live shortcut-capture simulator instead of a dormant mobile placeholder.
- Successful capture writes directly into today’s Daily Tier B list and updates the visible frame immediately.
- The signed-out, authenticated, and admin browser sweeps remained healthy after the Daily mobile capture surface landed.

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
- opened `/daily`
- dismissed the transient onboarding modal before interaction
- filled the Daily shortcut-capture input
- clicked `Capture via iPhone Shortcut`
- verified the captured task appeared in the card preview and the visible Daily frame
- repeated the proof with `Capture via Android Shortcut`
- captured screenshots:
  - `test-results/thetaframe-browser-qa/c25-daily-quick-capture-ios.png`
  - `test-results/thetaframe-browser-qa/c25-daily-quick-capture-android.png`
- restored today’s frame to an empty default state afterward

### API-only verified behavior

Authenticated production API smoke passed through a signed-in browser context:
- first capture created today’s Daily frame when none existed
- repeated captures prepended new Tier B tasks
- blank text returned `400`
- unsupported `intent` returned `400`
- unsupported `captureChannel` returned `400`
- response route/deep-link contract remained `daily`, `/daily`, `thetaframe://daily/new`

### Blocked / manual signoff items

- `qa:browser:headed` was not run in this slice
- no iOS Shortcut or Android Shortcut native-device signoff was performed yet; proof remained browser-simulated on the live Daily page

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [x] Authenticated lane sweep
- [x] Admin-only sweep
- [x] Secondary API smoke where needed
- [x] Daily quick-capture card visible on the live Daily page
- [x] iPhone shortcut simulator path proven on production
- [x] Android shortcut simulator path proven on production
- [x] Captured Tier B task visible immediately after capture
- [x] Existing broader browser harness remained green

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the transient onboarding modal still appears in some signed-in proofs; dismissing it isolated the Daily capture surface from unrelated onboarding state
  - this slice proves route-safe Daily quick capture only; share sheet, widgets, and other capture lanes remain intentionally deferred
