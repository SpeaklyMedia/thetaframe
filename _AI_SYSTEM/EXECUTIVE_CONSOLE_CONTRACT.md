# ThetaFrame Executive Console Contract

Date: 2026-04-25
Status: Canonical product contract after C75 current-contract completion

## Source Authority

Primary transport source:
- `artifacts/arch1-executive-console-research-ingest/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1.zip`

Primary extracted planning sources:
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/02_STANDARDS/THETAFRAME_EXECUTIVE_CONSOLE_DESIGN_STANDARD__2026-04-23__R1.md`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/02_STANDARDS/THETAFRAME_CROSS_SURFACE_ADAPTATION_STANDARD__2026-04-23__R1.md`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/02_STANDARDS/THETAFRAME_MATERIAL_COLOR_TYPE_MOTION_STANDARD__2026-04-23__R1.md`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/03_THETAFRAME_SPEC/THETAFRAME_HERO_SURFACE_ARCHITECTURE__2026-04-23__R1.md`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/03_THETAFRAME_SPEC/THETAFRAME_HERO_MODULE_INVENTORY__2026-04-23__R1.json`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/03_THETAFRAME_SPEC/THETAFRAME_LANE_INTEGRATION_MAP__2026-04-23__R1.json`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/03_THETAFRAME_SPEC/THETAFRAME_VIEWPORT_AND_ASPECT_LAYOUT_MAP__2026-04-23__R1.json`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/04_CODEX_HANDOFF/THETAFRAME_ACCEPTANCE_CRITERIA__EXECUTIVE_CONSOLE__2026-04-23__R1.md`
- `artifacts/arch1-executive-console-research-ingest/extracted/ThetaFrame_ARCH1_Executive_Console_Research_Transport__2026-04-23__R1/04_CODEX_HANDOFF/THETAFRAME_IMPLEMENTATION_BACKLOG__EXECUTIVE_CONSOLE__2026-04-23__R1.json`

## Product Role

Locked naming:
- overall product name: `ThetaFrame`
- signed-in hero-surface name: `ThetaFrame Console`

Console role:
- signed-in home
- orientation shell across existing lanes
- premium command-console surface

Console is not:
- a replacement for lane routes
- a KPI dashboard clone
- a calendar-home shell
- a transcript-first assistant surface

Current repo truth remains:
- `/dashboard` is the shipped signed-in landing surface today
- `/console` is now implemented as a preview shell for all signed-in users
- `/dashboard` remains the default signed-in home until later proof justifies a change

## No-Drift Rules

These rules stay locked for future `/console` work:
- Daily / Now Frame remains the dominant object
- one dominant object per console; no equal-priority card wall
- lane truth remains authoritative over generic widgeting
- empty modules collapse instead of reserving dead space
- projected, imported, and AI-derived items must show provenance
- assistant surfaces remain draft-first, reviewable, and approval-gated
- external calendar data may appear as constraint horizon only, not as a month-grid hero
- Baby KB stays hidden from the user-visible Console surface
- background art may support atmosphere but cannot carry live operational hierarchy

## Cross-Surface Rules

Layout policy is based on window class and aspect ratio, not marketing device names.

Surface classes:
- Compact: phone widths
- Medium: tablets and small desktop windows
- Large: standard desktop
- Ultrawide: 21:9 productivity wides
- Super ultrawide: 32:9 curved classes
- Showcase: 6K / 8K proof surfaces

Density policy:
- more width buys spacing, hierarchy, and focus before it buys more modules
- 32:9 keeps primary text and actions centered
- phone Console is a compressed overview, not a shrunken desktop dashboard
- tablet is the first true two-pane console
- presentation or distance modes suppress low-value modules and inline forms

## Visual And Material Rules

Material posture:
- immersive midnight field
- operational islands
- matte-to-soft-glass surfaces

Core shell colors:
- shell midnight: `#092640`
- shell ink: `#032135`
- deep backdrop: `#001030`
- phi teal: `#00A6C7`
- phi blue: `#2E7FE8`
- reserved signal gold: `#D0B06A`

Current implementation token mapping:
- `--console-shell-midnight-rgb` -> shell midnight
- `--console-shell-ink-rgb` -> shell ink
- `--console-deep-backdrop-rgb` -> deep backdrop
- `--console-accent-rgb` -> phi teal
- `--console-accent-strong-rgb` -> phi blue
- `--console-signal-gold-rgb` -> reserved signal gold
- `--console-surface-*`, `--console-border-*`, and `--console-text-*` -> lane-scoped semantic surface, border, and text families for Console-only material treatment
- `.tf-console-panel`, `.tf-console-panel-hero`, `.tf-console-panel-muted`, `.tf-console-chip`, `.tf-console-chip-accent`, `.tf-console-cta-primary`, `.tf-console-cta-secondary`, and `.tf-console-provenance-chip` -> canonical Console material classes in `artifacts/thetaframe/src/index.css`

Guardrails:
- gold is reserved for sync, warning, risk, or background-job emphasis
- large readable titles beat dense module count
- atmospheric motion stays sparse and optional
- reduced motion must suppress ambient motion

## Module Contract

Required module model:
- `Now Frame`
  - source: Daily
  - role: dominant hero
  - current progress signal: one calm Tier A completion bar
- `Week Vector`
  - source: Weekly
  - role: supporting orientation
  - current progress signal: one compact weekly-steps completion ring
- `Constraint Horizon`
  - source: Life Ledger Events plus reminder queue truth
  - role: due-soon and obligations surface
  - current progress signal: one calm urgency strip for `due_now`, `near`, and `staged`
- `Lane Atlas`
  - source: lane access state
  - role: calm navigation overview
  - current support signal: one compact core-lane readiness row for `Today`, `This Week`, and `Goals`
- `Assistant Review`
  - source: approval-gated AI drafts
  - role: review queue, never transcript home
- `Continuity`
  - source: Vision
  - role: long-horizon signal
- `System Health`
  - source: platform state
  - role: sync, reminders, approvals, system health band
  - current progress signal: one segmented review-pressure bar for `draft`, `needs_review`, and `approval_gated`
- `REACH Capture`
  - conditional intake and review snapshot
- `BizDev Motion`
  - conditional follow-up/pipeline signal

Collapse rules:
- `Now Frame` never fully collapses
- `System Health` always shows at least one chip
- conditional modules hide when empty

## Lane Mapping

Lane representation rules:
- Daily -> hero `Now Frame`
- Weekly -> `Week Vector`
- Vision -> `Continuity`
- Life Ledger -> `Constraint Horizon`
- REACH -> conditional intake signal
- FollowUps / internal `bizdev` -> conditional motion signal
- Baby KB -> hidden admin-only signal, never a user-visible module
- Assistant -> draft cards with provenance and approval state

## Acceptance And Proof

The Console is only acceptable if it preserves these outcomes:
- answers where am I, what matters now, what needs review, and the safest next move in one glance
- keeps calm hierarchy under load
- avoids decorative dead modules

P0 screenshot proof must cover:
- `360x800`
- `390x844`
- `414x896`
- `820x1180`
- `2752x2064`
- `1920x1080`
- `5120x2160`
- `5120x1440`

Stretch validation may add centered-first super-wide proof surfaces, but it does not authorize orbit-edge secondaries by itself.

## Execution Order

Canonical packet sequence is now realized in repo-native form:
1. `EC-0` standards promotion -> shipped through the current Console SSOT docs
2. `EC-1` reuse inventory -> shipped through the receipt-backed local inventory artifacts
3. `EC-2` prototype route, shell, and live module activation -> shipped through C55-C58
4. `EC-3` screenshot proof -> shipped through C59
5. `EC-4` premium polish -> shipped through C60-C61
6. `EC-5` stretch validation -> shipped through C62

Current continuation direction after that packet:
1. C63 keeps `/dashboard` as the default signed-in home
2. C64-C70 harden Console preferences, truthful progress signals, calm support orientation, and the first two optional-lane support signals
3. current-contract completion is now closed; any next work stays narrow and read-only before any broader optional module family or home-switch experiment

Current planning artifact:
- `THETAFRAME_EXECUTIVE_CONSOLE_EXECUTION_PLAN__2026-04-23__R1.md`

## Current Status

This contract now governs the implemented preview shell, the closed current-contract baseline, and any future Console slices.

Current implementation truth:
- `/console` route exists
- signed-in nav exposes `Console`
- Console shell ships responsive layout buckets plus limited live `Now Frame` and `System Health`
- `Week Vector` is live as a read-only Weekly orientation block
- `Constraint Horizon` is live as a read-only Life Ledger Events/reminder surface
- `Lane Atlas` is live with permission-aware lane links
- `Lane Atlas` now includes one compact read-only core-lane readiness row above the lane links
- `Now Frame` is live as one Daily-derived object only
- `Week Vector` is live as Weekly theme, steps, non-negotiables, and recovery-plan reuse only
- `Week Vector` now reads real persisted Weekly step completion truth from the Weekly lane contract
- `Constraint Horizon` is live as reminder queue truth first, then upcoming dated Events fallback
- `Constraint Horizon` now includes one calm read-only urgency strip above the existing rows, derived from reminder queue truth first and fallback dated Events only when the reminder queue is quiet
- `System Health` is live as a minimal review-and-safety chip band
- `Now Frame` now includes a calm read-only Tier A completion bar derived from saved non-empty Daily Tier A tasks
- `Week Vector` now includes a compact read-only weekly-steps completion ring alongside the existing Weekly orientation content, backed by true saved Weekly step completion
- `Assistant Review` is live as one compact approval-gated draft queue across allowed lanes
- `Continuity` is live as one Vision-derived long-horizon anchor
- `System Health` now includes a calm segmented review-pressure bar under the existing chip band
- `REACH Capture` is now live as a conditional read-only REACH intake and review snapshot beneath `Continuity`
- `REACH Capture` uses existing REACH file and REACH draft truth only, shows up to two newest files, and collapses when the current session has no live REACH signal
- `FollowUps Motion` is now live as a conditional read-only FollowUps snapshot beneath `REACH Capture`
- `FollowUps Motion` uses existing FollowUps list and phase-summary truth only, shows up to two upcoming rows, and collapses when the current session has no live FollowUps signal
- full P0 Console screenshot proof now passes at `360x800`, `390x844`, `414x896`, `820x1180`, `2752x2064`, `1920x1080`, `5120x2160`, and `5120x1440`
- bounded C59 responsive remediation keeps signed-in nav on the mobile menu through tablet widths and promotes Console to a true two-pane layout at the `820x1180` representative tablet surface
- C60 premium polish keeps large-surface reading fields tighter, reinforces `Now Frame` dominance, narrows the support rail on premium tablet and ultrawide surfaces, and de-emphasizes non-operational support chrome
- C61 brand hardening moves Console shell, panel, chip, text, CTA, and provenance styling onto shared semantic Console tokens and utility classes in `artifacts/thetaframe/src/index.css`
- C62 stretch validation adds a centered-first `6400x1800` proof surface and keeps the tokenized Console passing the authenticated browser matrix with no bounded remediation required beyond the shipped centered reading-field rules
- C63 keeps `/dashboard` as the default signed-in home after reviewing the proof-backed, tokenized, and stretch-validated Console; no replacement-home approval is granted in this gate
- calendar projection is still deferred from `Constraint Horizon`
- Console review/apply and edit controls are still deferred to Dashboard and lane-owned surfaces
- 32:9 orbit-edge secondaries and deeper display-mode/material work are still deferred

It does not mean:
- `/dashboard` is deprecated
- Console is approved to replace Dashboard as the default signed-in home
- Console modules are already data-complete
- the existing neurodivergent-friendly lane-first contract is replaced

Continue to treat the current dashboard and lane surfaces as product truth for actual execution and editing workflows until later Console slices prove safe reuse.
