# Baby-KB Product Contract

Generated: 2026-09-16
Status: planning contract / no runtime implementation
Depends on: `SEPTEMBER_FOCUS_BABY_KB_RECONCILIATION__20260916.md`
Current production truth: Daily Rhythm V1 is shipped; `/dashboard` remains the canonical signed-in home.

## 1. Purpose

Baby-KB is a future ThetaFrame module for household baby-care, postpartum support, routine handoff, and proof-boundary knowledge work.

Its purpose is to help caregivers:

- see the next safe, practical care action
- hand off care context cleanly
- protect parent recovery and sleep opportunities
- keep routines observable without pretending certainty
- separate verified proof from unverified notes, memory, or internet claims

Baby-KB must not become:

- a medical diagnosis tool
- a pediatric or postpartum clinician substitute
- a baby-surveillance anxiety dashboard
- a public family social network
- a generic habit tracker
- a notification-heavy nag system
- a place where private child/caregiver state is casually committed to a public repo

## 2. Production Integration Boundary

Baby-KB must integrate with the shipped Daily Rhythm architecture rather than replacing it.

Required constraints:

- `/dashboard` remains canonical signed-in home unless a later explicit route-governance approval changes it.
- `/daily` remains the Daily Rhythm workflow owner for Morning, three promises, Today Canvas, Night Reset, and first-action handoff.
- Baby-KB can eventually appear as an optional card, module, or protected surface, but it must not overwrite Daily Rhythm or global navigation by default.
- Focus-Lane language may inform future UX, but the preserved September Focus-Lane shell must not be merged directly.

Recommended future surfaces:

1. Dashboard summary card: a compact “Baby / Household Handoff” launcher.
2. Daily Rhythm integration: optional handoff prompt within Night Reset or Today Canvas.
3. Dedicated protected route: a future `/baby-kb` or equivalent module, gated by access permissions.
4. Local proof/admin surface: proof ingestion and review should be admin/local-first before public UI exposure.

## 3. Product Objects

Baby-KB concepts from the preserved September work are valid as product concepts, not yet approved production schema.

Candidate objects:

- `caregiver`
- `care_shift`
- `shift_handoff`
- `sleep_equity_window`
- `baby_care_event`
- `routine_window`
- `postpartum_recovery_metric`
- `support_checklist_item`
- `warning_signal_note`
- `proof_source`
- `proof_chunk`
- `proof_answer`
- `care_context_snapshot`

Do not add these tables or APIs until a data-model slice is explicitly approved.

## 4. Proof Boundary

Baby-KB must distinguish four source states:

1. `verified_local_proof`
   - reviewed source material intentionally admitted into the local proof corpus
   - allowed for factual “according to source X” responses
2. `caregiver_observation`
   - user-entered local observations, logs, or household notes
   - allowed for recall and pattern review, not generalized advice
3. `draft_or_unverified`
   - imported or written material awaiting review
   - visible only as unverified and not used for factual claims
4. `rejected_or_retired`
   - explicitly disallowed, stale, irrelevant, or unsafe sources
   - not used for answers

Default fallback for proof-seeking answers:

> AWAITING VERIFIED PROOF INGESTION.

This wording can be refined later, but the behavior must remain: no verified proof means no confident answer.

## 5. Safety Language

Baby-KB may support routine, logistics, and observation workflows. It must not provide clinical certainty.

Required safety principles:

- Emergency and urgent warning-signal content must direct the user to appropriate human medical help rather than giving local instructions as a substitute.
- Pediatric/postpartum content must show source and confidence when it claims factual support.
- Caregiver notes must be labeled as observations, not proof.
- The UI must avoid blame, shame, or “bad parent” framing.
- Sleep-equity features must support care and recovery, not scorekeeping or resentment mechanics.
- Any AI feature must reduce caregiver effort and preserve user control.

## 6. Privacy / Data Governance

Baby-KB data is sensitive household and child-adjacent data.

Blocked by default:

- committing live baby/caregiver state into this public repository
- committing private proof PDFs, medical records, pediatric notes, or family-identifying material
- packaging Playwright auth state, cookies, Clerk tokens, Vercel env files, database URLs, or private object paths
- using another real user's private data for QA
- exposing Baby-KB state through public routes
- creating unmanaged external accounts or integrations for baby-care data

Allowed only with explicit future approval:

- local-only proof-source folders
- local-only runtime state stores
- encrypted/private object storage
- production database tables for user-scoped Baby-KB state
- admin proof-ingestion tooling

## 7. Architecture Placement

The preserved September utilities place Node filesystem code under frontend source. Do not preserve that placement.

Future placement rules:

- Browser UI code must not import `node:fs`, `node:path`, or local filesystem state managers.
- File/state managers belong in a server package, scripts package, or Astro/local runtime package.
- Proof indexing belongs in local tooling first, not the production React bundle.
- If production persistence is needed, use the existing PostgreSQL + Drizzle + auth/user ownership pattern.
- If local-only persistence is needed, document the Astro runtime boundary and keep it out of production deploys.

## 8. Relationship to Daily Rhythm

Daily Rhythm V1 already owns:

- Morning Start
- Night Reset
- three daily commitments
- first-action handoff
- Today Canvas
- Dashboard summary

Baby-KB should reuse this loop rather than creating a parallel planning system.

Possible integrations:

- Night Reset “Prepare” prompt can optionally include baby/household prep.
- Night Reset can later include a handoff prompt if Baby-KB state is approved.
- Morning / Today can show a baby-care context card if there is a safe, user-scoped source.
- Daily commitments may include a Family/Home/Baby win without hard-coding every future user's family structure.

## 9. MVP Slice Proposal

The first implementation slice should not create a full Baby-KB app.

Recommended MVP order:

### Slice A — Contract Only

This document and reconciliation report. No runtime code.

### Slice B — Private Proof Inventory

Create a local-only proof inventory contract:

- allowed source classes
- disallowed source classes
- review state
- redaction rules
- citation requirements
- fallback behavior

### Slice C — Shift Handoff Model Draft

Draft a server-safe data model for handoff state:

- caregiver labels
- active duty
- shift window
- next actions
- sleep opportunity notes
- audit timestamps

No production table until reviewed.

### Slice D — Daily Rhythm Handoff Card

Add a small, optional card to `/daily` or `/dashboard` only after the model is approved.

### Slice E — Proof-Backed Answer Prototype

Local-only prototype that answers only from reviewed proof chunks.

## 10. Explicit Deferrals

Defer until separately approved:

- production Baby-KB tables
- Baby-KB public/product route
- source upload UI
- vector database or AI retrieval
- Slack reminders or event-loop dispatch
- partner/caregiver shared accounts
- medical warning workflow
- push notifications
- production object storage for proof sources
- mobile background timers
- any route change that makes `/daily` the canonical home

## 11. Required QA Before Any Runtime Slice

Any future Baby-KB runtime implementation must prove:

- user-scoped auth ownership
- no cross-user data access
- no public exposure of private state
- no production use of unreviewed proof sources
- no frontend import of Node filesystem APIs
- accessible labels for caregiver and baby-care state
- mobile readability under stress conditions
- emergency/urgent copy does not delay real-world care
- no shame/scoring mechanics

## 12. Source Evidence

This contract is derived from read-only inspection of the preserved September dirty worktree, especially:

- `artifacts/thetaframe/src/focus-lane/FocusLanePage.tsx`
- `artifacts/thetaframe/src/utils/core/baby-kb-manager.ts`
- `artifacts/thetaframe/src/utils/core/shift-manager.ts`
- `knowledge-base/schemas/*.json`
- `knowledge-base/memory-cards/tier-1-thetaframe-core.json`
- `state/baby-kb/baby-kb-lane-manifest__20260909.json`
- `tests/test_thetaframe_sprint1.py`

Those files remain in the preserved dirty worktree as evidence and are not merged by this contract.
