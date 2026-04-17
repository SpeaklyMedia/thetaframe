# ThetaFrame UI Rebuild Roadmap

Date: 2026-04-13

Status sync: 2026-04-16

## Objective
Rebuild the local ThetaFrame interface toward the Replit `ThetaFrame 2.0` visual direction without drifting from the accepted product contract already validated in production.

This roadmap remains locked behind the ARCH-1 assimilation gate. It is the implementation target only after the design-selection pass is reviewed and normalized locally.

## Pre-Implementation Gate
Do not begin any UI rebuild work until all of the following are true:
- the ARCH-1 response was produced from `THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
- the response is complete against the required output shape in `THETAFRAME_ARCH1_HANDOFF.md`
- every recommendation is classified in `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md`
- every `adopt with constraint` recommendation names the exact ThetaFrame constraint it must obey
- every `reject due to product drift` recommendation cites the product-purpose conflict
- unresolved deltas are reduced to explicit narrow decisions

If the chosen execution lane is a Replit full-artifact pass instead of direct local implementation, also use:
- `THETAFRAME_REPLIT_R2_ACTIVATION_INGEST.md`
- `THETAFRAME_REPLIT_R2_OPERATOR_RUNBOOK.md`

Those documents add brand/loading authority and artifact-return requirements, but they do not change the behavioral contract or the phase order below.

## Rebuild Source Priority
When decisions conflict during implementation planning, use this order:
1. `THETAFRAME_WORKFLOW_AUDIT.md`
2. `THETAFRAME_QA_REPORT.md`
3. accepted decisions from `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md`
4. Replit visual reference material from the transport

## Phase Order
1. Shared shell
2. Core operational lanes
3. Support and reference lanes
4. Deferred phase-2 constraints

## Phase 1: Shared Shell

### Visual Goal
- adopt the calmer Replit shell language
- reduce chrome noise
- make lane identity readable through atmosphere, spacing, and top-of-page hierarchy

### Hierarchy Goal
- shell should orient without competing with page content
- every lane should start with one clear top card/hero region before secondary information
- onboarding should read as orientation, not interruption

### Planned Changes
- rebuild header and navigation treatment
- standardize lane background atmosphere and centered content rails
- standardize top-of-page hero framing across lanes
- restyle the signed-in onboarding modal around calmer card hierarchy
- preserve assistant entry placement as a utility affordance

### Must Remain Behaviorally Unchanged
- current routing and first-allowed-lane landing
- current permission gating and access-denied behavior
- current user mode persistence behavior
- current onboarding semantics

### Acceptance Criteria
- shell feels visually aligned to Replit without changing route behavior
- users still land in the first allowed lane
- onboarding modal remains orientation-only
- mode selection still persists across refresh

## Phase 2: Core Operational Lanes

### Daily
- Visual goal: setup-first, current-day-first, low-noise execution lane
- Hierarchy goal: energy state and protected work appear before supporting context
- Planned changes:
  - rebuild top hero and setup sections
  - keep Daily as the current-day anchor
  - preserve Skip Protocol as a nearby recovery affordance
- Must remain unchanged:
  - Daily first-run setup semantics
  - Tier A / Tier B execution role
  - onboarding clears only after real mutation
- Acceptance criteria:
  - Daily still reads as today’s pacing and execution lane
  - Baby KB promotions still land only in `Tier B`

### Weekly
- Visual goal: theme-led weekly planning surface with clearer primary/secondary split
- Hierarchy goal: weekly theme and protected step appear before supporting explanation
- Planned changes:
  - rebuild week header and top action area
  - keep Skip Protocol close to the top
  - use cleaner card grouping for steps and non-negotiables
- Must remain unchanged:
  - weekly theme / steps / recovery semantics
  - onboarding and save behavior
- Acceptance criteria:
  - Weekly still reads as alignment and protection, not a backlog dump
  - Baby KB promotions still land only in `steps`

### Vision
- Visual goal: longer-range lane with stronger headline and next-step clarity
- Hierarchy goal: long-view goal and next visible step appear before secondary explanation
- Planned changes:
  - rebuild hero and first-input framing
  - keep next visible action legible near the top
- Must remain unchanged:
  - goal + next-step semantics
  - onboarding and mutation behavior
- Acceptance criteria:
  - Vision still reads as continuity plus next visible action
  - Baby KB promotions still land only in `nextSteps`

## Phase 3: Support And Reference Lanes

### Life Ledger
- Visual goal: calmer obligations/plans lane with better tab and empty-state hierarchy
- Hierarchy goal: users should immediately understand what belongs in each tab
- Planned changes:
  - rebuild header, tab rail, and empty-state treatment
  - clarify primary action vs supporting context
- Must remain unchanged:
  - current tab structure and CRUD semantics
  - current onboarding logic

### Baby KB Inside Life Ledger
- Visual goal: supporting review/provenance/actionability lane that inherits the Life Ledger system
- Hierarchy goal: clarify what is framework, what is verified, and what is already in motion
- Planned changes:
  - rebuild review board and items-in-motion presentation using the new shared shell language
  - keep linked target affordances visible but subordinate
  - add account assignment and rolling event projection without promoting Baby KB into a top-level planner
  - let Daily / Weekly / Vision consume Baby-derived consequences as hero-support data only
- Must remain unchanged:
  - admin-only placement inside Life Ledger
  - promotion/import/provenance behavior
- Acceptance criteria:
  - Baby KB improves overview and action selection
  - Baby KB still does not read as a standalone planner
  - rolling Baby work lands in Life Ledger Events first, then rises into hero surfaces when relevant

### REACH
- Visual goal: cleaner source/input lane with stronger file-list hierarchy
- Hierarchy goal: upload, inspect, and reuse should be visually obvious
- Must remain unchanged:
  - normal upload URL -> storage PUT -> file record flow

### Admin
- Visual goal: governance lane with clearer action grouping and lower visual noise
- Hierarchy goal: user selection and permission/preset actions should be primary
- Must remain unchanged:
  - current admin access semantics
  - current preset and permission mutation behavior

## Phase 4: Integration And Delivery Extensions

This phase remains downstream of the accepted shell and lane hierarchy. It should extend ThetaFrame's existing product model, not replace it.

### Current Execution Status
- R3 shell and brand baseline: complete
- `C0` through `C13A`: complete
- `C13B` through `C13E`: complete
- Baby KB `Baby-1`, `Baby-2`, and `Baby-3`: complete
- `C14` through `C28`: complete
- Canonical browser QA gate: complete at `12` routes with `0` skips
- Production surface cleanup: complete
- Active implementation track: `4D` / `C29` complete; `C30` access lane hardening complete with Basic default, Select Authorized module grants, and Admin all-access semantics

### 4A: Artwork Introduction And Brand-System Completion
- introduce the remaining approved brand assets only where they improve identity, onboarding, or positioning
- keep operational lane comprehension independent of artwork
- keep loading art reserved for cold start, explicit sync, or long-running jobs

### 4B: Calendar And Reminder Foundation
- define Google Calendar link identity, import/export states, and reconciliation rules
- preserve ThetaFrame as the planning-intent source rather than turning the app into a calendar clone
- land imported dated commitments inside meaningful existing surfaces
  - foundation is now real enough locally through reminder-aware `events`, execution controls, queueing, and Baby-derived projection
  - calendar sync and external transport remain deferred until a later justified slice

### 4C: Mobile OS Integration Foundation
- define iPhone and Android deep-link, notification, and quick-capture foundations
- reduce entry friction without creating a second mobile-specific product model
- keep captured items routed into existing ThetaFrame lanes
  - foundation is now real enough locally through deep links, notification taxonomy, simulated dispatch, and Daily quick capture
  - real push transport and broader capture expansion remain deferred unless `4D` later needs them

### 4D: AI-Assisted Population And Approval Layer
- define provider-agnostic draft, provenance, confidence, and approval models
- use ThetaFrame's lane structure to help AI classify and populate the right surface
- reduce manual entry without allowing silent high-stakes auto-commit
  - use this layer for Baby KB suggestion-only assignment and scheduling help, not silent rollout
  - Baby assignment suggestions are implemented as approval-gated admin review; real provider-generated production proof passed after switching ThetaFrame to Yuki's working OpenRouter provider path

### 4E: Post-Integration Explainer Media
- produce a short explainer only after the integration foundations are real enough to demonstrate
- use real product screenshots
- cap the delivery at 3-5 slides and 60-90 seconds

These extensions should be planned and implemented against the final shell and hierarchy system, not used to reopen the shell redesign itself.

## Global Acceptance Model
- Replit visual influence may improve clarity, calmness, and hierarchy
- current ThetaFrame product semantics remain authoritative
- no new top-level modules should be introduced by the rebuild
- no phase should assume artwork is available
- no phase should break Baby KB’s current role as an admin-only feeder lane
- no phase should change current onboarding from orientation-only into progress completion logic

## Rebuild Gate
Do not begin implementation until:
- ARCH-1 output is reviewed
- `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md` is fully classified
- this roadmap is updated to reflect only accepted or constrained decisions

## First Planning Pass After Gate
Once the gate is passed, the first implementation planning turn should produce:
- a shared-shell component map
- a page-by-page hierarchy translation for Daily, Weekly, and Vision
- a support-lane translation for Life Ledger, Baby KB, REACH, and Admin
- explicit acceptance criteria per phase tied back to current product purpose

## Current Next Sequence
1. `4E` explainer media using real product screenshots now that Baby-4 is real enough to demo
2. real push transport or broader mobile capture only if later justified and explicitly selected
3. preserve the C29 OpenRouter provider mapping and fenced-JSON parser hardening
