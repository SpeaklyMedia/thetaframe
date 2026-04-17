# C34 Repeatable Basic Onboarding And AI Groundwork

Date: 2026-04-17
Status: `CLOSED / PRODUCTION PROOF PASSED`

## Scope

Implemented a Basic-user-first onboarding and AI usefulness pass:

- persistent signed-in `Guide` header control
- repeatable Basic Start Here guide for Daily, Weekly, and Vision
- compact next-step surfaces on Daily, Weekly, and Vision
- review-first AI time-saver surfaces on Daily, Weekly, and Vision
- durable AI-agent guidance for neurodivergent-friendly interface work
- browser QA coverage for the new C34 surfaces

No paid lanes, access rules, backend onboarding semantics, provider-backed AI generation, or silent AI writes were changed.

## Changed Files

- `_AI_SYSTEM/NEURODIVERGENT_INTERFACE_GUIDE.md`
- `_AI_SYSTEM/PROJECT_INDEX.md`
- `artifacts/thetaframe/src/lib/basic-onboarding.ts`
- `artifacts/thetaframe/src/lib/guide-events.ts`
- `artifacts/thetaframe/src/components/basic-guidance.tsx`
- `artifacts/thetaframe/src/components/header.tsx`
- `artifacts/thetaframe/src/components/signed-in-onboarding-modal.tsx`
- `artifacts/thetaframe/src/pages/daily.tsx`
- `artifacts/thetaframe/src/pages/weekly.tsx`
- `artifacts/thetaframe/src/pages/vision.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Result:

- status: `READY`
- deployment URL: `https://thetaframe-ly6eesnf6-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/31UAnunGQqQ8R1oUPRr5MsXQgsQL`
- alias reported by Vercel: `https://thetaframe.vercel.app`
- proof target: `https://thetaframe.mrksylvstr.com`

## Browser Proof

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c34-basic-onboarding \
pnpm run qa:browser
```

Result:

- `PASS`
- `passes=15`
- `skips=0`

New C34 coverage:

- Basic user sees the header Guide control.
- Guide can be dismissed and reopened.
- Basic guide shows Daily, Weekly, and Vision.
- Basic guide does not expose BizDev, Life Ledger, REACH, Admin, or Baby KB.
- Daily, Weekly, and Vision each expose one next-step surface.
- Daily, Weekly, and Vision each expose one review-first AI time-saver surface.

Evidence screenshots:

- `scripts/test-results/thetaframe-browser-qa/c34-basic-onboarding/c34-basic-guide-desktop.png`
- `scripts/test-results/thetaframe-browser-qa/c34-basic-onboarding/c34-basic-guide-mobile.png`
- `scripts/test-results/thetaframe-browser-qa/c34-basic-onboarding/c34-basic-daily.png`
- `scripts/test-results/thetaframe-browser-qa/c34-basic-onboarding/c34-basic-weekly.png`
- `scripts/test-results/thetaframe-browser-qa/c34-basic-onboarding/c34-basic-vision-mobile.png`

## Static Checks

- `git diff --check` on touched C34 files: `PASS`
- `pnpm --filter @workspace/scripts run typecheck`: `PASS`
- `pnpm --filter @workspace/thetaframe run typecheck`: `PASS`
- `pnpm run typecheck`: `PASS`
- `pnpm --filter @workspace/thetaframe run build`: `PASS`

## Notes

- The repeatable Guide is frontend-only and preserves existing `GET /api/onboarding` plus real-data completion semantics.
- AI groundwork is copy and UI registry only; no provider call, new draft generation endpoint, or auto-commit behavior was added.
- Local production-equivalent browser proof used the production domain because Clerk auth remains domain-constrained.
- The workspace already contained unrelated dirty and untracked files from prior slices; those were preserved.
