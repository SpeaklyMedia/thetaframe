# ThetaFrame R3 Next-Run QA Checklist

Date: 2026-04-14

Use this checklist for the next QA/browser pass after the conservative R3 transport into the canonical repo.

## Preflight
- Run `pnpm --filter @workspace/thetaframe run typecheck`
- Run `pnpm --filter @workspace/thetaframe run build`
- Run `pnpm run typecheck`
- Run `pnpm run build`

## Must-Pass UI Checks
- Header:
  - phi-crop mark renders on all breakpoints
  - wordmark is hidden on extra-small screens and visible on `sm+`
- Sign-in:
  - primary brand splash renders above the Clerk form
  - tagline `Drop In · Rewire · Rise` is visible
  - sign-in flow still works normally
- Startup loading:
  - `ThetaFrameStartup` appears during cold auth/session loading
  - it does not appear on ordinary route changes
  - permission/data loading still uses the existing skeleton path
- Daily:
  - hero renders before all helper/onboarding cards
  - emotion picker lives in the primary action island
  - support rail appears directly below the action island
  - mobile document order is:
    - hero
    - emotion action island
    - support rail
    - helper/onboarding cards
    - remaining content
  - `data-testid="text-daily-title"` still resolves on the heading
- Weekly:
  - top composition renders as hero + primary action island + support rail
  - weekly theme appears only once
- Vision:
  - top composition renders as hero + primary action island + support rail
  - vision goals appear only once
  - next visible steps remain a separate standalone section
- BizDev:
  - new top composition renders without breaking the existing `New Lead` action
- Life Ledger:
  - new top composition renders without breaking tab behavior or Baby KB access rules
- REACH:
  - new top composition renders without breaking upload/search/import flows
- Admin:
  - compact hero renders without breaking user search, selection, or permission editing

## Regression Checks
- No route regressions on:
  - `/daily`
  - `/weekly`
  - `/vision`
  - `/bizdev`
  - `/life-ledger`
  - `/reach`
  - `/admin`
- No auth/env contract regression:
  - missing Clerk publishable key still fails as before
  - no `clerk-disabled` fallback behavior was introduced
- No product contract regression:
  - Baby KB remains inside Life Ledger
  - no top-level Baby KB route
  - no assistant UI expansion or trust-chip transport was introduced
  - no sign-up branding changes were introduced
  - no route-transition loading animation was introduced

## Evidence To Capture
- signed-out screenshot
- sign-in screenshot
- daily desktop screenshot
- daily mobile screenshot
- weekly desktop screenshot
- vision desktop screenshot
- short run receipt with:
  - commands run
  - pass/fail result
  - any warnings observed

## Known Build Noise
- Vite may emit sourcemap reporting warnings from:
  - `src/components/ui/tooltip.tsx`
  - `src/components/ui/dropdown-menu.tsx`
- These warnings do not fail the build and were present during the conservative R3 transport verification.
