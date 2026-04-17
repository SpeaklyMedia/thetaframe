# C37 Control Center And Dynamic Start Here Guide Receipt

Date: 2026-04-17
Status: PASS

## Scope

Implemented a signed-in Control Center and route-aware Start Here guide.

Changed product/code scope:

- `artifacts/thetaframe/src/App.tsx`
- `artifacts/thetaframe/src/pages/dashboard.tsx`
- `artifacts/thetaframe/src/components/header.tsx`
- `artifacts/thetaframe/src/components/basic-guidance.tsx`
- `artifacts/thetaframe/src/components/signed-in-onboarding-modal.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

Changed durable AI-agent documentation:

- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/NEURODIVERGENT_INTERFACE_GUIDE.md`
- `_AI_SYSTEM/PROJECT_INDEX.md`
- `_AI_SYSTEM/RECEIPT_INDEX.md`

No access rules, privacy rules, paid lanes, AI provider calls, AI write behavior, or backend data ownership semantics were changed.

## Product Result

- Signed-in `/` now lands on `/dashboard`.
- Header now shows `Dashboard` and `Start Here`.
- Header no longer exposes the old `Explore / Build / Release` mode badge.
- The existing `userMode.mode` data contract remains intact.
- Dashboard uses plain helper labels for mode:
  - Look Around
  - Do The Work
  - Wrap Up
- Dashboard is lane-safe:
  - Basic sees Today, This Week, Goals, AI review status, coming-up guidance, and honest calendar planning.
  - Select Authorized with Life Ledger sees Life Ledger event/reminder summaries.
  - Admin sees governance links without adding ordinary private cross-user lane browsing.
- Start Here now has visible Daily/Weekly/Vision tabs.
- Opening Start Here from Daily focuses Today.
- Opening Start Here from Dashboard shows the full Basic path.
- Restart guidance shows the first step again without deleting saved data or onboarding history.

## Deployment

Production deploy command:

```bash
vercel deploy --prod --yes
```

Deployment:

- Deployment URL: `https://thetaframe-iziq81hik-marks-projects-f03fd1cc.vercel.app`
- Inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/2wT2yqctBMP261ZdKcqrBQdtnbC7`
- Vercel alias reported: `https://thetaframe.vercel.app`
- Production QA target: `https://thetaframe.mrksylvstr.com`

## Verification

Static/build checks:

```bash
git diff --check -- artifacts/thetaframe/src/App.tsx artifacts/thetaframe/src/components/header.tsx artifacts/thetaframe/src/components/basic-guidance.tsx artifacts/thetaframe/src/components/signed-in-onboarding-modal.tsx artifacts/thetaframe/src/pages/dashboard.tsx scripts/src/runThetaFrameBrowserQa.ts
pnpm --filter @workspace/scripts run typecheck
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/thetaframe run build
```

Results:

- `git diff --check`: pass
- `pnpm --filter @workspace/scripts run typecheck`: pass
- `pnpm run typecheck`: pass
- `pnpm --filter @workspace/api-server run build`: pass
- `pnpm --filter @workspace/thetaframe run build`: pass

Production browser QA command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c37-control-center-start-guide \
pnpm run qa:browser
```

Final result:

- `passes=16`
- `skips=0`

The first C37 QA run found a strict-selector issue in the new browser assertion after the product behavior had already reached the guide tab switch. The selector was tightened to the restart-surface heading and the full production matrix then passed.

## Browser Evidence

Evidence directory as written by the scripts workspace:

`scripts/test-results/thetaframe-browser-qa/c37-control-center-start-guide/`

Screenshots:

- `c37-dashboard-desktop.png`
- `c37-dashboard-mobile.png`
- `c37-basic-guide-daily-focus-desktop.png`
- `c37-basic-guide-dashboard-mobile.png`
- `c36-basic-daily-purple-workspace.png`
- `c36-basic-weekly-purple-workspace.png`
- `c36-basic-vision-mobile-purple-workspace.png`
- `basic-repeatable-guide-and-lane-ai-groundwork-render.png`

## Storage States Used

- User: `test-results/auth/thetaframe-user.json` captured `2026-04-16T14:25:03.919Z`
- Admin: `test-results/auth/thetaframe-admin.json` captured `2026-04-16T14:24:36.761Z`
- Basic: `test-results/auth/thetaframe-basic.json` captured `2026-04-16T14:18:54.563Z`
- Select Authorized: `test-results/auth/thetaframe-select-authorized.json` captured `2026-04-16T14:24:07.304Z`

No secret values, token URLs, `.env*`, or local Vercel state were written to this receipt.
