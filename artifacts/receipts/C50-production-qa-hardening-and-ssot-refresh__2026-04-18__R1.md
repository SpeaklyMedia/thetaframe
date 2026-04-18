# C50 Production QA Hardening And SSOT Refresh

Date: 2026-04-18
Status: PASS
Canonical production target: `https://thetaframe.mrksylvstr.com`

## Summary

C50 ran a full production hardening sweep over the current C49 state, with special focus on the recent C46-C49 surfaces:

- Dashboard Brain Dump Setup lane.
- FollowUps rename and reminder-oriented messaging.
- public marketing screamer hero, theta positioning, theta favicon, and social preview assets.
- Daily frontend-only task feeling color scaffold.
- Start Here modal fit from Dashboard, Daily, Weekly, and Vision.

No P0, P1, or P2 product regressions were found. No frontend/backend code changes, schema changes, API changes, database migrations, or AI/provider generation were required.

## Git And Deployment

- Pre-deploy branch state: `main...origin/main`, clean.
- Application commit verified and redeployed: `580da43fee3c1837b0af3650ba065b6ffb54e504`.
- Deploy command: `vercel deploy --prod --yes`.
- Deployment ID: `dpl_5nxi8L1a5K42WaEFTUr3mDDNuRzY`.
- Deployment URL: `https://thetaframe-qhatly3rj-marks-projects-f03fd1cc.vercel.app`.
- Inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/5nxi8L1a5K42WaEFTUr3mDDNuRzY`.
- Vercel target: `production`.
- Canonical health target remained: `https://thetaframe.mrksylvstr.com`.

## Verification Matrix

| Check | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` | PASS | Clean before receipt/docs update: `## main...origin/main`. |
| `git diff --check` | PASS | No whitespace errors. |
| `pnpm run typecheck` | PASS | Workspace typecheck completed. |
| `pnpm --filter @workspace/api-server run build` | PASS | Build completed; existing bundle-size warnings only. |
| `pnpm --filter @workspace/thetaframe run build` | PASS | Build completed; existing sourcemap and chunk-size warnings only. |
| Pre-deploy production browser QA | PASS | `passes=16`, `skips=0`; evidence in `test-results/thetaframe-browser-qa/c50-production-hardening`. |
| Production isolation QA | PASS | `[c33-isolation] PASS checks=47`; evidence in `test-results/thetaframe-browser-qa/c50-isolation-hardening/c33-isolation-results.json`. |
| Production deploy | PASS | Vercel deployment ready at `dpl_5nxi8L1a5K42WaEFTUr3mDDNuRzY`. |
| Health check | PASS | `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` returned `{"status":"ok"}`. |
| Root smoke | PASS | `https://thetaframe.mrksylvstr.com/` returned `HTTP 200` and `content-type: text/html; charset=utf-8`. |
| Static asset smoke | PASS | `/favicon.svg`, `/marketing/screamer-stress.webp`, `/marketing/screamer-beach-chair.webp`, and `/opengraph.jpg` returned `200` with expected content types. |
| Post-deploy production browser QA | PASS | `passes=16`, `skips=0`; evidence in `test-results/thetaframe-browser-qa/c50-post-deploy`. |
| Post-deploy focused frontend QA | PASS | `checks=17`; evidence in `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy`. |

## Focused Frontend Evidence

Focused checks were run against `https://thetaframe.mrksylvstr.com` after deploy and passed:

- Home desktop: marketing screamer hero visible, CTA readable, no horizontal overflow.
- Home mobile: marketing hero and theta positioning visible, no horizontal overflow.
- Reduced motion: stress image layer suppressed; calm beach-chair state remains visible.
- Sign In and Sign Up: theta positioning rendered without disrupting auth pages.
- Static assets: favicon, screamer WebPs, and Open Graph image served correctly.
- Dashboard Basic: Brain Dump Setup rendered idle without invoking AI.
- Start Here: modal opened from Dashboard, Daily, Weekly, and Vision with reachable footer.
- Daily Basic: Tier A task feeling control mounted; selecting red set `data-task-feeling="red"`; temporary QA-created row was removed.
- FollowUps: allowed user saw FollowUps copy and reminder guidance; Basic user remained denied.

Screenshot evidence was captured under ignored local directories:

- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/home-desktop.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/home-mobile.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/home-reduced-motion.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/sign-in.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/sign-up.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/dashboard-brain-dump.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/start-here-dashboard.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/start-here-daily.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/start-here-weekly.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/start-here-vision.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/daily-task-feeling-red.png`
- `test-results/thetaframe-browser-qa/c50-focused-visual-post-deploy/followups-allowed.png`

## Findings

- P0: none.
- P1: none.
- P2: none requiring code changes.
- P3: none recorded for this slice.

Two temporary focused-check harness issues were corrected during the run:

- the one-off script initially resolved auth state relative to `scripts/` because `pnpm --filter` changes the working directory;
- the one-off FollowUps allowed check initially used an overly strict role selector, while the production page and canonical QA use stable test IDs/copy.

Both were harness issues only. The product surfaces were already passing the canonical QA.

## Exclusions

The following were intentionally not committed:

- raw screenshots and focused QA outputs under `test-results/`;
- auth storage state under `test-results/auth/`;
- `.env*`;
- `.vercel/`;
- build output and generated caches;
- raw browser artifacts.

## Decision

The current C49 product state is hardened and live in production. `origin/main`, production behavior, receipt history, and `_AI_SYSTEM` documentation are aligned for the next slice.
