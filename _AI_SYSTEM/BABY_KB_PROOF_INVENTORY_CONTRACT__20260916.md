# Baby-KB Private Proof Inventory Contract

Generated: 2026-09-16
Status: planning contract / no runtime implementation
Depends on: `BABY_KB_PRODUCT_CONTRACT__20260916.md`
Current production truth: Daily Rhythm V1 is shipped; Baby-KB has no approved runtime, schema, route, ingestion pipeline, or answer UI.

## 1. Purpose

This contract defines how a future Baby-KB proof inventory should be governed before any source ingestion, local RAG, answer surface, upload UI, or production data model exists.

The goal is to make Baby-KB useful without letting private household data, medical material, or unverified claims leak into the public repo or into confident product answers.

The inventory is not a knowledge base by itself. It is an admission-control layer that answers:

- what source exists
- where it is allowed to live
- whether it contains private data
- whether it has been reviewed or redacted
- whether Baby-KB may cite it
- whether Baby-KB must refuse because verified proof is absent

## 2. Boundary

This document is a contract only.

It does not approve:

- production Baby-KB tables
- a public or signed-in Baby-KB route
- vector database use
- AI answer generation
- source upload UI
- local proof ingestion scripts
- committing private source files
- committing local runtime state
- production object storage
- caregiver sharing features

Any future implementation must be approved as a separate slice.

## 3. Proof Source Classes

Baby-KB must classify every possible source before use.

| Class | Meaning | Answer Eligibility |
| --- | --- | --- |
| `verified_local_proof` | Reviewed source material intentionally admitted into the local proof corpus. | May support sourced factual answers within scope. |
| `candidate_source` | Potentially useful material not yet reviewed, redacted, or admitted. | Must not support factual answers. |
| `caregiver_observation` | User-entered household notes, logs, or observations. | May support recall of what was logged; must not be treated as generalized proof. |
| `draft_or_unverified` | Imported, drafted, AI-generated, copied, or incomplete material awaiting review. | Must not support factual answers. |
| `rejected_or_retired` | Disallowed, stale, irrelevant, contradicted, unsafe, or superseded material. | Must never support answers. |

Required fallback for proof-seeking answers without eligible proof:

> AWAITING VERIFIED PROOF INGESTION.

Product copy can be refined later, but the behavior must remain: no verified proof means no confident proof-backed answer.

## 4. Allowed Source Categories

Allowed source categories are still subject to review, redaction, and storage-boundary checks.

Potentially allowed as `verified_local_proof`:

- pediatrician-provided instructions intentionally added by the user
- hospital or postpartum discharge instructions intentionally added by the user
- public pediatric or public health guidance from durable institutions
- product manuals for household/baby equipment, when used only for product-specific operation or safety references
- locally created household SOPs that are labeled as household practice, not medical authority
- checklists generated from reviewed sources with traceable citations back to the source

Potentially allowed only as `caregiver_observation`:

- feeding, sleep, diaper, comfort, or routine notes
- caregiver shift notes
- household prep notes
- parent recovery notes
- observations about what seemed to help or not help

Caregiver observations may help Baby-KB remember context, but they do not become medical or factual proof merely because they are logged.

## 5. Disallowed Source Categories

Baby-KB must not admit these as verified proof:

- mommy blogs, influencer posts, forums, or social media anecdotes
- uncited AI output
- scraped webpages without provenance and review
- generic internet snippets copied into notes
- sales pages presented as health guidance
- another family's private records
- another user's ThetaFrame data
- credentials, cookies, auth state, environment files, database URLs, or tokens
- private medical records committed to the public repo
- raw source files whose privacy/redaction status is unknown
- outdated, contradicted, or intentionally retired guidance

These may be rejected or kept outside Baby-KB entirely, depending on future governance.

## 6. Conceptual Inventory Record

This is a conceptual record, not an approved database schema.

```json
{
  "source_id": "",
  "title": "",
  "source_class": "candidate_source|verified_local_proof|caregiver_observation|draft_or_unverified|rejected_or_retired",
  "review_state": "candidate|needs_redaction|verified|rejected|retired",
  "storage_boundary": "public_repo_contract|private_local_source|local_runtime_state|private_object_storage|production_user_data",
  "contains_private_data": false,
  "redaction_status": "not_needed|pending|required|complete|not_safe_to_store",
  "citation_label": "",
  "admitted_by": "",
  "admitted_at": "",
  "reviewed_at": "",
  "expires_at": "",
  "source_path": "",
  "source_hash": "",
  "notes": ""
}
```

Future implementation may rename fields to match repository conventions, but it must preserve the distinctions between class, review state, storage boundary, privacy, redaction, provenance, and answer eligibility.

## 7. Review States

Every inventory item needs an explicit review state.

| State | Meaning | Required Behavior |
| --- | --- | --- |
| `candidate` | Source is known but not reviewed. | Not answer-eligible. |
| `needs_redaction` | Source may be useful but contains or may contain private details. | Not answer-eligible until redaction is complete. |
| `verified` | Source has been reviewed, boundary-approved, and admitted. | May be answer-eligible if scope matches. |
| `rejected` | Source is not allowed for Baby-KB. | Never answer-eligible. |
| `retired` | Source was once useful but is stale, superseded, or no longer permitted. | Never answer-eligible for new answers. |

Verification must be deliberate. A file being present on disk is not proof admission.

## 8. Storage Boundaries

Storage location controls what may be committed, indexed, or exposed.

| Boundary | Allowed Contents | Commit Rule |
| --- | --- | --- |
| `public_repo_contract` | Generic schemas, contracts, policies, and examples with no private household data. | May be committed. |
| `private_local_source` | User-owned private source files for local review. | Must not be committed. |
| `local_runtime_state` | Generated local inventory, indexes, hashes, and review notes. | Must not be committed unless explicitly sanitized and approved. |
| `private_object_storage` | Future approved private storage for user-scoped source material. | Requires separate architecture/security approval. |
| `production_user_data` | Future approved user-scoped database records. | Requires schema, auth, RLS/user-ownership, and migration review. |

The public repo may contain Baby-KB contracts. It must not contain private baby, caregiver, medical, authentication, or household state.

## 9. Redaction Rules

A source that contains private data must be reviewed before any indexing or transport.

Required redaction considerations:

- names, addresses, phone numbers, account identifiers, and patient identifiers
- hospital, clinic, insurance, and appointment identifiers
- photos, scans, or documents containing personal details
- exact birth details or family details when unnecessary for the use case
- sensitive caregiver notes not needed for proof-backed answers
- embedded metadata in PDFs, images, or exported documents

If redaction cannot be proven safe, the source must remain local/private and not answer-eligible.

## 10. Provenance and Integrity

Every admitted proof source needs traceability.

Minimum provenance:

- stable title
- source class
- source boundary
- admission reviewer or process
- admission timestamp
- citation label for UI display
- source hash or equivalent integrity marker when practical
- review/expiry date for time-sensitive guidance

Baby-KB should be able to explain what it relied on without exposing private source contents in public reports.

## 11. Answer Behavior

Future Baby-KB answer surfaces must follow these rules.

- Use only `verified_local_proof` for proof-backed factual claims.
- Cite the source label or approved citation metadata.
- Show uncertainty when source coverage is incomplete.
- If no verified source supports the question, use the proof-missing fallback.
- Treat `caregiver_observation` as household memory, not authority.
- Never transform `candidate_source`, `draft_or_unverified`, `rejected_or_retired`, or unreviewed files into confident answers.
- For urgent medical or safety concerns, direct the user to appropriate human medical/emergency help instead of relying on local answers.

## 12. Relationship to Daily Rhythm

Daily Rhythm remains the current working product loop.

Baby-KB proof inventory can later support Daily Rhythm in small ways:

- Night Reset can remind the user to capture baby/household open loops.
- A future handoff card can show verified household context.
- First Move can reference a caregiver/household action if the user chooses it.
- Dashboard can eventually launch a protected Baby-KB card.

Baby-KB must not create a parallel planning system or replace Daily Rhythm.

## 13. QA Gates Before Runtime Implementation

Before any proof inventory runtime exists, a future implementation plan must prove:

- private source files are ignored/untracked
- generated local indexes are ignored/untracked unless explicitly sanitized
- auth state, cookies, tokens, Vercel env files, Clerk keys, and database URLs are excluded from all transports
- source-class transitions are tested
- unverified sources cannot be used for proof-backed answers
- rejected and retired sources cannot be used for proof-backed answers
- caregiver observations are labeled as observations
- user ownership is enforced for production/user data if any exists
- frontend bundles do not import Node filesystem APIs
- emergency/urgent copy does not delay real-world care
- no shame, scorekeeping, or blame mechanics are introduced

## 14. Implementation Deferrals

Explicitly defer:

- vector DB selection
- embedding generation
- RAG pipelines
- answer generation
- upload UI
- production Baby-KB migrations
- proof-source object storage
- caregiver account sharing
- shift handoff runtime
- Slack/event-loop automation
- browser UI for Baby-KB
- production deployment of any Baby-KB proof feature

The next safe technical slice is a design-only data-model draft for shift handoff or a local-only proof inventory implementation plan, not production ingestion.

## 15. Source Evidence

This contract is derived from:

- `BABY_KB_PRODUCT_CONTRACT__20260916.md`
- `SEPTEMBER_FOCUS_BABY_KB_RECONCILIATION__20260916.md`
- read-only inspection of the preserved September dirty worktree

No files from the preserved dirty worktree are copied into production source by this contract.
