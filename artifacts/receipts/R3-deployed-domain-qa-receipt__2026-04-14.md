# R3 Deployed-Domain QA Receipt

Date: 2026-04-14

## Scope
- Candidate under test: conservative R3 transport in the canonical repo
- Acceptance gate: `THETAFRAME_R3_NEXT_RUN_QA_CHECKLIST.md`
- QA mode: deployed-domain verification only, no implementation changes to product code during the pass
- Target: `https://thetaframe.mrksylvstr.com`

## Command Baseline
- `pnpm --filter @workspace/thetaframe run typecheck` — passed locally before deployed QA
- `pnpm --filter @workspace/thetaframe run build` — passed locally before deployed QA
- `pnpm run typecheck` — passed locally before deployed QA
- `pnpm run build` — passed locally before deployed QA

## Deployed QA Methods Used
- Playwright public-page probe against `/` and `/sign-in`
- Playwright live sign-in probe through Clerk factor-two
- Gmail retrieval of the latest verification emails sent to the disposable QA mailbox

## Result Summary
- Local build/typecheck gate: `PASS`
- Deployed public-surface gate: `FAIL`
- Deployed authenticated-surface gate: `BLOCKED`
- Failure classification:
  - public-surface mismatch: `environment/setup issue`
  - factor-two auth block: `environment/setup issue`

## Confirmed Deployed Findings
- Public home page renders and exposes the signed-out sign-in link.
- The deployed sign-in page renders the working email/password form.
- The deployed site did **not** expose the expected R3 sign-in branding on this pass:
  - no detected primary splash image
  - no detected `Drop In · Rewire · Rise` tagline
  - no detected header logo image references matching the transported R3 brand assets
- Because the public deployed pages do not match the current R3 candidate, this domain is not a reliable acceptance target for the transported repo state.

## Auth Blocker
- Live sign-in reached the real Clerk factor-two screen on the deployed domain.
- Fresh verification emails were received for the disposable QA user.
- A fresh code was entered into the live factor-two form within the same waiting browser session.
- Clerk stayed on `/sign-in/factor-two` after submit and cleared the OTP field instead of establishing a session.
- Post-submit screen text remained:
  - `Check your email`
  - `Didn't receive a code? Resend`
  - `You're signing in from a new device. We're asking for verification to keep your account secure.`
- This blocked all authenticated checklist items for `/daily`, `/weekly`, `/vision`, `/bizdev`, `/life-ledger`, `/reach`, and `/admin`.

## Acceptance Checklist Status
- Header branding: `FAIL`
  - expected R3 branding was not detected on the deployed public surface
- Sign-in branding: `FAIL`
  - sign-in form present, but R3 splash/tagline not detected
- Startup loading behavior: `NOT VERIFIED`
  - public cold-load probe did not reliably observe the startup component on the deployed site
- Daily mobile ordering: `BLOCKED`
- Weekly/Vision deduplication: `BLOCKED`
- BizDev/Life Ledger/Reach/Admin top composition: `BLOCKED`
- Route-access regression checks: `BLOCKED`
- No top-level Baby KB route drift: `BLOCKED`
- Assistant/trust drift: `BLOCKED`
- Sign-up drift: `NOT VERIFIED`
- Clerk env fallback drift: `NOT VERIFIED`

## Evidence Captured
- Public-page screenshots:
  - `artifacts/receipts/screenshots/screenshot-signed-out.jpg`
  - `artifacts/receipts/screenshots/screenshot-sign-in.jpg`
- Factor-two screenshots:
  - `artifacts/receipts/screenshots/deployed-factor-two-probe.jpg`
  - `artifacts/receipts/screenshots/deployed-factor-two-after-submit.jpg`
- Public DOM probe summary:
  - root: sign-in link visible
  - sign-in: email field visible, continue button visible
  - R3 branding markers not detected on deployed public pages

## Warnings Observed
- None beyond the deployed-environment issues above.

## Outcome
- The canonical repo remains buildable and type-safe.
- The deployed domain used for QA does not currently present the expected R3 public branding, so it does not appear to reflect the candidate under test.
- Authenticated deployed QA was additionally blocked by Clerk factor-two failing to accept fresh emailed verification codes for the disposable QA user.
- No R3 transport regression was demonstrated by this deployed pass.

## Next No-Drift Action
- Run the same checklist against a deployment that is confirmed to be built from the current canonical repo state on an allowed Clerk domain, or
- provide a localhost-compatible Clerk configuration and rerun browser QA locally.
