# C69 Console REACH Capture Signal

Date: 2026-04-24
Status: Production complete

## Summary

C69 adds one narrow optional-lane support signal to `/console`: `REACH Capture`.

The new module stays read-only, conditional, and subordinate to the existing support rail hierarchy. It reuses only existing REACH file truth plus existing actionable REACH draft truth, keeps `/dashboard` as the default signed-in home, and adds no new route, API, schema, or write path.

## Delivered

- Added one conditional `REACH Capture` module below `Continuity` in the existing Console support rail.
- Reused the existing REACH file list read and the existing REACH AI draft read already present in Console.
- Locked visibility to current-session REACH truth only:
  - hidden when `canReach` is false
  - hidden when REACH has no files and no actionable draft pressure
  - shown when REACH has files and/or actionable drafts
- Kept the module read-only and compact:
  - title `REACH Capture`
  - short read-only intake/review support line
  - file-count chip when files exist
  - review chip when actionable drafts exist
  - up to 2 recent file rows
  - one CTA back to `/reach`
- Preserved the no-drift contract:
  - no upload/delete/import controls
  - no inline file open actions from Console
  - no approve/reject/apply controls
  - no charts, rings, or segmented bars
- Extended production browser QA so REACH Capture proof is data-aware instead of assuming the module is always visible.

## Unchanged

- `/dashboard` remains the default signed-in home
- `/console` remains additive and read-only
- no new route, API, schema, migration, OpenAPI/codegen, or write path
- no permission-model change
- no Console home-switch or broader optional-module family expansion

## Verification

Static and build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Production:

- `vercel pull --yes --environment=production --scope marks-projects-f03fd1cc`
- `vercel build --prod --yes --scope marks-projects-f03fd1cc`
- `vercel deploy --prebuilt --prod --yes --scope marks-projects-f03fd1cc`
- deploy id: `dpl_9HSfHvRnJfwSLdxFnRmwyk6r86D2`
- health: `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` -> `{"status":"ok"}`

Browser proof:

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c69-console-reach-capture-signal pnpm run qa:browser`
- result: `passes=19`, `skips=0`
- Console viewport manifest:
  - `test-results/thetaframe-browser-qa/c69-console-reach-capture-signal/c69-console-viewport-manifest.json`

Proof coverage includes:

- REACH Capture stays hidden for sessions without REACH access
- REACH Capture stays hidden when REACH has no files and no actionable draft pressure
- REACH Capture renders when live REACH file truth or actionable REACH draft truth is present
- visible REACH Capture states preserve CTA visibility and support-rail fit across:
  - `360x800`
  - `390x844`
  - `414x896`
  - `820x1180`
  - `2752x2064`
  - `1920x1080`
  - `5120x2160`
  - `5120x1440`
  - `6400x1800`

## Durable Context Updated

- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/EXECUTIVE_CONSOLE_CONTRACT.md`
- `_AI_SYSTEM/RECEIPT_INDEX.md`
