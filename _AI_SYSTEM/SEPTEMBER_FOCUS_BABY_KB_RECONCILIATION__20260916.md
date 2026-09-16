# September Focus-Lane / Baby-KB Reconciliation

Generated: 2026-09-16

## Baseline

- Production baseline: `8774ba08e477b411e6af638e3949010f4cc9bc64`
- Production status: Daily Rhythm V1 merged and deployed
- Preserved dirty worktree inspected read-only: `/home/mark/vscode-projects/thetaframe`
- Dirty worktree baseline: `3bf1d903408fa050e97616aae12f12a4aecbaf51`

## Executive Decision

Do **not** directly merge the preserved September dirty worktree.

The preserved work contains useful planning assets, but the app-level changes conflict with the now-shipped Daily Rhythm architecture and with the explicit product decision that `/dashboard` remains the canonical signed-in home.

This reconciliation branch records the decision boundary and keeps production safe. Future Focus-Lane/Baby-KB work should be reintroduced as deliberate, scoped slices on top of Daily Rhythm V1.

## Dirty Worktree Inventory

Tracked modifications in the preserved dirty tree:

- `artifacts/thetaframe/src/App.tsx`
- `artifacts/thetaframe/src/components/header.tsx`
- `artifacts/thetaframe/package.json`
- `package.json`

Untracked asset groups:

- `_AI_SYSTEM/LOCAL_AI_DEV_PILOT_BOUNDARY__20260605.md`
- `artifacts/thetaframe/src/focus-lane/*`
- `artifacts/thetaframe/src/staging-views/*`
- `artifacts/thetaframe/src/App.active.tsx`
- `artifacts/thetaframe/src/main.active.tsx`
- `artifacts/thetaframe/index.active.html`
- `artifacts/thetaframe/vite.active.config.ts`
- `artifacts/thetaframe/tsconfig.active.json`
- `artifacts/thetaframe/src/utils/core/baby-kb-manager.ts`
- `artifacts/thetaframe/src/utils/core/shift-manager.ts`
- `knowledge-base/**`
- `state/baby-kb/**`
- `state/project-hygiene/**`
- `scripts/utils/astro-spock-event-loop.py`
- `scripts/utils/proof-indexer.py`
- `tests/test_thetaframe_sprint1.py`

## Classification

| Asset / Change | Classification | Decision |
| --- | --- | --- |
| Signed-in `/` redirect from `/dashboard` to `/daily` | CONFLICT | Do not port. Daily Rhythm V1 explicitly keeps `/dashboard` canonical. |
| Header replacement with Focus-Lane nav | PARTIAL / CONFLICT | Do not port directly. Some language may inform a future navigation experiment, but it hides broad nav and admin concepts in ways that need fresh UX review after Daily Rhythm. |
| `ConsolePage` import through `staging-views/console` | DEFER | Could be useful if Console is later demoted, but current product keeps `/console` route available. No need now. |
| Active clean-room build scripts and `vite.active.config.ts` | DEFER | Useful as experimental sandbox concept, but not part of production Daily Rhythm. Keep out of main until a named sandbox lane is approved. |
| `focus-lane/FocusLanePage.tsx` and CSS | ADJACENT | Contains useful Baby-KB proof-boundary language and handoff demo. Rebuild as a protected module/surface later, not as a replacement app shell. |
| Baby-KB proof policy / memory cards | ADJACENT | Preserve conceptually. Can become a future Baby-KB knowledge contract, but raw runtime state should not be committed to public production repo without privacy review. |
| `state/baby-kb/active_*` files | DEFER / RISK | Treat as local runtime state. Do not commit to public repo or production app without privacy/data governance review. |
| `baby-kb-manager.ts` / `shift-manager.ts` in frontend `src/utils/core` | CONFLICT / DEFER | Uses Node filesystem APIs under frontend source. Re-home to a server/runtime package or scripts lane before use. Do not add to current frontend compile. |
| `scripts/utils/astro-spock-event-loop.py` | DEFER | Runtime automation concept needs Astro governance and non-production proof; not a ThetaFrame production app change yet. |
| `scripts/utils/proof-indexer.py` | ADJACENT | Could support a future local proof-ingestion pipeline. Needs a private/local data boundary before merge. |
| `tests/test_thetaframe_sprint1.py` | DEFER | Tests assert the old experimental shell decisions, including `/daily` default, so they should not be ported as-is. |
| Project hygiene receipts | PRESERVE OUTSIDE MAIN | Keep as evidence in the preserved worktree or transport, not production source unless converted into current `_AI_SYSTEM` receipts. |

## What Should Be Preserved

Preserve the following concepts for later implementation:

1. Baby-KB proof boundary: health/postpartum/pediatric answers require verified local proof and safe fallback wording.
2. Shift handoff concept: parent/caregiver handoff, duty state, next actions, and sleep-equity tracking.
3. Current Routine concept: useful framing, but now overlaps with Daily Rhythm and should be integrated as a sub-surface rather than replacing navigation.
4. Clean-room active build concept: potentially useful for experimental demos, but should live outside production build rules until governance is defined.
5. Proof indexer concept: useful for future local RAG/proof ingestion, but not without privacy boundaries and source curation.

## What Should Not Be Ported Now

Do not port now:

- `/daily` as signed-in default route.
- Focus-Lane nav as the main header.
- Runtime `state/baby-kb/active_*` files.
- Node filesystem utilities into frontend source.
- Baby-KB answer/search UI that implies verified proof exists before proof ingestion is actually implemented.
- Slack/event-loop automation.
- Tests that lock in deprecated Daily-as-home assumptions.

## Recommended Future Slices

### Slice A — Baby-KB Product Contract

Create a private/local Baby-KB product and safety contract under `_AI_SYSTEM`.

- Define proof-source classes.
- Define allowed local-only runtime state.
- Define explicit non-medical safety language.
- Define what can and cannot be committed to the public repo.

### Slice B — Shift Handoff Data Model

Move the shift-handoff concepts into a server/runtime-safe package or API design.

- Avoid frontend Node filesystem imports.
- Decide whether state belongs in Postgres, local Astro runtime, or a private local store.
- Keep caregiver labels configurable and non-hardcoded.

### Slice C — Daily Rhythm Integration

Integrate “Current Routine” into the shipped Daily Rhythm system.

- Reuse `/daily` Morning/Night surfaces.
- Add optional Baby/household handoff card only after data model is approved.
- Do not replace `/dashboard` as home.

### Slice D — Proof Ingestion Prototype

Build proof ingestion as local-only tooling first.

- Keep source PDFs/docs out of public repo unless explicitly public-safe.
- Generate a proof index with redaction/privacy review.
- Only then expose a read-only Baby-KB proof result UI.

## Current Branch Scope

This branch intentionally adds only this reconciliation report.

No production code changes are made in this pass.
No schema changes are made in this pass.
No Baby-KB runtime state is committed.
No Focus-Lane shell is merged.

## Next Recommended Action

Open a small PR for this reconciliation report, then start Slice A: Baby-KB Product Contract, using the preserved dirty worktree as source evidence and Daily Rhythm V1 as the current production truth.
