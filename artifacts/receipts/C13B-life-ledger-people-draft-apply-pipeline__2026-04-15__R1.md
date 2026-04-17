# C13B Life Ledger People Draft Apply Pipeline

Date: 2026-04-15

## Summary

Extended the existing AI draft apply flow so `life_ledger_classification_draft` can now create new Life Ledger `people` entries.

This slice is intentionally narrow:
- create-only apply for `people`
- no matching or overwrite logic
- no new endpoint
- no schema expansion
- `events` keeps its existing apply + execution-state behavior
- `financial`, `subscriptions`, `travel`, and `baby` remain non-applicable

## Implementation

Server:
- extracted a shared `people` create helper in `artifacts/api-server/src/lib/lifeLedgerPeople.ts`
- reused that helper from:
  - `POST /api/life-ledger/people`
  - `POST /api/ai-drafts/{id}/apply`
- extended `artifacts/api-server/src/routes/ai-drafts.ts` so:
  - `draftKind=life_ledger_classification_draft`
  - `targetLane=life-ledger`
  - `targetSurfaceKey=people`
  applies successfully when the draft is review-eligible
- malformed stored people payloads now fail with `422` on apply through the shared validator

Frontend:
- upgraded the `people` tab review panel in `artifacts/thetaframe/src/pages/life-ledger.tsx`
- `people` now supports:
  - `Approve`
  - `Reject`
  - `Apply to people`
- success behavior:
  - invalidates the `people` list query
  - invalidates the `people` draft list query
  - invalidates onboarding progress

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

Authenticated smoke ran against a local API server on `127.0.0.1:4019` backed by the linked Vercel `Development` environment, using a token derived from an existing active owner Clerk session.

Assertions that passed:
- authenticated `POST /api/ai-drafts` for `life_ledger_classification_draft` with `targetSurfaceKey=people` -> `201`
- created people draft defaulted to `reviewState=approval_gated`
- initial apply from `approval_gated` -> `409`
- authenticated `PATCH /api/ai-drafts/{id}/review-state` to `approved` -> `200`
- authenticated `POST /api/ai-drafts/{id}/apply` -> `200`
- apply response included:
  - `draft.reviewState=applied`
  - `lifeLedgerEntry.tab=people`
  - `appliedTargetRef=life-ledger:people:<id>`
- authenticated `GET /api/life-ledger/people` contained the created people entry
- second apply on the same draft -> `409`
- rejected people draft apply -> `409`
- malformed stored people payload apply -> `422`
- approved `life_ledger_classification_draft` with `targetSurfaceKey=financial` still applied -> `409`

Smoke output:
- `peopleDraftCreate=201`
- `initialReviewState=approval_gated`
- `initialApply=409`
- `approve=200`
- `apply=200`
- `secondApply=409`
- `rejectedApply=409`
- `malformedApply=422`
- `financialApply=409`

Cleanup:
- removed the smoke-created `life_ledger_people` row through the authenticated API (`DELETE /api/life-ledger/people/1 -> 204`)
- the smoke drafts themselves were left in the Development database because there is no public delete-draft endpoint in this slice

## Next Action

Move to the next Life Ledger write consumer:
- `financial` if the priority is durable obligation coverage
- `subscriptions` if the priority is recurring-cost workflow coverage

`events` should remain the only dated execution tab unless broader `4B` reminder/calendar work changes that boundary.
