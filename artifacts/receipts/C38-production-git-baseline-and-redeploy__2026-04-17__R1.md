# C38 Production Git Baseline And Redeploy

Date: 2026-04-17
Status: PASS

## Scope

Established a git baseline for the current Phase 4/C37 production state and redeployed production from that committed workspace.

Baseline commit:

- `fa3127591225c253264aa8a0747c8368cf7d353f`
- Commit message: `Baseline Phase 4 production state`
- Branch pushed: `main` -> `origin/main`

Included durable source/context/evidence:

- root agent and project docs;
- `_AI_SYSTEM/` canonical agent context;
- API/frontend source;
- DB schemas, OpenAPI spec, generated API source, and shared integration contracts;
- browser QA harness source;
- receipt markdown/html and C32 explainer media;
- brand assets under `artifacts/thetaframe/public/brand/`.

Excluded local/transient artifact classes:

- `.env*`;
- `.vercel/` local state;
- local auth storage state;
- root `test-results/`;
- `scripts/test-results/`;
- `node_modules/`;
- `dist/`;
- `*.tsbuildinfo`;
- zip bundles;
- extracted ARCH/Replit transport trees;
- receipt screenshot directories and transient browser screenshots.

The legacy tracked zip bundle under `attached_assets/` was removed in the receipt follow-up to satisfy the no-zip git hygiene rule.

## Verification Before Baseline Commit

Commands:

```bash
git diff --check origin/main -- .
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/thetaframe run build
```

Results:

- `git diff --check origin/main -- .`: PASS
- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/api-server run build`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS

Build notes:

- API build completed successfully.
- Frontend build completed successfully.
- Vite emitted existing sourcemap-location warnings for `tooltip.tsx` and `dropdown-menu.tsx`.
- Vite emitted the existing large chunk warning.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Result:

- status: `READY`
- deployment id: `dpl_GJt6KeENotJznm2nhYfMVda6sdVH`
- deployment URL: `https://thetaframe-a9rhek9nq-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/GJt6KeENotJznm2nhYfMVda6sdVH`
- Vercel alias reported: `https://thetaframe.vercel.app`
- canonical production target: `https://thetaframe.mrksylvstr.com`

Custom domain smoke:

- `GET https://thetaframe.mrksylvstr.com/`: `HTTP 200`
- root last-modified: `Fri, 17 Apr 2026 20:41:57 GMT`
- deployed assets:
  - `/assets/index-BMBNTI9n.js`
  - `/assets/index-Iezn-TjG.css`
- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `HTTP 200`
- health body: `{"status":"ok"}`

## Production Browser QA

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c38-production-baseline \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`

Evidence directory:

`test-results/thetaframe-browser-qa/c38-production-baseline`

This directory is intentionally ignored and was not committed.

## Git Hygiene

Confirmed before the first baseline commit:

- staged set did not include `.env*`, `.vercel/`, `test-results`, `node_modules`, `dist`, `.vite`, `*.tsbuildinfo`, zip bundles, extracted transport trees, or receipt screenshots;
- staged secret scan found no raw local secrets.

Confirmed after production QA:

- local QA evidence remained ignored;
- no database push or migration command was run;
- production proof closed against the canonical custom domain.
