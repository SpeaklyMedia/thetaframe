# Baby KB Rectify and Authenticate

Date: 2026-04-15

## Summary

Rectified a real Baby KB assignment/projection defect and re-ran authenticated smoke against a clean Development-database state.

The defect:
- repeated `POST /api/admin/baby-kb/assignments` calls for the same source-entry / assignee / date tuple created duplicate assignments
- duplicate projected `life_ledger_events` rows were created for those duplicate assignments
- the existing `events` promotion link stayed pointed at the first projected event

The fix:
- Baby assignment creation is now idempotent for the same active tuple
- repeated create returns the existing assignment instead of creating a second row
- the existing `events` promotion link is updated if a projected event record changes

## Rectification

Environment:
- linked Vercel project `marks-projects-f03fd1cc/thetaframe`
- `Development` env pulled to `/tmp/thetaframe-baby-rectify.4x5l7w.env`

Removed stale smoke artifacts from the Development database:
- deleted `baby_kb_assignments` ids `1,2,3,4`
- deleted projected `life_ledger_events` ids `1,2,3,4`
- deleted matching `parent_packet_promotions` rows targeting those event ids

No repo secrets or env files were committed.

## Validation

Static:
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`

Authenticated runtime:
- local API server on `127.0.0.1:4014`
- owner JWT derived from active Clerk session via backend API

Verified:
- unauthenticated `GET /api/admin/baby-kb/assignments` -> `401`
- authenticated `POST /api/admin/baby-kb/assignments` (due-today) -> `201`
- repeated authenticated `POST /api/admin/baby-kb/assignments` with the same tuple -> returned the **same** assignment id
- authenticated `POST /api/admin/baby-kb/assignments` (longer-horizon) -> `201`
- authenticated `GET /api/admin/baby-kb/assignments` -> exactly one due-today smoke assignment and one longer-horizon smoke assignment
- authenticated `PATCH /api/admin/baby-kb/assignments/{id}` -> `200`
- authenticated `GET /api/life-ledger/events` -> exactly one projected event per smoke assignment id
- authenticated `GET /api/life-ledger/baby-kb-hero-rollups` -> correct Daily / Weekly / Vision inclusion

Observed clean IDs after rectification:
- due-today assignment id: `5`
- repeated create returned same id: `true`
- longer-horizon assignment id: `6`
- projected due-today event id: `5`
- projected longer-horizon event id: `6`

## Outcome

The Baby KB rolling assignment flow is now rectified and authenticated-smoke validated for:
- idempotent assignment creation
- correct event projection linkage
- correct hero rollup sourcing
- enforced admin auth on assignment routes
