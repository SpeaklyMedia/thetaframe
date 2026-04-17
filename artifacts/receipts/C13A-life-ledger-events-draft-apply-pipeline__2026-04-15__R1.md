# C13A Life Ledger Events Draft Apply Pipeline

Date: 2026-04-15

## Summary

Implemented the first Life Ledger write consumer by extending the existing AI draft apply flow to support `life_ledger_classification_draft` for `targetSurfaceKey=events` only.

This slice adds:
- `lifeLedgerEntry` to the shared AI draft apply response
- a shared Life Ledger `events` create helper reused by the route family and draft apply
- `/api/ai-drafts/{id}/apply` support for `life_ledger_classification_draft` when the draft targets `events`
- an `events`-only apply-capable review panel in Life Ledger

This slice does not add:
- apply support for `people`, `financial`, `subscriptions`, `travel`, or `baby`
- existing-row update or dedupe behavior for Life Ledger event apply
- reminder semantics, Baby KB changes, or AI execution

## Server, Contracts, and Generated Client

Shared contracts:
- extended `ThetaApplyAIDraftResponse` with `lifeLedgerEntry`
- kept the existing apply request body unchanged

Server:
- extracted shared Life Ledger `events` create logic into a reusable helper
- reused that helper from `POST /api/life-ledger/events`
- reused that helper from `POST /api/ai-drafts/{id}/apply`
- restricted apply to:
  - `draftKind=life_ledger_classification_draft`
  - `targetLane=life-ledger`
  - `targetSurfaceKey=events`
- stamped successful apply with:
  - `reviewState=applied`
  - `appliedAt`
  - `appliedBy`
  - `appliedTargetRef=life-ledger:events:<id>`

Generated surfaces updated:
- `@workspace/api-zod`
- `@workspace/api-client-react`

## Frontend

Life Ledger `events` is now the only apply-capable Life Ledger tab:
- `Apply to events` appears for eligible drafts
- `Approve` is available for `needs_review` and `approval_gated` events drafts
- `Reject` remains available for non-terminal drafts
- successful apply invalidates:
  - Life Ledger `events`
  - Life Ledger AI drafts for `targetSurfaceKey=events`
  - `next-90-days`

All other Life Ledger tabs remain review-only in this slice.

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`
- `pnpm --filter @workspace/api-server run build`

Authenticated API smoke against a local API server on `127.0.0.1:4015` using the linked Vercel `Development` env and an owner Clerk session token:
- `GET /api/healthz` -> `200`
- valid `life_ledger_classification_draft` create for `targetSurfaceKey=events` -> `201`
- created events draft defaulted to `reviewState=approval_gated`
- apply while still `approval_gated` -> `409`
- patch review state to `approved` -> `200`
- apply approved events draft -> `200`
- returned draft moved to `applied`
- returned `appliedTargetRef=life-ledger:events:7`
- returned `lifeLedgerEntry.id=7`
- `GET /api/life-ledger/events` contained the applied entry id
- second apply on the same draft -> `409`
- rejected events draft apply -> `409`
- approved `targetSurfaceKey=people` draft apply -> `409`
- malformed stored events payload apply -> `422`

Expected non-failing frontend build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Notes

- Events drafts currently start in `approval_gated` because `life_ledger_classification_draft` is a medium-risk action. This slice explicitly enabled the `events` review panel to approve from that state before apply.
- No database schema change was required for `C13A`, so no DB push was needed in this slice.

## Next Action

The next safe Life Ledger consumer is `C13B` for `people`, or a reminder-aware follow-on for Life Ledger `events` if scheduling behavior is the higher priority.
