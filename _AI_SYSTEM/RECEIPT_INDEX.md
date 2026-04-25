# ThetaFrame Receipt Index

Date: 2026-04-25
Status: Current high-signal receipt map after C75 current-contract completion

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

- `artifacts/receipts/C43-habit-canvas-hover-focus__2026-04-17__R1.md`
  - Adds a scoped Habit Canvas hover/focus interaction layer inspired by Speakly's hover system.
  - Keeps desktop hover CSS-only and uses touch-only scroll-focus for mobile/tablet.
  - Redeploys production and proves automated browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C44-production-qa-doc-hardening__2026-04-17__R1.md`
  - Verifies finished Habit Canvas work in production after C43.
  - Updates durable AI-facing docs to the after-C43 current truth.
  - Redeploys production and proves automated browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C45-social-link-preview-image__2026-04-18__R1.md`
  - Adds static Open Graph and Twitter Card metadata for production link previews.
  - Points social/text/embed crawlers at the committed `1280x720` `/opengraph.jpg`.
  - Redeploys production and verifies the image is served as `image/jpeg`.

- `artifacts/receipts/C46-dashboard-brain-dump-ai-setup-lane__2026-04-18__R1.md`
  - Adds the Dashboard Brain Dump Setup lane for provider-backed Basic draft batches.
  - Generates review-first Daily, Weekly, and Vision draft rows from typed messy input.
  - Redeploys production, proves browser QA with `passes=16`, `skips=0`, and records real-provider generation/refinement proof.

- `artifacts/receipts/C47-brain-dump-apply-hardening__2026-04-18__R1.md`
  - Hardens Dashboard brain-dump generation with better provider normalization, dedupe, context merge, time normalization, and sparse-output fallback.
  - Adds richer lane previews plus batch-level `Approve all` and `Save approved` actions.
  - Redeploys production, proves all three Basic drafts can be approved/applied, restores proof state, and proves browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C48-followups-rename-and-reminder-messaging__2026-04-18__R1.md`
  - Renames the user-facing BizDev lane to FollowUps while keeping internal `bizdev` route/API/schema/module identifiers stable.
  - Adds reminder/calendar-oriented FollowUps messaging without creating Life Ledger reminders, calendar links, or new persisted fields.
  - Redeploys production and proves browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C49-marketing-theta-hero-and-task-color-scaffold__2026-04-18__R1.md`
  - Adds the public stress-to-calm screamer image hero, theta-state positioning on Home/Auth, and a clean theta favicon.
  - Adds frontend-only Daily task feeling color scaffolding without task schema/API persistence.
  - Redeploys production and proves browser QA with `passes=16`, `skips=0`.

- `artifacts/receipts/C50-production-qa-hardening-and-ssot-refresh__2026-04-18__R1.md`
  - Runs static/build, production browser, isolation, static asset, and focused frontend QA over the C49 state.
  - Redeploys the hardened C49 application commit to production and proves health/root/static assets.
  - Proves post-deploy browser QA with `passes=16`, `skips=0` and focused frontend QA with `17` checks passing.

- `artifacts/receipts/C51-neurodivergent-ux-surface-audit__2026-04-20__R1.md`
  - Audits public, Basic, Select Authorized, Admin, access-denied, and not-found visual surfaces through a neurodivergent end-user lens.
  - Classifies always-visible vs callable support content and produces a three-phase simplification roadmap.
  - Proves production browser QA with `passes=16`, `skips=0`, isolation with `47` checks, and captures `20` focused surface screenshots.

- `artifacts/receipts/C52-phase-a-ux-content-triage__2026-04-20__R1.md`
  - Implements the C51 Phase A content-order pass so Basic canvases and optional-lane primary work appear before repeated guidance/support panels.
  - Keeps Basic step order and AI time-saver education callable through existing `More help` and `Review AI drafts` sections.
  - Redeploys production and proves browser QA with `passes=16`, `skips=0` plus focused C52 ordering screenshots.

- `artifacts/receipts/C53-documentation-hardening-ux-surface-contract__2026-04-20__R1.md`
  - Hardens `_AI_SYSTEM/NEURODIVERGENT_INTERFACE_GUIDE.md` as the canonical UX surface contract.
  - Documents the core-action-first, callable-support-second rule for future UI-facing work.
  - Records that C53 is documentation-only and keeps the latest C52 production/browser QA baseline.

- `artifacts/receipts/C55-console-route-and-layout-foundation__2026-04-23__R1.md`
  - Adds the first authenticated `/console` route, signed-in nav entry, dedicated Console shell atmosphere, and preview module layout.
  - Keeps `/dashboard` as the default signed-in home while proving Console access for signed-in, Basic, Select Authorized, and Admin sessions.
  - Records the verification and deployment baseline for the first Console runtime slice.

- `artifacts/receipts/C56-live-console-now-frame-and-system-health__2026-04-23__R1.md`
  - Activates a live Daily-derived `Now Frame` and a minimal live `System Health` band inside `/console`.
  - Keeps `/dashboard` as the default signed-in home and leaves the remaining Console modules as placeholders.
  - Records production deploy, refreshed browser proof, and the deferred Console follow-on modules.

- `artifacts/receipts/C57-live-console-week-vector-and-constraint-horizon__2026-04-23__R1.md`
  - Activates a live Weekly-derived `Week Vector` and a live Life Ledger-derived `Constraint Horizon` inside `/console`.
  - Keeps `/dashboard` as the default signed-in home and leaves `Assistant Review` plus `Continuity` deferred.
  - Records production deploy, refreshed browser proof, and the no-calendar-projection Console contract for this slice.

- `artifacts/receipts/C58-live-console-assistant-review-and-continuity__2026-04-23__R1.md`
  - Activates a live compact `Assistant Review` queue and a live Vision-derived `Continuity` anchor inside `/console`.
  - Keeps `/dashboard` as the default signed-in home and preserves Console as a read-only orientation surface.
  - Records production deploy, refreshed browser proof, and the no-transcript-home / no-inline-apply Console contract for this slice.

- `artifacts/receipts/C59-console-p0-proof-and-fit-signoff__2026-04-23__R1.md`
  - Captures the full Console P0 viewport proof matrix and records the per-viewport screenshot manifest.
  - Fixes the tablet-width signed-in header overflow and promotes Console to a true two-pane tablet layout at the representative `820x1180` surface.
  - Records final production deploy, browser proof with `passes=19`, `skips=0`, and the explicit decision to keep `/dashboard` as the default signed-in home.

- `artifacts/receipts/C60-premium-console-polish__2026-04-23__R1.md`
  - Polishes the live Console layout for premium tablet and ultrawide surfaces without changing routes, data behavior, or module inventory.
  - Tightens the centered reading field, reinforces `Now Frame` dominance, narrows the support rail, and de-emphasizes large-surface support chrome.
  - Records final production deploy, refreshed C60 viewport evidence, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C61-brand-aligned-console-style-hardening__2026-04-23__R1.md`
  - Moves Console shell, panel, chip, text, CTA, and provenance styling onto shared semantic Console tokens and utility classes.
  - Removes raw `slate` and `cyan` brand utilities from the Console page while preserving module structure and test ids.
  - Records the shared-token implementation baseline for later Console material work.

- `artifacts/receipts/C62-console-stretch-validation-and-wide-surface-tuning__2026-04-23__R1.md`
  - Re-proves the tokenized Console on the authenticated viewport matrix and adds a centered-first `6400x1800` stretch validation surface.
  - Keeps `/dashboard` as the default signed-in home and records final production deploy, viewport manifest, and browser proof with `passes=19`, `skips=0`.
  - Records the sequential env-refresh rebuild that fixed the intermediate blank-shell public home regression.

- `artifacts/receipts/C63-console-home-decision-gate__2026-04-23__R1.md`
  - Closes the current Console observation gate after C61 and C62.
  - Explicitly keeps `/dashboard` as the default signed-in home and leaves `/console` additive.
  - Defers any default-home trial to a separate future plan.

- `artifacts/receipts/C64-shared-user-preference-controls__2026-04-23__R1.md`
  - Adds the shared persisted `user_preferences` surface, authenticated read/write endpoints, and the signed-in `Display + reminders` settings entry point.
  - Applies reduced stimulation, density, and reminder-tone preferences across Dashboard, Console, and the core Daily/Weekly/Vision signed-in lanes without changing routes or permissions.
  - Records production schema push, deploy, browser proof with `passes=19`, `skips=0`, and the resolved hook-memoization fix for the initial preferences-dialog render loop.

- `artifacts/receipts/C65-console-progress-signals__2026-04-24__R1.md`
  - Adds the first calm Console progress visuals: a Today completion bar in `Now Frame`, a Weekly completion ring in `Week Vector`, and a segmented review-pressure bar in `System Health`.
  - Keeps `/dashboard` as the default signed-in home, preserves Console as a read-only orientation surface, and defers the `Constraint Horizon` urgency strip.
  - Records final production deploy, refreshed C65 viewport manifest, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C66-weekly-step-completion-truth__2026-04-24__R1.md`
  - Hardens Weekly step completion truth end-to-end so `WeeklyStep.completed` persists through storage, API reads/writes, AI draft apply, and Weekly UI toggles.
  - Makes the Console `Week Vector` completion ring fully truthful while keeping Console read-only and `/dashboard` as the default signed-in home.
  - Records database push, final production deploy, refreshed C66 viewport manifest, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C67-constraint-horizon-urgency-strip__2026-04-24__R1.md`
  - Adds one calm read-only urgency strip inside Console `Constraint Horizon`, driven by reminder queue truth first and fallback upcoming dated Events only when the queue is quiet.
  - Keeps `/dashboard` as the default signed-in home, preserves `Constraint Horizon` as a reminder-first surface, and avoids new routes, APIs, schema changes, or write paths.
  - Records final production deploy, refreshed C67 viewport manifest, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C68-console-lane-readiness-and-plan-resolution__2026-04-24__R1.md`
  - Adds one compact read-only core-lane readiness row inside Console `Lane Atlas` using only current Daily, Weekly, and Vision truth.
  - Resolves stale Console execution docs so they match the shipped C55-C68 baseline and keep `/dashboard` as the default signed-in home.
  - Records final production deploy, refreshed C68 viewport manifest, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C69-console-reach-capture-signal__2026-04-24__R1.md`
  - Adds one conditional read-only `REACH Capture` module to Console using existing REACH file truth plus actionable REACH draft truth only.
  - Keeps `/dashboard` as the default signed-in home, preserves Console hierarchy, and collapses the module when REACH is inaccessible or empty.
  - Records final production deploy, refreshed C69 viewport manifest, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C70-console-bizdev-motion-signal__2026-04-24__R1.md`
  - Adds one conditional read-only `FollowUps Motion` module to Console using existing FollowUps list and phase-summary truth only.
  - Keeps `/dashboard` as the default signed-in home, preserves Console hierarchy, and collapses the module when FollowUps is inaccessible or empty.
  - Records final production deploy, refreshed C70 viewport manifest, and browser proof with `passes=19`, `skips=0`.

- `artifacts/receipts/C71-current-contract-baseline-normalization__2026-04-25__R1.md`
  - Freezes the local C55-C70 worktree as the true current-contract baseline and corrects stale SSOT docs that still pointed at C68 or pre-Console product truth.
  - Records the verified local baseline, refreshed roadmap/runbook/verification docs, and the file set that becomes authoritative for the completion program.

- `artifacts/receipts/C72-core-lane-current-contract-closeout__2026-04-25__R1.md`
  - Audits Dashboard, Daily, Weekly, and Vision against the current product contract and confirms no runtime gap remains beyond the already-shipped C55-C70 baseline.
  - Records the proof bar for core-lane hierarchy, review-first behavior, shared preferences, and persisted Weekly completion truth.

- `artifacts/receipts/C73-support-lane-current-contract-closeout__2026-04-25__R1.md`
  - Audits FollowUps, Life Ledger, REACH, and Admin against the current product contract and confirms the current runtime matches the required lane posture.
  - Records proof for primary-work-first ordering, permission boundaries, and admin-only governance behavior with no new product expansion.

- `artifacts/receipts/C74-console-current-contract-closeout__2026-04-25__R1.md`
  - Hardens `/console` copy so Assistant Review, Continuity, and System Notes describe the shipped C70 module set instead of future-only placeholder behavior.
  - Keeps `/dashboard` as the default signed-in home and preserves Console as a read-only orientation surface.

- `artifacts/receipts/C75-current-contract-completion-rebaseline__2026-04-25__R1.md`
  - Rebaselines current truth, planning docs, preference/Console contracts, and receipt indexes around the verified C55-C75 state.
  - Closes the current-contract completion program while explicitly preserving the deferred backlog.

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
