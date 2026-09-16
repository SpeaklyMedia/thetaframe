# Project Index

This file maps the generic AI-system naming convention onto the current ThetaFrame repository.

## Canonical Context Map

- `THETAFRAME_CURRENT_TRUTH.md`
  - Primary source today:
    - `./THETAFRAME_CURRENT_TRUTH.md`

- `PRODUCT_TRUTH.md`
  - Primary sources today:
    - `./THETAFRAME_CURRENT_TRUTH.md`
    - `../replit.md`
  - Executive Console continuation note:
    - `./EXECUTIVE_CONSOLE_CONTRACT.md`

- `ARCHITECTURE_MAP.md`
  - Primary source today: `../replit.md`

- `ENVIRONMENT_MATRIX.md`
  - Primary sources today:
    - `../replit.md`
    - `../VERCEL_ENV_VARS.md`

- `POLICY_GUARDRAILS.md`
  - Primary source today: `../replit.md`
  - Integration contract continuation note:
    - `./INTEGRATION_CONTRACT_AUTHORITY_BINDING.md`
  - User data isolation continuation note:
    - `./USER_DATA_ISOLATION_POLICY.md`
  - Neurodivergent-friendly UX surface contract and AI usefulness note:
    - `./NEURODIVERGENT_INTERFACE_GUIDE.md`
  - Signed-in preference contract note:
    - `./USER_PREFERENCES_CONTRACT.md`
  - Baby-KB product/safety planning contract:
    - `./BABY_KB_PRODUCT_CONTRACT__20260916.md`
  - Baby-KB private proof inventory contract:
    - `./BABY_KB_PROOF_INVENTORY_CONTRACT__20260916.md`
  - Baby-KB shift handoff model draft:
    - `./BABY_KB_SHIFT_HANDOFF_MODEL_DRAFT__20260916.md`
  - Baby-KB local-only proof inventory implementation plan:
    - `./BABY_KB_PROOF_INVENTORY_IMPLEMENTATION_PLAN__20260916.md`
  - September Focus-Lane / Baby-KB reconciliation decision:
    - `./SEPTEMBER_FOCUS_BABY_KB_RECONCILIATION__20260916.md`

- `RISK_REGISTER.md`
  - No dedicated repo document yet. Use `../replit.md` and create this file when risk tracking becomes a stable artifact.

- `RUNBOOKS.md`
  - Primary source today:
    - `./RUNBOOKS.md`
  - Browser auth capture details:
    - `./BROWSER_AUTH_RUNBOOK.md`
  - Legacy/manual QA references:
    - `../THETAFRAME_R3_FINAL_MANUAL_QA_RUNBOOK.md`

- `ROADMAP.md`
  - Primary source today: `../replit.md`
  - Active execution references:
    - `../THETAFRAME_UI_REBUILD_ROADMAP.md`
    - `../THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`
    - `../THETAFRAME_EXECUTIVE_CONSOLE_EXECUTION_PLAN__2026-04-23__R1.md`

- `RECEIPT_INDEX.md`
  - Primary source today:
    - `./RECEIPT_INDEX.md`

- `VERIFICATION_MATRIX.md`
  - Primary source today:
    - `./VERIFICATION_MATRIX.md`

- `OPEN_QUESTIONS.md`
  - Create this when unresolved product or technical decisions need a stable home.

## Current Notes

- `THETAFRAME_CURRENT_TRUTH.md` is the fastest current-state entrypoint after C75. Start there before broad product, access, onboarding, AI, or QA work.
- `EXECUTIVE_CONSOLE_CONTRACT.md` is the canonical product contract for the implemented `/console` preview shell and future Console slices. Read it before changing signed-in home-shell behavior, large-display layout strategy, or console module hierarchy.
- `USER_PREFERENCES_CONTRACT.md` is the canonical product and implementation contract for the new shared `user_preferences` surface. Read it before changing signed-in settings UI, display-density behavior, reminder wording behavior, or shell-level preference attributes.
- `BABY_KB_PRODUCT_CONTRACT__20260916.md` is the canonical planning/safety contract for future Baby-KB work. Read it before changing baby-care, postpartum, shift-handoff, proof-ingestion, or local RAG behavior.
- `BABY_KB_PROOF_INVENTORY_CONTRACT__20260916.md` is the canonical local/private proof inventory contract for Baby-KB source admission, review state, redaction, storage boundary, and proof-backed answer eligibility. Read it before changing proof-source ingestion, citation, indexing, or local RAG behavior.
- `BABY_KB_SHIFT_HANDOFF_MODEL_DRAFT__20260916.md` is the canonical planning draft for future Baby-KB caregiver shift handoff data, ownership, safety copy, Daily Rhythm integration, and MVP boundary. Read it before changing baby-care handoff, caregiver labels, sleep-opportunity, or household-support behavior.
- `BABY_KB_PROOF_INVENTORY_IMPLEMENTATION_PLAN__20260916.md` is the canonical implementation plan for a future local-only Baby-KB proof inventory validator/reporting slice. Read it before adding proof inventory scripts, schemas, fixtures, reports, or private-root behavior.
- `SEPTEMBER_FOCUS_BABY_KB_RECONCILIATION__20260916.md` records why the preserved September dirty worktree should not be directly merged and how its concepts should be sliced.
- Primary project truth is concentrated in `replit.md`.
- `THETAFRAME_ARCH1_EXECUTIVE_CONSOLE_RESEARCH_INGEST__2026-04-23__R1.md` records the newest Executive Console research packet intake and points to the exact ingested transport paths.
- `artifacts/receipts/C71-current-contract-baseline-normalization__2026-04-25__R1.md` is the baseline-freeze receipt for the uncommitted C55-C70 stack and should be read before assuming `main` is the latest product truth.
- `RECEIPT_INDEX.md` maps high-signal receipts and should be used before reading the full `artifacts/receipts/` tree.
- `VERCEL_ENV_VARS.md` is the current deployment environment reference.
- `INTEGRATION_CONTRACT_AUTHORITY_BINDING.md` is the current AI-agent entry for the returned ARCH-1 PM Phase 4 contract slice.
- `USER_DATA_ISOLATION_POLICY.md` is the current AI-agent guardrail for per-user private data ownership, admin governance boundaries, and Baby assignment exceptions.
- `NEURODIVERGENT_INTERFACE_GUIDE.md` is the current AI-agent UX surface contract for core-action-first layout, callable support, repeatable Basic onboarding, low-friction lane guidance, and review-first AI usefulness. Read it before UI-facing changes.
- `RUNBOOKS.md` now records the canonical browser QA standard and local browser harness commands.
- `BROWSER_AUTH_RUNBOOK.md` records the Linux workspace PTY + Chrome auth-capture rule for AI agents.
- `VERIFICATION_MATRIX.md` now records the preferred proof order and receipt structure for UI-facing work.
- `THETAFRAME_UI_REBUILD_ROADMAP.md`, `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`, and `THETAFRAME_EXECUTIVE_CONSOLE_EXECUTION_PLAN__2026-04-23__R1.md` are the current local roadmap and console-planning sources and should stay aligned with shipped receipts, the implemented preview shell, and current-contract completion proof.
- If the repo grows additional durable docs, prefer indexing them here instead of scattering agent guidance across the tree.
