# C26 Production Surface Cleanup and Browser QA Coverage Completion

- Date: 2026-04-16
- Operator: Codex
- Environment:
  - Base URL: `https://thetaframe.mrksylvstr.com`
  - Browser: Playwright Chromium
  - Auth modes used: saved user + admin storage state
  - User storage state: `test-results/auth/thetaframe-user.json`
  - Admin storage state: `test-results/auth/thetaframe-admin.json`
  - Production deploy:
    - Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/H8VWXcyATNV1j7U1a1rCzyg1davd`
    - Deployment: `https://thetaframe-8kjhzupb1-marks-projects-f03fd1cc.vercel.app`
    - Alias: `https://thetaframe.vercel.app`

## Summary

Closed the visible-surface QA gap as a production hygiene slice.

This pass did four things:
- removed production-visible proof artifacts from live user/admin surfaces
- updated stale sign-in / sign-up auth copy now that Google auth is live
- expanded the canonical browser QA gate to cover all visible top-level signed-in/admin nav surfaces
- verified the cleaned live surfaces with both browser proof and direct production-data checks

## Tracked Code Changes

Updated:
- `artifacts/thetaframe/src/pages/sign-in.tsx`
- `artifacts/thetaframe/src/pages/sign-up.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

Changes:
- removed the conditional “if available for this environment” wording from production-facing auth copy
- added canonical browser QA checks for:
  - authenticated `/bizdev`
  - admin `/admin`

## Cleanup Actions Applied To Production

### API-only / DB / Clerk cleanup

Removed or neutralized proof artifacts:
- deleted 30 owner-scoped AI draft proof rows across Daily / Weekly / Vision / REACH / Life Ledger
- deleted 9 proof outbox rows from `mobile_notification_outbox`
- deleted 3 simulated device rows from `mobile_devices`
- deleted the proof Life Ledger event row `C24 UI proof ... queued reminder`
- reset the polluted Weekly frame to an empty neutral state
- reset the polluted historical Daily frame to an empty neutral state
- cleared the REACH file smoke note from the retained source archive row
- deleted 2 Clerk QA users:
  - `thetaframe-local-qa+1776175378009@mrksylvstr.com`
  - `thetaframe-restricted+1775936463@mrksylvstr.com`
- removed lingering Baby KB smoke text from projected event notes / assignment-derived notes

Direct production data verification after cleanup:
- `ai_drafts` proof rows for the owner account: `0`
- proof REACH notes: `0`
- proof Life Ledger event rows: `0`
- proof outbox rows: `0`
- proof device rows: `0`
- QA user access-permission rows: `0`

### Intentionally retained historical/provenance data

Retained:
- the REACH source archive row and the Baby KB parent-packet provenance chain
- the Baby KB source material and imported note corpus

Reason:
- these are part of the actual admin provenance model, not transient smoke fixtures
- only the proof annotations / notes were removed

## Browser-verified QA

### Canonical browser gate

Ran:
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser`

Result:
- `passes=12`
- `skips=0`

Covered routes:
- `/`
- `/sign-in`
- signed-out `/daily`
- authenticated `/daily`
- authenticated `/weekly`
- authenticated `/vision`
- authenticated `/life-ledger?tab=events`
- authenticated `/reach`
- authenticated `/bizdev`
- admin `/life-ledger?tab=baby`
- admin `/admin`

### Visible-surface review

Fresh viewport screenshots captured after cleanup:
- `test-results/thetaframe-surface-review-c26/sign-in.png`
- `test-results/thetaframe-surface-review-c26/daily.png`
- `test-results/thetaframe-surface-review-c26/weekly.png`
- `test-results/thetaframe-surface-review-c26/vision.png`
- `test-results/thetaframe-surface-review-c26/events.png`
- `test-results/thetaframe-surface-review-c26/reach.png`
- `test-results/thetaframe-surface-review-c26/bizdev.png`
- `test-results/thetaframe-surface-review-c26/admin.png`
- `test-results/thetaframe-surface-review-c26/baby-admin.png`

Observed product truth after cleanup:
- Daily / Weekly / Vision draft panels now show clean empty review states instead of proof rows
- Life Ledger Events no longer shows proof reminder rows or proof outbox history labels
- REACH no longer shows proof draft labels or smoke notes
- Admin now shows only the real workspace user
- sign-in copy matches the live Google-auth state

### Post-cleanup string scan

Automated browser text scan across:
- sign-in
- daily
- weekly
- vision
- life-ledger events
- reach
- bizdev
- admin
- baby admin

Forbidden tokens checked:
- `smoke`
- `proof`
- `thetaframe-local-qa`
- `thetaframe-restricted`

Result:
- all reviewed surfaces returned `clean`

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - the production-visible artifact leak is closed
  - the canonical browser gate now matches the actual top-level visible nav surface set
  - future proof runs should either clean up their rows immediately or keep proof data out of user-facing lists entirely
