# C66 Weekly Step Completion Truth

Date: 2026-04-24
Status: Production complete

## Summary

C66 makes the Console `Week Vector` completion ring fully truthful by hardening Weekly step completion end-to-end.

This slice adds persisted `completed` truth to Weekly protected steps, exposes that field through the Weekly API and generated client types, adds a minimal completion toggle in `/weekly`, and keeps the Console ring read-only while making it reflect real Weekly completion.

`/dashboard` remains the default signed-in home.

## Delivered

- Extended the Weekly contract so `WeeklyStep` now carries `completed: boolean`.
- Normalized legacy Weekly rows and incoming legacy Weekly payloads forward with `completed=false`.
- Kept Weekly `nonNegotiables` as non-completable supports that always round-trip with `completed=false`.
- Added inline Weekly protected-step checkboxes in `/weekly`.
- Updated Console `Week Vector` so the completion ring reads true saved Weekly completion.
- Updated compatibility helpers used by:
  - Weekly AI draft apply
  - Dashboard brain-dump Weekly context/draft generation
  - Baby KB weekly promotion helpers
- Refreshed the browser harness so C66 proof includes one explicit Weekly-toggle-to-Console-ring follow-through assertion and a C66 viewport manifest.

## Compatibility Rules

- Existing Weekly rows without `completed` are read back with `completed=false`.
- Existing Weekly AI draft payloads without `completed` still validate and apply with `completed=false`.
- Weekly routes stay the same:
  - `GET /weekly-frames`
  - `GET /weekly-frames/:weekStart`
  - `POST /weekly-frames`
  - `PUT /weekly-frames/:weekStart`
- No new endpoint or query key was added.

## Unchanged

- `/dashboard` remains the default signed-in home
- `/console` remains read-only for Weekly completion
- `nonNegotiables` remain supports, not completable tasks
- no new Console modules or chart families shipped in this slice

## Verification

Static and build:

- `git diff --check`
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Database:

- `pnpm --filter @workspace/db run push`
- result: applied cleanly against the current production schema; no separate route or table was added because Weekly completion lives inside the existing `weekly_frames.steps` JSON contract

Production:

- deploy id: `dpl_5a87yhDcQv2i9zDfL3eaPdVy21zp`
- health: `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` -> `{"status":"ok"}`

Browser proof:

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=scripts/test-results/thetaframe-browser-qa/c66-weekly-step-completion-truth pnpm run qa:browser`
- result: `passes=19`, `skips=0`
- Console viewport manifest:
  - `scripts/test-results/thetaframe-browser-qa/c66-weekly-step-completion-truth/c66-console-viewport-manifest.json`

Proof coverage includes:

- Weekly step completion toggle persists across reload
- Console `Week Vector` ring changes after the Weekly toggle
- proof state is restored after the Weekly mutation check
