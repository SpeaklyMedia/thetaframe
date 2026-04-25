# C67 Constraint Horizon Urgency Strip

Date: 2026-04-24
Status: Production complete

## Summary

C67 adds one calm, read-only urgency strip inside Console `Constraint Horizon`.

The strip stays reminder-first and event-first. It derives one thin `due_now` / `near` / `staged` shape from the existing Life Ledger reminder queue when that queue is active, then falls back to upcoming dated Events only when the reminder queue is quiet. `/dashboard` remains the default signed-in home.

## Delivered

- Added one restrained urgency strip above the existing `Constraint Horizon` rows in `/console`.
- Kept the strip frontend-derived and read-only.
- Used the exact bucket policy from the slice contract:
  - reminder queue:
    - `due_now` = `nextReminderAt <= now + 24h`
    - `near` = `> 24h && <= 72h`
    - `staged` = `> 72h`
  - fallback dated Events when the reminder queue is empty:
    - `due_now` = `executionDate <= tomorrow`
    - `near` = `> tomorrow && <= today + 3 days`
    - `staged` = `> today + 3 days`
- Kept existing `Constraint Horizon` row caps and ordering unchanged:
  - up to 2 `Due Now`
  - up to 3 `Coming Up`
  - fallback dated Events capped at 3 visible rows
- Added stable strip test ids:
  - `console-constraint-horizon-urgency-strip`
  - `console-constraint-horizon-urgency-strip-label`
  - `console-constraint-horizon-urgency-segment-due-now`
  - `console-constraint-horizon-urgency-segment-near`
  - `console-constraint-horizon-urgency-segment-staged`
  - `console-constraint-horizon-urgency-strip-empty-state`
- Added token-based strip styling to the shared Console class layer in `artifacts/thetaframe/src/index.css`.
- Extended the production browser harness so the Console proof now asserts the urgency strip state alongside the existing module and viewport checks.

## Unchanged

- `/dashboard` remains the default signed-in home
- `/console` remains additive and read-only
- no new route, API, schema, migration, or write path
- no calendar-home projection, month grid, timeline chart, or reminder transport/device state
- no inline event completion or Life Ledger write controls inside Console

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
- deploy id: `dpl_FUQzer8grP1eN5CFSPjPjPYBD6KK`
- health: `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` -> `{"status":"ok"}`

Browser proof:

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=/home/mark/vscode-projects/thetaframe/test-results/thetaframe-browser-qa/c67-constraint-horizon-urgency-strip pnpm run qa:browser`
- result: `passes=19`, `skips=0`
- Console viewport manifest:
  - `test-results/thetaframe-browser-qa/c67-constraint-horizon-urgency-strip/c67-console-viewport-manifest.json`

Proof coverage includes:

- urgency strip renders when reminder queue items exist
- fallback urgency strip renders when reminder queue is empty but upcoming dated Events exist
- calm empty-state strip renders when neither reminder-active items nor fallback dated Events exist
- Console fit, hierarchy, and CTA visibility continue to pass across:
  - `360x800`
  - `390x844`
  - `414x896`
  - `820x1180`
  - `2752x2064`
  - `1920x1080`
  - `5120x2160`
  - `5120x1440`
  - `6400x1800`

## Notes

- The first production QA attempt caught a contract mismatch in the strip segment test-id names. The final shipped build corrected that naming drift and reran the full production matrix cleanly.
