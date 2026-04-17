# C36 Workspace Color Palette And Button Clarity

Date: 2026-04-17
Status: `CLOSED / PRODUCTION PROOF PASSED`

## Scope

Implemented a UI-only workspace palette and control clarity pass:

- Daily color picker now updates the user's persisted `userMode.colourState`
- shared Layout reads `userMode.colourState` and exposes `data-workspace-colour`
- signed-out/public pages remain neutral
- existing lane atmosphere remains active through `data-lane`
- workspace color adds subtle page/header tint and action accent variables
- shared Button styling is stronger for real actions
- Basic Start Here guide tiles now visually separate the card from the real action control
- Basic step order blocks read as informational, not button-like

No backend schema, access, privacy, paid-lane, AI provider, AI write, or data ownership behavior was changed.

## Changed Files

- `_AI_SYSTEM/NEURODIVERGENT_INTERFACE_GUIDE.md`
- `_AI_SYSTEM/THETAFRAME_CURRENT_TRUTH.md`
- `_AI_SYSTEM/RECEIPT_INDEX.md`
- `artifacts/thetaframe/src/lib/colors.ts`
- `artifacts/thetaframe/src/components/layout.tsx`
- `artifacts/thetaframe/src/components/ui/button.tsx`
- `artifacts/thetaframe/src/components/basic-guidance.tsx`
- `artifacts/thetaframe/src/pages/daily.tsx`
- `artifacts/thetaframe/src/index.css`
- `scripts/src/runThetaFrameBrowserQa.ts`

## Static Checks

- `git diff --check` on touched C36 files: `PASS`
- `pnpm --filter @workspace/scripts run typecheck`: `PASS`
- `pnpm --filter @workspace/thetaframe run typecheck`: `PASS`
- `pnpm run typecheck`: `PASS`
- `pnpm --filter @workspace/thetaframe run build`: `PASS`

Build notes:

- Vite emitted existing sourcemap warnings for UI wrapper files.
- Vite emitted the existing large chunk warning.
- Build completed successfully.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Result:

- status: `READY`
- deployment URL: `https://thetaframe-dd2d9li5b-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/4JLaAUg7z8JPMk2pS3NCLsnFVyXB`
- Vercel alias reported: `https://thetaframe.vercel.app`
- proof target: `https://thetaframe.mrksylvstr.com`

## Browser QA

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c36-workspace-color-buttons \
pnpm run qa:browser
```

Result:

- `PASS`
- `passes=15`
- `skips=0`

Proof covered:

- signed-out landing exposes `data-workspace-colour="neutral"`
- Daily color buttons update layout `data-workspace-colour` for green, yellow, red, blue, and purple
- selected workspace color persists from Daily to Weekly and Vision
- lane route background still exposes `data-lane`
- Start Here, Daily, Weekly, and Vision screenshots show stronger real buttons than cards/blocks
- full browser matrix passes with `passes=15`, `skips=0`

Evidence screenshots:

- `scripts/test-results/thetaframe-browser-qa/c36-workspace-color-buttons/c36-basic-guide-desktop.png`
- `scripts/test-results/thetaframe-browser-qa/c36-workspace-color-buttons/c36-basic-guide-mobile.png`
- `scripts/test-results/thetaframe-browser-qa/c36-workspace-color-buttons/c36-basic-daily-purple-workspace.png`
- `scripts/test-results/thetaframe-browser-qa/c36-workspace-color-buttons/c36-basic-weekly-purple-workspace.png`
- `scripts/test-results/thetaframe-browser-qa/c36-workspace-color-buttons/c36-basic-vision-mobile-purple-workspace.png`

## Notes

- Daily writes both the Daily frame color and the global user mode color on color selection.
- Header mode changes continue to use the same user mode source, so the workspace palette remains one shared signed-in state.
- Browser QA intentionally leaves the Basic QA account's workspace color as `purple` after checking all five colors.
- The dirty worktree was preserved; unrelated files were not reverted or reformatted.
