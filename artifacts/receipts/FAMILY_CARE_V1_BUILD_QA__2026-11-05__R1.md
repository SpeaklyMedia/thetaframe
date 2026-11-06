# Family Care V1 Build + QA Receipt

Captured UTC: `2026-11-06T05:47:29Z`
Status: `GO_PRODUCTION_VALIDATED_WITH_ACCESS_DRIFT_NOTE`

## Environment

- Repository: `SpeaklyMedia/thetaframe`
- Base SHA: `4d117a2d1ed79fec75589969c2eafbacbf6a2888`
- Branch: `feature/family-care-v1-20261105`
- Production deployment: `dpl_CfxoTmTBHyM46ocSNJSzFDV45M26` (`READY`)
- Production runtime source: clean worktree commit
  `8a060960e7d8b3a355ef6fb995703627c9bfa4af`; CLI deployment metadata does
  not carry a Git source object
- Previous production rollback anchor: `dpl_6VyDp7VYF1K7KDBbuVxkM9f8P7dz`
- Preview deployments: `dpl_DCqWVbUTMqrzgF7bbqkPSWV2GN1H` and
  `dpl_3PqoTYZMzXnCkpbkoJd1QyxHqzzA` (both deleted after QA)
- Preview database: empty `thetaframe_family_care_qa_20261106` database with
  the repository schema applied (deleted after QA)
- Preserved dirty checkout: unchanged at `3bf1d903408fa050e97616aae12f12a4aecbaf51`
- Test records: synthetic only

## Implemented

- Protected `/family-care` route under existing authenticated Daily access.
- Private one-account context with configurable labels, IANA timezone, and
  editable Tonight coverage/rest plan.
- Observed feed, diaper, sleep, pump, and note events with edit/delete.
- Bottle offered/consumed and pumped/produced volumes remain distinct integral
  milliliter fields; nursing volume remains unknown.
- Duplicate-safe client event IDs, soft deletion, and owner-scoped revision
  audit snapshots.
- Corrected create-event body validation after disposable persistence QA caught
  the strict schema rejecting its own `clientEventId` field.
- Preserved one client event ID across ambiguous browser retries, rejected
  future sleep end-times, and removed the OpenAPI `allOf` strict-schema trap.
- Clarified that event date/time entry follows the current device timezone and
  that shared awake coverage may overlap while planned rest windows do not.
- Persistent private handoff and a rolling observed 24-hour summary.
- Optional Dashboard launcher. Dashboard remains the signed-in home.
- No household sharing, notification transport, clinical scoring/advice,
  proof ingestion, AI writes, or private source import.

## Gate results

| Gate | Result | Evidence |
|---|---|---|
| Source truth / dirty checkout preservation | PASS | Preflight receipt; original checkout status re-read after build |
| OpenAPI codegen | PASS | `pnpm --filter @workspace/api-spec run codegen` |
| Full TypeScript checks | PASS | `pnpm run typecheck` |
| Frontend production build | PASS | `pnpm --filter @workspace/thetaframe run build` |
| API production build | PASS | `pnpm --filter @workspace/api-server run build` |
| Family Care deterministic QA | PASS | 11 synthetic runtime assertions + 8 static/security assertions |
| Family Care service persistence QA | PASS | Synthetic owner isolation, idempotent create, CRUD, handoff separation, and create/update/delete audit revisions |
| Additive migration | PASS | Disposable PostgreSQL 16 RAM-backed container |
| Migration idempotency | PASS | Second application completed with existing-object notices only |
| Database constraints | PASS | Invalid kind and end-before-start rejected |
| Duplicate boundary | PASS | Same client ID allowed for two owners; duplicate for same owner rejected |
| Rollback | PASS | Rollback completed; post-check found zero `family_care_%` tables |
| Private-data/source scrub | PASS | Feature source and built public assets contain no private transport content, credentials, or family observations |
| Synthetic account authentication | PASS_WITH_DRIFT_NOTE | Fresh short-lived Clerk ticket resolved to the dedicated non-admin QA user with Daily access; its current production profile includes all optional modules rather than the previously recorded Basic preset |
| Isolated preview deployment + process health | PASS | Deployment-local temporary database binding was present; static `/api/healthz` returned `200 {"status":"ok"}` but was not a database-connectivity probe |
| Signed-out browser privacy | PASS | Six preview browser checks passed, including protected `/family-care` exposing no private shell; unauthenticated `/api/family-care` returned `401` |
| Service-layer persistence smoke | PASS | Direct synthetic service calls proved owner-scoped CRUD, handoff separation, idempotency, and audit revisions against disposable PostgreSQL; this did not exercise Clerk or HTTP middleware |
| Production schema backup + rollback anchor | PASS | PostgreSQL 17 schema-only backup captured before migration; SHA-256 `ae2b4432dfa34d395bf1372142f10863f6723b00442a7d0646bea87d6ec77477`; explicit rollback SQL and prior Vercel deployment retained during QA |
| Production additive migration | PASS | Four Family Care tables, nine indexes, and eleven constraints created transactionally; all tables began empty |
| Authenticated production browser/API smoke | PASS | Non-admin synthetic user verified private UI, GET/context/event/handoff CRUD, idempotent duplicate create, update persistence, soft-delete visibility, and Daily-module enforcement |
| 360/390/414/iPad + keyboard/reduced-motion proof | PASS | Authenticated production checks passed at `360x800`, `390x844`, `414x896`, and `820x1180` with no horizontal overflow and visible keyboard focus |
| Signed-out production privacy | PASS | Six public/signed-out browser checks passed; protected Family Care exposed no private shell |
| Synthetic production cleanup | PASS | Exact synthetic context, event, revisions, and handoff rows removed; all four Family Care tables returned to zero rows |
| Production deployment | PASS | `thetaframe.mrksylvstr.com` resolves to READY deployment `dpl_CfxoTmTBHyM46ocSNJSzFDV45M26` built from clean commit `8a06096` |

## Security boundary

Every Family Care route requires `requireAuth` and Daily module access. Context,
event, duplicate resolution, update, delete, handoff, and revision operations
use the current Clerk `userId`; ordinary admin status creates no private-data
bypass. GET has stable neutral defaults and performs no implicit database write.

The public feature source contains generic caregiver labels and synthetic QA
only. It contains no extracted transport path, real child/caregiver record,
auth state, database URL, token, or private source document.

## Preview execution and cleanup

- Built and deployed the feature twice as non-production previews. The second
  deployment alone received the empty QA database URL through deployment-local
  environment injection; no shared Preview or Production environment variable
  was changed.
- Applied the full repository schema to the empty QA database and verified the
  live process health endpoint. That static endpoint did not prove HTTP-to-
  database connectivity; authenticated preview HTTP proof remains blocked.
- Verified the live public shell and protected-route behavior with the existing
  browser suite: `passes=6`, `skips=17`, with authenticated cases skipped when
  no preview-domain storage state was available.
- Attempted a fresh synthetic Basic-account Clerk ticket. It remained on the
  production custom account host, so the run stopped at the host boundary. A
  proposed production-session-cookie transfer to the preview was rejected and
  was not performed.
- Revoked only the newly created non-environment Vercel bypass. Sanitized
  follow-up inspection found one pre-existing environment-backed bypass, zero
  temporary non-environment bypasses, and SSO still enabled.
- Deleted both preview deployments, dropped the explicitly named QA database,
  verified its database count was zero, and removed all temporary URL/token
  files. Production deployment, database, Clerk settings, DNS, and shared
  Vercel environment configuration were not changed.

## Production execution

- Confirmed remote `main` and the prior production deployment were both at the
  recorded base `4d117a2d1ed79fec75589969c2eafbacbf6a2888` before release.
- Captured a PostgreSQL 17 schema-only backup with mode `0600`. The first local
  PostgreSQL 14 client attempt stopped on version mismatch before any write;
  the version-matched backup completed before migration.
- Applied the committed additive migration transaction. Validation found the
  expected four tables, nine indexes, eleven constraints, and zero initial rows.
- Deployed the clean `8a06096` worktree through Vercel CLI. The production
  custom domain resolves to READY deployment `dpl_CfxoTmTBHyM46ocSNJSzFDV45M26`.
- Captured a fresh short-lived session for the dedicated synthetic non-admin
  account. Its access profile has drifted from Basic to full non-admin; Family
  Care smoke required and verified only Daily access, and did not use admin.
- Ran authenticated synthetic UI and API smoke, including create, duplicate
  idempotency, update persistence response, handoff, delete visibility,
  four responsive viewports, keyboard focus, and reduced motion.
- The local smoke harness had two pre-write UI selector/onboarding failures and
  one post-write reload timeout. The post-write attempt was immediately cleaned
  by exact synthetic identifiers, returning all tables to zero before the final
  successful run. The successful run was also cleaned by exact identifiers.
- Re-ran signed-out production browser privacy checks: `passes=6`, `skips=17`.
  No private Family Care shell was exposed without authentication.

## Production decision

`GO_PRODUCTION_VALIDATED_WITH_ACCESS_DRIFT_NOTE`. Family Care V1 is deployed,
the additive production schema is present, authenticated synthetic CRUD and
responsive UI proof passed, signed-out privacy passed, and all synthetic Family
Care rows were removed. The retained follow-up is access governance: the
dedicated QA account currently resolves as full non-admin rather than the
previously recorded Basic preset. This does not grant admin and did not bypass
the Family Care Daily-module boundary, but its intended preset should be reviewed
separately.
