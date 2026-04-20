# C52 Phase A UX Content Triage

Date: 2026-04-20
Status: PASS
Production target: `https://thetaframe.mrksylvstr.com`

## Summary

C52 implements the first build slice from the C51 neurodivergent UX audit: reduce first-screen cognitive load by keeping the smallest useful action first and moving repeated guidance, tutorial content, placeholders, and non-urgent support panels below the core work.

No public API, OpenAPI, database schema, auth rule, AI-provider, or saved-data behavior changed.

## Commits And Deployment

| Item | Value |
| --- | --- |
| Implementation commit | `ee841b001e9374d45e9b321e24eed426fabeb30e` |
| QA hardening commit | `6482b83a920e48f3f31e3e844ce124954d53f5ee` |
| Production deployment ID | `dpl_CmkwCq6dtsFGRgrv49QdD8BfJH76` |
| Production deployment URL | `https://thetaframe-psab1hgyf-marks-projects-f03fd1cc.vercel.app` |
| Vercel inspect URL | `https://vercel.com/marks-projects-f03fd1cc/thetaframe/CmkwCq6dtsFGRgrv49QdD8BfJH76` |
| Canonical production target | `https://thetaframe.mrksylvstr.com` |

## Implemented Changes

### Basic Daily, Weekly, Vision

- Daily, Weekly, and Vision now lead with the lane hero, workspace mood picker, one `BasicLaneNextStep`, and the Habit Canvas.
- `BasicLaneStepOrder` remains available but moved into each existing `More help` details section.
- `BasicAITimeSaver` remains available but moved into each existing `Review AI drafts` details section above the detailed draft review panel.
- Existing route behavior, save-on-blur behavior, API hooks, query keys, and test IDs are preserved.

### REACH

- Upload, search/filter, and file list/empty state now appear before non-urgent support panels.
- AI draft review remains above the file work only when actionable drafts exist in `needs_review`, `approval_gated`, or `approved`.
- If there are no actionable drafts, AI draft review and mobile placeholder/status support render below the file work.

### Life Ledger Events

- On the Events tab, the event execution board now appears before non-urgent calendar/import and mobile delivery/status panels.
- Actionable AI draft review still renders above event work when active drafts exist.
- If there are no actionable drafts, AI draft review renders below the event execution board.
- Life Ledger models, reminder actions, event actions, and non-events tab behavior were not changed.

### FollowUps

- FollowUps now keeps the hero, `Add FollowUp`, summary counts, filters, and list/table work before support guidance.
- Support rail, onboarding card, and reminder/calendar guidance remain accessible below the primary list controls.
- Internal `bizdev` route/API/module identifiers and all form/filter/API behavior remain unchanged.

### Browser QA

- Browser QA now opens Basic `More help` before asserting `step-order-*` markers.
- Browser QA now opens Basic `Review AI drafts` before asserting `ai-time-saver-*` markers.
- Ordering assertions were added for Basic lane canvas-first order, REACH upload-first order, Life Ledger Events work-first order, and FollowUps primary-content-before-guidance order.
- The FollowUps assertion was hardened to use visible primary content instead of a hidden empty filter container.

## Verification

| Check | Result |
| --- | --- |
| `git diff --check` | PASS |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server run build` | PASS |
| `pnpm --filter @workspace/thetaframe run build` | PASS with existing Vite sourcemap/chunk warnings |
| `pnpm --filter @workspace/scripts run typecheck` | PASS after QA harness hardening |
| `vercel deploy --prod --yes` | PASS: `dpl_CmkwCq6dtsFGRgrv49QdD8BfJH76` |
| `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` | PASS: `{"status":"ok"}` |
| Production browser QA before final redeploy | PASS: `passes=16`, `skips=0` |
| Production browser QA after final redeploy | PASS: `passes=16`, `skips=0` |
| Focused C52 visual/order proof | PASS |

Production browser QA command after final redeploy:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c52-phase-a-content-triage-post-deploy \
pnpm run qa:browser
```

Focused proof output:

`scripts/test-results/thetaframe-browser-qa/c52-phase-a-focused`

Focused screenshots captured:

- `daily-desktop-canvas-before-guidance.png`
- `daily-mobile-canvas-before-guidance.png`
- `weekly-desktop-canvas-before-guidance.png`
- `weekly-mobile-canvas-before-guidance.png`
- `vision-desktop-canvas-before-guidance.png`
- `vision-mobile-canvas-before-guidance.png`
- `reach-desktop-upload-before-support.png`
- `reach-mobile-upload-before-support.png`
- `life-ledger-events-desktop-work-before-support.png`
- `life-ledger-events-mobile-work-before-support.png`
- `followups-desktop-list-before-guidance.png`
- `followups-mobile-list-before-guidance.png`

## PASS / BLOCKED Matrix

| Surface | Result | Evidence |
| --- | --- | --- |
| Dashboard | PASS | Brain Dump Setup and Habit Canvas map remain first-class in browser QA. |
| Daily | PASS | Today Canvas appears before `More help`; step order remains callable. |
| Weekly | PASS | Week Canvas appears before `More help`; step order remains callable. |
| Vision | PASS | Goals Canvas appears before `More help`; step order remains callable. |
| REACH | PASS | Upload/file work appears before non-urgent support when no actionable draft is present. |
| Life Ledger Events | PASS | Event execution board appears before calendar/mobile support when no actionable draft is present. |
| FollowUps | PASS | Summary/list/empty-state work appears before reminder guidance. |
| Start Here | PASS | Existing browser QA still proves Start Here opens and route-aware guide surfaces render. |
| Basic access matrix | PASS | Basic remains limited to Dashboard, Daily, Weekly, Vision. |

## Exclusions

Not changed:

- backend/API routes;
- OpenAPI contracts;
- database schema or migrations;
- auth rules;
- AI provider behavior;
- saved data formats;
- persisted task fields;
- dashboard feature behavior.

Not committed:

- raw screenshots and browser output under `test-results/` or `scripts/test-results/`;
- auth storage state;
- `.env*`;
- `.vercel/`;
- build output;
- generated local browser artifacts.
