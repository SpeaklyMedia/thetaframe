# R3 Local Preview QA Receipt

Date: 2026-04-14

## Scope
- Candidate under test: conservative R3 transport in the canonical repo
- Acceptance gate: `THETAFRAME_R3_NEXT_RUN_QA_CHECKLIST.md`
- QA mode: local preview only, no new design or implementation work during the pass

## Commands Run
- `pnpm --filter @workspace/thetaframe run typecheck` — passed
- `pnpm --filter @workspace/thetaframe run build` — passed
- `pnpm run typecheck` — passed
- `pnpm run build` — passed

## Local Runtime Stack Used
- API server:
  - `PORT=8080 NODE_ENV=development pnpm --filter @workspace/api-server run dev`
- Frontend:
  - `PORT=5173 pnpm --filter @workspace/thetaframe run dev`
- Local same-origin proxy:
  - `127.0.0.1:3100 -> /api/* => 8080, all other paths => 5173`

## Result Summary
- Preflight build/typecheck gate: `PASS`
- Local browser QA gate: `BLOCKED`
- Failure classification: `environment/setup issue`

## Blocking Finding
- The app never progressed beyond `ThetaFrameStartup` on local preview for `/` and `/sign-in`.
- Browser console evidence shows Clerk rejected the local origin:
  - `Clerk: Production Keys are only allowed for domain "mrksylvstr.com".`
  - `API Error: The Request HTTP Origin header must be equal to or a subdomain of the requesting URL.`
- This means the pulled local runtime uses a production Clerk publishable key that will not resolve auth/session state on `127.0.0.1`.

## Acceptance Checklist Status
- Header branding: `NOT EXECUTED`
- Sign-in branding: `NOT EXECUTED`
- Startup loading behavior: `BLOCKED`
  - startup screen renders, but it does not clear locally because Clerk never resolves
- Daily mobile ordering: `NOT EXECUTED`
- Weekly/Vision deduplication: `NOT EXECUTED`
- BizDev/Life Ledger/Reach/Admin top composition: `NOT EXECUTED`
- Route-access regression checks: `NOT EXECUTED`
- Clerk env fallback regression:
  - local runtime still fails hard instead of silently falling back
  - status: `PASS`

## Evidence Captured
- Blocking screenshots:
  - `artifacts/receipts/screenshots/local-root-blocking-state.jpg`
  - `artifacts/receipts/screenshots/local-sign-in-blocking-state.jpg`
- Blocking console finding source:
  - local Playwright capture against `http://127.0.0.1:3100`

## Warnings Observed
- Known non-failing Vite build warnings remain present:
  - sourcemap reporting warnings from `src/components/ui/tooltip.tsx`
  - sourcemap reporting warnings from `src/components/ui/dropdown-menu.tsx`
- These warnings did not fail any build step.

## Outcome
- No R3 transport regression was demonstrated in local build/typecheck.
- Full local browser acceptance could not be completed because the current Clerk publishable key is domain-restricted to `mrksylvstr.com`.
- Next no-drift action for full browser QA is one of:
  - run the acceptance pass against the allowed deployed domain, or
  - use a localhost-compatible Clerk configuration for local preview QA.
