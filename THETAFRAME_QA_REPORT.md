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

## Residual Risks
- Signed-in browser-only UX remains to be manually verified:
  - onboarding modal first appearance
  - mode badge interaction feel
  - exact `403` UX on deliberately restricted accounts
  - per-surface onboarding clearing in a live signed-in session

## Manual Acceptance Checklist
- Sign in on desktop and confirm the onboarding modal appears for incomplete surfaces.
- Dismiss the modal and confirm local onboarding cards remain on incomplete pages.
- Set `Build`, refresh, and confirm the mode badge still shows `Build`.
- Save one real item in each surface and confirm only that surface’s onboarding disappears.
- Confirm an account without a module grant lands on `Access Denied` for that lane.
- Confirm owner/admin can reach Admin and perform a permission mutation successfully.
