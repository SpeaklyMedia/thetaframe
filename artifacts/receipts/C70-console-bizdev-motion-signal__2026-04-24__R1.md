# C70 Console BizDev Motion Signal

Date: 2026-04-24
Status: Production complete

## Summary

C70 adds one narrow optional-lane support signal to `/console`: `FollowUps Motion`.

The new module stays read-only, conditional, and subordinate to the existing support rail hierarchy. It reuses only existing FollowUps list truth plus existing phase-summary truth, keeps `/dashboard` as the default signed-in home, and adds no new route, API, schema, or write path.

## Delivered

- Added one conditional `FollowUps Motion` module below `REACH Capture` in the existing Console support rail.
- Reused the existing FollowUps list read and the existing FollowUps phase-summary read.
- Locked visibility to current-session FollowUps truth only:
  - hidden when `canBizdev` is false
  - hidden when FollowUps has no rows and `summary.total === 0`
  - shown when FollowUps has rows and/or non-zero phase-summary truth
- Kept the module read-only and compact:
  - title `FollowUps Motion`
  - short read-only follow-up snapshot support line
  - phase chips for `Needs attention`, `Soon`, and `Later` only when their counts are non-zero
  - up to 2 follow-up rows
  - one CTA back to `/bizdev`
- Locked row content to calm operational truth only:
  - person/organization name
  - phase label
  - one short support line from `nextAction`, `humanStatus`, `blocker`, or fallback copy
  - reminder date when present
- Preserved the no-drift contract:
  - no edit/delete controls
  - no reminder transport controls
  - no money totals or pipeline dashboards
  - no charts, rings, or segmented bars
- Extended production browser QA so FollowUps Motion proof is data-aware instead of assuming the module is always visible.

## Unchanged

- `/dashboard` remains the default signed-in home
- `/console` remains additive and read-only
- no new route, API, schema, migration, OpenAPI/codegen, or write path
- no permission-model change
- no Console home-switch or broader module-family expansion

## Verification

Static and build:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts run typecheck`
- `pnpm --filter @workspace/thetaframe run build`

Production:

- `vercel pull --yes --environment=production --scope marks-projects-f03fd1cc`
- `vercel build --prod --yes --scope marks-projects-f03fd1cc`
- `vercel deploy --prebuilt --prod --yes --scope marks-projects-f03fd1cc`
- deploy id: `dpl_2EjjYKBraa13UntWsKc5FZE1fHfw`
- health: `curl -sS https://thetaframe.mrksylvstr.com/api/healthz` -> `{"status":"ok"}`

Browser proof:

- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c70-console-bizdev-motion-signal pnpm run qa:browser`
- result: `passes=19`, `skips=0`
- Console viewport manifest:
  - `test-results/thetaframe-browser-qa/c70-console-bizdev-motion-signal/c70-console-viewport-manifest.json`

Proof coverage includes:

- FollowUps Motion stays hidden for sessions without FollowUps access
- FollowUps Motion stays hidden when FollowUps has no rows and no phase-summary truth
- FollowUps Motion renders when live FollowUps list or summary truth is present
- visible FollowUps Motion states preserve CTA visibility and support-rail fit across:
  - `360x800`
  - `390x844`
  - `414x896`
  - `820x1180`
  - `2752x2064`
  - `1920x1080`
  - `5120x2160`
  - `5120x1440`
  - `6400x1800`

## Durable Context Updated

- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/EXECUTIVE_CONSOLE_CONTRACT.md`
- `_AI_SYSTEM/RECEIPT_INDEX.md`

## Notes

- The first prebuilt deploy produced a blank signed-out shell because the client bundle missed `VITE_CLERK_PUBLISHABLE_KEY`.
- Rebuilding with the pulled production env explicitly exported into `vercel build` fixed the public-shell regression before the final deploy and production browser proof.
