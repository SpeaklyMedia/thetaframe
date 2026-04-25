# C75 Current-Contract Completion Rebaseline

Date: 2026-04-25
Status: Completion gate target

## Summary

C75 rebaselines ThetaFrame around the verified current-contract state after C55-C75.

This slice closes the current-contract completion program without reopening deferred bets. It refreshes the canonical current-truth, Console contract, preference contract, receipt index, and roadmap/planning references so they all describe the same product state.

## Delivered

- Refreshed current-truth and contract docs to the C75 baseline.
- Added C71-C75 receipts for baseline normalization, lane audits, Console closeout, and final rebaseline.
- Hardened the browser QA preferences-dialog helper so the proof stack tolerates an already-open preferences dialog before clicking the header trigger.
- Preserved the current deferred backlog explicitly:
  - billing
  - unrestricted assistant
  - silent AI writes
  - real push transport
  - full calendar sync
  - Console home-switch
  - broad cross-user support views
  - deeper 32:9 display modes
  - broader preference systems

## Completion Definition

Current-contract completion now means:

- SSOT docs match shipped behavior
- lane posture matches the current product contract
- Console remains additive and read-only
- `/dashboard` remains the default signed-in home
- deferred bets stay deferred

## Verification

Program-wide verification for this closeout:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`
- `pnpm --filter @workspace/scripts run typecheck`
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c75-current-contract-completion-postdeploy pnpm run qa:browser`
  - result: `passes=19`, `skips=0`
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c75-current-contract-completion-postdeploy pnpm run qa:isolation`
  - result: `[c33-isolation] PASS checks=47`
- `vercel pull --yes --environment=production --scope marks-projects-f03fd1cc`
- `vercel build --prod --yes --scope marks-projects-f03fd1cc`
- `vercel deploy --prebuilt --prod --yes --scope marks-projects-f03fd1cc`
  - deploy id: `dpl_Hhg3Eq16RvjzA6U43miimXAiZhZN`
  - deploy url: `https://thetaframe-9ccecehp9-marks-projects-f03fd1cc.vercel.app`
- `curl -sS https://thetaframe.mrksylvstr.com/api/healthz`
  - result: `{"status":"ok"}`

## Notes

- The first C75 isolation rerun failed because `test-results/auth/thetaframe-basic-b.json` had gone stale and returned `401`.
- C75 resolved that by minting a short-lived Clerk sign-in-token URL for the dedicated Basic B QA user, then recapturing `thetaframe-basic-b.json` through the existing PTY-backed auth helper without storing credentials or token URLs in the repo.
