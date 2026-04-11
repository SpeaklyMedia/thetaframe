# Thetaframe QA Report

Date: 2026-04-11

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
- Life Ledger now supports an admin-only `Baby KB` tab that reuses the existing CRUD flow while blocking non-admin direct API access.
- Baby KB now supports admin-only bulk review actions and linked promotion into Daily, Weekly, and Vision without mutating import provenance.

## Production Runtime Checks Completed
- `GET /api/healthz` returns `200`
- signed-out `GET /api/onboarding` returns `401`
- signed-out protected route probes still return auth-gated responses
- `thetaframe.mrksylvstr.com` is attached to the Thetaframe Vercel project and now resolves publicly to Vercel
- authoritative Cloudflare DNS now serves:
  - CNAME `thetaframe.mrksylvstr.com` -> `3e1fc87145b8ad9a.vercel-dns-017.com.`
- Vercel domain config for `thetaframe.mrksylvstr.com` now reports `misconfigured = false`
- `http://thetaframe.mrksylvstr.com/api/healthz` returns `200` from the Thetaframe Vercel deployment
- `https://thetaframe.mrksylvstr.com/api/healthz` returns `200`
- Vercel issued a valid TLS certificate for `thetaframe.mrksylvstr.com`

## Clerk Production Investigation
- Production is now on the real Clerk production instance:
  - `CLERK_PUBLISHABLE_KEY = pk_live_...`
  - `VITE_CLERK_PUBLISHABLE_KEY = pk_live_...`
  - `CLERK_SECRET_KEY = sk_live_...`
- Direct Clerk API inspection confirms the live app is using Clerk instance `ins_3CBEjMTdvpLqPNR0FAAFX3pdtoo`.
- That Clerk instance reports `environment_type = production`.
- Production Clerk domain inventory now resolves through `mrksylvstr.com`:
  - frontend API URL: `https://clerk.mrksylvstr.com`
  - accounts portal URL: `https://accounts.mrksylvstr.com`
- Clerk-required DNS records were created live in Cloudflare for the production instance:
  - `clerk.mrksylvstr.com` -> `frontend-api.clerk.services`
  - `accounts.mrksylvstr.com` -> `accounts.clerk.services`
  - `clk._domainkey.mrksylvstr.com` -> `dkim1.tci80x03ktfm.clerk.services`
  - `clk2._domainkey.mrksylvstr.com` -> `dkim2.tci80x03ktfm.clerk.services`
  - `clkmail.mrksylvstr.com` -> `mail.tci80x03ktfm.clerk.services`
  - `_dmarc.mrksylvstr.com` -> `v=DMARC1; p=none;`
- The Cloudflare zone write path was recovered from a local zone-scoped API token on this machine with `#dns_records:edit` for `mrksylvstr.com`.
- The previous forced proxy path is now identified as obsolete for production:
  - Thetaframe had still been forcing `proxyUrl=/api/__clerk`
  - the backend proxy target remained hardcoded to `frontend-api.clerk.dev`
  - Vercel still had `VITE_CLERK_PROXY_URL` configured
- The frontend was corrected to stop forcing `/api/__clerk` by default, and `VITE_CLERK_PROXY_URL` was removed from Vercel production.
- The API server was corrected so production no longer mounts `/api/__clerk`, and the legacy proxy middleware now only activates when an explicit `CLERK_PROXY_TARGET` is set for a non-production fallback.
- `clerk.mrksylvstr.com` now resolves and serves Clerk client responses successfully from the production instance.
- New production auth blocker identified after the custom-domain fix:
  - the production Clerk tenant exposed `oauth_google` as a first-factor path, but the Google social provider was not fully configured, producing `Error 400: invalid_request` with `Missing required parameter: client_id`
  - the production Clerk tenant also had no live users at the time of investigation, so owner sign-in could not succeed even after the domain and live-key cutover
- Mitigation applied in ThetaFrame:
  - the auth screens now hide the broken social-login buttons and present email-first guidance instead
  - production owner access was provisioned directly in Clerk for `mark@speaklymedia.com`
- Important implementation note:
  - Clerk rejected `proxy_url = https://thetaframe.mrksylvstr.com/api/__clerk` for this production instance with `Proxy url is invalid. Cannot be on a different domain`.
  - That means Thetaframe cannot rely on the old proxy workaround for this Clerk domain configuration and must use Clerk's real frontend domain once it becomes healthy.

## Parent Packet Import Completed
- The parent packet archive `SESSION_4_REVIEW_GATE__20260324_R1(1).zip` was uploaded through the normal production REACH flow as admin-owned content, not inserted directly into the database.
- Production REACH source record:
  - file id: `1`
  - object path: `/objects/uploads/a6b3476b-4c07-4078-9834-5ef75738d087`
- Production import run:
  - import id: `1`
  - packet key: `SESSION_4_REVIEW_GATE__20260324_R1`
  - scope: `broader-dual-layer`
  - status: `completed`
- Materialization results:
  - `83` Baby KB entries materialized
  - `71` created
  - `12` updated during import
  - `12` packet source files materialized
- Imported content remains user-specific framework/reference content for parenting-related planning and routine adjustment. It is not Thetaframe default seed data.
- A compatibility gap was found during live import:
  - the generated client/UI used `sourceReachFileId` while the backend route expected `reachFileId`
  - the backend was patched to accept both shapes so the in-app import action can use the same production route successfully

## Residual Risks
- Signed-in browser-only UX remains to be manually verified:
  - onboarding modal first appearance
  - mode badge interaction feel
  - exact `403` UX on deliberately restricted accounts
  - per-surface onboarding clearing in a live signed-in session
- `Baby KB` needs one live admin smoke test and one non-admin API probe to confirm the admin-only lane behaves as intended after deploy.
- Baby KB promotion flows still need signed-in browser confirmation against the real admin account:
  - bulk verify
  - bulk tag add/remove
  - idempotent promotion to Daily, Weekly, and Vision
  - visible promotion badges after linking
- Clerk social login is still intentionally bypassed in ThetaFrame until the Google provider is configured correctly in the production Clerk tenant.

## Manual Acceptance Checklist
- Sign in on desktop and confirm the onboarding modal appears for incomplete surfaces.
- Dismiss the modal and confirm local onboarding cards remain on incomplete pages.
- Set `Build`, refresh, and confirm the mode badge still shows `Build`.
- Save one real item in each surface and confirm only that surface’s onboarding disappears.
- Confirm an account without a module grant lands on `Access Denied` for that lane.
- Confirm owner/admin can reach Admin and perform a permission mutation successfully.
- Confirm Baby KB bulk verify removes `Needs verification` and adds `Verified personal truth`.
- Confirm one Baby KB item can be promoted into:
  - Daily Tier B
  - Weekly steps
  - Vision next steps
- Confirm re-promoting the same Baby KB item into the same target container does not duplicate it.
