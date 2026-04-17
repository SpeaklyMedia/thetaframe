# C30 Access Lane Framework Hardening

Date: 2026-04-16

## Scope

Implemented the three-level ThetaFrame access framework:
- Admin: role-derived all-access across current modules and future stored rows.
- Select Authorized: Basic defaults plus Admin-assigned optional modules.
- Basic User: default non-admin access to Daily, Weekly, and Vision only.

Changed files for this slice:
- `artifacts/api-server/src/lib/access.ts`
- `artifacts/api-server/src/routes/admin.ts`
- `artifacts/thetaframe/src/pages/admin.tsx`
- `artifacts/thetaframe/src/pages/access-denied.tsx`
- `scripts/src/runThetaFrameBrowserQa.ts`
- `scripts/src/thetaframeBrowserQaPaths.ts`
- `THETAFRAME_UI_REBUILD_ROADMAP.md`
- `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`

Note: the worktree already contained unrelated dirty Baby/Admin work in some of these files. This receipt records only the access-lane hardening changes.

## Implementation Summary

- Added `BASIC_MODULES = ["daily", "weekly", "vision"]`.
- Kept `ALL_MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"]`.
- Replaced the prior "no permission rows means all modules" behavior with Basic defaults for non-admin users.
- Admin remains derived from owner email or Clerk `publicMetadata.role === "admin"` and receives all modules regardless of stored permission rows.
- Non-admin effective permissions now always include Basic modules and add explicit optional module grants on top.
- Admin permission writes and preset applies normalize saved permissions so Basic access is not accidentally removed.
- Standardized presets:
  - `Basic User`
  - `Select Authorized: Core + BizDev`
  - `Select Authorized: Core + Life Ledger`
  - `Select Authorized: Core + REACH`
  - `Select Authorized: Full Non-Admin`
- Standard presets are auto-created on admin preset reads and blocked from deletion.
- Admin UI now labels users as Basic, Select Authorized, or Admin; Basic rows are visible but non-removable.
- Access-denied copy now explains that the lane is outside the current access level and requires Admin assignment.
- Browser QA harness now supports optional route-matrix storage states:
  - `test-results/auth/thetaframe-basic.json`
  - `test-results/auth/thetaframe-select-authorized.json`
  - optional `THETAFRAME_BROWSER_SELECT_AUTHORIZED_MODULES`, defaulting to `life-ledger`

## Access Semantics

Expected effective access after this change:
- New non-admin with no rows: Daily, Weekly, Vision.
- Basic user: Daily, Weekly, Vision; disallowed optional lanes should return access-denied/403 through existing module guards.
- Select Authorized: Daily, Weekly, Vision plus assigned optional modules.
- Admin: all modules plus `/admin`; Baby KB admin tooling remains behind admin routes.
- AI draft lane checks continue to derive accessible lanes from effective module access; no silent AI writes were added.

## Verification

- `pnpm run typecheck`
  - Result: `PASS`
- `pnpm --filter @workspace/api-server run build`
  - Result: `PASS`
- `pnpm --filter @workspace/thetaframe run build`
  - Result: `PASS`
  - Note: Vite emitted the existing sourcemap warnings for `tooltip.tsx` and `dropdown-menu.tsx`, then completed successfully.

## Browser QA

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/access-lanes \
pnpm run qa:browser
```

Result:
- `PASS`
- `passes=12`
- `skips=2`

Skipped checks:
- Basic route matrix skipped because `test-results/auth/thetaframe-basic.json` is not present.
- Select Authorized route matrix skipped because `test-results/auth/thetaframe-select-authorized.json` is not present.

Browser QA caveat:
- This production run validates the updated harness still works, but the local access-code changes are not production-deployed in this receipt.
- The new Basic/Select route-matrix checks are ready to run once dedicated storage states are captured for those roles.
- The harness only captures screenshots on failure, so no successful route-matrix screenshots were produced in this pass.

## Roadmap Sync

Updated:
- `THETAFRAME_UI_REBUILD_ROADMAP.md`
- `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`

The roadmap now records `C30` as access lane hardening complete and keeps paid-lane packaging deferred until after this infrastructure pass.
