# C49 Marketing Theta Hero And Task Color Scaffold

Date: 2026-04-18
Status: PASS

## Scope

Added a signed-out marketing pass that frames ThetaFrame as a stress-to-calm habit-design workspace. Added the supplied screamer artwork crossfade, a theta-symbol favicon, evidence-forward theta-state positioning on Home/Auth, and a frontend-only Daily task feeling color scaffold.

No backend, API, auth, database, AI, or persisted task-field changes were made.

Implementation commit:

- `f55a8389ff05fdc5af652b905fe7a45d60f69c04` (`Add marketing theta hero and task color scaffold`)

## Product Result

Marketing assets:

- Added `/marketing/screamer-stress.webp`.
- Added `/marketing/screamer-beach-chair.webp`.
- Added `artifacts/thetaframe/public/marketing/marketing-asset-notes.md`.
- Source PNGs were downloaded from the supplied Google Drive links, converted with ImageMagick, and not committed.

Home/Auth:

- Home now uses a full-bleed public hero with a 6-second stress-to-calm crossfade:
  - `0s-1.5s`: stress screamer visible;
  - `1.5s-2.0s`: fade transition;
  - `2.0s-6.0s`: beach chair state visible.
- Reduced-motion mode suppresses the stress animation and shows the calm state.
- Home, Sign In, and Sign Up share evidence-forward theta-state positioning.
- Copy avoids medical, hypnosis, sleep-manipulation, and guaranteed behavior-change claims.

Favicon:

- Replaced `/favicon.svg` with a clean theta-symbol mark using Brand Midnight and Phi Teal.

Daily task feeling scaffold:

- Added frontend-only task feeling color controls for Daily Tier A and Tier B task rows.
- Supported colors: `green`, `yellow`, `red`, `blue`, `purple`.
- Row color transitions back toward calm green over about 18 seconds.
- Task feeling color is local React state only and is not persisted into task JSON.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Deployment:

- status: `READY`
- deployment id: `dpl_7aEDue7rD5igppHv4MePF3XjyiWe`
- deployment URL: `https://thetaframe-jnghqjqn3-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/7aEDue7rD5igppHv4MePF3XjyiWe`
- canonical production target: `https://thetaframe.mrksylvstr.com`

## Verification

Static/build:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
git diff --check
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- `git diff --check`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Production smoke:

- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `{"status":"ok"}`
- `GET https://thetaframe.mrksylvstr.com/marketing/screamer-stress.webp`: `HTTP 200`, `content-type: image/webp`
- `GET https://thetaframe.mrksylvstr.com/favicon.svg`: `HTTP 200`, `content-type: image/svg+xml`

Production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c49-marketing-theta-hero \
pnpm run qa:browser
```

Result:

- `passes=16`
- `skips=0`

Focused visual checks:

- Desktop Home screenshot captured: `scripts/test-results/thetaframe-browser-qa/c49-focused-visual/desktop-home.png`
- Mobile Home screenshot captured: `scripts/test-results/thetaframe-browser-qa/c49-focused-visual/mobile-home.png`
- Reduced-motion Home screenshot captured: `scripts/test-results/thetaframe-browser-qa/c49-focused-visual/desktop-home-reduced-motion.png`
- Daily task feeling screenshot captured: `test-results/thetaframe-browser-qa/c49-focused-visual/daily-task-feeling-red.png`
- Daily task feeling check created a temporary Basic test-account row because none existed, selected `red`, verified `data-task-feeling="red"`, captured evidence, then removed the temporary row.

## Git Hygiene

Committed durable source, optimized marketing assets, QA harness changes, and AI-system docs only.

Excluded local/transient artifact classes:

- raw downloaded PNGs;
- `.env*`;
- `.vercel/`;
- auth storage state JSON;
- root `test-results/`;
- `scripts/test-results/`;
- build output;
- `dist`;
- `node_modules`;
- `*.tsbuildinfo`;
- raw screenshot directories;
- extracted transport folders;
- zip bundles.

## Decision

C49 is live in production. The signed-out surface now explains the stress-to-calm LIFEos positioning more clearly, the favicon is a clean theta symbol, and Daily has a non-persisted task feeling color scaffold ready for later product validation.
