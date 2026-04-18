# C47 Brain Dump Apply Hardening

Date: 2026-04-18
Status: PASS

## Scope

Hardened the C46 Dashboard Brain Dump Setup lane so it creates more useful draft payloads and makes approval/apply easier for the Basic user.

No database schema, auth model, route permissions, cross-user access model, billing, file upload, mobile transport, or silent-write behavior changed.

Implementation commit:

- `d6047e5 Harden brain dump apply workflow`

## Product Result

Backend hardening:

- maps common provider aliases into the expected Today, This Week, and Goals shape;
- normalizes object/string provider items into lane text rows;
- dedupes generated and existing items;
- merges generated suggestions with existing lane context instead of blindly replacing arrays;
- moves overflow Daily must-do suggestions into Can Wait;
- normalizes vague time labels such as morning/afternoon/evening into valid `HH:MM` values;
- adds useful fallback lane content when provider output is sparse.

Dashboard hardening:

- shows richer per-lane draft previews for Must Do, Can Wait, Time Shape, Small Win, Theme, Protected Steps, Must Keep, Backup, Goals, and Next Steps;
- adds `Approve all`;
- adds `Save approved`;
- shows batch save progress;
- shows success status messages after save actions;
- skips fully rejected batches when choosing the active Dashboard setup batch.

Review-first behavior remains binding:

- generation creates drafts only;
- Dashboard apply is disabled until a draft is `approved`;
- live lane data changes only after explicit user save/apply.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Deployment:

- status: `READY`
- deployment id: `dpl_14o8BjDWyNUGUMeW5RGHKFgH5oT7`
- deployment URL: `https://thetaframe-fzj5qlmqy-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/14o8BjDWyNUGUMeW5RGHKFgH5oT7`
- canonical production target: `https://thetaframe.mrksylvstr.com`

## Verification

Static/build:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/thetaframe run build
git diff --check
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/api-server run build`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- `git diff --check`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Production smoke:

- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `{"status":"ok"}`

Production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c47-brain-dump-apply-hardening \
pnpm run qa:browser
```

Result:

- `passes=16`
- `skips=0`

Focused real-provider apply proof:

- Basic test account authenticated Dashboard successfully.
- Generated batch id: `3e2906c9-9e42-475d-8c17-55aab938a8a4`.
- Draft ids: `47`, `48`, `49`.
- Draft kinds:
  - `daily_frame_draft`;
  - `weekly_frame_draft`;
  - `vision_alignment_draft`.
- All three drafts were patched to `approved`.
- All three drafts were applied.
- Applied draft states returned `applied`, `applied`, `applied`.
- After apply:
  - Daily endpoint returned `200`;
  - Weekly endpoint returned `200`;
  - Vision endpoint returned `200`.
- Restore:
  - Daily restored to prior snapshot: `200`;
  - Vision restored to prior snapshot: `200`;
  - Weekly started as `404`, so it was reset to an empty Weekly frame: `200`;
  - restore error: `null`.

## Git Hygiene

Committed durable source and AI-system docs only.

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

C47 is live in production. The Dashboard brain-dump setup lane now gives more useful drafts, clearer review previews, and a lower-friction approve/apply path while preserving explicit user control before live data changes.
