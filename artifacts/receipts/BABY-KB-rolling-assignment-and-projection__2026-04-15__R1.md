# Baby KB Rolling Assignment and Projection

Date: 2026-04-15

## Summary
- Kept Baby KB admin-only inside Life Ledger
- Added durable `baby_kb_assignments` persistence and runtime schema guards
- Added admin assignment create/list/update routes
- Projected Baby assignments into Life Ledger `events` as the dated execution surface
- Added baby-derived hero consequence cards to Daily, Weekly, and Vision
- Updated roadmap docs to place Baby display refresh now, rolling reminders in `4B`, and AI-assisted Baby assignment in `4D`

## Implemented Surfaces
- DB/schema:
  - `lib/db/src/schema/baby-kb-assignments.ts`
  - `lib/db/src/schema/life-ledger.ts`
- API/server:
  - `artifacts/api-server/src/lib/babyKbAssignments.ts`
  - `artifacts/api-server/src/routes/admin.ts`
  - `artifacts/api-server/src/routes/life-ledger.ts`
- Frontend:
  - `artifacts/thetaframe/src/hooks/use-parent-packet-imports.ts`
  - `artifacts/thetaframe/src/pages/life-ledger.tsx`
  - `artifacts/thetaframe/src/components/shell/BabyHeroConsequencesCard.tsx`
  - `artifacts/thetaframe/src/pages/daily.tsx`
  - `artifacts/thetaframe/src/pages/weekly.tsx`
  - `artifacts/thetaframe/src/pages/vision.tsx`

## Behavior
- Baby review cards now support:
  - assign to account
  - edit assignment
  - schedule event
  - mark in motion
  - complete
  - supersede
- Baby top-of-tab layout now shows:
  - summary tiles
  - rolling timeline buckets
  - subordinate import/provenance summary
- Assignment projection writes to Life Ledger `events`
- Projected Baby events automatically feed:
  - `Next 90 Days`
  - Daily due-soon hero card
  - Weekly this-week hero card
  - Vision milestone-window hero card

## Guardrails Preserved
- Baby KB remains admin-only and inside Life Ledger
- Daily / Weekly / Vision remain consequence surfaces, not Baby storage
- Existing REACH provenance and parent-packet linkage remain intact
- Existing direct Daily / Weekly / Vision promotion path is still available

## Validation
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Notes:
- Frontend build still emits the existing non-failing sourcemap warnings in `tooltip.tsx` and `dropdown-menu.tsx`
- Frontend build still emits the existing chunk-size warning
- No DB push was run in this slice; runtime schema guards were added for the new assignment table and Baby event projection columns

## Follow-on
- Run `pnpm --filter @workspace/db run push` against the target database
- Smoke-test admin Baby assignment flow against a real dev database
- Add approval-gated AI suggestions for Baby assignment/scheduling only after the broader `4D` layer is ready
