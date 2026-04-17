# C8 Daily Draft Apply Pipeline

Date: 2026-04-15

## Summary

Implemented the first controlled write consumer for persisted AI drafts by enabling explicit apply-to-Daily only.

This slice adds:
- `applied` as a persisted AI draft terminal audit state
- apply audit fields on `ai_drafts`
- `POST /api/ai-drafts/{id}/apply`
- shared Daily upsert persistence reused by the existing Daily route family and the new apply route
- Daily-only UI actions to apply eligible drafts into the currently viewed date

This slice does not add:
- provider/model execution
- auto-commit behavior
- non-Daily apply support
- approve/reject UI controls
- new write consumers in `Weekly`, `Vision`, `Life Ledger`, `REACH`, `BizDev`, `Baby KB`, or `Admin`

## Shared Contracts

Updated `@workspace/integration-contracts` with:
- `applied` in `thetaAIDraftReviewStates`
- `applied` and `approval_gated` in the shared review-status enum used by metadata hydration
- `thetaApplyAIDraftBodySchema`
- `ThetaApplyAIDraftBody`
- `thetaApplyAIDraftResponseSchema`
- `ThetaApplyAIDraftResponse`
- nullable `appliedAt`, `appliedBy`, and `appliedTargetRef` on `ThetaAIDraftRecord`

Important correction made during validation:
- `approval_gated` was already a valid AI draft review state, but the shared metadata review-status enum did not include it
- authenticated smoke surfaced that mismatch on non-Daily draft creation
- the shared review-status enum was corrected in-slice so metadata hydration and persisted draft states stay aligned

## Persistence, API, and Generated Client

DB changes:
- added nullable `applied_at`
- added nullable `applied_by`
- added nullable `applied_target_ref`

API changes:
- added `POST /api/ai-drafts/{id}/apply`
- restricted apply to `daily_frame_draft`
- restricted apply eligibility to drafts in `needs_review` or `approved`
- rejected `draft`, `approval_gated`, `rejected`, and `applied` on apply with `409`
- rejected malformed Daily payloads on apply with `422`
- rejected manual transition to `applied` through `/review-state`

Generated surfaces updated:
- `@workspace/api-zod`
- `@workspace/api-client-react`
- new generated `useApplyAiDraft` mutation hook

## Daily UI

Daily was upgraded from read-only AI review to explicit apply-capable review:
- `Apply to today` is shown only for drafts in `needs_review` or `approved`
- `Applied` drafts render as disabled terminal-state items
- successful apply immediately hydrates the local Daily form state from the response
- the Daily frame query, Daily draft list query, and onboarding query are invalidated after apply

All other lane review panels remain read-only in this slice.

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

DB materialization:
- pulled Vercel `Development` env into a temporary file outside the repo
- ran `pnpm --filter @workspace/db run push`
- removed the temporary env file after validation

Authenticated API smoke against a local API server using the Vercel `Development` database:
- created a valid `daily_frame_draft` -> `201`
- applied it to today’s date -> `200`
- verified returned draft moved to `applied`
- verified `appliedAt`, `appliedBy`, and `appliedTargetRef=daily:<date>` were stamped
- verified `GET /api/daily-frames/{date}` returned the applied payload
- verified second apply on the same draft -> `409`
- created and rejected a second Daily draft, then verified apply -> `409`
- created a non-Daily `vision_alignment_draft`, then verified apply -> `409`
- created a malformed `daily_frame_draft` payload, then verified apply -> `422`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Next Action

Implement the second controlled write consumer only after confirming product preference for the next lane.

The cleanest follow-on remains either:
- `REACH` metadata-only apply, or
- `Weekly` explicit apply with the same audit model used here for `Daily`
