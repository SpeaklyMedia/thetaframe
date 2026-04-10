# Thetaframe Systems Report

Date: 2026-04-10

## Workspace Inventory

- Repo root: `thetaframe/`
- Workspace packages:
  - `artifacts/api-server`
  - `artifacts/mockup-sandbox`
  - `artifacts/thetaframe`
  - `lib/api-client-react`
  - `lib/api-spec`
  - `lib/api-zod`
  - `lib/db`
  - `scripts`
- Root scripts:
  - `pnpm run typecheck:libs`
  - `pnpm run typecheck`
  - `pnpm run build`

## Verified Build and Deploy Entry Points

- Root install: `pnpm install --frozen-lockfile`
- Root library typecheck: `pnpm run typecheck:libs`
- Root workspace typecheck: `pnpm run typecheck`
- Root workspace build: `pnpm run build`
- Deploy-facing build steps:
  - `pnpm --filter @workspace/api-spec run codegen`
  - `pnpm --filter @workspace/api-server run build`
  - `pnpm --filter @workspace/thetaframe run build`

## Findings

### Confirmed and Fixed

- `artifacts/api-server/src/routes/me.ts` inserted default access rows without the required `grantedBy` field from `accessPermissionsTable`.
  - Impact: `pnpm run typecheck` failed in `@workspace/api-server`.
  - Fix: default bootstrap grants now record `grantedBy: "system:auto-bootstrap"`.

- `artifacts/mockup-sandbox/vite.config.ts` required `PORT` and `BASE_PATH` even for production builds.
  - Impact: `pnpm run build` failed in `@workspace/mockup-sandbox` under normal CI/build conditions.
  - Fix: build-safe defaults now match the main app behavior:
    - `PORT` defaults to `5173`
    - `BASE_PATH` defaults to `/`
    - invalid `PORT` is still rejected when explicitly provided

- `vercel.json` ran `pnpm --filter @workspace/db run push` during the build.
  - Impact: deploy builds were coupled to a live `DATABASE_URL` and attempted schema mutation as part of build.
  - Fix: removed DB push from the Vercel build command and switched install to `pnpm install --frozen-lockfile`.

### Confirmed Current State

- Git worktree was clean before implementation.
- `pnpm-lock.yaml` is present with `lockfileVersion: '9.0'`.
- Local validation succeeded using `pnpm 10.33.0`.
- Generated API client and zod outputs are repo-owned and can be refreshed by `@workspace/api-spec` codegen.

### Remaining External Prerequisites

- Database migrations or schema pushes still require `DATABASE_URL` and should run in an explicit migration step, not inside Vercel build.
- Any runtime-only environment variables for the API server still need to be provided by the deployment platform.

## Validation Results

Verified successfully:

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck:libs`
- `pnpm run typecheck`
- `pnpm run build`
- Sequential deploy-path validation:
  - `pnpm --filter @workspace/api-spec run codegen`
  - `pnpm --filter @workspace/api-server run build`
  - `pnpm --filter @workspace/thetaframe run build`

Known invalid previous behavior:

- `pnpm --filter @workspace/db run push` fails without `DATABASE_URL` by design and should not be part of the static build pipeline.
