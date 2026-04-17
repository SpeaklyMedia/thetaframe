# C13E Life Ledger Travel Draft Apply Pipeline

Date: 2026-04-15

## Summary

Extended the existing AI draft apply flow so `life_ledger_classification_draft` can now create new Life Ledger `travel` entries.

This slice stays intentionally narrow:
- create-only apply for `travel`
- no matching, dedupe, or overwrite logic
- no new endpoint
- no schema expansion
- `events`, `people`, `financial`, and `subscriptions` keep their current behavior
- `baby` remains non-applicable

## Implementation

Server:
- added a shared `travel` create helper in `artifacts/api-server/src/lib/lifeLedgerTravel.ts`
- reused that helper from:
  - `POST /api/life-ledger/travel`
  - `POST /api/ai-drafts/{id}/apply`
- extended `artifacts/api-server/src/routes/ai-drafts.ts` so:
  - `draftKind=life_ledger_classification_draft`
  - `targetLane=life-ledger`
  - `targetSurfaceKey=travel`
  applies successfully when the draft is review-eligible
- malformed stored travel payloads now fail with `422` on apply through the shared validator

Frontend:
- upgraded the `travel` tab review panel in `artifacts/thetaframe/src/pages/life-ledger.tsx`
- `travel` now supports:
  - `Approve`
  - `Reject`
  - `Apply to travel`
- success behavior:
  - invalidates the `travel` list query
  - invalidates the `travel` draft list query
  - invalidates onboarding progress
- `baby` remains read-only

No OpenAPI or codegen update was required because:
- the public apply route stayed `POST /api/ai-drafts/{id}/apply`
- the existing `ThetaApplyAIDraftResponse.lifeLedgerEntry` shape already covered this case

## Validation

Completed:
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Authenticated Smoke

Authenticated smoke ran against a local API server on `127.0.0.1:4023` backed by the linked Vercel `Development` environment.

Auth transport:
- pulled the linked Vercel `Development` env into a temporary file outside the repo
- resolved the owner user `mark@speaklymedia.com` through the Clerk backend API
- minted a fresh owner session token from the active Clerk session immediately before the smoke
- sent the token as Clerk cookies:
  - `__session=<fresh jwt>`
  - `__client_uat=<fresh jwt iat>`

Observed non-blocking auth note:
- Clerk logged `Session token from cookie is missing the azp claim`
- the local API still authenticated successfully for this smoke

Assertions that passed:
- authenticated `POST /api/ai-drafts` for `life_ledger_classification_draft` with `targetSurfaceKey=travel` -> `201`
- created travel draft defaulted to `reviewState=approval_gated`
- initial apply from `approval_gated` -> `409`
- authenticated `PATCH /api/ai-drafts/{id}/review-state` to `approved` -> `200`
- authenticated `POST /api/ai-drafts/{id}/apply` -> `200`
- apply response included:
  - `draft.reviewState=applied`
  - `draft.appliedAt` set
  - `draft.appliedBy` set
  - `lifeLedgerEntry.tab=travel`
  - `appliedTargetRef=life-ledger:travel:<id>`
- authenticated `GET /api/life-ledger/travel` contained the created travel entry
- second apply on the same draft -> `409`
- rejected travel draft apply -> `409`
- malformed stored travel payload apply -> `422`
- approved `life_ledger_classification_draft` with `targetSurfaceKey=baby` still apply -> `409`

Smoke output:
- `createValid=201`
- `initialReviewState=approval_gated`
- `initialApply=409`
- `approveValid=200`
- `applyValid=200`
- `listTravel=200`
- `secondApply=409`
- `rejectedApply=409`
- `malformedApply=422`
- `babyApply=409`

Cleanup:
- removed the smoke-created `life_ledger_travel` row through the authenticated API (`DELETE /api/life-ledger/travel/1 -> 204`)
- temporary env and smoke artifacts stayed outside the repo and were removed after validation
- the smoke drafts themselves were left in the Development database because there is no public delete-draft endpoint in this slice

## Next Action

The visible non-`baby` Life Ledger apply matrix is now complete:
- `events`
- `people`
- `financial`
- `subscriptions`
- `travel`

The next follow-up should be one of:
- authenticated browser QA closeout from a real interactive headed session
- a new Phase 4 slice outside Life Ledger apply, now that the visible Life Ledger draft-consumer set is complete
