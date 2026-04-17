# ThetaFrame Browser QA Framework Realignment

- Date: 2026-04-15
- Operator: Codex
- Environment:
  - Repo: `thetaframe`
  - Browser harness: repo-native Playwright Chromium via `pnpm run qa:browser`
  - Browser binary: Playwright-managed Chromium from `~/.cache/ms-playwright/`
  - Base URL used for the first proof run: `https://thetaframe.mrksylvstr.com`
  - Auth storage state supplied: no
  - Admin storage state supplied: no

## Preconditions

- `pnpm install`
- `pnpm --dir scripts exec playwright install chromium`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

## Observed Product Truth

- ThetaFrame now has a repo-native browser QA harness modeled on the Yuki workflow.
- Browser QA is now documented as the preferred UI verification lane.
- Authenticated API smoke remains valid secondary proof for non-visual or auth-heavy lifecycle checks.
- The first headless browser proof run closed the signed-out route sweep and left authenticated/admin checks explicitly skipped because no storage-state files were provided.

## Evidence Gathered

### Browser-verified behavior

- `pnpm run qa:browser` now exists at the repo root and delegates into the `scripts` workspace.
- Signed-out `https://thetaframe.mrksylvstr.com/` rendered the public shell.
- Signed-out `https://thetaframe.mrksylvstr.com/sign-in` rendered the auth shell copy.
- Signed-out `https://thetaframe.mrksylvstr.com/baby` resolved to the not-found experience.
- Signed-out `https://thetaframe.mrksylvstr.com/daily` fell back to the public home as expected.

### API-only verified behavior

- No new API smoke was required for this workflow pass.
- Existing authenticated API smoke receipts remain authoritative for:
  - AI draft approval/apply flows
  - Baby KB lifecycle and projection checks
  - Life Ledger event execution-state checks

### Blocked / manual signoff items

- Authenticated lane browser coverage was skipped because:
  - `THETAFRAME_BROWSER_STORAGE_STATE` was not supplied
  - `THETAFRAME_BROWSER_ADMIN_STORAGE_STATE` was not supplied
- Headed/manual signoff was not run in this pass.

## Checklist Result

- [x] Root `qa:browser` and `qa:browser:headed` commands added
- [x] Repo-native Playwright Chromium harness added under `scripts`
- [x] Canonical browser automation runbook added under `_AI_SYSTEM`
- [x] Verification matrix updated to make browser QA primary for UI work
- [x] Receipt template added for future browser-first verification
- [x] Signed-out browser route sweep passed
- [ ] Authenticated lane sweep closed in browser
- [ ] Admin-only browser sweep closed in browser

## Validation

- `pnpm install` — PASS
- `pnpm --dir scripts exec playwright install chromium` — PASS
- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser` — PASS

Expected non-failing build noise remained present:

- Vite sourcemap warnings in `tooltip.tsx` and `dropdown-menu.tsx`
- current frontend chunk-size warning

## Result

- Pass / Fail / Blocked: `Pass with authenticated/browser signoff still open`
- Notes:
  - This pass establishes the workflow and proves the signed-out browser lane.
  - Future UI-heavy slices should treat browser QA as the primary closure path.
  - The next browser-proof increment is to run the same harness with signed-in and admin storage-state files so the authenticated lane sweep stops being `skip`.
