# C9 Weekly Draft Apply Pipeline

Date: 2026-04-15

## Summary

Extended the existing `POST /api/ai-drafts/{id}/apply` flow to support `weekly_frame_draft -> weekly` without changing the Daily apply behavior added in `C8`.

This slice adds:
- shared Weekly frame validation and upsert persistence
- shared apply-body support for `weekStart`
- shared apply-response support for a returned `weeklyFrame`
- Weekly-only UI upgrade from read-only review to explicit apply review

This slice does not add:
- new endpoints
- new review states
- non-Daily/non-Weekly write consumers
- approve/reject UI controls
- provider/model execution

## Shared Contracts

Updated `@workspace/integration-contracts` `ai` module to:
- allow `ThetaApplyAIDraftBody` to carry `date` or `weekStart`
- add the applied Weekly frame schema used in the shared apply response
- preserve the existing `applied` audit state from `C8`

Apply contract behavior after `C9`:
- `date` is used by `daily_frame_draft`
- `weekStart` is used by `weekly_frame_draft`
- both still return the same top-level `draft` plus applied lane object response pattern

## API, Helpers, and UI

Server changes:
- extracted `artifacts/api-server/src/lib/weeklyFrames.ts`
- updated `weekly-frames` routes to reuse the shared Weekly validation/upsert helper
- extended `/api/ai-drafts/{id}/apply` to support `weekly_frame_draft`
- kept non-Daily/non-Weekly draft kinds on `409`
- kept malformed stored Weekly payloads on `422`

Weekly UI changes:
- Weekly review panel now exposes `Apply to this week` for drafts in `needs_review` or `approved`
- successful apply immediately hydrates local Weekly state from the response
- applied Weekly drafts render as disabled terminal-state items

Daily compatibility:
- Daily still uses the same shared apply route
- Daily now tolerates the broader shared response shape while preserving the same UX

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

DB validation:
- pulled Vercel `Development` env into a temporary file outside the repo
- ran `pnpm --filter @workspace/db run push`
- result: `No changes detected`
- removed the temporary env file after validation

Authenticated API smoke against a local API server using the Vercel `Development` database:
- created a valid `daily_frame_draft` -> `201`
- applied Daily after the request-body expansion -> `200`
- created a valid `weekly_frame_draft` -> `201`
- applied it to the current `weekStart` -> `200`
- verified returned draft moved to `applied`
- verified `appliedAt`, `appliedBy`, and `appliedTargetRef=weekly:<weekStart>` were stamped
- verified `GET /api/weekly-frames/{weekStart}` returned the applied payload
- verified second Weekly apply -> `409`
- created and rejected a second Weekly draft, then verified apply -> `409`
- created a malformed Weekly draft payload, then verified apply -> `422`
- created a non-Daily/non-Weekly draft and verified apply -> `409`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Next Action

Choose the third controlled write consumer deliberately.

The cleanest follow-on is now either:
- `REACH` metadata-only apply, or
- a separate approval/reject UI slice across the already-writable `Daily` and `Weekly` consumers
