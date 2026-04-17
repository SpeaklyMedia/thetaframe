# C44 Production QA And Documentation Hardening

Date: 2026-04-17
Status: PASS

## Scope

Verified the finished C42/C43 Habit Canvas work in production, hardened durable AI-facing documentation so future agents start from the current shipped state, and redeployed from the updated documentation baseline.

No product code, backend, API, OpenAPI, database schema, auth, AI provider, integration contract, or persisted field changed in this slice.

Documentation hardening commit:

- `45e58ec998ff821631c7b8721de614423ecc85ec` (`45e58ec Harden C43 production docs`)

Documentation updated:

- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/PROJECT_INDEX.md`
- `_AI_SYSTEM/RUNBOOKS.md`
- `_AI_SYSTEM/VERIFICATION_MATRIX.md`

## Documentation Result

- `THETAFRAME_CURRENT_TRUTH.md` now identifies the canonical state as after C43 instead of after C37.
- Current truth now records:
  - Basic LIFEos Habit Canvas is shipped;
  - Dashboard, Daily, Weekly, and Vision are connected Habit Canvas surfaces;
  - Habit Canvas hover/focus is scoped to `data-habit-focus-group` / `data-habit-focus-card`;
  - desktop uses CSS hover/focus, touch uses scroll-focus, and reduced-motion suppresses transforms.
- `PROJECT_INDEX.md` now points future agents to the after-C43 current truth.
- `RUNBOOKS.md` now includes the signed-in `/` to `/dashboard` redirect and `/dashboard` in the authenticated browser checklist.
- `VERIFICATION_MATRIX.md` now records the current production browser QA standard: `passes=16`, `skips=0`.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Deployment used for post-doc QA:

- status: `READY`
- deployment id: `dpl_FLJn8gLo5RMpXzGRwmnmGkJBtvGv`
- deployment URL: `https://thetaframe-l57sq4cpv-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/FLJn8gLo5RMpXzGRwmnmGkJBtvGv`
- canonical production target: `https://thetaframe.mrksylvstr.com`

Custom domain smoke:

- `GET https://thetaframe.mrksylvstr.com/`: `HTTP 200`
- root last-modified: `Fri, 17 Apr 2026 23:39:49 GMT`
- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `HTTP 200`
- health body: `{"status":"ok"}`

## Verification

Pre-doc production QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c44-production-doc-hardening \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`

Post-doc-deploy production QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c44-production-doc-hardening-final \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`
- output directory from the scripts package: `scripts/test-results/thetaframe-browser-qa/c44-production-doc-hardening-final`

Screenshot evidence captured by final QA includes:

- `c42-basic-dashboard-habit-canvas-desktop.png`
- `c42-basic-dashboard-habit-canvas-mobile.png`
- `c43-dashboard-today-hover-focus-desktop.png`
- `c43-dashboard-scroll-focus-mobile.png`
- `c43-today-scroll-focus-mobile.png`
- `c43-week-scroll-focus-mobile.png`
- `c43-goals-scroll-focus-mobile.png`
- `c42-start-here-dashboard-mobile.png`

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

The finished C42/C43 work is live in production, production QA is green at `passes=16`, `skips=0`, and durable AI-facing docs now describe the current Habit Canvas and hover/focus production state.
