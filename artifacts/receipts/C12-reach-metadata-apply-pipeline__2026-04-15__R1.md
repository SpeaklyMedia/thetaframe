# C12 REACH Metadata Apply Pipeline

Date: 2026-04-15

## Summary

Implemented the next controlled write consumer by extending the shared `POST /api/ai-drafts/{id}/apply` flow to support `reach_file_summary -> reach` as a metadata-only apply.

This slice adds:
- shared REACH metadata apply validation and persistence
- shared apply-body support for `reachFileId`
- shared apply-response support for a returned `reachFile`
- REACH UI upgrade from read-only review to explicit review-and-metadata-apply

This slice does not add:
- new endpoints
- DB schema changes
- file creation through AI drafts
- object storage mutation or file replacement
- non-Daily/non-Weekly/non-Vision/non-REACH write consumers
- provider/model execution

## Shared Contracts

Updated `@workspace/integration-contracts` `ai` module to:
- add `reachFileId` to the shared apply body
- add the applied REACH file schema used in the shared apply response
- extend `ThetaApplyAIDraftResponse` with `reachFile`

Apply behavior after `C12`:
- `date` is still used by `daily_frame_draft`
- `weekStart` is still used by `weekly_frame_draft`
- `vision_alignment_draft` still applies against the singleton Vision frame
- `reach_file_summary` now applies against an explicit `reachFileId`
- all supported apply consumers continue returning the same top-level `draft` plus applied lane object response pattern

## API, Helpers, and UI

Server changes:
- added `artifacts/api-server/src/lib/reachFiles.ts`
- extended `/api/ai-drafts/{id}/apply` to support `reach_file_summary`
- restricted REACH apply to metadata-only notes updates on an existing owned file
- required `reachFileId` in the apply body for REACH drafts
- treated malformed stored REACH payloads as `422`
- treated missing target REACH files as `404`
- kept non-supported draft kinds on `409`

REACH UI changes:
- REACH review panel now exposes `Approve`, `Reject`, and `Apply to source file`
- apply is only enabled when the draft resolves to an existing file
- draft-to-file resolution prefers:
  - `proposedPayload.reachFileId`
  - numeric `reach_file` source refs
  - prefixed `reach-file:<id>` style refs
  - `reach_file` source refs that carry the file `objectPath`
- unresolved drafts stay visible but disable apply with a clear unavailable state
- successful apply updates the cached REACH file list and AI draft list
- action failures render inline without hiding the draft list

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
- authenticated API smoke for REACH apply
- manual browser UI verification of REACH approve/apply interactions

## Next Action

The cleanest follow-on is now `Life Ledger` with one tab-scoped apply surface at a time, starting with `events` or `people`, because the frame-style and metadata-only consumers are now covered in `Daily`, `Weekly`, `Vision`, and `REACH`.
