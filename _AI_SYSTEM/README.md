# AI System Folder Standard

This folder is the stable discovery point for AI agents working in this repository.

Purpose:
- Provide one predictable place for product truth, architecture context, environment references, runbooks, and verification evidence.
- Avoid making each future agent rediscover where important project documents live.
- Map legacy or project-specific document names onto a generic convention.

Required discovery order:
1. `AGENTS.md`
2. `_AI_SYSTEM/README.md`
3. `_AI_SYSTEM/PROJECT_INDEX.md`

Recommended canonical document names:
- `PROJECT_INDEX.md`
- `PRODUCT_TRUTH.md`
- `ARCHITECTURE_MAP.md`
- `ENVIRONMENT_MATRIX.md`
- `POLICY_GUARDRAILS.md`
- `RISK_REGISTER.md`
- `RUNBOOKS.md`
- `ROADMAP.md`
- `VERIFICATION_MATRIX.md`
- `OPEN_QUESTIONS.md`

Rules:
- Prefer these generic filenames for new durable context.
- If legacy docs already exist elsewhere, index them from `PROJECT_INDEX.md` instead of duplicating them.
- Keep secrets and raw env values out of this folder.
