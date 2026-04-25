# C57 Live Console Week Vector And Constraint Horizon

Date: 2026-04-23
Status: Shipped

## Summary

C57 activates the next two read-only ThetaFrame Console modules inside `/console`:

- `Week Vector` now reuses the saved Weekly frame.
- `Constraint Horizon` now reuses Life Ledger reminder queue truth first, then upcoming dated Events as a fallback.

This slice keeps `/dashboard` as the default signed-in home, keeps `/console` additive rather than replacing the existing dashboard, and does not add inline edits, review/apply actions, calendar projection, or any new route/API/schema work.

## Scope Delivered

Implemented:

- live read-only `Week Vector` inside Console
- live read-only `Constraint Horizon` inside Console
- stable Console test ids for the new live module states and CTAs
- production browser QA assertions for the new Console module markers
- current-truth and Console-contract SSOT updates

Intentionally unchanged:

- signed-in `/` still redirects to `/dashboard`
- `/dashboard` remains the canonical default signed-in home
- `Now Frame`, `System Health`, and `Lane Atlas` stay as shipped in C56
- `Assistant Review` and `Continuity` remain placeholders
- no new write paths from Console
- no calendar projection or month-grid behavior in Console

## Runtime Details

### Week Vector

Console now reads the existing Weekly frame via the proven Weekly read model and renders, in order:

1. `theme` as the dominant headline when present
2. up to 3 non-empty Weekly `steps`
3. up to 2 non-empty `nonNegotiables`
4. `recoveryPlan` as the fallback/support note
5. calm empty state when Weekly has no meaningful saved content

The module includes a single CTA back to `/weekly` and stays read-only.

### Constraint Horizon

Console now reads existing Life Ledger data using:

- the Life Ledger event reminder queue
- the Life Ledger Events list

Render order:

1. due-now reminder items
2. coming-up reminder items
3. fallback to the next dated Events when no reminder queue items exist
4. calm empty state when neither reminder-active items nor upcoming dated Events exist

The module stays read-only and explicitly does not expose:

- reminder transport controls
- mobile/outbox/device controls
- inline event completion actions
- calendar-home projection
- Baby KB admin content

## Files Changed

Runtime:

- `artifacts/thetaframe/src/pages/console.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

Durable docs:

- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/EXECUTIVE_CONSOLE_CONTRACT.md`
- `_AI_SYSTEM/RECEIPT_INDEX.md`

Receipt:

- `artifacts/receipts/C57-live-console-week-vector-and-constraint-horizon__2026-04-23__R1.md`

## Verification

Static/build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Production:

- `vercel deploy --prod --yes`
- deployment id: `dpl_7YB4dxCq4WM1JHCaajpj8P8PoF8Q`
- deployment url: `https://thetaframe-2pxp8jgyj-marks-projects-f03fd1cc.vercel.app`
- `curl -sS https://thetaframe.mrksylvstr.com/api/healthz`
- result: `{"status":"ok"}`

Browser QA:

- command:
  - `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c57-live-console-week-vector-and-constraint-horizon pnpm run qa:browser`
- result:
  - `passes=19`
  - `skips=0`

Evidence directory:

- `test-results/thetaframe-browser-qa/c57-live-console-week-vector-and-constraint-horizon`

## Deferred

Still deferred after C57:

- live `Assistant Review`
- live `Continuity`
- calendar projection inside `Constraint Horizon`
- reminder/mobile/outbox/device signals inside `System Health`
- Console home replacement decision
- wider-display Console polish beyond the first centered ultrawide pass

## Outcome

C57 makes `/console` materially more useful without changing ThetaFrame’s core routing contract. The Console now answers:

- what matters today
- what this week is pointing toward
- what constraints are approaching
- what needs review

while keeping Dashboard and the lane routes as the authoritative places for editing, review/apply, and deeper operational work.
