# Baby-KB Shift Handoff Model Draft

Generated: 2026-09-16
Status: planning/data-model draft / no runtime implementation
Depends on:
- `BABY_KB_PRODUCT_CONTRACT__20260916.md`
- `BABY_KB_PROOF_INVENTORY_CONTRACT__20260916.md`
Current production truth: Daily Rhythm V1 is shipped; `/dashboard` remains canonical signed-in home; Baby-KB has no approved production schema, route, API, or runtime.

## 1. Purpose

This draft defines a future Baby-KB shift handoff model that can support household care continuity without becoming a medical app, family social network, surveillance dashboard, or shame/scorekeeping system.

The goal is to help caregivers answer:

- who is currently responsible
- what just happened
- what needs attention next
- what can wait
- what would help the off-duty caregiver recover
- what context should survive memory fatigue

This is a model draft only. It does not approve production tables, migrations, API routes, UI, auth roles, notifications, or automation.

## 2. Product Boundary

Baby-KB shift handoff should support practical coordination.

It must not become:

- medical diagnosis or treatment guidance
- a substitute for pediatric/postpartum clinical advice
- a blame ledger between caregivers
- a productivity score for parents
- a public social feed
- a notification-heavy nagging system
- a replacement for Daily Rhythm

Daily Rhythm remains the main daily operating loop. Baby-KB handoff can later appear as an optional protected module or compact card.

## 3. Core Concepts

Candidate conceptual objects:

- `care_context`
- `caregiver_profile`
- `care_shift`
- `shift_handoff`
- `handoff_item`
- `baby_care_event`
- `routine_window`
- `sleep_opportunity`
- `support_need`
- `proof_reference`

These names are conceptual. Future implementation should align with repository naming conventions and existing PostgreSQL/Drizzle/user-ownership patterns if production persistence is approved.

## 4. Conceptual Records

### `care_context`

Represents a protected household or child-care context owned by a user or approved household boundary.

```json
{
  "id": "",
  "owner_user_id": "",
  "label": "Baby / Household",
  "timezone": "",
  "active": true,
  "created_at": "",
  "updated_at": ""
}
```

V1 planning note: do not implement shared household accounts until access governance is separately approved. The first implementation can be single-user/private.

### `caregiver_profile`

Represents a configurable caregiver label inside the user's private context.

```json
{
  "id": "",
  "care_context_id": "",
  "label": "Parent A",
  "role_label": "",
  "color_key": "",
  "active": true,
  "created_at": "",
  "updated_at": ""
}
```

Labels should be user-defined. Do not hard-code Mark, Megan, parent, mom, dad, partner, or family structure into the schema.

### `care_shift`

Represents a bounded period where one caregiver is primarily responsible or a handoff is expected.

```json
{
  "id": "",
  "care_context_id": "",
  "active_caregiver_id": "",
  "start_at": "",
  "end_at": null,
  "status": "planned|active|completed|cancelled",
  "handoff_summary": "",
  "created_by_user_id": "",
  "created_at": "",
  "updated_at": ""
}
```

A shift should not imply blame or perfect adherence. It is context for coordination.

### `shift_handoff`

Represents the actual transition note between one care period and the next.

```json
{
  "id": "",
  "care_context_id": "",
  "from_caregiver_id": null,
  "to_caregiver_id": null,
  "related_shift_id": null,
  "handoff_at": "",
  "summary": "",
  "next_action": "",
  "watch_for": "",
  "can_wait": "",
  "support_needed": "",
  "created_by_user_id": "",
  "created_at": "",
  "updated_at": ""
}
```

The model should favor short handoff clarity over exhaustive logging.

### `handoff_item`

Represents one actionable or observable handoff line.

```json
{
  "id": "",
  "handoff_id": "",
  "item_type": "next_action|watch_for|can_wait|support|note",
  "label": "",
  "details": "",
  "priority": "normal|important|urgent_human_help",
  "status": "open|done|dismissed",
  "created_at": "",
  "updated_at": ""
}
```

`urgent_human_help` must not become local medical instruction. It should route to appropriate real-world care guidance.

### `baby_care_event`

Represents an observed event, not a proof-backed medical claim.

```json
{
  "id": "",
  "care_context_id": "",
  "event_type": "feed|sleep|diaper|comfort|medicine_note|appointment_note|custom",
  "observed_at": "",
  "summary": "",
  "details": "",
  "entered_by_user_id": "",
  "source_class": "caregiver_observation",
  "created_at": "",
  "updated_at": ""
}
```

Medicine or appointment notes require careful UX language and should not convert into dosing advice unless a later proof-backed workflow is explicitly approved.

### `routine_window`

Represents an expected rhythm or window, not a rigid schedule.

```json
{
  "id": "",
  "care_context_id": "",
  "label": "",
  "window_type": "sleep|feed|prep|caregiver_recovery|custom",
  "starts_after": "",
  "ends_before": "",
  "flexibility_note": "",
  "active": true,
  "created_at": "",
  "updated_at": ""
}
```

This should remain flexible. Do not recreate a punitive baby habit tracker.

### `sleep_opportunity`

Represents a protected recovery opportunity for a caregiver.

```json
{
  "id": "",
  "care_context_id": "",
  "caregiver_id": "",
  "planned_start_at": "",
  "planned_end_at": "",
  "actual_start_at": null,
  "actual_end_at": null,
  "status": "planned|protected|missed|completed|cancelled",
  "support_note": "",
  "created_at": "",
  "updated_at": ""
}
```

Missed recovery should not be framed as failure. It should help the household adjust support.

### `proof_reference`

Represents a safe pointer from a handoff item or care note to an admitted proof source.

```json
{
  "id": "",
  "related_entity_type": "handoff_item|baby_care_event|routine_window|support_need",
  "related_entity_id": "",
  "proof_source_id": "",
  "citation_label": "",
  "created_at": ""
}
```

Only `verified_local_proof` sources from the proof inventory contract may back factual guidance.

## 5. Minimal First Runtime Slice Candidate

If approved later, the smallest useful runtime slice is not the full model.

Recommended MVP runtime subset:

1. Single-user private `care_context` created implicitly.
2. Configurable caregiver labels stored privately.
3. Current `shift_handoff` with short fields:
   - `summary`
   - `next_action`
   - `watch_for`
   - `can_wait`
   - `support_needed`
4. Optional Daily Rhythm card linking to the handoff.
5. No AI, no proof ingestion, no sharing, no notifications.

This creates useful continuity without overbuilding.

## 6. Relationship to Daily Rhythm

Daily Rhythm owns the daily loop.

Possible future integrations:

- Night Reset `Prepare` can include a small handoff prompt.
- Daily Dashboard can show a compact protected “Baby / Household Handoff” card.
- `First Move` can optionally be set from a handoff `next_action` if the user chooses it.
- Tier B / Can Wait can receive non-urgent household open loops.

Do not make Baby-KB the default signed-in home. Do not change `/dashboard` routing as part of this model.

## 7. Auth and Ownership Requirements

Before production persistence, Baby-KB handoff data must prove:

- every row is user-owned or context-owned through an explicit access model
- unauthenticated access is rejected
- users cannot read another user's care context
- users cannot write another user's care context
- caregiver labels do not imply external accounts unless sharing is approved
- shared household access, if ever added, has explicit invite/role/audit behavior

The first implementation should be single-user/private unless a later approval authorizes household sharing.

## 8. Privacy Requirements

Baby-KB handoff records may contain sensitive child, caregiver, household, sleep, health, or schedule information.

Blocked by default:

- committing live handoff state to the public repository
- committing private source documents
- packaging baby/caregiver runtime state in return transports
- exposing handoff state on public routes
- storing auth state, cookies, Clerk tokens, Vercel env files, or database URLs in reports
- using another real user's data for QA

Development QA must use disposable or test-only data.

## 9. Safety and Copy Requirements

UI copy should be calm, practical, and non-judgmental.

Required patterns:

- “What should the next caregiver know?” instead of “What did you fail to do?”
- “Can wait” instead of “ignored” or “missed”
- “Support needed” instead of “problem”
- “Get medical help / call your clinician / emergency services” for urgent safety concerns
- “Logged observation” for caregiver-entered notes
- “According to [source]” for proof-backed guidance

Avoid:

- shame language
- caregiver scoring
- competitive metrics
- punitive streaks
- false certainty
- medical diagnosis language

## 10. Implementation Placement Rules

Do not copy the preserved September filesystem utilities into frontend source.

Future implementation should follow these placement rules:

- React UI can render handoff forms and summaries.
- Server/API code should own persistence and auth checks.
- Local proof tools, if any, belong in scripts/server/Astro-runtime lanes, not browser bundles.
- Production persistence should follow existing PostgreSQL + Drizzle conventions.
- Local-only private state should be governed outside public source.

## 11. QA Gates Before Implementation

Any runtime Baby-KB handoff slice must pass:

- schema review if new tables are added
- authenticated route tests
- user ownership tests
- read-after-write tests
- mobile/responsive browser QA
- keyboard/accessibility checks
- no public route exposure
- no bundled Node filesystem imports in frontend
- no private runtime state committed
- no proof-backed guidance without verified proof
- Daily Rhythm remains intact
- `/dashboard` remains canonical unless explicitly changed by later governance

## 12. Explicit Deferrals

Defer until separately approved:

- shared caregiver accounts
- partner invitation flows
- push notifications
- SMS/Slack reminders
- AI handoff summaries
- proof-backed baby-care Q&A
- vector search
- production proof-source storage
- medication/dosing workflows
- clinical alert workflows
- automatic schedule optimization
- timeline analytics
- scoring, badges, or streaks

## 13. Source Evidence

This draft is derived from:

- `BABY_KB_PRODUCT_CONTRACT__20260916.md`
- `BABY_KB_PROOF_INVENTORY_CONTRACT__20260916.md`
- `SEPTEMBER_FOCUS_BABY_KB_RECONCILIATION__20260916.md`
- read-only inspection of the preserved September dirty worktree

No preserved dirty-worktree runtime files are copied into production source by this draft.
