# C11 Vision Draft Apply Pipeline

Date: 2026-04-15

## Summary

Extended the existing `POST /api/ai-drafts/{id}/apply` flow to support `vision_alignment_draft -> vision` and upgraded the Vision lane from read-only AI review to explicit review-and-apply controls.

This slice adds:
- shared Vision frame validation and upsert persistence
- shared apply-response support for a returned `visionFrame`
- Vision-only UI upgrade from read-only review to explicit approve/reject/apply review

This slice does not add:
- new endpoints
- new review states
- DB schema changes
- non-Daily/non-Weekly/non-Vision write consumers
- provider/model execution
- apply controls in `Life Ledger`, `REACH`, `BizDev`, `Baby KB`, or `Admin`

## Shared Contracts

Updated `@workspace/integration-contracts` `ai` module to:
- preserve the existing shared apply endpoint/body pattern
- allow empty apply bodies so `Vision` can apply against the singleton user frame
- add the applied Vision frame schema used in the shared apply response
- extend `ThetaApplyAIDraftResponse` with `visionFrame`

Apply behavior after `C11`:
- `date` is still used by `daily_frame_draft`
- `weekStart` is still used by `weekly_frame_draft`
- `vision_alignment_draft` now applies with no target remapping field
- all three continue returning the same top-level `draft` plus applied lane object response pattern

## API, Helpers, and UI

Server changes:
- extracted `artifacts/api-server/src/lib/visionFrames.ts`
- updated `vision-frames` routes to reuse the shared Vision validation/upsert helper
- extended `/api/ai-drafts/{id}/apply` to support `vision_alignment_draft`
- kept malformed stored Vision payloads on `422`
- kept non-Daily/non-Weekly/non-Vision draft kinds on `409`

Vision UI changes:
- Vision review panel now exposes explicit review controls
- `approval_gated` and `needs_review` drafts show `Approve` and `Reject`
- `approved` drafts show `Reject` and `Apply to vision`
- successful apply immediately hydrates local Vision state from the response
- applied Vision drafts render as disabled terminal-state items
- action failures render inline without hiding the draft list

Daily and Weekly compatibility:
- existing Daily and Weekly apply behavior is unchanged
- the shared apply route now returns `visionFrame` only when Vision is the applied target

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

Not completed in this turn:
- authenticated API smoke for Vision apply
- manual browser UI verification of Vision approve/apply interactions

## Next Action

Choose the next controlled write consumer deliberately.

The cleanest follow-on is now either:
- `REACH` metadata-only apply, or
- `Life Ledger` classification apply scoped to one tab surface at a time
