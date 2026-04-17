# C41 Start Here Bottom Clip Follow-Up

Date: 2026-04-17
Status: PASS

## Scope

Fixed the remaining Start Here visual fit issue after C40: the separate AI note panel could still appear partially clipped at the bottom of the modal viewport. The AI trust copy now lives in the Start Here intro sentence, and the modal restart actions use shorter visible labels while keeping the fuller descriptions available to assistive technology.

No backend, schema, API, data contract, auth, or AI provider behavior changed.

Source commits:

- `b9ec279 Remove clipped Start Here AI note`
- `15fae31 Shorten Start Here modal action labels`

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Deployment:

- status: `READY`
- deployment id: `dpl_2K7gDH1x2MeurCRT7ZdHmyxDskQP`
- deployment URL: `https://thetaframe-ecu1iyf7p-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/2K7gDH1x2MeurCRT7ZdHmyxDskQP`
- canonical production target: `https://thetaframe.mrksylvstr.com`

Custom domain smoke:

- `GET https://thetaframe.mrksylvstr.com/`: `HTTP 200`
- root last-modified: `Fri, 17 Apr 2026 22:23:18 GMT`
- deployed assets:
  - `/assets/index-BQhhOmhk.js`
  - `/assets/index-BvHQz33y.css`
- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `HTTP 200`
- health body: `{"status":"ok"}`

## Verification

Static/build:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Automated production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c41-start-here-no-bottom-clip \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`

Headed Chrome full-suite signoff:

- BLOCKED by the known local Chrome context-close issue during the authenticated dashboard check.
- Error class: `page.goto: Target page, context or browser has been closed`.
- Classification: local headed browser-lifetime issue, not a production product failure, because automated production QA passed and focused headed visual capture succeeded.

Focused headed visual capture:

- PASS
- directory: `scripts/test-results/thetaframe-browser-qa/c41-start-here-visual`
- files:
  - `start-here-dashboard-desktop.png`
  - `start-here-dashboard-mobile.png`

Manual visual result:

- Desktop Start Here: PASS. The modal no longer ends on a partially clipped AI note panel.
- Mobile Start Here: PASS. The restart actions fit above the footer with no horizontal overflow or clipped bottom row.
- AI trust copy remains visible in the intro: AI can make drafts from messy notes, and the user chooses what to save.

Raw screenshot and QA output directories remain ignored and were not committed.

## Git Hygiene

Excluded local/transient artifact classes:

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

The Start Here visual fit issue is now closed for both desktop and mobile. Production is live from commit `15fae31` plus this receipt follow-up.
