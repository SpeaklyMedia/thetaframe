# Integration Contract Authority Binding

Date: 2026-04-14

This note binds the canonical ThetaFrame repo to the returned ARCH-1 PM master KB integration contract materials for the `C0/C1` foundation slice only.

## Governing Sources

Use these in order when planning or implementing Phase 4 integration foundations:

1. `artifacts/arch1-pm-return-ingest/extracted/ThetaFrame_ARCH1_Master_KB_Codex_Transport__2026-04-14__R1/03_UPLOADED_SOURCE_PACKETS/THETAFRAME_ARCH1_TRANSPORT__2026-04-11__R1.zip`
2. `artifacts/arch1-pm-return-ingest/extracted/ThetaFrame_ARCH1_Master_KB_Codex_Transport__2026-04-14__R1/01_MASTER_KB/THETAFRAME_MASTER_KB__MACHINE_READABLE__2026-04-14__R1.json`
3. `artifacts/arch1-pm-return-ingest/extracted/ThetaFrame_ARCH1_Master_KB_Codex_Transport__2026-04-14__R1/01_MASTER_KB/THETAFRAME_SHARED_INTEGRATION_CONTRACT_PACK__2026-04-14__R1.json`

These sources are authoritative for:
- integration enums and metadata primitives
- lane extension and integration binding intent
- approval and provenance policy primitives

They are not yet authoritative for:
- database schema changes
- OpenAPI changes
- route additions
- UI behavior beyond future scaffold planning

## Current Repo Surfaces That Already Match

### Canonical lane model
The repo already has the canonical operating lanes expected by the returned packet:
- `daily`
- `weekly`
- `vision`
- `bizdev`
- `life-ledger`
- `reach`
- `admin`

These exist as live protected routes and module-access surfaces in the current frontend and API server.

### Baby KB precedent
Baby KB already provides a working precedent for the following integration-contract concepts:
- provenance-carrying materializations
- gated admin-only review state
- explicit promotion into live operating lanes
- operator-controlled mutation instead of silent auto-commit

Relevant current precedents:
- parent packet materializations
- Baby KB promotions
- bulk admin review updates

### Existing no-drift product contract
The repo already preserves the required lane meanings:
- Daily = current-day execution
- Weekly = alignment and protection
- Vision = continuity and next visible step
- Life Ledger = structured obligations and plans
- Baby KB = admin-only feeder inside Life Ledger

## Current Repo Gaps That Are Intentionally Still Absent

The following do not yet exist in the canonical repo and should remain absent during `C0/C1`:
- shared contract package for calendar/mobile/AI primitives
- persisted calendar-link schemas
- persisted notification schemas
- persisted external-link metadata
- persisted AI-draft schemas
- provider-specific Google Calendar, iPhone, Android, or AI integration code

## Explicit Mismatches To Preserve As Receipts

### Deep-link mismatch
The returned packet includes mobile deep-link targets such as `thetaframe://daily/new`.
These are planning targets only. They are not current repo routes and should not be implemented during `C0/C1`.

### Notification and widget bindings mismatch
The returned packet includes provider/channel concepts for:
- iOS notifications
- Android notifications
- widgets
- shortcuts

These are contract placeholders only. No runtime bindings exist yet, and no runtime bindings are authorized during `C0/C1`.

### Persistence mismatch
The returned contract pack models integration metadata such as:
- `theta_object_id`
- `external_link_refs`
- `reminder_policy`
- approval and provenance fields

These are not persisted in the current repo yet. `C0/C1` may define repo-native TypeScript and Zod surfaces for them, but may not add DB columns, new tables, or OpenAPI shapes.

## Implementation Boundary For `C0/C1`

Allowed:
- authority binding docs
- a standalone shared contracts workspace package
- repo-native TypeScript types
- repo-native Zod schemas
- readonly lane/integration binding maps
- deterministic ID and approval helpers

Not allowed:
- calendar client wiring
- mobile notification services
- deep-link route handling
- AI provider integration
- DB migrations
- OpenAPI changes
- frontend or API runtime feature wiring

## Immediate Next Use

The next implementation slice should:
1. mint the standalone shared contracts package
2. validate it with library and workspace typecheck/build
3. stop before any `4B/4C/4D` scaffold work
