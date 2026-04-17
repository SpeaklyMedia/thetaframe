# `C28` Baby-4 AI Assignment Suggestion Drafts

## Scope

Implemented the first `4D` slice for admin-only Baby KB assignment suggestion drafts.

Delivered:
- new AI draft kind: `baby_kb_assignment_draft`
- new admin generation route: `POST /api/admin/baby-kb/assignment-suggestions`
- shared Baby assignment create validation reused by:
  - manual admin assignment create
  - AI draft apply
- `POST /api/ai-drafts/{id}/apply` support for Baby assignment drafts
- Baby-tab AI review panel and per-entry generate controls
- first narrow provider-backed Baby suggestion runtime
- OpenAPI + generated client updates
- environment reference update for AI provider config

## Key Files

- `lib/integrations/shared-contracts/src/ai.ts`
- `artifacts/api-server/src/lib/aiDrafts.ts`
- `artifacts/api-server/src/lib/babyKbAssignments.ts`
- `artifacts/api-server/src/lib/babyKbAssignmentSuggestions.ts`
- `artifacts/api-server/src/routes/admin.ts`
- `artifacts/api-server/src/routes/ai-drafts.ts`
- `artifacts/thetaframe/src/pages/life-ledger.tsx`
- `artifacts/thetaframe/src/lib/ai-draft-review.ts`
- `artifacts/thetaframe/src/lib/ai-draft-mapping.ts`
- `artifacts/thetaframe/src/hooks/use-parent-packet-imports.ts`
- `lib/api-spec/openapi.yaml`
- `VERCEL_ENV_VARS.md`

## Validation

Passed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Production deploy:
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/2q9WPxCJX64RRiy5xbL1cKb41rmc`
- Deployment: `https://thetaframe-6lh6x7nd3-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`

## Runtime Proof

### Production API proof

Verified on `https://thetaframe.mrksylvstr.com` with authenticated admin browser state:

- ineligible unverified entry returns `409`
- provider-unavailable eligible generation returns `503`
  - live error: `OPENAI_API_KEY is not configured for Baby assignment suggestions.`
- seeded `baby_kb_assignment_draft` review/apply path works
  - review-state update returns `200`
  - apply returns `200`
  - returned `babyAssignment` payload included:
    - `id=7`
    - `appliedTargetRef=baby-kb:assignment:7`
    - `projectedEventId=31`

Important qualification:
- the code path is provider-backed and production-ready
- the true model-generated success path is still blocked in production until `OPENAI_API_KEY` is added to Vercel
- to keep the apply path verified anyway, one temporary Baby assignment draft was seeded through the public draft contract, applied successfully, and then fully cleaned back out of production

### Production cleanup after proof

Removed after validation:
- temporary `Verified personal truth` tag on Baby entry `id=1`
- temporary AI draft `ai_drafts.id=35`
- temporary Baby assignment `baby_kb_assignments.id=7`
- temporary projected event `life_ledger_events.id=31`

Post-cleanup verification:
- Baby entry `id=1` tags restored to:
  - `Imported from packet`
  - `Framework`
  - `Parent planning`
- Baby assignment draft count returned to `0`
- Baby assignments for entry `id=1` returned to `[]`

## Notes

- `assertBabyAssignmentSuggestionStillEligible(...)` was hardened so apply no longer rejects its own draft during revalidation.
- Invalid model-shape responses now normalize to generation failure instead of falling through as generic server errors.
- `VERCEL_ENV_VARS.md` now documents:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_BASE_URL`

## Remaining blocker

The only remaining runtime blocker for a true end-to-end model-generated success proof is missing production AI provider config:
- add `OPENAI_API_KEY` in Vercel
- optionally add `OPENAI_MODEL`
- optionally add `OPENAI_BASE_URL`

Once that exists, the new Baby generate button and generation route should be able to mint real `baby_kb_assignment_draft` rows without seeded proof setup.
