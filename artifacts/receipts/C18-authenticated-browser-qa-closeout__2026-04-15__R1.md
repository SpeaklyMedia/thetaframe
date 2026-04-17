# Authenticated Browser QA Closeout

- Date: 2026-04-15
- Operator: Codex
- Environment:
  - Base URL: `https://thetaframe.mrksylvstr.com`
  - Browser: Playwright Chromium via the repo-native `qa:browser` harness
  - User storage state: not present
  - User storage state captured at: n/a
  - Admin storage state: not present
  - Admin storage state captured at: n/a

## Preconditions

- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS

Expected non-failing build noise remained present:

- Vite sourcemap warnings in `tooltip.tsx` and `dropdown-menu.tsx`
- current frontend chunk-size warning

## Observed Product Truth

- The signed-out browser lane remains closed.
- The auth-capture helper can run in a real PTY and reaches the expected interactive prompt.
- This Codex session still cannot complete the real human browser login needed to mint Playwright storage state, so authenticated browser closure remains blocked by missing interactive sign-in completion rather than product code.

## Evidence Gathered

### Browser-verified behavior

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS
- Signed-out proof remains green for:
  - `/`
  - `/sign-in`
  - `/baby`
  - signed-out `/daily` fallback

### Auth capture behavior

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture` was run in a PTY and reached the interactive prompt:
  - `Complete the ThetaFrame sign-in flow in the opened browser window.`
  - `Press Enter after the browser has finished the sign-in flow.`
- After continuing without a completed human sign-in, the helper failed with the expected verification error:
  - `No signed-in ThetaFrame shell marker was visible after login. If auth was blocked or incomplete, retry the capture.`

### API-only verified behavior

- No new API smoke was required in this closeout pass.
- Existing authenticated API receipts remain the secondary proof source for:
  - AI draft approval/apply flows
  - Baby KB lifecycle/projection
  - Life Ledger event execution-state checks

### Blocked / manual signoff items

- User storage-state capture: BLOCKED in this session
- Admin storage-state capture: BLOCKED in this session
- Authenticated browser sweep for:
  - `/daily`
  - `/weekly`
  - `/vision`
  - `/life-ledger?tab=events`
  - `/reach`
  - `/life-ledger?tab=baby`
- `qa:browser:headed` authenticated signoff was not run because no valid storage-state files were available

## Checklist Result

- [x] Signed-out shell
- [x] Auth gate or redirect behavior
- [ ] Authenticated lane sweep
- [ ] Admin-only sweep
- [x] Secondary API smoke already exists for the auth-heavy lifecycle flows

## Result

- Pass / Fail / Blocked: `Blocked`
- Notes:
  - This is not a product regression receipt.
  - The remaining blocker is the absence of a completed human interactive sign-in during auth capture from this Codex session.
  - To close browser QA fully, run from a normal headed terminal/browser session:
    - `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture`
    - `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser:auth:capture:admin`
    - `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser`
