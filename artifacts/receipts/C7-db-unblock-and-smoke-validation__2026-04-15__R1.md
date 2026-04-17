# C7 DB Unblock and Smoke Validation

Date: 2026-04-15

## Summary

Resolved the `C7` database blocker by using the linked Vercel **Development** environment as a temporary local env source, then materializing the `ai_drafts` schema successfully with Drizzle.

The local API was also started against that same Development database and the new `/api/ai-drafts` route family was validated end to end with an authenticated owner session token derived from an existing active Clerk session.

During smoke validation, a real `C7` route bug was discovered and fixed:
- persisted `metadata` was being stored too narrowly
- readback failed shared-schema parsing because server-owned metadata fields were missing
- the route now hydrates full core integration metadata from server-owned fields on create/read/update

## Environment Source

- Source of truth: linked Vercel project `marks-projects-f03fd1cc/thetaframe`
- Environment used: `Development`
- Temporary env artifact: `/tmp/thetaframe-c7-vercel-dev.env`
- `DATABASE_URL` confirmed present in the pulled env
- Temporary env artifact removed after validation
- No `.env*` file was created or committed inside the repo

## DB Materialization

Command:

```bash
set -a && source /tmp/thetaframe-c7-vercel-dev.env && set +a
pnpm --filter @workspace/db run push
```

Result:
- `drizzle-kit push` succeeded
- `ai_drafts` is now materialized in the Vercel Development database

Observed warning:
- PostgreSQL driver / connection-string SSL mode warning about future `sslmode=require` semantics; this did not block schema application

## Static Regression

Completed with the pulled Development env loaded into the shell:

- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Build noise remained the same as before:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## API Smoke Validation

Local API run:

```bash
set -a && source /tmp/thetaframe-c7-vercel-dev.env && set +a
export PORT=4011
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Verified:
- `GET /api/healthz` -> `200 OK`
- `GET /api/ai-drafts` without auth -> `401 Unauthorized`
- `POST /api/ai-drafts` without auth -> `401 Unauthorized`
- authenticated `POST /api/ai-drafts` -> `201 Created`
- authenticated `GET /api/ai-drafts?lane=daily&draftKind=daily_frame_draft&limit=5` -> `200 OK`
- authenticated `GET /api/ai-drafts/{id}` -> `200 OK`
- authenticated `PATCH /api/ai-drafts/{id}/review-state` -> `200 OK`
- authenticated drifted create with wrong `commitTool` -> `400 Bad Request`

Authenticated smoke assertions passed:
- created draft returned numeric `id` and stable `thetaObjectId`
- low-risk `daily_frame_draft` defaulted to `approvalRequired=one_tap`
- low-risk `daily_frame_draft` defaulted to `reviewState=needs_review`
- list endpoint returned the created draft under the expected lane filter
- get endpoint returned the same `id` and `thetaObjectId`
- patch updated `reviewState` to `approved`
- patch stamped `reviewedBy` and `reviewedAt`
- drifted create was rejected with `Draft body drifted from the registered AI action definition.`

## Remaining Blocker

No remaining `C7` unblock blocker.

The database materialization step and authenticated route smoke both completed successfully.

## Next Action

Move to the next `C7` follow-on or subsequent slice with `ai_drafts` now proven against the Development database and authenticated API path.
