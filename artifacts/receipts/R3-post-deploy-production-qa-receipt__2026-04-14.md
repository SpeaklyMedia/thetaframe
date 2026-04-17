# R3 Post-Deploy Production QA Receipt

Date: 2026-04-14

## Scope
- Candidate under test: conservative R3 transport in the canonical repo
- Acceptance gate: `THETAFRAME_R3_NEXT_RUN_QA_CHECKLIST.md`
- QA mode: post-deploy production-domain verification on the allowed Clerk domain

## Deployment
- Command:
  - `vercel deploy --prod --yes`
- Vercel inspect URL:
  - `https://vercel.com/marks-projects-f03fd1cc/thetaframe/AuLWAuh6veANy5vnW1ppR4FZEotS`
- Production deployment URL:
  - `https://thetaframe-icd0b4jrh-marks-projects-f03fd1cc.vercel.app`
- Production alias:
  - `https://thetaframe.vercel.app`
- Custom domain under test:
  - `https://thetaframe.mrksylvstr.com`

## Command Baseline
- `pnpm --filter @workspace/thetaframe run typecheck` — passed before this pass
- `pnpm --filter @workspace/thetaframe run build` — passed before this pass
- `pnpm run typecheck` — passed before this pass
- `pnpm run build` — passed before this pass

## Result Summary
- Deployment of current canonical repo: `PASS`
- Public R3 surface verification on `thetaframe.mrksylvstr.com`: `PASS`
- Authenticated browser verification: `BLOCKED`
- Failure classification for authenticated browser verification: `environment/setup issue`

## Public Verification Findings
- Signed-out home rendered successfully on the custom domain.
- Signed-out home exposed the sign-in link.
- Header phi mark was detected on the public surface.
- Sign-in page rendered the expected R3 branding:
  - primary splash image detected
  - `Drop In · Rewire · Rise` visible
  - email field visible
  - continue button visible
- `/baby` still resolves to the not-found experience:
  - `Lost in the theta waves` detected

## Authenticated Browser Blocker
- Owner-browser QA was attempted with a real Clerk sign-in token for the production owner account.
- The token route reached `accounts.mrksylvstr.com`, but Cloudflare presented a bot/security verification interstitial before Clerk could complete the sign-in redirect.
- Because the owner sign-in token flow was blocked upstream by Cloudflare, authenticated verification could not be completed for:
  - `/daily`
  - `/weekly`
  - `/vision`
  - `/bizdev`
  - `/life-ledger`
  - `/reach`
  - `/admin`
- This blocker sits outside the ThetaFrame app code and outside the R3 transport itself.

## Acceptance Checklist Status
- Header branding: `PASS` on public surface
- Sign-in branding: `PASS`
- Startup loading behavior: `NOT VERIFIED`
- Daily mobile ordering: `BLOCKED`
- Weekly/Vision deduplication: `BLOCKED`
- BizDev/Life Ledger/Reach/Admin top composition: `BLOCKED`
- Route-access regression checks requiring auth: `BLOCKED`
- No top-level Baby KB route drift: `PASS`
- Assistant/trust drift: `NOT VERIFIED`
- Sign-up drift: `NOT VERIFIED`
- Clerk env fallback drift: `NOT VERIFIED`

## Evidence Captured
- Public screenshots:
  - `artifacts/receipts/screenshots/R3-post-deploy-signed-out__2026-04-14.jpg`
  - `artifacts/receipts/screenshots/R3-post-deploy-sign-in__2026-04-14.jpg`
- Auth blocker screenshot:
  - `artifacts/receipts/screenshots/R3-post-deploy-owner-signin-cloudflare-block__2026-04-14.jpg`

## Warnings Observed
- Vite sourcemap warnings from `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx` remained non-failing during build and deploy.

## Outcome
- The current canonical R3 candidate is now deployed to the production domain and the public R3 branding is live there.
- The remaining browser-acceptance gap is an upstream security challenge on `accounts.mrksylvstr.com`, not a demonstrated app regression.
- No further product or design drift was introduced during this pass.

## Next No-Drift Action
- Complete the authenticated checklist from a non-bot interactive browser session on the deployed production domain, or
- temporarily relax the upstream Cloudflare bot challenge for the Clerk accounts domain during QA.
