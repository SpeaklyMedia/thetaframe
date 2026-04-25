# C62 Console Stretch Validation And Wide-Surface Tuning

Date: 2026-04-23
Status: Shipped

## Summary

C62 re-proves the tokenized Console on production and adds one centered-first stretch validation surface.

This slice keeps `/dashboard` as the default signed-in home, keeps the live Console module set intact, and records the refreshed post-hardening viewport evidence.

## Scope Delivered

Implemented:

- `C62` viewport manifest and screenshot naming in the authenticated browser harness
- one added stretch validation surface at `6400x1800`
- centered-first hierarchy thresholds for the stretch surface
- refreshed production proof over the live tokenized Console

Intentionally unchanged:

- no new routes
- no API, schema, migration, or write-path change
- no new module behavior
- no orbit-edge secondary layout
- no Dashboard-to-Console home switch

## Runtime And QA Changes

Primary files:

- `scripts/src/runThetaFrameBrowserQa.ts`
- `artifacts/thetaframe/src/pages/console.tsx`

Proof surfaces passed:

- `360x800`
- `390x844`
- `414x896`
- `820x1180`
- `2752x2064`
- `1920x1080`
- `5120x2160`
- `5120x1440`
- `6400x1800`

Evidence directory:

- `scripts/test-results/thetaframe-browser-qa/c62-console-brand-hardening-and-stretch-validation`

Viewport manifest:

- `scripts/test-results/thetaframe-browser-qa/c62-console-brand-hardening-and-stretch-validation/c62-console-viewport-manifest.json`

## Verification

Static/build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Production deploy:

- env refresh:
  - `vercel pull --yes --environment production --scope marks-projects-f03fd1cc`
- final build method:
  - `vercel build --prod --yes --scope marks-projects-f03fd1cc`
- final deploy method:
  - `vercel deploy --prebuilt --prod --yes --scope marks-projects-f03fd1cc`
- final deployment id:
  - `dpl_2kVgAg7Vv7szUnC1yNHnAebQdYoN`
- final deployment url:
  - `https://thetaframe-q09gl9ksh-marks-projects-f03fd1cc.vercel.app`
- production health:
  - `curl -sS https://thetaframe.mrksylvstr.com/api/healthz`
  - result: `{"status":"ok"}`

Browser QA:

- command:
  - `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c62-console-brand-hardening-and-stretch-validation pnpm run qa:browser`
- result:
  - `passes=19`
  - `skips=0`

Deploy note:

- one intermediate prebuilt deploy produced the blank ThetaFrame loading shell on the public home because `vercel build` was started in parallel with `vercel pull`
- the final shipped build reran the env refresh first, rebuilt sequentially, redeployed, and restored the public signed-out shell before final QA

## Outcome

C62 proves the tokenized Console still holds its hierarchy and centered reading field on production after brand hardening, including the added stretch surface.

The product decision remains unchanged:

- `/dashboard` stays the default signed-in home
- `/console` remains an additive orientation surface
