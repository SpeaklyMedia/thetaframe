# Thetaframe QA Report

Date: 2026-04-10

## Local Validation
- `pnpm run typecheck` — passed
- `pnpm run build` — passed

## Code-Level QA Findings Addressed

### Blockers Fixed
- User mode first-selection race in the header could overwrite the user’s chosen mode with the old fallback `explore` write.
- Onboarding visibility depended on a separate permissions query and could disappear entirely on first signed-in load.
- Module permissions were not enforced consistently: users could still open or call module routes/APIs outside the nav.
- Signed-in root always redirected to `/daily`, even when another module was the first actually allowed lane.

### High-Risk Flows Rechecked
- Auth/session readiness gates still wrap protected data surfaces.
- Onboarding completion remains mutation-driven from the real workflow routes.
- Owner bootstrap still reconciles admin access and full module access.
- REACH file flows still use the normal upload URL -> storage PUT -> file record creation chain.

## Production Runtime Checks Completed
- `GET /api/healthz` returns `200`
- signed-out `GET /api/onboarding` returns `401`
- signed-out protected route probes still return auth-gated responses

## Clerk Production Investigation
- Vercel production is still configured with Clerk test keys:
  - `CLERK_PUBLISHABLE_KEY = pk_test_...`
  - `VITE_CLERK_PUBLISHABLE_KEY = pk_test_...`
  - `CLERK_SECRET_KEY = sk_test_...`
- Direct Clerk API inspection confirms the live app is using Clerk instance `ins_3C6Oz1etMpUelMZ80k8JHR68FcY`.
- That Clerk instance reports `environment_type = development`.
- Clerk domain inspection showed only one configured domain:
  - `unique.bass-77.lcl.dev`
  - frontend API URL on `clerk.accounts.dev`
- Clerk redirect URL inspection returned `0` configured redirect URLs.
- Clerk allowlist inspection returned `0` configured allowlist identifiers.
- Clerk user inspection returned only `1` user in the current instance.
- Live proxy inspection found a second production misalignment:
  - `GET /api/__clerk/v1/client` returned Clerk `host_invalid`
  - the frontend was not passing `proxyUrl` into `ClerkProvider`, even though the backend proxy middleware and env contract already existed
- Interim mitigation applied:
  - updated Clerk `allowed_origins` on the current instance to include `https://thetaframe.vercel.app`
  - wired `VITE_CLERK_PROXY_URL` through the frontend `ClerkProvider`
  - prepared the production app to route Clerk browser traffic through `/api/__clerk`
  - set Clerk domain `proxy_url = https://thetaframe.vercel.app/api/__clerk`
  - added `VITE_CLERK_PROXY_URL` to Vercel Production env
- Hard blocker remains:
  - ThetaFrame production still needs a real Clerk production instance and live keys; the current development instance is not a valid long-term production auth foundation.

## Residual Risks
- Signed-in browser-only UX remains to be manually verified:
  - onboarding modal first appearance
  - mode badge interaction feel
  - exact `403` UX on deliberately restricted accounts
  - per-surface onboarding clearing in a live signed-in session
- Clerk production cutover remains outstanding:
  - until Vercel uses `pk_live_...` / `sk_live_...`, signed-in behavior can still be unstable even with client-side hardening

## Manual Acceptance Checklist
- Sign in on desktop and confirm the onboarding modal appears for incomplete surfaces.
- Dismiss the modal and confirm local onboarding cards remain on incomplete pages.
- Set `Build`, refresh, and confirm the mode badge still shows `Build`.
- Save one real item in each surface and confirm only that surface’s onboarding disappears.
- Confirm an account without a module grant lands on `Access Denied` for that lane.
- Confirm owner/admin can reach Admin and perform a permission mutation successfully.
