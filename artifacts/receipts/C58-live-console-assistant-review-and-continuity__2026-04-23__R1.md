# C58 Live Console Assistant Review And Continuity

Date: 2026-04-23
Status: Shipped

## Summary

C58 activates the last two previously deferred core ThetaFrame Console modules inside `/console`:

- `Assistant Review` is now a live compact approval-gated AI draft queue across allowed lanes.
- `Continuity` is now a live calm Vision-derived long-horizon anchor.

This slice keeps `/dashboard` as the default signed-in home, keeps `/console` additive, and does not move approve/reject/apply or inline edit controls into Console.

## Scope Delivered

Implemented:

- live read-only `Assistant Review` inside Console
- live read-only `Continuity` inside Console
- stable Console test ids for the new live states
- production browser QA assertions for the new Console module markers
- SSOT current-truth and Console-contract updates

Intentionally unchanged:

- signed-in `/` still redirects to `/dashboard`
- `/dashboard` remains the canonical default signed-in home
- `Now Frame`, `Week Vector`, `Constraint Horizon`, `System Health`, and `Lane Atlas` stay as shipped
- no new route, API, schema, migration, or write path
- no transcript-home behavior in Console
- no approve/reject/apply controls in Console

## Runtime Details

### Assistant Review

Console now reuses existing AI draft list reads for the session's allowed lanes:

- Daily
- Weekly
- Vision
- Life Ledger Events when allowed
- REACH when allowed

Queue behavior:

- includes only actionable review states: `draft`, `needs_review`, `approval_gated`
- sorts strongest review pressure first, then newest first
- caps visible rows at `4`
- shows calm overflow summary when more actionable drafts exist

Each row shows:

- lane label
- draft-kind label
- payload summary
- provenance/source chips
- review-state badge
- CTA back to the authoritative lane

This module stays read-only and does not expose chat, transcripts, or inline review/apply controls.

### Continuity

Console now reuses the existing Vision frame read model and locks the surface to `1 goal + 1 next step`.

Resolution order:

1. first non-empty goal
2. first non-empty next step
3. goal-only fallback
4. next-step-only fallback
5. calm empty state

The module stays read-only and includes one CTA back to `/vision`.

## Files Changed

Runtime:

- `artifacts/thetaframe/src/pages/console.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

Durable docs:

- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/EXECUTIVE_CONSOLE_CONTRACT.md`
- `_AI_SYSTEM/RECEIPT_INDEX.md`

Receipt:

- `artifacts/receipts/C58-live-console-assistant-review-and-continuity__2026-04-23__R1.md`

## Verification

Static/build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Production:

- `vercel deploy --prod --yes`
- deployment id: `dpl_G6WdoCjMrVJtRswEwuT2PUkStyaH`
- deployment url: `https://thetaframe-91onv281w-marks-projects-f03fd1cc.vercel.app`
- `curl -sS https://thetaframe.mrksylvstr.com/api/healthz`
- result: `{"status":"ok"}`

Browser QA:

- command:
  - `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c58-live-console-assistant-review-and-continuity pnpm run qa:browser`
- result:
  - `passes=19`
  - `skips=0`

Evidence directory:

- `test-results/thetaframe-browser-qa/c58-live-console-assistant-review-and-continuity`

## Deferred

Still deferred after C58:

- calendar projection inside `Constraint Horizon`
- reminder/mobile/outbox/device signals inside `System Health`
- optional Console modules such as `REACH Capture` and `BizDev Motion`
- Console home replacement decision
- wider-display Console polish beyond the first centered ultrawide pass

## Outcome

C58 completes the first live core Console module set without changing ThetaFrame's routing or review-first safety model. `/console` now answers:

- what matters now
- where this week is pointing
- what constraints are approaching
- what needs review
- what still matters beyond today

while keeping Dashboard and the lane routes as the authoritative places for editing, review/apply, and deeper operational work.
