# C10 Daily and Weekly Review Controls

Date: 2026-04-15
Status: COMPLETE

## Summary

This slice upgrades the existing Daily and Weekly AI draft review panels from apply-only to explicit review controls. Users can now approve or reject eligible drafts in `Daily` and `Weekly` before optionally applying them.

No backend, database, OpenAPI, or generated-client changes were required for this slice. `C10` consumes the existing `PATCH /api/ai-drafts/{id}/review-state` route and existing generated React hooks from `C7`.

## Scope

Visible UI changes:
- `Daily` draft panel now supports `Approve`, `Reject`, and `Apply to today`
- `Weekly` draft panel now supports `Approve`, `Reject`, and `Apply to this week`
- Action failures now render inline without replacing the draft list

Out of scope and unchanged:
- `Vision`, `Life Ledger`, `REACH`, `BizDev`, `Baby KB`, and `Admin` remain read-only
- no new review states
- no new API routes
- no DB schema changes
- no provider execution, assistant runtime, or auto-commit behavior

## Files Updated

Frontend review surface:
- `artifacts/thetaframe/src/components/shell/AIDraftReviewPanel.tsx`
- `artifacts/thetaframe/src/pages/daily.tsx`
- `artifacts/thetaframe/src/pages/weekly.tsx`

## Behavior

### Daily
- `needs_review` drafts show `Approve`, `Reject`, and `Apply to today`
- `approved` drafts show `Reject` and `Apply to today`
- `rejected` drafts render a disabled `Rejected` state
- `applied` drafts render a disabled `Applied` state

### Weekly
- `needs_review` drafts show `Approve`, `Reject`, and `Apply to this week`
- `approved` drafts show `Reject` and `Apply to this week`
- `rejected` drafts render a disabled `Rejected` state
- `applied` drafts render a disabled `Applied` state

### Error handling
- load failures still use the panel-level error state
- action failures now render inline and preserve the visible draft list

## Validation

Commands run:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
```

Results:
- `pnpm run typecheck` passed
- `pnpm --filter @workspace/thetaframe run build` passed

Expected non-failing build noise:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Notes

- This slice depends on the existing `useUpdateAiDraftReviewState` generated client hook.
- No manual browser QA was run in this slice; validation was compile/build-only.
- Other lanes remain intentionally unchanged until a later write-consumer or review-control slice explicitly targets them.
