# Baby KB Authenticated API Smoke

Date: 2026-04-15

## Summary

Closed the remaining runtime validation gap for the Baby KB rolling assignment and projection slice by running authenticated admin-owner smoke against a local API server backed by the linked Vercel `Development` database.

The smoke covered:
- Baby KB source entry access
- Baby KB assignment create/list/update
- automatic Life Ledger `events` projection
- baby-derived Daily / Weekly / Vision hero rollups

No secrets or env files were committed.

## Environment and Auth

- env source: linked Vercel project `marks-projects-f03fd1cc/thetaframe`
- environment used: `Development`
- temporary env artifact: `/tmp/thetaframe-baby-auth.NdDEa1.env`
- owner user resolved: `mark@speaklymedia.com`
- authenticated owner JWT derived from the current active Clerk session via the Clerk backend API
- local API server: `127.0.0.1:4014`

## DB Materialization

- `pnpm --filter @workspace/db run push` -> success
- `baby_kb_assignments` table materialized
- Life Ledger `events` projection columns materialized

Observed warning:
- PostgreSQL driver / connection-string SSL mode warning about future `sslmode=require` semantics; this did not block schema application

## Smoke Results

Auth boundary:
- unauthenticated `GET /api/admin/baby-kb/assignments` -> `401`

Baby source entry:
- authenticated `GET /api/life-ledger/baby` -> `200`
- reused the first existing admin-owned Baby KB entry as the smoke source

Assignments:
- authenticated `POST /api/admin/baby-kb/assignments` (due-today assignment) -> `201`
- authenticated `POST /api/admin/baby-kb/assignments` (longer-horizon assignment) -> `201`
- authenticated `GET /api/admin/baby-kb/assignments` -> `200`
- authenticated `PATCH /api/admin/baby-kb/assignments/{id}` to `in_motion` -> `200`

Event projection:
- authenticated `GET /api/life-ledger/events` -> `200`
- both created assignments projected into Life Ledger `events`
- projected events carried:
  - `sourceType=baby_kb_assignment`
  - `sourceAssignmentId=<assignment id>`

Hero rollups:
- authenticated `GET /api/life-ledger/baby-kb-hero-rollups` -> `200`
- due-today assignment appeared in:
  - `daily`
  - `weekly`
- longer-horizon assignment appeared in:
  - `vision`

## Verified Invariants

- Baby assignment admin routes enforce auth
- assignment creation returns a durable assignment id plus projected event linkage
- lifecycle patch updates assignment state without breaking projection linkage
- Life Ledger `events` is the primary dated execution surface for Baby work
- Daily / Weekly / Vision consume baby-derived consequences as read-model rollups, not storage targets

## Notes

- Hero rollup counts were greater than `1` during smoke because this dev database already contained earlier Baby-assignment smoke records from the same source entry. Validation used assignment ids and source linkage rather than assuming empty arrays.
- The local API server was stopped after validation.
- The temporary env artifact was removed after validation.

## Outcome

The Baby KB rolling assignment and projection slice is now authenticated-smoke validated for:
- admin-owner auth
- Baby KB assignment create/list/update
- automatic `events` projection
- baby-derived Daily / Weekly / Vision hero read models
