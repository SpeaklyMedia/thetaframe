# C46 Dashboard Brain Dump AI Setup Lane

Date: 2026-04-18
Status: PASS

## Scope

Added a Dashboard-only Basic brain-dump setup lane that uses real OpenAI-compatible generation to create reviewable draft batches for:

- `daily_frame_draft`;
- `weekly_frame_draft`;
- `vision_alignment_draft`.

No database schema, auth model, cross-user access model, payment model, file upload behavior, mobile transport, or silent-write behavior changed.

Implementation commits:

- `2c4382f5b81f96dcd93d906302852bd00657f5c8` - `Add Dashboard brain dump setup lane`
- `46502c528b32a62c73c98b3ad36cf8d33a86eed6` - `Harden brain dump provider output parsing`

## Product Result

- Added `POST /api/ai-drafts/basic-brain-dump`.
- Request creates one all-or-nothing batch containing Today, This Week, and Goals drafts.
- Refinement creates a new batch and preserves prior draft rows.
- Dashboard now has `Brain Dump Setup` above the Habit Canvas map.
- Dashboard review cards can approve, reject, and apply lane drafts.
- Dashboard apply requires `approved` state before calling the existing apply route.
- Default browser QA asserts the setup surface without invoking provider generation.
- Opt-in provider QA remains available through `THETAFRAME_BROWSER_ENABLE_AI_GENERATION_QA=1`.

Stable UI/API markers:

- `dashboard-brain-dump-setup`
- `textarea-dashboard-brain-dump`
- `button-generate-brain-dump`
- `dashboard-brain-dump-batch`
- `dashboard-brain-dump-draft-daily`
- `dashboard-brain-dump-draft-weekly`
- `dashboard-brain-dump-draft-vision`

## Production Deploy

Final command:

```bash
vercel deploy --prod --yes
```

Final deployment:

- status: `READY`
- deployment id: `dpl_CHXoKYTRyNvi2WRx7bYopPXSUhPa`
- deployment URL: `https://thetaframe-dgeewtxg3-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/CHXoKYTRyNvi2WRx7bYopPXSUhPa`
- canonical production target: `https://thetaframe.mrksylvstr.com`

Prior C46 deployment before provider-output hardening:

- `dpl_4gQrnvN1EyjeR3VTSdLbCGvm4faL`

## Verification

Static/build:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/thetaframe run build
git diff --check
```

Results:

- `pnpm --filter @workspace/api-spec run codegen`: PASS
- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/api-server run build`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- `git diff --check`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Production smoke:

- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `{"status":"ok"}`
- unauthenticated `POST /api/ai-drafts/basic-brain-dump`: `401 {"error":"Unauthorized"}`

Production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c46-brain-dump-final \
pnpm run qa:browser
```

Result:

- `passes=16`
- `skips=0`

Focused real-provider proof:

- authenticated Basic account loaded Dashboard successfully;
- first provider batch id: `620725ab-d588-4210-b7fe-961ff75d2538`;
- first draft ids: `41`, `42`, `43`;
- refined provider batch id: `19389304-1910-4508-9239-f85d7a9d2eaf`;
- refined draft ids: `44`, `45`, `46`;
- both batches contained exactly:
  - `daily_frame_draft`;
  - `weekly_frame_draft`;
  - `vision_alignment_draft`;
- all six proof drafts were patched to `rejected`;
- no apply route was called during the focused provider proof.

Apply/restore note:

- The Basic test account had no existing Weekly frame for `2026-04-13`.
- A full apply/restore proof would have created a new Weekly row with no delete route to restore the prior `404` state.
- The focused proof therefore stopped after provider generation/refinement and rejected proof drafts to avoid live lane writes.
- Existing Daily, Weekly, and Vision apply paths remain covered by prior draft/apply receipts and current browser QA access checks.

## Git Hygiene

Committed durable source, OpenAPI/generated client changes, QA harness updates, and AI-system docs only.

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

C46 is live in production. The Dashboard now has a real provider-backed brain-dump setup lane that creates review-first Basic draft batches without silent writes or backend schema changes.
