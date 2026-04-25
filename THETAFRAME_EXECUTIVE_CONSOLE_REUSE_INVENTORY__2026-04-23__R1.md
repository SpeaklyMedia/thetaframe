# ThetaFrame Executive Console Reuse Inventory

Date: 2026-04-23
Status: PASS
Scope: `EC-015` only

## Summary

This slice inventories reusable visual dashboard and shell primitives for a future ThetaFrame `/console` without changing runtime code, routes, or QA behavior.

Signed-in landing remains `/dashboard`.

Primary outcome:
- the strongest implementation base is ThetaFrame's existing signed-in shell and lane surfaces;
- `strategy_dashboard_replit` is the highest-signal external layout and token donor;
- no scanned repo provides an acceptable turnkey donor for distance-aware display modes, `21:9` center-band tuning, or `32:9` orbit-edge composition;
- those wide-display behaviors must be built specifically for ThetaFrame Console instead of forced from an existing dashboard pattern.

## Scan Coverage

Scanned in the requested order:

1. ThetaFrame current sources
   - `artifacts/thetaframe/src/App.tsx`
   - `artifacts/thetaframe/src/components/header.tsx`
   - `artifacts/thetaframe/src/components/layout.tsx`
   - `artifacts/thetaframe/src/pages/dashboard.tsx`
   - `artifacts/thetaframe/src/pages/weekly.tsx`
   - `artifacts/thetaframe/src/pages/vision.tsx`
   - `artifacts/thetaframe/src/pages/life-ledger.tsx`
   - `artifacts/thetaframe/src/components/habit-canvas.tsx`
   - `artifacts/thetaframe/src/components/dashboard-brain-dump-setup.tsx`
   - `artifacts/thetaframe/src/components/shell/PrimaryActionIsland.tsx`
   - `artifacts/thetaframe/src/components/shell/SupportRail.tsx`
   - `artifacts/thetaframe/src/components/shell/AIDraftStatusCard.tsx`
   - `artifacts/thetaframe/src/components/shell/CalendarLinkStatusCard.tsx`
   - `artifacts/thetaframe/src/components/shell/MobileIntegrationStatusCard.tsx`
   - `scripts/src/runThetaFrameBrowserQa.ts`
   - `artifacts/mockup-sandbox/src/components/ui/chart.tsx`
   - `artifacts/mockup-sandbox/src/components/ui/command.tsx`
   - `artifacts/mockup-sandbox/src/components/ui/sidebar.tsx`

2. `social-utility-20260414-1445/01_WORKINGSET/strategy_dashboard_replit`
   - `src/App.jsx`
   - `src/styles.css`
   - `handoff/REPLIT_UI_LAYOUT_MAP.json`
   - `handoff/REPLIT_UI_DESIGN_TOKENS.json`

3. `not-a-hoarder/artifacts/not-a-hoarder`
   - `src/components/layout.tsx`
   - `src/components/navbar.tsx`
   - `src/components/hero-animation.tsx`

4. `Yuki/artifacts/anime-companion`
   - `src/components/ui/sidebar.tsx`
   - `src/components/ui/command.tsx`
   - `src/components/ui/chart.tsx`

5. `nassau-pf-nav-design-draft`
   - `artifacts/nassau-design-r3/src/components/layout/Navbar.tsx`

6. `speakly-mhaw-proposal`
   - `src/components/HeroBackground.tsx`
   - `src/index.css`
   - `src/pages/Proposal.tsx`

Skipped by rule:

- `Yuki-release` and `Yuki-reconcile`
  - skipped as duplicate branches because `Yuki` already exposed the same generic UI primitives.
- `node_modules`, generated caches, extracted transports, and vendor trees
  - skipped as non-authoritative or out-of-scope.

## Ranked Shortlist By Subsystem

### 1. Shell Chrome And Route Ownership

Ranked donors:

1. ThetaFrame current signed-in shell
   - `artifacts/thetaframe/src/App.tsx`
   - `artifacts/thetaframe/src/components/header.tsx`
   - `artifacts/thetaframe/src/components/layout.tsx`
   - Why: already owns auth-gated routing, `/` redirect behavior, permission-aware nav, and the calm signed-in shell contract.
2. `strategy_dashboard_replit` layout authority
   - `social-utility-20260414-1445/01_WORKINGSET/strategy_dashboard_replit/handoff/REPLIT_UI_LAYOUT_MAP.json`
   - `social-utility-20260414-1445/01_WORKINGSET/strategy_dashboard_replit/src/styles.css`
   - Why: strongest external guide for shell zoning, top strip, sidebar discipline, and modular panel rhythm.
3. Marketing-shell donors rejected as primary shell sources
   - `not-a-hoarder/artifacts/not-a-hoarder/src/components/navbar.tsx`
   - `nassau-pf-nav-design-draft/artifacts/nassau-design-r3/src/components/layout/Navbar.tsx`
   - Why rejected: these are public-site headers, not signed-in operator shells; importing them would blur Console into a marketing navigation pattern.

Implementation call:
- Build Console shell on ThetaFrame's existing route and auth ownership.
- Use `strategy_dashboard_replit` as layout inspiration only, not as a literal shell transplant.

### 2. Core Orientation Modules

Ranked donors:

1. ThetaFrame dashboard and lane canvases
   - `artifacts/thetaframe/src/pages/dashboard.tsx`
   - `artifacts/thetaframe/src/components/habit-canvas.tsx`
   - `artifacts/thetaframe/src/components/shell/PrimaryActionIsland.tsx`
   - Why: already expresses lane-first hierarchy, review-first AI, and a calm "pick one next action" posture.
2. ThetaFrame Weekly and Vision surfaces
   - `artifacts/thetaframe/src/pages/weekly.tsx`
   - `artifacts/thetaframe/src/pages/vision.tsx`
   - Why: these already hold the right orientation primitives for `Week Vector` and `Continuity` without degrading into backlog walls.
3. ThetaFrame Life Ledger event and reminder surfaces
   - `artifacts/thetaframe/src/pages/life-ledger.tsx`
   - Why: richest current source of due-soon, reminder, and execution-state truth for `Constraint Horizon`.

Implementation call:
- `Now Frame`, `Week Vector`, `Continuity`, `Constraint Horizon`, and `Lane Atlas` should be extracted primarily from existing ThetaFrame runtime surfaces.
- Do not import external KPI or CRM card patterns for these modules.

### 3. Review Queue, Status Band, And Conditional Modules

Ranked donors:

1. ThetaFrame brain-dump review batch
   - `artifacts/thetaframe/src/components/dashboard-brain-dump-setup.tsx`
   - Why: best current pattern for grouped reviewable objects with approve/reject/apply behavior and lane-specific previews.
2. ThetaFrame shell status cards
   - `artifacts/thetaframe/src/components/shell/AIDraftStatusCard.tsx`
   - `artifacts/thetaframe/src/components/shell/CalendarLinkStatusCard.tsx`
   - `artifacts/thetaframe/src/components/shell/MobileIntegrationStatusCard.tsx`
   - `artifacts/thetaframe/src/components/shell/SupportRail.tsx`
   - Why: compact, low-noise status language that already respects approval-gated AI and deferred integrations.
3. ThetaFrame current dashboard gating logic
   - `artifacts/thetaframe/src/pages/dashboard.tsx`
   - Why: already collapses optional surfaces based on module access and available data.

Implementation call:
- Reuse ThetaFrame's review-first queue and conditional visibility logic.
- Do not borrow transcript-shell or inbox-shell patterns from any other project.

### 4. Visual System, Material, Motion, And Presentation

Ranked donors:

1. `strategy_dashboard_replit` premium dark operator tokens
   - `social-utility-20260414-1445/01_WORKINGSET/strategy_dashboard_replit/handoff/REPLIT_UI_DESIGN_TOKENS.json`
   - `social-utility-20260414-1445/01_WORKINGSET/strategy_dashboard_replit/src/styles.css`
   - Why: closest external match for premium dark shell tokens, glass panels, semantic status colors, and restrained surface rhythm.
2. ThetaFrame current workspace atmosphere
   - `artifacts/thetaframe/src/components/layout.tsx`
   - Why: already encodes lane-aware atmospheres and user color state without turning the shell into decoration.
3. Speakly proposal ambient motion and reduced-motion posture
   - `speakly-mhaw-proposal/src/components/HeroBackground.tsx`
   - `speakly-mhaw-proposal/src/index.css`
   - `speakly-mhaw-proposal/src/pages/Proposal.tsx`
   - Why: useful as a secondary donor for sparse atmospheric motion and explicit reduced-motion behavior.
4. Not A Hoarder hero animation
   - `not-a-hoarder/artifacts/not-a-hoarder/src/components/hero-animation.tsx`
   - Why: useful only as a secondary ambient-animation reference; not suitable for operational hierarchy.

Implementation call:
- Rebase external premium tokens into ThetaFrame's Console contract.
- Keep atmosphere subordinate to live work.
- Treat Speakly and Not A Hoarder motion as secondary references, not shell models.

### 5. Generic Utility Donors

Low-priority support reuse only:

- `artifacts/mockup-sandbox/src/components/ui/chart.tsx`
- `artifacts/mockup-sandbox/src/components/ui/command.tsx`
- `artifacts/mockup-sandbox/src/components/ui/sidebar.tsx`
- `Yuki/artifacts/anime-companion/src/components/ui/chart.tsx`
- `Yuki/artifacts/anime-companion/src/components/ui/command.tsx`
- `Yuki/artifacts/anime-companion/src/components/ui/sidebar.tsx`

Why low priority:
- these are generic shadcn-style primitives;
- they may be useful for support infrastructure later;
- they do not by themselves solve calm hierarchy, centered-console layout, or lane-atlas behavior.

## Rejected External Patterns

Rejected as primary Console patterns:

- `strategy_dashboard_replit/src/styles.css`
  - reject for `EC-011` and `EC-012`
  - reason: fixed rail plus full-width modular scanning conflicts with the Console requirement to keep `21:9` and `32:9` reading content centered.
- `not-a-hoarder/artifacts/not-a-hoarder/src/components/navbar.tsx`
  - reject for `EC-001`
  - reason: sticky marketing navigation is not a signed-in operator shell.
- `nassau-pf-nav-design-draft/artifacts/nassau-design-r3/src/components/layout/Navbar.tsx`
  - reject for `EC-001`
  - reason: service-site information architecture would misframe Console as a brochure header.

## EC Backlog Decisions

Authoritative machine-readable map:
- `artifacts/console-reuse/THETAFRAME_EXECUTIVE_CONSOLE_REUSE_MATRIX__2026-04-23__R1.json`

Decision summary:

| Item | Decision | Primary donor |
| --- | --- | --- |
| `EC-001` | `adapt` | `artifacts/thetaframe/src/App.tsx` |
| `EC-002` | `adapt` | `strategy_dashboard_replit/handoff/REPLIT_UI_LAYOUT_MAP.json` |
| `EC-003` | `adapt` | `artifacts/thetaframe/src/pages/dashboard.tsx` |
| `EC-004` | `adapt` | `artifacts/thetaframe/src/components/shell/AIDraftStatusCard.tsx` |
| `EC-005` | `adapt` | `artifacts/thetaframe/src/pages/weekly.tsx; artifacts/thetaframe/src/pages/vision.tsx` |
| `EC-006` | `adapt` | `artifacts/thetaframe/src/pages/life-ledger.tsx` |
| `EC-007` | `adapt` | `artifacts/thetaframe/src/components/habit-canvas.tsx` |
| `EC-008` | `adapt` | `artifacts/thetaframe/src/components/dashboard-brain-dump-setup.tsx` |
| `EC-009` | `adapt` | `artifacts/thetaframe/src/pages/dashboard.tsx` |
| `EC-010` | `build_net_new` | none acceptable |
| `EC-011` | `reject_external_pattern` | `strategy_dashboard_replit/src/styles.css` |
| `EC-012` | `reject_external_pattern` | `strategy_dashboard_replit/src/styles.css` |
| `EC-013` | `adapt` | `strategy_dashboard_replit/handoff/REPLIT_UI_DESIGN_TOKENS.json` |
| `EC-014` | `adapt` | `scripts/src/runThetaFrameBrowserQa.ts` |
| `EC-015` | `reuse` | `THETAFRAME_EXECUTIVE_CONSOLE_EXECUTION_PLAN__2026-04-23__R1.md` |

## Ordered Implementation Shortlist For `/console`

1. Start from ThetaFrame's current signed-in shell ownership.
   - Implement `/console` beside `/dashboard`, not by replacing `/dashboard` first.
2. Extract the internal ThetaFrame module layer before importing external layout ideas.
   - `EC-003`, `EC-004`, `EC-005`, `EC-006`, `EC-007`, `EC-008`, and `EC-009` should primarily come from existing Dashboard, Weekly, Vision, Life Ledger, and shell-card primitives.
3. Translate `strategy_dashboard_replit` into Console-specific layout and token rules.
   - Borrow zoning, panel rhythm, and token posture.
   - Do not import its fixed sidebar or full-width desktop scan behavior unchanged.
4. Treat visual polish as a second pass after core module extraction.
   - Apply `EC-013` tokens and restrained ambient motion only after hierarchy is proven.
5. Build wide-display behavior explicitly.
   - `EC-010`, `EC-011`, and `EC-012` need Console-specific implementation from the contract.
   - Do not widen the current dashboard grid as a shortcut.
6. Extend the existing ThetaFrame browser QA harness only after `/console` exists.
   - Reuse the current authenticated route harness for `EC-014`.

## Defaults Locked By This Inventory

- `EC-015` is complete as a docs-only slice.
- `/dashboard` remains the shipped signed-in landing surface.
- no runtime code, routes, or QA scripts changed in this slice.
- future Console work should prefer internal ThetaFrame donors first, external layout/tokens second, and net-new wide-display behavior where no acceptable donor exists.
