# C7 Generic AI Draft Backbone and Read-Only Review Surface

Date: 2026-04-15

## Summary

Implemented the first real `C5` consumer as a generic persisted AI draft backbone plus read-only review panels in `Daily`, `Weekly`, `Vision`, `Life Ledger`, and `REACH`.

This slice adds:
- persisted AI draft contract types and helper state derivation
- a new `ai_drafts` Drizzle table and generic `/ai-drafts` route family
- OpenAPI and generated React client support for AI drafts
- read-only lane review surfaces backed by persisted draft queries

This slice does not add:
- provider/model execution
- apply/commit flows into live lane data
- assistant dock runtime
- background jobs
- visible `BizDev`, `Baby KB`, or `Admin` AI review UI

## Shared Contract Additions

Updated `@workspace/integration-contracts` `ai` module with:
- `thetaAIDraftReviewStateSchema`
- `ThetaAIDraftReviewState`
- `thetaAIDraftRecordSchema`
- `ThetaAIDraftRecord`
- `thetaCreateAIDraftBodySchema`
- `ThetaCreateAIDraftBody`
- `thetaUpdateAIDraftReviewStateBodySchema`
- `ThetaUpdateAIDraftReviewStateBody`
- optional `targetSurfaceKey` on `thetaAIDraftEnvelopeSchema`
- `getInitialAIDraftReviewState`

## Persistence, API, and Client

Added:
- `lib/db/src/schema/ai-drafts.ts`
- `/api/ai-drafts`
- `/api/ai-drafts/{id}`
- `/api/ai-drafts/{id}/review-state`

Updated:
- `lib/api-spec/openapi.yaml`
- generated `@workspace/api-zod`
- generated `@workspace/api-client-react`

Route guarantees:
- auth required everywhere
- lane access enforced against the target lane
- `baby_kb_promotion_draft` remains admin-gated and tied to `life-ledger` access
- create requests are rejected if body values drift from `thetaAIActionDefinitions`
- `approvalRequired` and initial `reviewState` are derived server-side

## Visible Review Surfaces

Visible lanes upgraded from passive placeholder to read-only review surface:
- `Daily`
- `Weekly`
- `Vision`
- `Life Ledger` non-`baby` tabs only
- `REACH`

Dormant draft kinds preserved in contracts and persistence only:
- `bizdev_followup_draft`
- `baby_kb_promotion_draft`

Important behavioral note:
- `approved` is only a persisted review-state marker in `C7`
- it does not apply or commit data into live lane records

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm install`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

Follow-up closure:
- DB materialization and authenticated route smoke were completed later via the Vercel Development environment
- see `C7-db-unblock-and-smoke-validation__2026-04-15__R1.md`

## Best Next Action

Implement the first controlled write consumer for persisted drafts, limited to one low-risk lane such as `Daily` or `REACH`, with explicit apply semantics and no provider-side auto-commit.
