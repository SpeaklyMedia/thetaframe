# C40 Phase A Start Here Modal QA Fix

Date: 2026-04-17
Status: PASS

## Scope

Implemented the Phase A frontend QA fix from C39: the Basic Start Here modal now keeps its header and footer visible, scrolls only the guide body, and avoids the desktop visual truncation that made lower guide content hard to read.

This was a frontend-only fix. No backend route, API contract, schema, database, AI provider, or persisted data model was changed.

Final production source commit:

- `f2a9b31 Compact Start Here guide summaries`

Related implementation commits:

- `ac286d4 Fix Start Here modal viewport fit`
- `7873463 Fix Start Here modal flex direction`
- `f483820 Tighten Start Here guide visual fit`
- `f2a9b31 Compact Start Here guide summaries`

Implementation notes:

- `SignedInOnboardingModal` now uses a viewport-safe flex-column dialog layout with a fixed header/footer and a scrollable body.
- `BasicStartGuide` now uses more compact restart actions and lane summary cards so Start Here reads cleanly inside the modal.
- `runThetaFrameBrowserQa.ts` now asserts Start Here modal viewport fit on desktop and mobile.

During implementation, an interim production QA run caught a bad flex direction before closeout. The final deployment below includes the corrected flex-column layout and compact guide.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Final deployment:

- status: `READY`
- deployment id: `dpl_G8HHor2fNxaLffdxWS9EubTjcRr7`
- deployment URL: `https://thetaframe-gj9wrw4tn-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/G8HHor2fNxaLffdxWS9EubTjcRr7`
- canonical production target: `https://thetaframe.mrksylvstr.com`

Custom domain smoke:

- `GET https://thetaframe.mrksylvstr.com/`: `HTTP 200`
- root last-modified: `Fri, 17 Apr 2026 22:05:50 GMT`
- deployed assets:
  - `/assets/index-D7Ur7SWU.js`
  - `/assets/index-B7WkLJls.css`
- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `HTTP 200`
- health body: `{"status":"ok"}`

## Verification

Static and build:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Automated production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c40-phase-a-start-here \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`
- includes the new desktop and mobile Start Here modal viewport-fit assertions

Headed Chrome visual signoff:

```bash
BROWSER_AUTOMATION_BIN=$HOME/.local/opt/chrome-for-testing/stable/chrome \
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c40-phase-a-headed \
pnpm run qa:browser:headed
```

Result:

- PASS
- `passes=16`
- `skips=0`

Focused Basic visual capture:

- PASS
- directory: `scripts/test-results/thetaframe-browser-qa/c40-phase-a-basic-visual`
- files:
  - `start-here-dashboard-desktop.png`
  - `start-here-dashboard-mobile.png`
  - `start-here-daily-desktop.png`
  - `start-here-weekly-desktop.png`
  - `start-here-vision-desktop.png`

Automated QA screenshot directories, intentionally ignored:

- `scripts/test-results/thetaframe-browser-qa/c40-phase-a-start-here`
- `scripts/test-results/thetaframe-browser-qa/c40-phase-a-headed`
- `scripts/test-results/thetaframe-browser-qa/c40-phase-a-basic-visual`

## Manual Visual Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Desktop Dashboard -> Start Here | PASS | Header and footer remain visible; guide cards are readable; body scroll is contained inside the modal. |
| Mobile Dashboard -> Start Here | PASS | No horizontal overflow; tabs and restart actions fit within the viewport; footer remains visible. |
| Daily -> Start Here | PASS | Today tab is focused when opened from Daily. |
| Weekly -> Start Here | PASS | This Week tab is focused when opened from Weekly. |
| Vision -> Start Here | PASS | Goals tab is focused when opened from Vision. |
| Modal dismissal | PASS | `Continue to the app` and close button both dismiss the modal. |
| Basic first screens | PASS | Daily, Weekly, and Vision still show core actions before More sections. |
| AI trust copy | PASS | Basic surfaces still communicate that AI drafts and the user chooses what to save. |
| Access/auth matrix | PASS | Existing signed-out, Basic, Select Authorized, Admin, and access-gated checks pass. |

## Git Hygiene

Committed durable source/test/receipt files only.

Excluded local/transient artifact classes:

- `.env*`;
- `.vercel/`;
- local auth storage state JSON;
- root `test-results/`;
- `scripts/test-results/`;
- build output;
- `dist`;
- `node_modules`;
- `*.tsbuildinfo`;
- raw screenshot directories;
- extracted transport folders;
- zip bundles.

## Decision

Phase A is complete. The C39 P1 Start Here modal issue is fixed and production is up to date. The next product slice can proceed to Phase B Habit Canvas frontend work without carrying this modal clipping issue forward.
