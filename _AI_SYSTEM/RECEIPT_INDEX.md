# ThetaFrame Receipt Index

Date: 2026-04-17
Status: Current high-signal receipt map

## Current Production Baseline

- `artifacts/receipts/C30-access-lane-framework-hardening__2026-04-16__R1.md`
  - Defines Admin, Select Authorized, and Basic access semantics.
  - Changes default non-admin access from all modules to Basic modules.

- `artifacts/receipts/C31-access-lane-production-qa-closeout__2026-04-16__R2.md`
  - Captures dedicated Basic, Select Authorized, Admin, and full user storage states.
  - Proves production access matrix with `passes=14`, `skips=0`.
  - Hardens Linux workspace Chrome/PTTY auth-capture docs.

- `artifacts/receipts/C33-user-data-isolation-hardening__2026-04-16__R1.md`
  - Proves per-user private data isolation in production.
  - Adds `pnpm run qa:isolation`.
  - Records `47` isolation checks passing.

- `artifacts/receipts/C34-repeatable-basic-onboarding-ai-groundwork__2026-04-17__R1.md`
  - Adds repeatable Basic Guide and Daily/Weekly/Vision next-step/AI time-saver surfaces.
  - Proves production browser QA with `passes=15`, `skips=0`.

- `artifacts/receipts/C35-plain-language-basic-onboarding-surface-rework__2026-04-17__R1.md`
  - Reworks Basic onboarding and Daily/Weekly/Vision first screens around plain helper names and visible order of operations.
  - Proves production browser QA with `passes=15`, `skips=0`.

- `artifacts/receipts/C36-workspace-color-palette-and-button-clarity__2026-04-17__R1.md`
  - Makes Daily color selection drive the signed-in workspace palette and strengthens shared button styling.
  - Proves production browser QA with palette persistence and `passes=15`, `skips=0`.

- `artifacts/receipts/C37-control-center-dynamic-start-guide__2026-04-17__R1.md`
  - Adds signed-in Control Center dashboard, removes the header mode badge, and makes Start Here route-aware with restartable tabs.
  - Proves production browser QA with dashboard/guide coverage and `passes=16`, `skips=0`.

- `artifacts/receipts/C38-production-git-baseline-and-redeploy__2026-04-17__R1.md`
  - Baselines the Phase 4/C37 production state into git at `fa3127591225c253264aa8a0747c8368cf7d353f`.
  - Redeploys production from the committed workspace and proves production browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C39-frontend-lifeos-qa-sweep__2026-04-17__R1.md`
  - Runs a production frontend QA sweep through the Basic neurodivergent user lens.
  - Proves automated production browser QA with `passes=16`, `skips=0`.
  - Records headed Basic visual evidence, a UX scorecard, P1/P2 findings, and the LIFEos Habit Canvas roadmap.

- `artifacts/receipts/C40-phase-a-start-here-modal-qa-fix__2026-04-17__R1.md`
  - Fixes the C39 P1 Start Here modal clipping issue for Basic users.
  - Adds desktop/mobile modal viewport-fit browser QA assertions.
  - Redeploys production and proves automated plus headed browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C41-start-here-bottom-clip-followup__2026-04-17__R1.md`
  - Removes the remaining clipped bottom AI note panel from Start Here.
  - Keeps AI trust copy in the intro and shortens visible modal action labels for mobile fit.
  - Redeploys production and proves automated browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C42-habit-canvas-frontend-v1__2026-04-17__R1.md`
  - Reframes Basic Dashboard, Today, This Week, and Goals as a connected LIFEos Habit Canvas.
  - Adds frontend-only canvas primitives and browser QA assertions for the new canvas markers.
  - Redeploys production and proves automated browser QA with `passes=16`, `skips=0`.

## AI Draft And Apply Foundation

- `artifacts/receipts/C5-ai-draft-provenance-approval-foundation__2026-04-14__R1.md`
  - Adds shared AI draft contracts, provenance, approval requirements, and action definitions.

- `artifacts/receipts/C7-generic-ai-draft-review-backbone__2026-04-15__R1.md`
  - Adds persisted AI draft review backbone.

- `artifacts/receipts/C8-daily-draft-apply-pipeline__2026-04-15__R1.md`
  - Adds Daily draft apply path.

- `artifacts/receipts/C9-weekly-draft-apply-pipeline__2026-04-15__R1.md`
  - Adds Weekly draft apply path.

- `artifacts/receipts/C10-daily-weekly-review-controls__2026-04-15__R1.md`
  - Adds Daily and Weekly approve/reject controls.

- `artifacts/receipts/C11-vision-draft-apply-pipeline__2026-04-15__R1.md`
  - Adds Vision draft apply path.

- `artifacts/receipts/C12-reach-metadata-apply-pipeline__2026-04-15__R1.md`
  - Adds REACH file metadata apply path.

- `artifacts/receipts/C13A-life-ledger-events-draft-apply-pipeline__2026-04-15__R1.md`
- `artifacts/receipts/C13B-life-ledger-people-draft-apply-pipeline__2026-04-15__R1.md`
- `artifacts/receipts/C13C-life-ledger-financial-draft-apply-pipeline__2026-04-15__R1.md`
- `artifacts/receipts/C13D-life-ledger-subscriptions-draft-apply-pipeline__2026-04-15__R1.md`
- `artifacts/receipts/C13E-life-ledger-travel-draft-apply-pipeline__2026-04-15__R1.md`
  - Add Life Ledger tab-specific draft apply paths.

- `artifacts/receipts/C28-baby-4-ai-assignment-suggestion-drafts__2026-04-16__R1.md`
- `artifacts/receipts/C29-baby-4-real-generated-draft-closeout__2026-04-16__R1.md`
  - Add and prove Baby KB assignment suggestion drafts and real provider-generated closeout.

## Mobile, Reminder, And Browser QA Foundation

- `artifacts/receipts/C4-mobile-deeplink-notification-foundation__2026-04-14__R1.md`
  - Adds mobile deep-link and notification contract foundation.

- `artifacts/receipts/C17-authenticated-browser-state-capture__2026-04-15__R1.md`
  - Adds first browser auth-state capture helper.

- `artifacts/receipts/C20-reminder-foundation-activation__2026-04-15__R1.md`
- `artifacts/receipts/C21-mobile-reminder-read-model-and-deep-link-activation__2026-04-15__R1.md`
- `artifacts/receipts/C22-in-app-due-now-reminder-queue__2026-04-15__R1.md`
- `artifacts/receipts/C23-reminder-delivery-outbox-foundation__2026-04-15__R1.md`
- `artifacts/receipts/C24-device-registration-and-simulated-reminder-dispatch__2026-04-15__R1.md`
  - Establish reminder queue, mobile return flows, outbox, device registration, and simulated dispatch.

- `artifacts/receipts/C25-daily-mobile-quick-capture-activation__2026-04-16__R1.md`
  - Activates Daily mobile quick capture.

## Product, Cleanup, And Explainability

- `artifacts/receipts/C26-production-surface-cleanup-and-browser-qa__2026-04-16__R1.md`
  - Cleans polluted proof state and captures fresh production browser evidence.

- `artifacts/receipts/C27-roadmap-rebaseline-and-4d-activation__2026-04-16__R1.md`
  - Rebaselines roadmap around current product state.

- `artifacts/receipts/C32-4e-new-user-explainer-media__2026-04-16__R1.md`
  - Adds first 4E new-user explainer deck with production screenshots.

## Usage

For current-state work, start with:

1. `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
2. `_AI_SYSTEM/PROJECT_INDEX.md`
3. `_AI_SYSTEM/RECEIPT_INDEX.md`
4. The specific receipt for the subsystem being changed.

Receipts are evidence, not the only source of truth. When receipt history conflicts with current code or newer `_AI_SYSTEM` docs, inspect the code and prefer the latest proven current-state document.
