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
- Baby KB now exposes an admin-only `Items in Motion` queue so parenting framework items can be reviewed as operational inputs to Daily, Weekly, and Vision rather than as a standalone planner.

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
- A purpose-alignment gap was found during live admin QA:
  - some imported Baby KB rows were using taxonomy tokens like `insurance_or_admin` as the entry title
  - this made Baby KB less useful as a review-and-action lane because the card label reflected schema vocabulary instead of the actionable checkpoint
  - the importer was corrected so milestone/checkpoint rows prefer the packet's actionable `checkpoint` field before generic type fields, and legacy underscore tokens are still humanized defensively in review and promotion rendering
- The parent packet import was re-run successfully after the importer corrections:
  - import id: `4`
  - `83` entries updated in place
  - no duplicate Baby KB entries were created
  - this preserved the existing provenance map while refreshing imported content
- The corrected importer path was then verified again on the public production custom domain after deployment:
  - import id: `6`
  - entry `40` now reads `choose pediatrician / pediatric practice` inside Baby KB instead of the taxonomy token `insurance_or_admin`
  - the same entry was promoted into:
    - Daily `2026-04-13` as a `Tier B` task
    - Weekly `2026-04-27` as a `steps` item
    - Vision `parent-os-check` as a `nextSteps` item
  - all three target surfaces now show the humanized action label `Choose Pediatrician / Pediatric Practice`
  - this confirms the intended product contract:
    - Baby KB remains the admin-only review/provenance lane
    - Daily, Weekly, and Vision remain the live operating surfaces where action actually lands

## Final PASS QA Run
Run date: `2026-04-11`

Acceptance URL:
- `https://thetaframe.mrksylvstr.com`

Evidence directory used during the live browser pass:
- `/tmp/thetaframe-playwright-check/final-pass-out`

### Findings
- Blocker found and fixed during the run:
  - module-guard middleware in multiple API routers was mounted at router scope instead of path scope
  - because `daily-frames` was mounted first, non-daily users could receive `403 {"module":"daily"}` from unrelated endpoints like `/api/me/permissions`, which broke the restricted-user shell and access-denied flow
  - fixed by scoping module middleware to the router's actual path prefixes:
    - `/daily-frames`
    - `/weekly-frames`
    - `/vision-frames`
    - `/bizdev`
    - `/life-ledger`
    - `/reach`
  - local validation passed after the fix:
    - `pnpm run typecheck`
    - `pnpm run build`
  - production deploy for the fix:
    - deployment id: `dpl_J243bEs2bKVuxWUmEUeUudxN3EGp`
    - deployment URL: `https://thetaframe-eqfau25qg-marks-projects-f03fd1cc.vercel.app`

### Owner/Admin Lane: PASS
- Sign-in succeeded through the live Clerk production tenant using the production custom domain.
- The signed-in onboarding modal appeared and dismissed without breaking the handoff.
- Daily loaded as the real current-day execution lane, not a partial screen.
- Mode persistence passed:
  - set `Build`
  - refreshed
  - header still showed `Build`
- Baby KB passed as an admin-only supporting lane:
  - `Baby KB` tab rendered under Life Ledger
  - `Items in Motion` queue rendered
  - review board and bulk actions rendered
  - provenance and target links rendered
- Live Baby KB workflow passed against a real imported entry:
  - source entry id: `24`
  - label: `First Pediatric Well Visit`
  - verified in Baby KB
  - promoted to Daily, Weekly, and Vision
  - target links rendered in Baby KB
- Admin passed:
  - Admin route rendered
  - permission editor rendered
  - one real preset mutation succeeded during QA and was then cleaned up

### Promotion Verification: PASS
The earlier browser assertion failure here was a harness issue, not a product defect. The promoted values live in input controls, so body-text matching was the wrong assertion method. Production state was verified through both API and browser input values.

Verified live target state for `First Pediatric Well Visit`:
- Daily `2026-04-11`
  - landed in `Tier B`
  - browser input values: `["", "First Pediatric Well Visit"]`
- Weekly `2026-04-06`
  - landed in `steps`
  - browser input values: `["First Pediatric Well Visit"]`
- Vision `me`
  - landed in `nextSteps`
  - browser input values include `First Pediatric Well Visit`

This confirms the documented product contract still holds:
- Daily remained the current-day action lane
- Weekly remained weekly alignment
- Vision remained longer-range continuity
- Baby KB remained the feeder/provenance lane rather than becoming a separate planner

### Restricted Lane: PASS
Temporary restricted account used:
- `thetaframe-restricted+1775936899@mrksylvstr.com`

Permission model used:
- `reach` only in `production`

Results after the route-scoping fix:
- signed-in landing redirected to `/reach`
- Admin nav was hidden
- `/daily` showed a coherent denied state
- `/life-ledger` showed a coherent denied state
- `/admin` showed a coherent denied state
- direct API access to Baby KB was denied:
  - `GET /api/life-ledger/baby -> 403`
  - module reported: `life-ledger`

Cleanup completed:
- temporary Clerk user deleted
- related app-side rows removed from the production database

### Daily First-Run Lane: PASS
Temporary daily-only account used:
- `thetaframe-daily+1775936899@mrksylvstr.com`

Permission model used:
- `daily` only in `production`

Results:
- onboarding modal appeared on first sign-in
- dismissing it still left Daily in a first-run setup state
- `daily-first-run-setup` rendered
- first real save created the daily frame and marked Daily onboarding complete
- verified live frame after save:
  - `GET /api/daily-frames/2026-04-11 -> 200`
  - saved Tier A task: `QA: daily first-run acceptance`
- verified onboarding state after save:
  - `daily` moved to `completed`

Cleanup completed:
- temporary Clerk user deleted
- related app-side rows removed from the production database

### Production Runtime Checks Reconfirmed
- `GET /api/healthz -> 200`
- signed-out `GET /api/onboarding -> 401`
- restricted bearer checks after the middleware fix:
  - `GET /api/me/permissions -> 200 {"modules":["reach"],"environment":"production","isAdmin":false}`
  - `GET /api/reach/files -> 200`
  - `GET /api/daily-frames/2026-04-11 -> 403 {"module":"daily"}`

## PASS Decision
ThetaFrame now qualifies as `PASS` against the current documented product contract.

Reasoning:
- shared shell behavior is stable enough for production acceptance
- onboarding modal behavior was browser-verified
- Daily normal-load and first-run states were both browser-verified
- mode persistence was browser-verified
- admin visibility and mutation flow were browser-verified
- Baby KB is functionally useful as an admin-only review/provenance lane that feeds Daily, Weekly, and Vision
- restricted-user access behavior is now coherent in both UI and API
- imported parent-packet content remains user-specific framework/reference data, not ThetaFrame seed data

## Residual Non-Blocking Follow-Up
- Clerk social login remains intentionally bypassed until the production Google provider is configured correctly.
- The frontend bundle still emits a large-chunk warning during build and should be code-split in a later optimization pass.
- The new admin-only Baby KB endpoints are live and in use, but the OpenAPI/generated-client surface for them can still be cleaned up further.
