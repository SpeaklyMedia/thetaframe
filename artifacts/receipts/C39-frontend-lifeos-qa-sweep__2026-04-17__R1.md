# C39 Frontend LIFEos QA Sweep

Date: 2026-04-17
Status: PASS WITH FINDINGS

## Scope

Ran a production frontend QA sweep against the live ThetaFrame Basic experience through the lens of a neurodivergent Basic user.

This receipt is evidence and roadmap only. No product feature work, backend contract changes, database push, or migration command was run in this pass.

North star used for the audit:

- users should feel like they are designing new habitual behaviors;
- energy, time, supports, goals, and AI drafts should become visible, editable LIFEos objects;
- AI remains review-first, lane-scoped, and user-approved before writes.

Production target:

- canonical URL: `https://thetaframe.mrksylvstr.com`
- root smoke: `HTTP 200`
- root last-modified: `Fri, 17 Apr 2026 21:07:11 GMT`
- deployed assets observed during C39:
  - `/assets/index-BPQFMLje.js`
  - `/assets/index-tvSnUi8O.css`
- health URL: `https://thetaframe.mrksylvstr.com/api/healthz`
- health result: `HTTP 200`, `{"status":"ok"}`

Git baseline at start:

- branch: `main`
- remote: `origin/main`
- previous receipt commit: `49ce5a5 Record C38 production baseline receipt`
- production baseline source commit: `fa3127591225c253264aa8a0747c8368cf7d353f`

## Role States Used

The production browser QA harness used the existing local storage states under ignored `test-results/auth/`.

| State | File | Local capture timestamp |
| --- | --- | --- |
| signed out | none | n/a |
| default authenticated user | `test-results/auth/thetaframe-user.json` | `2026-04-16T14:25:03Z` |
| Basic | `test-results/auth/thetaframe-basic.json` | `2026-04-16T14:18:54Z` |
| Basic B | `test-results/auth/thetaframe-basic-b.json` | `2026-04-16T18:15:07Z` |
| Select Authorized | `test-results/auth/thetaframe-select-authorized.json` | `2026-04-16T14:24:07Z` |
| Admin | `test-results/auth/thetaframe-admin.json` | `2026-04-16T14:24:36Z` |

Storage state files remain ignored and were not committed.

## Commands And Results

Static and build:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- build notes:
  - Vite emitted existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c39-lifeos-qa-sweep \
pnpm run qa:browser
```

Result:

- PASS
- `passes=16`
- `skips=0`

Headed Chrome visual signoff, full suite:

```bash
BROWSER_AUTOMATION_BIN=$HOME/.local/opt/chrome-for-testing/stable/chrome \
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c39-lifeos-headed \
pnpm run qa:browser:headed
```

Result:

- BLOCKED for full-suite signoff
- repeated with a PTY-backed run in `scripts/test-results/thetaframe-browser-qa/c39-lifeos-headed-r2`
- both runs passed through signed-out, dashboard, Daily, Weekly, Vision, Life Ledger, REACH, BizDev, and Baby tab checks before the browser context closed during the admin check
- observed failure class: `page.goto: Target page, context or browser has been closed`
- classification: headed-suite environment/browser-lifetime issue, not a product regression, because automated production Chromium QA passed the same production target with all expected checks

Focused Basic headed visual capture:

- PASS
- evidence directory: `scripts/test-results/thetaframe-browser-qa/c39-lifeos-basic-headed-visual`
- capture method: headed Chrome against production using the Basic state
- purpose: visual audit of Basic surfaces after full headed suite was blocked by browser lifetime during the admin check

Production smoke:

```bash
curl -sS -D - https://thetaframe.mrksylvstr.com/ -o /tmp/thetaframe-c39-root.html
curl -sS -D - https://thetaframe.mrksylvstr.com/api/healthz -o /tmp/thetaframe-c39-health.json
```

Results:

- root: `HTTP 200`
- health: `HTTP 200`, `{"status":"ok"}`

## PASS / FAIL / BLOCKED Matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Production root | PASS | `HTTP 200` |
| Production health | PASS | `{"status":"ok"}` |
| Typecheck | PASS | `pnpm run typecheck` |
| Frontend build | PASS | `pnpm --filter @workspace/thetaframe run build` |
| Signed-out routes | PASS | included in `passes=16` production QA |
| Default authenticated dashboard | PASS | included in `passes=16` production QA |
| Basic route/API matrix | PASS | Basic limited to Daily, Weekly, Vision |
| Select Authorized route/API matrix | PASS | optional Life Ledger access only; admin/Baby KB denied |
| Admin routes/API matrix | PASS in automated QA | admin governance/users and Baby KB included |
| Basic onboarding and AI groundwork | PASS | included in `passes=16` production QA |
| Dashboard visual capture | PASS | desktop and mobile screenshots captured |
| Start Here visual capture | PASS WITH P1 FINDING | modal content can visually truncate on desktop |
| Daily visual capture | PASS | desktop and mobile screenshots captured |
| Weekly visual capture | PASS | desktop and mobile screenshots captured |
| Vision visual capture | PASS | desktop and mobile screenshots captured |
| Full headed Chrome suite | BLOCKED | browser context closed during admin check after earlier checks passed |

No P0 production access, auth, or data-safety regression was found.

## Screenshot Evidence

Automated production QA directory, intentionally ignored:

`scripts/test-results/thetaframe-browser-qa/c39-lifeos-qa-sweep`

Files:

- `c36-basic-daily-purple-workspace.png`
- `c36-basic-vision-mobile-purple-workspace.png`
- `c36-basic-weekly-purple-workspace.png`
- `c37-basic-guide-daily-focus-desktop.png`
- `c37-basic-guide-dashboard-mobile.png`
- `c37-dashboard-desktop.png`
- `c37-dashboard-mobile.png`

Focused Basic headed visual directory, intentionally ignored:

`scripts/test-results/thetaframe-browser-qa/c39-lifeos-basic-headed-visual`

Files:

- `dashboard-desktop.png`
- `dashboard-mobile.png`
- `start-here-from-dashboard.png`
- `start-here-from-daily.png`
- `start-here-from-weekly.png`
- `start-here-from-vision.png`
- `daily-desktop.png`
- `daily-mobile.png`
- `weekly-desktop.png`
- `weekly-mobile.png`
- `vision-desktop.png`
- `vision-mobile.png`

Raw screenshot files remain local QA artifacts and were not committed.

## Manual Visual Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Desktop Dashboard | PASS | Calm, readable, strong first action. Still reads more like a control center than a habit design canvas. |
| Mobile Dashboard | PASS | No overlap or horizontal overflow observed. Long stacked card flow. |
| Start Here from Dashboard | PASS WITH P1 FINDING | Desktop modal screenshot shows lower guide content visually clipped/truncated. |
| Start Here from Daily | PASS WITH P1 FINDING | Same modal system risk applies from route-aware entry. |
| Start Here from Weekly | PASS WITH P1 FINDING | Same modal system risk applies from route-aware entry. |
| Start Here from Vision | PASS WITH P1 FINDING | Same modal system risk applies from route-aware entry. |
| Daily color persists across Daily, Weekly, Vision | PASS | Automated QA captured purple workspace state across all three Basic lanes. |
| Daily first screen shows core action before support panels | PASS | Core action and color controls appear before More/support content. |
| Weekly first screen shows core action before support panels | PASS | Core weekly focus appears before support content. |
| Vision first screen shows core action before support panels | PASS | Goal island and current supports are visible before deeper panels. |
| More sections do not hide required first actions | PASS | Required Basic actions are available before More sections. |
| AI draft panels explain user choice | PASS WITH P2 FINDING | Review-first trust is clear, but panels are passive and not yet an interactive drafting surface. |
| Buttons distinct from informational cards | PASS | Primary actions are visually distinct enough for current flows. |
| Mobile text overlap or horizontal overflow | PASS | No overlap or overflow found on inspected Basic screenshots. |

## Findings

Severity definitions:

- `P0`: blocks access, auth, or data safety.
- `P1`: blocks Basic user task completion or AI trust.
- `P2`: creates friction, overload, visual confusion, or weak design-tool feel.
- `P3`: polish or roadmap-level improvement.

Findings:

- `P0`: none found.
- `P1`: Start Here modal can visually truncate lower guide content on desktop capture. Basic users rely on this modal for orientation and recovery, so the modal needs stronger responsive height, internal scroll, and visible continuation treatment.
- `P2`: Dashboard is calm and useful, but it reads as a card-based control center, not yet a LIFEos habit design canvas. The relationship between Today, This Week, Goals, supports, and AI drafts is not yet visible as one editable behavior system.
- `P2`: Daily, Weekly, and Vision are reliable and ordered, but the primary interaction model is still cards/forms. Users can fill fields, but they cannot yet feel like they are shaping a behavior system through editable blocks, ordering, or visual relationships.
- `P2`: AI review trust copy is present and review-first, but AI is still passive. There is not yet a clear Basic messy-input intake that turns user language into reviewable canvas objects.
- `P2`: Mobile Basic surfaces are readable and non-overflowing, but scroll depth is high. A canvas pattern should reduce repeated card scanning and make the next useful object visible faster.
- `P3`: Some visual evidence includes seeded C33-style test values in Vision inputs. This is acceptable QA state, but future public-facing evidence would read better with human-labeled test data.

## UX Scorecard

Scores are 1 to 5. Higher is better.

| Surface | Calmness | Clarity | Actionability | Habit-design feel | AI trust | Mobile fit | Evidence notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Dashboard | 5 | 5 | 4 | 2 | 4 | 4 | Clear Control Center and Start Here CTA. Weak connected-system/canvas feel. |
| Start Here | 4 | 4 | 4 | 2 | 4 | 3 | Route-aware and restartable. Desktop modal clipping lowers recoverability confidence. |
| Daily | 5 | 5 | 5 | 3 | 4 | 4 | Small next step, color state, and AI review copy are clear. Still form/card oriented. |
| Weekly | 5 | 5 | 4 | 3 | 4 | 4 | Theme and protected steps are understandable. Needs more visible week-shaping affordances. |
| Vision | 5 | 5 | 4 | 3 | 4 | 4 | Goal/support pattern is calm and clear. Needs more manipulation of goal objects. |
| AI Review | 4 | 4 | 3 | 2 | 5 | 4 | Review-first boundaries are strong. Missing Basic messy-input to draft workflow. |

## Neurodivergent UX Audit

| Criterion | Current read | Roadmap implication |
| --- | --- | --- |
| Orientation, "Where am I?" | Strong on Dashboard, Daily, Weekly, and Vision. Start Here clipping weakens orientation when help is opened. | Fix modal viewport behavior first, then make Today/Week/Goals visibly connected. |
| Next action clarity | Strong on Basic lanes. The smallest useful next step is usually visible before support panels. | Preserve this while converting cards into editable canvas objects. |
| Cognitive load | Moderate. Layout is calm, but stacked cards create repeated scanning on mobile. | Use fewer, denser canvas objects with progressive details. |
| Emotional safety | Strong. Copy is calm and avoids urgency/shame spikes. | Preserve plain language and gentle restart paths. |
| Recoverability | Mostly strong via Start Here and repeatable guide. Modal clipping is the main risk. | Make guidance modal robust, scrollable, and visibly restartable on all viewports. |
| AI trust | Strong boundaries. AI draft/review/apply framing is clear. | Add provider-backed drafting only as explicit reviewable drafts, never silent writes. |
| Design-tool feel | Weak to moderate. Current UI is reliable but still card/form led. | Introduce Habit Canvas object patterns for Today, Week, and Goals without changing backend contracts first. |

## Habit Canvas Roadmap

### Phase A: QA Fixes

Target user value:

- Basic users can orient, restart guidance, and complete the first useful action without visual clipping, overload, or ambiguity.

Candidate files and surfaces:

- Start Here / signed-in onboarding modal surface.
- Dashboard Control Center.
- Daily, Weekly, and Vision first-screen hierarchy.
- Shared Basic guide and AI review panels.
- Responsive layout and modal primitives used by the Basic flow.

Work slices:

- Fix Start Here modal height and scroll behavior on desktop and mobile.
- Add visible continuation/scroll affordance if guide content exceeds the viewport.
- Tighten Dashboard hierarchy so Today, This Week, Goals, and AI drafts read as connected LIFEos areas, not isolated cards.
- Reduce mobile scroll cost on Basic surfaces by grouping support content behind clearer progressive controls.
- Keep existing access and storage contracts unchanged.

Acceptance criteria:

- `pnpm run typecheck` passes.
- `pnpm --filter @workspace/thetaframe run build` passes.
- production browser QA passes with `passes=16`, `skips=0`.
- headed Basic visual screenshots show no Start Here clipping, no text overlap, and no mobile horizontal overflow.
- Basic visual checklist has no P0 or P1 findings.

Verification commands:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/phase-a-basic-qa \
pnpm run qa:browser
```

### Phase B: Habit Canvas Frontend

Target user value:

- Basic users understand within 30 seconds that they are designing a behavior system, not completing a planner form.

Candidate files and surfaces:

- Dashboard Control Center.
- Daily Today surface.
- Weekly planning surface.
- Vision/goals surface.
- shared Basic lane components, color state, section primitives, and AI draft panels.

Design surfaces:

- Today Canvas:
  - energy;
  - must-do;
  - can-wait;
  - time shape;
  - small win.
- Week Canvas:
  - theme;
  - protected steps;
  - must-keep supports;
  - backup plan.
- Goals Canvas:
  - goal;
  - next visible step;
  - current support pattern.

Interaction patterns:

- editable behavior blocks instead of passive cards;
- visual ordering controls where drag is too expensive;
- color and energy state as visible canvas state;
- "design this behavior" framing in UI copy;
- AI draft blocks that can be reviewed, edited, applied, or rejected.

Constraints:

- do not change backend contracts in Phase B;
- do not add silent writes;
- do not add global assistant behavior;
- do not add paid-lane behavior;
- do not expose unrestricted cross-user/admin views.

Acceptance criteria:

- Today, Week, and Goals feel connected on desktop and mobile.
- Basic user can identify the current canvas, the next editable object, and the save/apply boundary within 30 seconds.
- AI review panels remain lane-scoped and user-approved.
- production browser QA remains green.

Verification commands:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/phase-b-habit-canvas \
pnpm run qa:browser
```

### Phase C: First Provider-Backed Basic AI Workflow

Target user value:

- Basic users can paste messy Daily input and receive a clear, editable Daily draft without losing agency or trust.

Starting workflow:

- Daily messy input -> Daily draft.

Candidate files and surfaces:

- Daily Basic lane.
- AI draft generation route or existing lane-scoped draft creation path.
- shared AI draft provenance/review components.
- API contracts already present for draft provenance and apply controls.

Behavior requirements:

- user explicitly asks AI to draft;
- provider output creates a draft only;
- draft shows provenance and review state;
- user can edit, approve, reject, or apply;
- no data changes occur until user applies;
- draft is lane-scoped to Daily;
- errors are calm, recoverable, and do not erase the user's messy input.

Acceptance criteria:

- messy text becomes a reviewable Daily draft;
- draft has provenance, review state, approve/reject/apply controls;
- no silent write path exists;
- Basic route/API matrix still limits Basic users to Daily, Weekly, and Vision;
- production browser QA remains green.

Verification commands:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/thetaframe run build
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/phase-c-daily-ai-draft \
pnpm run qa:browser
```

## Exclusions

The following remained local-only and were not committed:

- `.env*`;
- `.vercel/`;
- auth storage state JSON;
- root `test-results/`;
- `scripts/test-results/`;
- build output;
- `dist`;
- `node_modules`;
- `*.tsbuildinfo`;
- raw screenshot directories;
- extracted transport folders;
- zip bundles.

## Decision

Proceed next with Phase A before feature work. The only task-completion-level issue found in the Basic frontend sweep is Start Here modal clipping. After that, the highest-value product work is Phase B: reframe existing Daily, Weekly, Vision, Dashboard, and AI review surfaces as LIFEos Habit Canvas objects while preserving current contracts and review-first AI rules.
