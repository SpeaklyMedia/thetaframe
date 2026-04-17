# C43 Habit Canvas Hover Focus

Date: 2026-04-17
Status: PASS

## Scope

Added a ThetaFrame-native hover/focus interaction layer for the Basic Habit Canvas. The behavior adapts the Speakly AI SEO Overhaul interaction model without copying its glass-card visual style:

- desktop/fine pointer uses CSS hover/focus only;
- touch/coarse pointer uses a scoped scroll-focus runtime;
- reduced motion suppresses transform movement;
- scope is limited to Habit Canvas map/cards/sections.

No backend, API, OpenAPI, database schema, auth, integration contract, AI provider, generation flow, or persisted field changed.

Implementation commits:

- `56cde98 Add Habit Canvas hover focus layer`
- `2e088eb Fix Habit Canvas touch focus startup`
- `0546374 Stabilize Habit Canvas touch focus sampling`

Changed source:

- `artifacts/thetaframe/src/App.tsx`
- `artifacts/thetaframe/src/components/habit-canvas.tsx`
- `artifacts/thetaframe/src/hooks/use-habit-canvas-focus.ts`
- `artifacts/thetaframe/src/index.css`
- `artifacts/thetaframe/src/pages/dashboard.tsx`
- `artifacts/thetaframe/src/pages/daily.tsx`
- `artifacts/thetaframe/src/pages/weekly.tsx`
- `artifacts/thetaframe/src/pages/vision.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

## Product Result

- Added scoped focus attributes/classes only under Habit Canvas:
  - `data-habit-focus-group`;
  - `data-habit-focus-card`;
  - `is-canvas-focused` for touch scroll-focus.
- Added stable QA markers:
  - `habit-focus-group-dashboard`;
  - `habit-focus-card-dashboard-daily`;
  - `habit-focus-card-dashboard-weekly`;
  - `habit-focus-card-dashboard-vision`;
  - `habit-focus-group-today`;
  - `habit-focus-group-week`;
  - `habit-focus-group-goals`.
- Mounted a small app-level runtime that only starts scroll/resize/mutation sampling when `(hover: none) and (pointer: coarse)` matches.
- Preserved C42 Habit Canvas test IDs, route links, inputs, save-on-blur behavior, add/remove handlers, API hooks, and query keys.
- Did not add tooltip/popover coach panels, Start Here changes, or global hover redesign.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Final deployment:

- status: `READY`
- deployment id: `dpl_5bYrkdQX1zSeV97J1VWUTye9Qq2Q`
- deployment URL: `https://thetaframe-h69vzwion-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/5bYrkdQX1zSeV97J1VWUTye9Qq2Q`
- canonical production target: `https://thetaframe.mrksylvstr.com`

Custom domain smoke:

- `GET https://thetaframe.mrksylvstr.com/`: `HTTP 200`
- root last-modified: `Fri, 17 Apr 2026 23:26:43 GMT`
- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `HTTP 200`
- health body: `{"status":"ok"}`

## Verification

Static/build:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
git diff --check
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- `git diff --check`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Automated production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c43-habit-canvas-hover-focus \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`
- output directory from the scripts package: `scripts/test-results/thetaframe-browser-qa/c43-habit-canvas-hover-focus`

New C43 screenshot evidence captured by automated QA:

- `c43-dashboard-today-hover-focus-desktop.png`
- `c43-dashboard-scroll-focus-mobile.png`
- `c43-today-scroll-focus-mobile.png`
- `c43-week-scroll-focus-mobile.png`
- `c43-goals-scroll-focus-mobile.png`

Focused headed visual capture:

- PASS
- browser: `$HOME/.local/opt/chrome-for-testing/stable/chrome`
- storage state: Basic user
- directory: `test-results/thetaframe-browser-qa/c43-habit-canvas-focused`
- files:
  - `dashboard-desktop-hover-today.png`
  - `dashboard-mobile-scroll-focus.png`
  - `today-mobile-scroll-focus.png`
  - `week-mobile-scroll-focus.png`
  - `goals-mobile-scroll-focus.png`
  - `dashboard-reduced-motion-hover.png`

Focused visual result:

- Desktop Dashboard hover: PASS. Today can be hovered/focused without awkward adjacent layout movement.
- Mobile Dashboard/Today/Week/Goals scroll-focus: PASS. Touch emulation applied `is-canvas-focused` to visible canvas cards, and screenshots showed no horizontal overflow.
- Inputs remain usable in focused canvas sections.
- Reduced-motion mode: PASS. Hover transform computed as `none`.
- Start Here remained covered by automated modal viewport-fit checks in the production browser QA run.

## Git Hygiene

No generated outputs, auth state, local Vercel state, raw screenshots, or build artifacts were committed.

Excluded local/transient artifact classes:

- `.env*`;
- `.vercel/`;
- auth storage state JSON;
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

C43 Habit Canvas Hover/Focus is live in production from commit `0546374`. The production browser QA gate is green at `passes=16`, `skips=0`, and focused headed visual signoff passed for desktop hover, touch scroll-focus, and reduced-motion behavior.
