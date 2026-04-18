# C45 Social Link Preview Image

Date: 2026-04-18
Status: PASS

## Scope

Fixed the production link preview metadata for `https://thetaframe.mrksylvstr.com/` so SMS/social/embed crawlers can discover the intended preview image.

No app behavior, backend, API, OpenAPI, database schema, auth, AI provider, integration contract, or persisted field changed.

Implementation commit:

- `b09bc14 Add social preview metadata`

Changed source:

- `artifacts/thetaframe/index.html`

## Product Result

Added static HTML head metadata that is visible before React loads:

- canonical URL: `https://thetaframe.mrksylvstr.com/`
- page description
- Open Graph title, description, type, URL, image, image dimensions, image type, and alt text
- Twitter `summary_large_image` card metadata

Preview image:

- URL: `https://thetaframe.mrksylvstr.com/opengraph.jpg`
- source: `artifacts/thetaframe/public/opengraph.jpg`
- type: JPEG
- dimensions: `1280x720`

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Deployment:

- status: `READY`
- deployment id: `dpl_AtzRN5wTUvdFnJvv5D6FADGcGHCM`
- deployment URL: `https://thetaframe-6o586ssty-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/AtzRN5wTUvdFnJvv5D6FADGcGHCM`
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

- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `HTTP 200`
- health body: `{"status":"ok"}`
- `GET https://thetaframe.mrksylvstr.com/`: HTML contains `og:image`, `og:image:secure_url`, `twitter:image`, and `twitter:card`
- `GET https://thetaframe.mrksylvstr.com/opengraph.jpg`: `HTTP 200`
- image content type: `image/jpeg`
- image content length: `51072`

## Git Hygiene

No generated outputs, auth state, local Vercel state, raw screenshots, or build artifacts were committed.

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

The production root page now advertises a valid large social preview image for text messages, social posts, and embed crawlers.
