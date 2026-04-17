# C35 Plain-Language Basic Onboarding And Surface Rework

Date: 2026-04-17
Status: `CLOSED / PRODUCTION PROOF PASSED`

## Scope

Implemented the Basic-user-first surface rework for Daily, Weekly, and Vision:

- header guide action now reads `Start Here`
- Basic Start Here guide uses Today, This Week, and Goals
- Daily, Weekly, and Vision now show a visible step order near the top of the lane
- Daily core flow leads with color, must-do, later tasks, time plan, and small win
- Weekly core flow leads with week name, main steps, must-keep items, and backup plan
- Vision core flow leads with goals and next steps
- AI draft review, support, linked items, calendar/mobile placeholders, and extra onboarding help moved below the core flow into clear More sections
- Basic copy now prefers plain helper names while preserving existing internal data semantics

No backend APIs, access rules, paid lanes, provider calls, AI write behavior, admin workflows, or data ownership semantics were changed.

## Changed Files

- `_AI_SYSTEM/NEURODIVERGENT_INTERFACE_GUIDE.md`
- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `artifacts/thetaframe/src/lib/basic-onboarding.ts`
- `artifacts/thetaframe/src/components/basic-guidance.tsx`
- `artifacts/thetaframe/src/components/header.tsx`
- `artifacts/thetaframe/src/components/signed-in-onboarding-modal.tsx`
- `artifacts/thetaframe/src/components/surface-onboarding-card.tsx`
- `artifacts/thetaframe/src/pages/daily.tsx`
- `artifacts/thetaframe/src/pages/weekly.tsx`
- `artifacts/thetaframe/src/pages/vision.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

## Static Checks

- `git diff --check` on touched C35 files: `PASS`
- `pnpm --filter @workspace/scripts run typecheck`: `PASS`
- `pnpm run typecheck`: `PASS`
- `pnpm --filter @workspace/thetaframe run build`: `PASS`

Build notes:

- Vite emitted existing sourcemap warnings for UI wrapper files.
- Vite emitted the existing large chunk warning.
- Build completed successfully.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Result:

- status: `READY`
- deployment URL: `https://thetaframe-67v8cf8mv-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/5SdtPtW4tSCPDD4JbYHozmgPzyaU`
- Vercel alias reported: `https://thetaframe.vercel.app`
- proof target: `https://thetaframe.mrksylvstr.com`

## Browser QA Status

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c35-plain-language-basic-onboarding \
pnpm run qa:browser
```

Final result:

- `PASS`
- `passes=15`
- `skips=0`

New C35 proof:

- Basic header shows `Start Here`.
- Basic guide shows Step 1 Today, Step 2 This Week, Step 3 Goals only.
- Daily exposes `step-order-daily` and `button-add-daily-must-do`.
- Weekly exposes `step-order-weekly` and `button-add-weekly-step`.
- Vision exposes `step-order-vision` and `button-add-vision-goal`.
- Existing access matrix remains `skips=0`.

Evidence screenshots:

- `scripts/test-results/thetaframe-browser-qa/c35-plain-language-basic-onboarding/c35-basic-guide-desktop.png`
- `scripts/test-results/thetaframe-browser-qa/c35-plain-language-basic-onboarding/c35-basic-guide-mobile.png`
- `scripts/test-results/thetaframe-browser-qa/c35-plain-language-basic-onboarding/c35-basic-daily.png`
- `scripts/test-results/thetaframe-browser-qa/c35-plain-language-basic-onboarding/c35-basic-weekly.png`
- `scripts/test-results/thetaframe-browser-qa/c35-plain-language-basic-onboarding/c35-basic-vision-mobile.png`

Browser notes:

- The first production browser run exposed a stale harness assumption: it still expected `support-rail` to be visible before opening More help. C35 intentionally moved support rail under More help, so the harness was updated to assert the new core step-order surfaces instead.
- A later rerun hit one blank-page navigation flake during the Select Authorized matrix. The final rerun passed the full matrix with `passes=15`, `skips=0`.
- The evidence directory also contains earlier `c34-*` and failure screenshots from pre-final reruns; use the `c35-*` files above as the final C35 evidence set.

## Notes

- This pass keeps onboarding repeatable and non-blocking.
- AI remains draft/review/apply only. No silent writes were added.
- Basic labels now lead with plain names, but existing internal schemas and API contracts stay unchanged.
- The dirty worktree was preserved; unrelated files were not reverted or reformatted.
