# ThetaFrame Phase 4 Execution Plan

Date: 2026-04-14

This document translates the returned ARCH-1 PM master KB packet into a local no-drift execution plan for the next development lane.

## Planning Status
- R3 shell and brand baseline: complete
- public production branding: verified
- ARCH-1 PM next-lane matrix: returned and passed
- `C0` through `C13A`: complete
- `C13B` through `C13E`: complete
- Baby KB `Baby-1`, `Baby-2`, and `Baby-3`: complete
- `C14` through `C28`: complete
- canonical browser QA gate: complete at `12` routes with `0` skips
- production surface cleanup: complete
- current implementation authorization: `C29` Baby-4 real generated draft closeout complete; `C30` access lane hardening complete; next authorized lane should be `4E` explainer, paid-lane packaging definition, or an explicitly requested push/mobile follow-up

## Approved Phase Split

### 4A: Artwork Introduction And Brand-System Completion
Scope:
- limited brand placements that support identity and orientation
- no operational lane dependence on artwork
- reserve loading art for cold start, explicit sync, or long-running jobs

Exit criteria:
- allowed surfaces are documented
- hierarchy remains legible without image support

### 4B: Calendar And Reminder Foundation
Scope:
- link identity model
- import/export status model
- reconciliation placeholder states
- source-of-truth rules before sync behavior
- Baby KB rolling event and reminder projection once dated semantics are stable
- reminder-aware event execution, queueing, and outbox simulation are now real locally

Exit criteria:
- imported items map into meaningful ThetaFrame surfaces
- exported items are intentional and traceable
- real calendar sync remains deferred

### 4C: Mobile OS Integration Foundation
Scope:
- deep-link map
- notification taxonomy
- quick-capture routing model
- no alternate mobile IA
- simulated device registration/dispatch and Daily shortcut capture are now real locally

Exit criteria:
- capture reaches the correct existing lane in minimal steps
- notifications deep-link exactly
- real push transport remains deferred

### 4D: AI-Assisted Population And Approval Layer
Scope:
- provider-agnostic draft model
- provenance model
- confidence and approval policy
- no silent auto-commit for high-stakes changes
- Baby KB assignment and scheduling suggestions as approval-gated drafts, not direct writes

Exit criteria:
- messy input can become a lane-correct draft
- approval and confidence are explicit

### 4E: Post-Integration Explainer Media
Scope:
- 3-5 slide explainer after 4B/4C/4D are real enough to show
- use real screenshots only

Exit criteria:
- concise explanation of why ThetaFrame works
- concise explanation of how to start using it

## Recommended Local Task Order

### Baby KB track
- Baby-1: display and assignment flow refresh inside the existing admin-only Baby tab — complete
- Baby-2: rolling event projection into Life Ledger Events with reminder-policy placeholders — complete
- Baby-3: Daily / Weekly / Vision hero consequence read models — complete
- Baby-4: AI-assisted Baby assignment and scheduling suggestions — complete with real provider-generated production proof

### Delivered since Phase 4 activation
- `C13B` through `C13E`: non-`baby` Life Ledger AI apply matrix complete
- `C14` and `C15`: Life Ledger `events` read model and execution controls complete
- `C16` through `C19`: browser QA framework, auth-state capture, and closeout groundwork complete
- `C20` through `C24`: reminder, queue, outbox, and simulated device-delivery foundation complete
- `C25`: Daily mobile quick capture complete
- `C26`: production surface cleanup and full browser gate coverage complete
- `C27`: roadmap rebaseline and `4D` activation complete
- `C28`: Baby-4 assignment suggestion route, draft review UI, and seeded apply proof complete
- `C29`: Baby-4 real provider-generated draft, approve/apply proof, and cleanup complete
- `C30`: access lane framework hardened around Basic default, Select Authorized module grants, Admin all-access, and route-matrix browser QA hooks

### C0: Authority Bind And Repo Mapping
Deliverables:
- map the canonical repo's existing lane/data models against the returned integration contract pack
- identify where shared metadata can live without breaking current app semantics
- emit a missing-field or mismatch receipt if needed

Not included:
- UI changes
- backend mutation changes

### C1: Mint Repo-Native Shared Integration Contract Pack
Deliverables:
- TypeScript types for integration enums and object metadata
- Zod schemas where runtime validation is needed
- provenance, approval, and external-link reference models
- local path decisions for these contracts in the monorepo

Not included:
- Google Calendar API wiring
- mobile notifications
- AI provider integration

### C2: Low-Risk 4A Brand/Loading Placements
Deliverables:
- only if still needed after authority bind
- no art-heavy operational lane changes

### C3: Calendar Identity And Link Scaffold
Deliverables:
- schema-level calendar link model
- placeholder UI states for linked/imported/exported/conflicted

### C4: Mobile Deep-Link And Notification Scaffold
Deliverables:
- route-safe deep-link map
- notification category/taxonomy
- quick-capture routing stubs

### C5: AI Draft, Provenance, And Approval Scaffold
Deliverables:
- AI draft object model
- review status mapping
- approval-gated UI state skeletons

### C6: Receipts And Proof
Deliverables:
- changed-file manifest
- build/typecheck receipt
- assumptions/deviations note
- one best next action

## Immediate Recommendation
The next implementation turn should stay narrow:
1. move to `4E` explainer media using real product screenshots now that Baby-4 is demonstrable
2. keep real push transport and broader mobile expansion deferred unless explicitly selected as the next slice
3. preserve the C29 OpenRouter provider mapping and fenced-JSON parser hardening

This keeps the repo aligned with the returned packet while avoiding drift into broad partial integrations.

## Guardrails
- no new top-level inbox
- no separate mobile mental model
- no calendar-as-source-of-truth behavior
- no AI-first shell or silent high-stakes automation
- no Baby KB promotion into a top-level planner

## Suggested Repo-Native Outputs For The Next Turn
- one `C29` receipt for Baby-4 real generated draft closeout
- one provider-env receipt note that records presence only, never secret values
- one follow-on hardening receipt only if real generation exposes approval/apply gaps

## 2026-04-16 C29 Provider Update

Yuki's live Render provider env was copied into ThetaFrame Vercel Production by name mapping only; secret values were not recorded:
- `AI_INTEGRATIONS_OPENAI_API_KEY` -> `OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL` -> `OPENAI_BASE_URL`

Production was redeployed and the canonical browser gate passed at `12` routes with `0` skips. The targeted Baby-4 real-generation proof reached the provider path but returned wrapped `503` with upstream `HTTP 401`, so no real `baby_kb_assignment_draft` was minted. The temporary proof Baby KB entry was cleaned up.

Follow-up investigation found that Yuki's working text-generation path uses `AI_INTEGRATIONS_OPENROUTER_*`, while the copied `AI_INTEGRATIONS_OPENAI_*` pair pointed official OpenAI at an OpenRouter-style key. ThetaFrame production was corrected to use Yuki's OpenRouter key/base URL through the existing `OPENAI_API_KEY` / `OPENAI_BASE_URL` contract. A narrow parser hardening patch accepts provider JSON wrapped in Markdown code fences.

Final C29 proof passed:
- generation `201`
- generated draft id `36`
- draft kind `baby_kb_assignment_draft`
- approve `200`
- apply `200` with Baby assignment id `8`
- cleanup `200` assignment supersede and `204` temporary source delete
- canonical browser gate `12` passes, `0` skips

Current next action: start `4E` explainer media with real screenshots, or explicitly select real push transport as a separate follow-up.
