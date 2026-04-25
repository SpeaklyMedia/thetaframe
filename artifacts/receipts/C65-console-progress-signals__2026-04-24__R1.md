# C65 Console Progress Signals

Date: 2026-04-24
Status: Production complete

## Summary

C65 adds the first calm progress visuals to the live ThetaFrame Console without changing routes, APIs, permissions, or Console module ownership.

This slice ships:

- a read-only `Today completion` bar inside `Now Frame`
- a read-only `Weekly steps` completion ring inside `Week Vector`
- a read-only segmented `Review pressure shape` bar inside `System Health`

`/dashboard` remains the default signed-in home. Console remains additive, read-only, and centered-first.

## Delivered

- Added a calm Tier A completion bar inside `Now Frame`.
- Added a compact weekly-steps completion ring inside `Week Vector`.
- Added a segmented review-pressure bar inside `System Health`.
- Added stable Console test ids for the new progress regions, labels, fills, segments, and zero-state markers.
- Extended the Console browser harness to assert the new signals across the authenticated viewport proof matrix.
- Refreshed the Console viewport manifest for the C65 proof run.

## Signal Rules

`Now Frame`:

- uses saved non-empty Daily Tier A tasks only
- completed = non-empty Tier A tasks with `completed=true`
- if zero Tier A tasks exist, Console renders a calm zero-state label instead of a fake percentage

`Week Vector`:

- uses saved non-empty Weekly steps only
- reads saved completion truth when present on step objects
- if zero saved steps exist, Console renders a calm empty support state instead of a misleading empty ring

`System Health`:

- uses existing actionable AI draft reads already allowed in Console
- segments are locked to:
  - `draft`
  - `needs_review`
  - `approval_gated`
- the segmented bar is additive to the existing chip band, not a replacement for it

## Unchanged

- `/dashboard` remains the default signed-in home
- `/console` remains additive
- no route, API, schema, or write-path change shipped in this slice
- no new chart library or dashboard-like chart container was introduced
- the deferred `Constraint Horizon` urgency strip did not ship

## Production Fixes During Closeout

- The first C65 prebuilt deploy shipped a blank signed-out shell because the local prebuilt bundle was generated before production Vite env was pulled, which left `VITE_CLERK_PUBLISHABLE_KEY` missing at runtime.
- Final fix: pull production env locally, rebuild sequentially, redeploy the repaired prebuilt output, and rerun health plus the full authenticated browser matrix.
- Browser QA also exposed a baseline reduced-stimulation regression from the earlier preference slice: the signed-in header still kept blur because the utility class won the cascade.
- Final fix: harden the reduced-stimulation header override with `backdrop-filter: none !important`.
- The C65 browser harness was also tightened so zero-count review-pressure segments only need to stay attached to the DOM, not visibly wide, which keeps the zero-state proof aligned with the shipped segmented bar behavior.

## Verification

Static and build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Production:

- deploy id: `dpl_BK84Xjhvu2gVkeDUURLS94qgkvj2`
- health: `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` -> `{"status":"ok"}`

Browser proof:

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c65-console-progress-signals pnpm run qa:browser`
- result: `passes=19`, `skips=0`
- Console viewport manifest:
  - `scripts/test-results/thetaframe-browser-qa/c65-console-progress-signals/c65-console-viewport-manifest.json`

Expected viewport proof set:

- `360x800`
- `390x844`
- `414x896`
- `820x1180`
- `2752x2064`
- `1920x1080`
- `5120x2160`
- `5120x1440`
- `6400x1800`
