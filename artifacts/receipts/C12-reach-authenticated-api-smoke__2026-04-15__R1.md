# C12 REACH Authenticated API Smoke

Date: 2026-04-15

## Summary

Closed the remaining `C12` validation gap by running authenticated REACH API smoke against a local API server backed by the linked Vercel `Development` database.

The smoke used:
- Vercel `Development` env pulled into a temporary file outside the repo
- a real owner Clerk session JWT derived from the current active owner session via the Clerk backend API
- a local API server on `127.0.0.1:4013`

No secrets or env files were committed.

## Environment and Auth

- env source: linked Vercel project `marks-projects-f03fd1cc/thetaframe`
- environment used: `Development`
- temporary env artifact: `/tmp/thetaframe-c12-reach-auth.OkDRQN.env`
- owner user resolved: `mark@speaklymedia.com`
- active owner session resolved through Clerk backend API
- temporary env artifact removed after validation

## REACH Smoke Results

Health and auth:
- `GET /api/healthz` -> `200`
- authenticated `GET /api/reach/files` -> `200`

Observed REACH target:
- existing owned file count: `1`
- target file id: `1`
- target file name: `SESSION_4_REVIEW_GATE__20260324_R1(1).zip`

Happy path:
- authenticated `POST /api/ai-drafts` for `reach_file_summary` -> `201`
- created draft defaulted to:
  - `reviewState=needs_review`
  - `approvalRequired=one_tap`
- authenticated `POST /api/ai-drafts/{id}/apply` with `reachFileId=1` -> `200`
- returned draft moved to:
  - `reviewState=applied`
  - `appliedTargetRef=reach:1`
- returned `reachFile.notes` updated to the applied summary text

Conflict and validation:
- second apply on the same draft -> `409`
- malformed `reach_file_summary` payload create -> `201`
- apply of malformed stored payload -> `422`
- returned validation error:
  - `REACH file summary drafts must include summary, notes, or title text before they can be applied.`

## Notes

- The first manual create attempt in this session used an incomplete metadata envelope and failed at `POST /api/ai-drafts` with `400`; this was a smoke-payload issue, not a route/auth defect.
- The successful rerun used a contract-valid metadata envelope and completed the intended REACH create/apply path.
- The local API server was stopped after validation.

## Outcome

`C12` is now authenticated-smoke validated for:
- owner auth against the REACH route family
- `reach_file_summary` draft creation
- metadata-only apply to an existing owned REACH file
- terminal re-apply protection
- malformed stored payload rejection
