# C33 User Data Isolation Hardening

Date: 2026-04-16
Status: `CLOSED / PRODUCTION PROOF PASSED`

## Scope

Changed C33-owned files:

- `_AI_SYSTEM/USER_DATA_ISOLATION_POLICY.md`
- `_AI_SYSTEM/PROJECT_INDEX.md`
- `lib/db/src/schema/parent-packet-imports.ts`
- `artifacts/api-server/src/lib/parentPacketImport.ts`
- `artifacts/api-server/src/lib/babyKbAdmin.ts`
- `artifacts/api-server/src/lib/babyKbAssignments.ts`
- `artifacts/api-server/src/lib/babyKbAssignmentSuggestions.ts`
- `artifacts/api-server/src/routes/life-ledger.ts`
- `scripts/src/thetaframeBrowserQaPaths.ts`
- `scripts/src/runThetaFrameIsolationQa.ts`
- `scripts/package.json`
- `package.json`

No paid-lane, billing, public auth, onboarding, or product-lane behavior was intentionally changed.

## Hardening

- Added durable ownership policy documentation for user-private records, admin governance boundaries, Baby assignment exceptions, and parent-packet materialization ownership.
- Added `uploader_user_id` ownership to parent-packet materializations and changed the uniqueness boundary to `uploader_user_id + packet_key + source_path + source_record_key`.
- Backfilled legacy materialization ownership from import runs or Baby source entries at runtime before enforcing `NOT NULL`.
- Scoped parent-packet materialization lookups by the owning uploader/source-entry user in import, Baby admin promotion, Baby assignment, and Baby assignment suggestion paths.
- Hardened projected Baby assignment event updates so existing projected events are updated only when they belong to the assignee.
- Changed Life Ledger delete to return `404` when the current user does not own the id instead of returning `204` for a no-op delete.
- Added `pnpm run qa:isolation`, a browser-context API isolation harness that uses saved Clerk storage states and real in-browser `fetch` calls.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Result:

- status: `READY`
- deployment URL: `https://thetaframe-ahlba0ncz-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/73yfPiGHCKiJCMpMnkiqGKi1ZqiT`
- alias reported by Vercel: `https://thetaframe.vercel.app`
- proof target: `https://thetaframe.mrksylvstr.com`

## QA Accounts And States

Storage states used:

- Basic A: `test-results/auth/thetaframe-basic.json` - `2026-04-16 14:18:54 +0000`
- Basic B: `test-results/auth/thetaframe-basic-b.json` - `2026-04-16 18:15:07 +0000`
- Select Authorized: `test-results/auth/thetaframe-select-authorized.json` - `2026-04-16 14:24:07 +0000`
- Admin: `test-results/auth/thetaframe-admin.json` - `2026-04-16 14:24:36 +0000`
- Reach owner: `test-results/auth/thetaframe-user.json` - `2026-04-16 14:25:03 +0000`

Dedicated Basic B QA account created:

- `thetaframe-c33-basic-b-qa@mrksylvstr.com`
- Production optional modules removed; Basic modules granted for all app environments.

Temporary Vercel env and Clerk sign-in-token files were kept under `/tmp` only and deleted after capture. No secret values or token URLs were written to the repo.

## Isolation Proof

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c33-isolation \
pnpm run qa:isolation
```

Result:

- `PASS`
- checks: `47`
- evidence: `scripts/test-results/thetaframe-browser-qa/c33-isolation/c33-isolation-results.json`
- marker: `C33-20260416181814-ewggv4`

Covered:

- Basic A/B permission exactness.
- Basic A can create/read Daily, Weekly, Vision; Basic B and Admin ordinary lane reads do not receive Basic A markers.
- Basic B writing the same Daily/Weekly date keys writes only Basic B records and does not overwrite Basic A.
- Select Authorized can create/read its own Life Ledger event.
- Basic receives `403` for Life Ledger.
- Admin ordinary Life Ledger read/delete by Select Authorized event id returns `404`.
- Basic B cannot get, review, or apply Basic A's AI draft by id.
- Basic and Select Authorized receive `403` for Baby KB and Admin users APIs.
- Admin can access Baby KB and Admin users APIs.
- REACH pending upload registration and private object reads require ownership; copied object path by Admin returns `403`/`404`.

Cleanup:

- Select Authorized Life Ledger proof event deleted through owner API.
- Basic A AI draft marked `rejected`.
- REACH pending upload cleaned by owner `POST /api/reach/files` returning `422` after confirming the object was absent.
- Basic A Vision frame restored when a prior frame existed.
- Daily/Weekly future QA records remain on dedicated QA accounts because those lanes have upsert-only APIs and no delete endpoints.

## Browser Gate

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c33-browser \
pnpm run qa:browser
```

Result:

- `PASS`
- `passes=14`
- `skips=0`
- evidence directory: `scripts/test-results/thetaframe-browser-qa/c33-browser/`
- no failure screenshots were generated.

## Static Checks

- `git diff --check` on touched C33 files: `PASS`
- `pnpm --filter @workspace/scripts run typecheck`: `PASS`
- `pnpm run typecheck`: `PASS`
- `pnpm --filter @workspace/api-server run build`: `PASS`
- `pnpm --filter @workspace/thetaframe run build`: `PASS`

## Caveats

- The workspace contains unrelated dirty and untracked files from prior slices; they were preserved.
- The isolation harness initially failed when it used a raw Playwright API context because Clerk browser auth was not hydrated. The final harness uses real browser contexts and in-page `fetch`, matching the existing browser QA standard.
