# ThetaFrame R3 Final Manual QA Runbook

Date: 2026-04-14

Use this runbook to complete the last R3 acceptance gate in a real interactive browser on the production custom domain.

## Target
- Acceptance URL: `https://thetaframe.mrksylvstr.com`
- Candidate deployment:
  - `https://thetaframe-icd0b4jrh-marks-projects-f03fd1cc.vercel.app`
  - `https://thetaframe.vercel.app`

## Rules
- Do not change product code.
- Do not change Clerk config.
- Do not change Cloudflare config.
- Use the owner account in a normal human-operated browser.
- If a failure appears, stop after classifying it. Do not improvise fixes during the QA pass.

## Preflight Already Completed
- `pnpm --filter @workspace/thetaframe run typecheck` — passed
- `pnpm --filter @workspace/thetaframe run build` — passed
- `pnpm run typecheck` — passed
- `pnpm run build` — passed

## Existing Verified Evidence
- Signed-out public page:
  - `artifacts/receipts/screenshots/R3-post-deploy-signed-out__2026-04-14.jpg`
- Sign-in public page:
  - `artifacts/receipts/screenshots/R3-post-deploy-sign-in__2026-04-14.jpg`
- Auth automation blocker:
  - `artifacts/receipts/screenshots/R3-post-deploy-owner-signin-cloudflare-block__2026-04-14.jpg`

## Manual Pass
1. Open `https://thetaframe.mrksylvstr.com` signed out.
2. Confirm public checks:
   - signed-out home renders
   - phi mark is visible
   - sign-in link is present
   - `/baby` returns the not-found experience
3. Open `/sign-in`.
4. Confirm:
   - splash image renders
   - `Drop In · Rewire · Rise` is visible
   - email field renders
5. Sign in as the owner through the normal interactive flow.
6. On first authenticated load, confirm startup behavior:
   - `ThetaFrameStartup` appears on cold auth/session load
   - it clears normally
   - route changes do not replay it
7. Validate `/daily` on desktop:
   - `text-daily-title` resolves
   - hero appears before helper/onboarding cards
   - emotion picker lives in the primary action island
   - support rail appears directly below the island
8. Validate `/daily` on mobile:
   - hero
   - emotion action island
   - support rail
   - helper/onboarding cards
   - remaining content
9. Validate `/weekly`:
   - hero + primary action island + support rail
   - weekly theme appears only once
10. Validate `/vision`:
   - hero + primary action island + support rail
   - vision goals appear only once
   - next visible steps remain separate
11. Validate `/bizdev`:
   - top composition renders
   - `New Lead` still works/render remains coherent
12. Validate `/life-ledger`:
   - top composition renders
   - tab behavior remains coherent
   - Baby KB remains inside Life Ledger
13. Validate `/reach`:
   - top composition renders
   - upload/search/import surfaces remain coherent
14. Validate `/admin`:
   - compact hero renders
   - user search, selection, and permission editing remain coherent

## Screenshot Files To Capture
- `artifacts/receipts/screenshots/R3-final-daily-desktop__2026-04-14.jpg`
- `artifacts/receipts/screenshots/R3-final-daily-mobile__2026-04-14.jpg`
- `artifacts/receipts/screenshots/R3-final-weekly-desktop__2026-04-14.jpg`
- `artifacts/receipts/screenshots/R3-final-vision-desktop__2026-04-14.jpg`

## Failure Classification
- `R3 transport regression`
  - only if the current shipped UI/behavior violates the conservative R3 transport contract
- `environment/setup issue`
  - auth/CDN/browser/security gate problem outside the shipped R3 UI
- `pre-existing unrelated issue`
  - existing product issue not introduced by the R3 transport

## Receipt To Update
- `artifacts/receipts/R3-final-delivery-receipt__2026-04-14.md`

If all checks pass, mark R3 delivered on the production custom domain in that receipt.
