# ThetaFrame Current Truth

Date: 2026-04-25
Status: Canonical current-state summary after C75 current-contract completion

## What ThetaFrame Does Now

ThetaFrame is a private, authenticated operating system for personal planning and life execution. It has separate user logins, a signed-in Control Center dashboard, module-gated lanes, per-user saved data, review-first AI draft infrastructure, repeatable Basic onboarding, a Basic LIFEos Habit Canvas, a Dashboard brain-dump AI setup lane, and production browser QA coverage.

The signed-out marketing surface now presents ThetaFrame as a stress-to-calm habit-design workspace. The public Home hero uses the C49 screamer artwork crossfade, and Home/Auth surfaces include careful evidence-forward theta-state positioning with source links. The copy must not make medical, hypnosis, sleep-manipulation, or guaranteed habit-change claims.

Current lanes:

- Daily: current-day execution, energy state, Tier A/Tier B tasks, time blocks, micro-win, Daily quick capture, Daily AI draft review/apply.
- Weekly: weekly rhythm, protected-step completion, theme, non-negotiables, recovery plan, Weekly AI draft review/apply.
- Vision: long-horizon goals plus next visible steps, Vision AI draft review/apply.
- FollowUps: optional user-facing follow-up lane for people or organizations the user said they would get back to. Internal route/API/module identifiers remain `bizdev` for compatibility.
- Life Ledger: optional people, events, financial, subscriptions, travel lane; Baby KB is admin-only inside this lane.
- REACH: optional file/artifact lane with private object ownership.
- Admin: governance lane for user access, presets, imports, Baby KB admin workflows, and AI review/apply tooling.

Signed-in `/` redirects to `/dashboard`. The dashboard is a navigation and summary surface, not a new analytics database. It shows a Basic brain-dump setup lane, allowed-lane next actions, review-first AI draft status, calendar-planning truth, and Life Ledger mobile/reminder links only when the user has Life Ledger.

The ARCH-1 Executive Console research transport is now ingested locally, and `/console` now exists as the authenticated `ThetaFrame Console` preview shell with the full current-contract live module set. ThetaFrame also now has a shared persisted user-preferences surface for reduced stimulation, density, and reminder tone.

Current Console truth:

- `/dashboard` remains the canonical default signed-in home.
- `/console` is a preview shell, not a route replacement.
- signed-in navigation now exposes both Dashboard and Console.
- Console ships a dedicated shell atmosphere, responsive preview layout buckets, a live Daily-derived `Now Frame`, a live Weekly-derived `Week Vector`, a live Life Ledger-derived `Constraint Horizon`, a live approval-gated `Assistant Review` queue, a live Vision-derived `Continuity` anchor, a minimal live `System Health` band, and a live permission-aware `Lane Atlas`.
- `Now Frame` surfaces one real Daily object only, using the fallback order `tierA -> tierB -> time block -> micro-win -> empty state`.
- `Week Vector` stays read-only and surfaces Weekly theme, up to three steps, up to two non-negotiables, and the saved recovery plan when present.
- Weekly `steps` now persist real `completed` truth end-to-end; legacy rows and legacy Weekly draft payloads normalize forward with `completed=false`.
- `/weekly` is now the authority for mutating Weekly step completion through inline protected-step checkboxes.
- `Constraint Horizon` stays read-only and surfaces Life Ledger reminder queue truth first, then upcoming dated Events as a fallback when the queue is quiet.
- `Constraint Horizon` now also includes one calm read-only urgency strip above the existing rows, bucketed as `due_now`, `near`, and `staged` from reminder queue truth first, then fallback upcoming dated Events when the queue is quiet.
- `Assistant Review` stays read-only and surfaces one compact actionable AI draft queue across the session's allowed lanes, with provenance plus lane CTAs and no transcript-home behavior.
- `Continuity` stays read-only and surfaces one Vision goal plus one next visible step when available, with calm fallback states when Vision is sparse or empty.
- `System Health` stays deliberately conservative: AI review pressure plus safe status chips only.
- `Lane Atlas` remains live and only exposes permission-aware links to allowed lanes.
- `Lane Atlas` now also includes one compact read-only core-lane readiness row for `Today`, `This Week`, and `Goals`, using current live Console truth only and staying visually subordinate to the lane links.
- `REACH Capture` is now a conditional read-only optional-lane support signal below `Continuity`, using existing REACH file truth plus actionable REACH draft truth only.
- `REACH Capture` stays hidden when the current session cannot access REACH or when REACH has no recent files and no actionable draft pressure.
- `FollowUps Motion` is now a conditional read-only optional-lane support signal below `REACH Capture`, using existing FollowUps list and summary truth only.
- `FollowUps Motion` stays hidden when the current session cannot access FollowUps or when FollowUps has no live rows and no summary total.
- C65 adds the first calm Console progress visuals without changing routes, APIs, or module ownership:
  - a read-only `Today completion` bar inside `Now Frame`, derived from saved non-empty Daily Tier A tasks;
  - a compact read-only `Weekly steps` completion ring inside `Week Vector`, now driven by saved non-empty Weekly steps with real persisted completion truth;
  - a read-only segmented `Review pressure shape` bar inside `System Health`, segmented by `draft`, `needs_review`, and `approval_gated`.
- C65 keeps those signals subordinate to the existing module hierarchy and does not turn Console into a KPI or chart wall.
- C66 hardens Weekly truth without adding new routes: `WeeklyStep` now includes `completed`, Weekly routes normalize legacy payloads forward, Weekly AI draft apply preserves compatibility, and the Console ring now reflects actual Weekly completion instead of best-effort optional truth.
- C59 captured and passed the full Console P0 screenshot proof matrix at `360x800`, `390x844`, `414x896`, `820x1180`, `2752x2064`, `1920x1080`, `5120x2160`, and `5120x1440`.
- C59 added only bounded responsive remediation: signed-in nav now keeps the mobile menu through tablet widths, and the Console shell now becomes a true two-pane surface starting at the `820x1180` representative tablet breakpoint.
- C59 proof confirms Console fit and hierarchy on the target surfaces, but it does not approve Console as a replacement for Dashboard as the default signed-in home.
- C60 adds premium-tablet and ultrawide polish without changing module behavior: `Now Frame` stays more visually dominant, the support rail stays calmer, large-surface reading measure is tighter, and decorative/support chrome is de-emphasized.
- C61 hardens Console styling against ThetaFrame brand implementation drift: Console shell, panel, chip, text, CTA, and provenance surfaces now resolve through shared semantic Console tokens and utility classes in `src/index.css` instead of page-local raw `slate`/`cyan` branding utilities.
- C62 keeps the tokenized Console centered-first and passes the refreshed viewport proof at `360x800`, `390x844`, `414x896`, `820x1180`, `2752x2064`, `1920x1080`, `5120x2160`, `5120x1440`, and the added stretch validation surface `6400x1800`.
- C63 closes the current home-decision gate with no home switch approved: `/dashboard` remains the default signed-in home and `/console` remains an additive orientation surface.
- Console does not ship calendar projection, inline edits, review/apply controls, reminder transport state, or a Dashboard-to-Console home switch in this slice.

Current shared user-preference truth:

- ThetaFrame now persists one `user_preferences` row per user, separate from `user_modes`.
- Authenticated `GET /api/user-preferences` and `PUT /api/user-preferences` are live.
- If a user has no saved row yet, the read contract returns stable defaults instead of `404`.
- Current preference enums are:
  - `reducedStimulation`: `default`, `reduced`
  - `density`: `comfortable`, `compact`
  - `reminderTone`: `gentle`, `standard`
- Current default values are:
  - `reducedStimulation=default`
  - `density=comfortable`
  - `reminderTone=gentle`
- Signed-in header now exposes a `Display + reminders` entry point for these preferences.
- Shared signed-in shell now carries:
  - `data-density`
  - `data-reduced-stimulation`
  - `data-reminder-tone`
- Current preference application scope is:
  - `/dashboard`
  - `/console`
  - `/daily`
  - `/weekly`
  - `/vision`
- `reducedStimulation` currently softens non-essential atmosphere, blur, hover-lift, and Canvas emphasis without changing core contrast.
- `density` currently tightens shared signed-in page and shell spacing modestly without changing reading order.
- `reminderTone` currently changes reminder-oriented helper copy only; it does not change reminder truth, counts, permissions, or urgency logic.
- `userMode.mode` and `userMode.colourState` remain separate and unchanged; `user_modes` is not the shared settings bucket.

## Access Levels

Admin:

- Owner email or Clerk `publicMetadata.role === "admin"`.
- Receives all current modules regardless of stored permission rows.
- Can manage users, module grants, presets, and admin Baby workflows.
- Admin governance does not mean ordinary private-lane APIs can browse other users' lane records.

Select Authorized:

- Always receives Basic modules.
- May receive any assigned optional modules: FollowUps, Life Ledger, REACH.
- Cannot access Admin or Baby KB admin tooling unless promoted to Admin.
- AI scope is limited to allowed modules.

Basic User:

- Default for new non-admin users.
- Receives Daily, Weekly, Vision.
- Cannot access FollowUps, Life Ledger, REACH, Admin, Baby KB, imports, assignment tools, or admin presets.
- AI scope is Daily, Weekly, and Vision only.

## Privacy And Data Ownership

Private lane records are owned by the current Clerk `userId`.

Every user-private list/get/create/update/delete/review/apply/object route must constrain by current `userId`. Disallowed cross-user attempts return `403` or `404`, never another user's data. This is production-proven by C33.

Admin exceptions are explicit:

- user and permission governance;
- admin Baby KB workflows;
- Baby assignment projection into an assignee's Life Ledger after explicit apply.

There is no general admin support view for private lane browsing yet. If one is built later, it must be explicit, audited, and documented before implementation.

## Onboarding And Neurodivergent-Friendly UX

Basic onboarding is repeatable, plain-language, and low-friction:

- the signed-in header has a persistent Start Here button;
- the signed-in header has Dashboard and Console links and no longer exposes Explore/Build/Release as a primary badge;
- Start Here is route-aware: opening it from Daily focuses Today, Weekly focuses This Week, Vision focuses Goals, and Dashboard shows the full Basic path;
- Start Here has visible Daily/Weekly/Vision tabs and a restart-current-surface action that replays guidance without deleting saved data;
- Basic Guide shows Daily, Weekly, Vision only;
- dismissing the Guide does not remove the ability to reopen it;
- existing `onboarding_progress` completion semantics still derive from real saved data;
- Daily, Weekly, and Vision each show a compact next-step surface and the Habit Canvas before repeated guidance;
- Basic full step-order guidance remains available in each lane's `More help` section instead of occupying the first work surface;
- Basic AI time-saver education remains available in each lane's `Review AI drafts` section before the detailed draft review panel;
- Basic lane first screens lead with the core work before AI review, support, linked items, calendar/mobile placeholders, repeated step order, or extra onboarding panels;
- Basic user labels prefer plain helper names: Today, This Week, Goals, Must Do Today, Can Do Later, Must Keep, If Things Get Hard, Next Steps;
- the Daily color picker sets the user's signed-in workspace color, and that palette follows the user across allowed lanes;
- Daily Tier A and Tier B rows have a frontend-only task feeling color scaffold that can visually transition a selected task feeling color back toward calm green; this does not persist to task JSON yet;
- the Basic Dashboard, Daily, Weekly, and Vision surfaces are now framed as connected LIFEos Habit Canvas surfaces;
- the Habit Canvas has a scoped hover/focus layer: desktop uses CSS hover/focus, touch devices use scroll-focus, and reduced-motion suppresses transform movement;
- Habit Canvas focus behavior is scoped to `data-habit-focus-group` / `data-habit-focus-card` and must not become a global card/table hover system;
- the shared layout exposes `data-lane` and `data-workspace-colour` for browser QA;
- real buttons are styled to read more clearly as controls than cards, step blocks, or disclosure panels;
- copy should stay calm, concrete, and free of shame or urgency language.

Do not turn onboarding into a blocking tutorial or dense dashboard. The goal is to reduce decisions, not add another task system.

The canonical UX surface contract lives in `_AI_SYSTEM/NEURODIVERGENT_INTERFACE_GUIDE.md`. Future UI-facing work should read that guide before changing first-screen order, support panels, AI draft placement, or onboarding/help surfaces.

The Control Center should stay calm and cross-lane:

- Brain Dump Setup;
- Start here today;
- Needs review;
- Coming up;
- Plan calendar;
- Phone reminders only for Life Ledger-enabled users;
- Admin governance only for Admin users.

Optional lanes should also put primary work first:

- FollowUps keeps Add FollowUp, summary/filter/list work before reminder/calendar guidance and onboarding support;
- REACH keeps upload/search/file work before non-urgent AI/mobile support unless actionable drafts are waiting;
- Life Ledger Events keeps the event execution board before non-urgent calendar/import/mobile status unless actionable drafts are waiting.

The old `userMode.mode` values remain in the data model for compatibility. User-facing mode language should be plain helper states: Look Around, Do The Work, Wrap Up.

## AI Model

AI is review-first and lane-scoped.

Current implemented foundation:

- persisted AI drafts;
- provenance and review state;
- explicit approve/reject/apply controls across supported draft kinds;
- Baby KB assignment suggestion generation with provider config;
- Dashboard Basic brain-dump generation that creates one reviewable Daily draft, one Weekly draft, and one Vision draft from typed messy input;
- Dashboard brain-dump review now shows richer lane previews, can approve all drafts, can save approved drafts, and skips fully rejected batches when selecting the active setup batch;
- UI groundwork for remaining Basic AI time-saver use cases.

AI must not silently write user data. AI outputs should become drafts that the user or admin reviews before apply, especially for high-risk data.

Basic AI time-saver map:

- Dashboard Brain Dump Setup: typed messy input -> Daily, Weekly, and Vision draft batch.
- Daily: messy current-work input -> Tier A, Tier B, time blocks, micro-win draft.
- Weekly: scattered notes -> theme, protected steps, non-negotiables, recovery plan draft.
- Vision: vague long-term ideas -> goals plus next visible steps draft.

Future AI work should build on this map one workflow at a time. Do not add silent writes; Dashboard brain-dump drafts still require explicit approval and apply before lane data changes. Brain-dump generation should preserve useful existing context, dedupe suggestions, normalize vague time labels, and produce a complete useful draft even when provider output is sparse.

## Production QA Truth

Canonical production target:

`https://thetaframe.mrksylvstr.com`

Current role storage states:

- user: `test-results/auth/thetaframe-user.json`
- admin: `test-results/auth/thetaframe-admin.json`
- Basic: `test-results/auth/thetaframe-basic.json`
- Basic B isolation: `test-results/auth/thetaframe-basic-b.json`
- Select Authorized: `test-results/auth/thetaframe-select-authorized.json`

Expected browser QA standard:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/<slice-name> \
pnpm run qa:browser
```

Expected browser QA result after C75: `passes=19`, `skips=0`.

Expected isolation proof:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/<slice-name> \
pnpm run qa:isolation
```

Latest isolation result after C51: `[c33-isolation] PASS checks=47`.

Recent focused frontend QA after C52 also verifies:

- public Home desktop/mobile marketing hero and reduced-motion calm state;
- Sign In and Sign Up theta-positioning blocks;
- C49 static assets and Open Graph image content types;
- Dashboard Brain Dump Setup idle render without invoking AI;
- Daily frontend-only task feeling controls;
- FollowUps allowed/denied behavior;
- Start Here modal fit from Dashboard, Daily, Weekly, and Vision.
- Basic Daily/Weekly/Vision canvas-first order before full step guidance;
- REACH upload-first order before non-urgent support;
- Life Ledger Events execution-board-first order before calendar/mobile support;
- FollowUps primary list controls before reminder guidance.

If authenticated browser state is stale and `$DISPLAY` exists, use PTY-backed Chrome capture. Do not mark auth capture blocked just because a non-TTY command fails.

## Deferred

Do not treat these as already implemented:

- paid lanes or billing;
- unrestricted global assistant;
- silent AI writes;
- general admin support view over private user data;
- real push transport beyond simulated/local reminder proof;
- full Select Authorized onboarding for every optional lane;
- Admin onboarding beyond current governance surfaces;
- production-grade AI generation for every Basic time-saver use case beyond the Dashboard brain-dump batch.
- reminder/mobile/outbox/device signals inside Console `System Health`;
- calendar projection inside Console `Constraint Horizon`;
- 32:9 orbit-edge secondaries, near/far display modes, and deeper Console motion/material passes beyond the current tokenized centered premium polish;
- persisted per-task feeling color fields or task-level color API/schema changes.
- per-surface preference overrides, admin-managed preference presets, fullscreen presentation modes, and richer multi-setting personalization beyond the current three shared user preferences.

## Current High-Value Next Work

Recommended next slices:

1. Keep `/dashboard` as the default signed-in home until a separate, proof-backed home-switch experiment is explicitly planned.
2. If more Console work is needed after C75, keep it narrow and read-only before any broader module family, graph surface, or home-switch experiment.
3. Prefer similarly calm orientation and support surfaces over any KPI-shaped or route-replacing Console expansion.
4. Treat 32:9 orbit-edge secondaries or near/far display modes as later proof work only if real usage shows the centered-first Console is insufficient.
5. Design explicit audited support/admin views only if cross-user support becomes necessary.
