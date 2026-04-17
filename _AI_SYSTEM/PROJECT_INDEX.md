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
  - Neurodivergent-friendly interface and AI usefulness note:
    - `./NEURODIVERGENT_INTERFACE_GUIDE.md`

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

- `RECEIPT_INDEX.md`
  - Primary source today:
    - `./RECEIPT_INDEX.md`

- `VERIFICATION_MATRIX.md`
  - Primary source today:
    - `./VERIFICATION_MATRIX.md`

- `OPEN_QUESTIONS.md`
  - Create this when unresolved product or technical decisions need a stable home.

## Current Notes

- `THETAFRAME_CURRENT_TRUTH.md` is the fastest current-state entrypoint after C37. Start there before broad product, access, onboarding, AI, or QA work.
- Primary project truth is concentrated in `replit.md`.
- `RECEIPT_INDEX.md` maps high-signal receipts and should be used before reading the full `artifacts/receipts/` tree.
- `VERCEL_ENV_VARS.md` is the current deployment environment reference.
- `INTEGRATION_CONTRACT_AUTHORITY_BINDING.md` is the current AI-agent entry for the returned ARCH-1 PM Phase 4 contract slice.
- `USER_DATA_ISOLATION_POLICY.md` is the current AI-agent guardrail for per-user private data ownership, admin governance boundaries, and Baby assignment exceptions.
- `NEURODIVERGENT_INTERFACE_GUIDE.md` is the current AI-agent guardrail for repeatable Basic onboarding, low-friction lane guidance, and review-first AI usefulness.
- `RUNBOOKS.md` now records the canonical browser QA standard and local browser harness commands.
- `BROWSER_AUTH_RUNBOOK.md` records the Linux workspace PTY + Chrome auth-capture rule for AI agents.
- `VERIFICATION_MATRIX.md` now records the preferred proof order and receipt structure for UI-facing work.
- `THETAFRAME_UI_REBUILD_ROADMAP.md` and `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md` are the current local Phase 4 roadmap sources and should stay aligned with shipped receipts.
- If the repo grows additional durable docs, prefer indexing them here instead of scattering agent guidance across the tree.
