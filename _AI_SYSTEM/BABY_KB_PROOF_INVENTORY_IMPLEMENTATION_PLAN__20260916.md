# Baby-KB Local-Only Proof Inventory Implementation Plan

Generated: 2026-09-16
Status: implementation plan / no runtime implementation in this branch
Depends on:
- `BABY_KB_PRODUCT_CONTRACT__20260916.md`
- `BABY_KB_PROOF_INVENTORY_CONTRACT__20260916.md`
- `BABY_KB_SHIFT_HANDOFF_MODEL_DRAFT__20260916.md`
Current production truth: Daily Rhythm V1 is shipped; Baby-KB has no approved runtime, schema, route, upload UI, answer UI, ingestion pipeline, or production storage.

## 1. Decision

The first Baby-KB proof slice should be a **local-only proof inventory toolchain**, not a production feature.

Its job is to create a governed private inventory of source material so future Baby-KB work can distinguish:

- verified proof
- candidate sources
- caregiver observations
- rejected or retired material
- private data that must never enter the public repo

This plan does not approve actual ingestion, RAG, AI answers, production database tables, source uploads, or UI.

## 2. Scope of the First Implementation Slice

The smallest useful implementation should create local tooling only.

Approved future slice contents:

1. A private local storage boundary outside the public repository.
2. A machine-readable proof inventory file generated or maintained locally.
3. A schema/validator for inventory records.
4. A report command that summarizes inventory state without printing private source contents.
5. Git-ignore or governance checks proving private material is not committed.
6. Tests for classification, validation, and exclusion behavior.

Not approved in the first implementation slice:

- source document parsing
- embeddings
- vector database
- AI/RAG answers
- upload UI
- production API routes
- production database migrations
- object storage
- browser UI
- caregiver sharing
- notifications
- medical advice workflows

## 3. Local Storage Boundary

Use a private local root outside the repository.

Preferred conceptual root:

```text
~/.local/share/thetaframe/baby-kb/
```

Do not hard-code this path into product behavior without override support. A future implementation should use an environment variable or local config value such as:

```text
THETAFRAME_BABY_KB_PRIVATE_ROOT
```

Recommended private layout:

```text
baby-kb/
  sources/
    candidate/
    verified/
    rejected/
    retired/
  inventory/
    proof-inventory.json
    proof-inventory-report.json
  redacted/
  logs/
```

All directories under this private root are local/private and must not be copied into the public repository or return transports.

## 4. Public Repository Boundary

The public repository may contain only generic tooling and contracts.

Allowed in repo for a future implementation:

- inventory record TypeScript types or Zod schemas
- validation scripts
- safe sample fixtures with fake content
- documentation
- tests using fake data
- `.gitignore` rules that prevent private proof paths from being committed
- receipt templates that report counts/classification only

Blocked from repo:

- actual pediatric/postpartum PDFs
- private hospital, discharge, appointment, insurance, or household documents
- child/caregiver identifying records
- raw private source text
- generated indexes containing private chunks
- embeddings derived from private sources
- cookies, auth state, `.env` files, Clerk keys, Vercel credentials, or database URLs

## 5. Inventory File

A future local implementation should produce or validate:

```text
proof-inventory.json
```

Conceptual structure:

```json
{
  "version": 1,
  "generatedAt": "",
  "privateRootClass": "local_private",
  "entries": [
    {
      "sourceId": "",
      "title": "",
      "sourceClass": "candidate_source",
      "reviewState": "candidate",
      "storageBoundary": "private_local_source",
      "containsPrivateData": true,
      "redactionStatus": "pending",
      "citationLabel": "",
      "sourcePath": "",
      "sourceHash": "",
      "admittedBy": "",
      "admittedAt": "",
      "reviewedAt": "",
      "expiresAt": "",
      "notes": ""
    }
  ]
}
```

The local inventory may contain private file paths, but public reports and transports must not expose private contents or secrets.

## 6. Validation Rules

The validator should reject inventory entries when:

- `sourceId` is missing or duplicated
- `sourceClass` is outside the approved contract values
- `reviewState` is outside the approved contract values
- `storageBoundary` is outside the approved contract values
- `verified_local_proof` is not paired with `reviewState = verified`
- `reviewState = verified` has missing citation metadata
- `containsPrivateData = true` has no redaction status
- `redactionStatus = pending|required|not_safe_to_store` is marked answer-eligible
- `rejected_or_retired` is marked answer-eligible
- source paths point inside the public repository unless the entry is a generic public contract fixture
- source path or title appears to include credential/auth/env material

Validation should fail closed. Unknown classes should not pass through.

## 7. Safe Report Output

A future report command should output safe metadata only.

Allowed report fields:

- inventory version
- generated timestamp
- total entry count
- counts by source class
- counts by review state
- counts by redaction status
- entries missing review metadata
- entries blocked from answer eligibility
- source IDs and citation labels when non-sensitive
- private root classification, not full secret paths when avoidable

Blocked report fields:

- source document text
- private medical details
- child/caregiver identifiers
- full credentials or environment values
- auth cookies/tokens/storage state
- database URLs
- embeddings or chunks derived from private documents

## 8. Candidate Future Files

If implementation is approved later, likely repo files are:

```text
scripts/baby-kb/validate-proof-inventory.ts
scripts/baby-kb/report-proof-inventory.ts
scripts/baby-kb/README.md
scripts/baby-kb/fixtures/fake-proof-inventory.valid.json
scripts/baby-kb/fixtures/fake-proof-inventory.invalid.json
lib/baby-kb-proof-inventory/src/schema.ts
lib/baby-kb-proof-inventory/src/validator.ts
lib/baby-kb-proof-inventory/package.json
```

This is a planning list, not approval to add a new package yet. If the repo prefers scripts-only first, use scripts-only.

## 9. Command Shape

Future local commands should be explicit and non-production.

Conceptual examples:

```bash
pnpm run baby-kb:proof:validate -- --root "$THETAFRAME_BABY_KB_PRIVATE_ROOT"
pnpm run baby-kb:proof:report -- --root "$THETAFRAME_BABY_KB_PRIVATE_ROOT" --out /tmp/baby-kb-proof-report.json
```

Commands must refuse to run if:

- the private root is unset
- the private root points inside the repository
- expected private directories are missing and creation is not explicitly authorized
- output path points into committed source by default
- validation would expose private source contents

## 10. Git Hygiene

Before implementation, ensure ignore rules protect likely private paths.

Future `.gitignore` candidates:

```text
.baby-kb-private/
baby-kb-private/
state/baby-kb/active_*
state/baby-kb/private_*
**/proof-inventory.local.json
**/proof-inventory-report.local.json
```

Do not add broad ignore rules that hide source-code changes. Keep ignore patterns focused on private runtime state and generated local proof inventory outputs.

## 11. QA Plan

A future implementation must include tests for:

- valid inventory passes
- duplicate source IDs fail
- unknown source class fails
- unknown review state fails
- verified proof without citation fails
- private unredacted proof is not answer-eligible
- rejected/retired sources are not answer-eligible
- source path inside public repo fails unless it is an explicit fake fixture
- report output excludes source text
- report output excludes credential-like strings
- command refuses an unset private root
- command refuses a private root inside the repository

Manual proof checks:

- `git status --short` does not show private source material
- return transports do not include private inventory files unless explicitly sanitized
- original preserved dirty worktree remains untouched

## 12. Relationship to Future AI/RAG

This plan intentionally comes before any AI/RAG work.

Future retrieval or answer generation may only proceed after:

1. proof inventory validator exists
2. verified proof entries can be distinguished from candidates
3. redaction state is enforced
4. rejected/retired sources are excluded
5. answer fallback behavior is tested
6. user/private storage boundary is approved

Default answer without verified proof remains:

> AWAITING VERIFIED PROOF INGESTION.

## 13. Relationship to Shift Handoff

Shift handoff may eventually reference proof, but it should not depend on proof ingestion for its first useful version.

Allowed future interaction:

- a handoff item may reference a verified proof citation
- caregiver observations can remain observations
- Daily Rhythm can show a handoff card without offering proof-backed answers

Blocked:

- converting handoff observations into medical guidance
- using unverified proof to guide care actions
- surfacing local RAG answers inside handoff before proof gates exist

## 14. Implementation Phases

### Phase A — Planning Branch

This document only.

### Phase B — Local Validator Prototype

Add schemas, validator, fake fixtures, tests, and safe report shape.

No private source files.
No production runtime.
No answer UI.

### Phase C — Local Private Inventory Dry Run

Run the validator against a private root selected by the user.

Do not package private files.
Only package sanitized report counts.

### Phase D — Proof-Backed Answer Design

Only after Phase B/C prove the boundary, design answer behavior.

No AI implementation until separately approved.

## 15. Stop Conditions

Stop rather than improvise if:

- a proposed source contains private medical or child-identifying information and redaction is unclear
- a command would print secrets or private source text
- a command would write inventory data into the public repo
- a tool would create embeddings/chunks from private docs before approval
- production DB or object storage becomes necessary
- answer UI becomes necessary to prove the validator
- implementation would touch the preserved original dirty worktree

## 16. Recommended Next Action

Open this plan as a documentation PR.

If approved, the next branch should implement **Phase B — Local Validator Prototype** using fake fixtures only.
