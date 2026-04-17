# ThetaFrame Current Truth

Date: 2026-04-17
Status: Canonical current-state summary after C43

## What ThetaFrame Does Now

ThetaFrame is a private, authenticated operating system for personal planning and life execution. It has separate user logins, a signed-in Control Center dashboard, module-gated lanes, per-user saved data, review-first AI draft infrastructure, repeatable Basic onboarding, a Basic LIFEos Habit Canvas, and production browser QA coverage.

Current lanes:

- Daily: current-day execution, energy state, Tier A/Tier B tasks, time blocks, micro-win, Daily quick capture, Daily AI draft review/apply.
- Weekly: weekly rhythm, theme, protected steps, non-negotiables, recovery plan, Weekly AI draft review/apply.
- Vision: long-horizon goals plus next visible steps, Vision AI draft review/apply.
- BizDev: optional lead/opportunity lane.
- Life Ledger: optional people, events, financial, subscriptions, travel lane; Baby KB is admin-only inside this lane.
- REACH: optional file/artifact lane with private object ownership.
- Admin: governance lane for user access, presets, imports, Baby KB admin workflows, and AI review/apply tooling.

Signed-in `/` redirects to `/dashboard`. The dashboard is a navigation and summary surface, not a new analytics database. It shows allowed-lane next actions, review-first AI draft status, calendar-planning truth, and Life Ledger mobile/reminder links only when the user has Life Ledger.

## Access Levels

Admin:

- Owner email or Clerk `publicMetadata.role === "admin"`.
- Receives all current modules regardless of stored permission rows.
- Can manage users, module grants, presets, and admin Baby workflows.
- Admin governance does not mean ordinary private-lane APIs can browse other users' lane records.

Select Authorized:

- Always receives Basic modules.
- May receive any assigned optional modules: BizDev, Life Ledger, REACH.
- Cannot access Admin or Baby KB admin tooling unless promoted to Admin.
- AI scope is limited to allowed modules.

Basic User:

- Default for new non-admin users.
- Receives Daily, Weekly, Vision.
- Cannot access BizDev, Life Ledger, REACH, Admin, Baby KB, imports, assignment tools, or admin presets.
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
- the signed-in header has a Dashboard link and no longer exposes Explore/Build/Release as a primary badge;
- Start Here is route-aware: opening it from Daily focuses Today, Weekly focuses This Week, Vision focuses Goals, and Dashboard shows the full Basic path;
- Start Here has visible Daily/Weekly/Vision tabs and a restart-current-surface action that replays guidance without deleting saved data;
- Basic Guide shows Daily, Weekly, Vision only;
- dismissing the Guide does not remove the ability to reopen it;
- existing `onboarding_progress` completion semantics still derive from real saved data;
- Daily, Weekly, and Vision each show a compact next-step surface plus a clear step order near the top of the lane;
- Basic lane first screens lead with the core work before AI review, support, linked items, calendar/mobile placeholders, or extra onboarding panels;
- Basic user labels prefer plain helper names: Today, This Week, Goals, Must Do Today, Can Do Later, Must Keep, If Things Get Hard, Next Steps;
- the Daily color picker sets the user's signed-in workspace color, and that palette follows the user across allowed lanes;
- the Basic Dashboard, Daily, Weekly, and Vision surfaces are now framed as connected LIFEos Habit Canvas surfaces;
- the Habit Canvas has a scoped hover/focus layer: desktop uses CSS hover/focus, touch devices use scroll-focus, and reduced-motion suppresses transform movement;
- Habit Canvas focus behavior is scoped to `data-habit-focus-group` / `data-habit-focus-card` and must not become a global card/table hover system;
- the shared layout exposes `data-lane` and `data-workspace-colour` for browser QA;
- real buttons are styled to read more clearly as controls than cards, step blocks, or disclosure panels;
- copy should stay calm, concrete, and free of shame or urgency language.

Do not turn onboarding into a blocking tutorial or dense dashboard. The goal is to reduce decisions, not add another task system.

The Control Center should stay calm and cross-lane:

- Start here today;
- Needs review;
- Coming up;
- Plan calendar;
- Phone reminders only for Life Ledger-enabled users;
- Admin governance only for Admin users.

The old `userMode.mode` values remain in the data model for compatibility. User-facing mode language should be plain helper states: Look Around, Do The Work, Wrap Up.

## AI Model

AI is review-first and lane-scoped.

Current implemented foundation:

- persisted AI drafts;
- provenance and review state;
- explicit approve/reject/apply controls across supported draft kinds;
- Baby KB assignment suggestion generation with provider config;
- UI groundwork for Basic AI time-saver use cases.

AI must not silently write user data. AI outputs should become drafts that the user or admin reviews before apply, especially for high-risk data.

Basic AI time-saver map:

- Daily: messy current-work input -> Tier A, Tier B, time blocks, micro-win draft.
- Weekly: scattered notes -> theme, protected steps, non-negotiables, recovery plan draft.
- Vision: vague long-term ideas -> goals plus next visible steps draft.

Future AI work should build on this map one workflow at a time.

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

Expected browser QA result after C43: `passes=16`, `skips=0`.

Expected isolation proof:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/<slice-name> \
pnpm run qa:isolation
```

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
- compact/spacious/reduced-stimulation preference settings;
- production-grade AI generation for every Basic time-saver use case.

## Current High-Value Next Work

Recommended next slices:

1. Define the first Basic provider-backed AI workflow, preferably Daily messy input -> Daily draft.
2. Add user preference controls for reduced stimulation, density, and reminder tone.
3. Extend Control Center summaries and repeatable onboarding to Select Authorized optional lanes.
4. Design explicit audited support/admin views only if cross-user support becomes necessary.
