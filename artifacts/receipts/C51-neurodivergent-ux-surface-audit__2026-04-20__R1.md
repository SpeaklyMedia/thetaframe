# C51 Neurodivergent UX Surface Audit

Date: 2026-04-20
Status: PASS
Production target: `https://thetaframe.mrksylvstr.com`
Audited commit: `d6ed374952feea928ff5d930ccc899acd79adda3`

## Summary

C51 audited the current production UI as a neurodivergent end-user and classified visible surface content into:

- **Always visible:** current location, one primary action, saved/error state, active user data, urgent review count, destructive/safety warnings, and role/access state.
- **Callable support:** onboarding/tutorial copy, full step order, repeated AI trust explanations, empty-state education, calendar/mobile placeholders, support rails, evidence links, and non-urgent advanced status panels.

No product code, API, schema, database, auth, or AI-provider changes were made. The output is an evidence-backed simplification roadmap for follow-up UI slices.

## QA Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Production browser QA | PASS: `passes=16`, `skips=0` | `test-results/thetaframe-browser-qa/c51-ux-audit-baseline` |
| Isolation QA | PASS: `[c33-isolation] PASS checks=47` | `test-results/thetaframe-browser-qa/c51-ux-isolation/c33-isolation-results.json` |
| Focused surface screenshots | PASS: `checks=20` | `test-results/thetaframe-browser-qa/c51-ux-focused-surfaces` |

Focused screenshots captured:

- `public-home-desktop.png`
- `sign-in-desktop.png`
- `sign-up-desktop.png`
- `not-found-desktop.png`
- `basic-dashboard-desktop.png`
- `basic-dashboard-mobile.png`
- `basic-daily-desktop.png`
- `basic-daily-mobile.png`
- `basic-weekly-desktop.png`
- `basic-weekly-mobile.png`
- `basic-vision-desktop.png`
- `basic-vision-mobile.png`
- `start-here-dashboard.png`
- `start-here-daily.png`
- `basic-access-denied-followups.png`
- `followups-authorized.png`
- `life-ledger-events-authorized.png`
- `admin-life-ledger-baby.png`
- `reach-authorized.png`
- `admin-governance.png`

## Route And Role Matrix

| Surface | Role state | Access result | Primary action observed |
| --- | --- | --- | --- |
| `/` | signed-out | public | Sign up / sign in from marketing hero |
| `/sign-in` | signed-out | public | Clerk sign-in panel now appears before theta evidence |
| `/sign-up` | signed-out | public | Clerk sign-up panel now appears before theta evidence |
| `/dashboard` | Basic | allowed | Brain Dump Setup and Habit Canvas map |
| `/daily` | Basic | allowed | Today Canvas task/time/small-win work |
| `/weekly` | Basic | allowed | Week Canvas theme/steps/supports/backup work |
| `/vision` | Basic | allowed | Goals Canvas goal/next-step work |
| Start Here modal | Basic | callable | Restartable Daily/Weekly/Vision guide |
| `/bizdev` | Basic | denied | Access denied state |
| `/bizdev` | authorized user | allowed | Add FollowUp |
| `/life-ledger?tab=events` | authorized user | allowed | New Entry / event execution planning |
| `/life-ledger?tab=baby` | Admin | allowed | Baby KB review and assignment governance |
| `/reach` | authorized user | allowed | Upload files |
| `/admin` | Admin | allowed | Search/manage users and permissions |
| `/baby` | signed-out | not-found | Public not-found state |

## Always Visible Vs Callable Inventory

| Surface | Should remain always visible | Should become or stay callable |
| --- | --- | --- |
| Home | brand promise, clear CTA, stress-to-calm visual | evidence links and longer theta rationale after first CTA |
| Sign In / Sign Up | Clerk panel, concise auth helper copy | theta positioning and evidence links below auth panel |
| Dashboard | Brain Dump Setup, Today/Week/Goals map, urgent draft count | calendar planning explanation, mobile reminder status, mode explanation, optional work-lane education |
| Daily | lane title, mood color, one compact next action, Today Canvas | full step order, repeated AI helper copy, support rail, first-run education, calendar/mobile placeholders |
| Weekly | lane title, mood color, one compact next action, Week Canvas | full step order, repeated AI helper copy, support rail, calendar/mobile placeholders |
| Vision | lane title, mood color, one compact next action, Goals Canvas | full step order, repeated AI helper copy, support rail, linked-item education |
| Start Here | Basic guide tabs and route-aware restart path | detailed examples and education inside the modal body only |
| FollowUps | title, Add FollowUp, reminder date summary/counts, filters/table | reminder/calendar guidance and onboarding card after primary list controls |
| Life Ledger Events | title, New Entry, active tab, event execution board when active | AI draft review, calendar import placeholder, delivery simulator/status unless active items are due |
| Baby KB | active tab, search/filter, review board, assignment actions | provenance/import explanations and operational education after review controls |
| REACH | title, upload drop zone, search/filter, file list | AI metadata review and mobile placeholder unless there are active drafts |
| Admin | title, user search, user list, selected user permission editor | admin onboarding/preset education after core governance controls |
| Access denied / Not found | clear state, safe route back | additional explanation only if it helps route recovery |

## Neurodivergent UX Scorecard

Scores use `1-5`, where `5` is best.

| Surface | Orientation | Next action | Cognitive load | Emotional safety | Recoverability | AI trust | Design-tool feel | Mobile fit | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Home | 4 | 4 | 3 | 4 | 3 | N/A | 3 | 4 | Strong visual promise; theta evidence can compete with CTA. |
| Sign In / Sign Up | 5 | 5 | 4 | 4 | 4 | N/A | 2 | 4 | Clerk now appears before evidence. |
| Dashboard | 4 | 4 | 3 | 4 | 4 | 5 | 4 | 4 | Brain Dump is useful; secondary sections can be compressed. |
| Daily | 5 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | Canvas is strong; top guidance repeats before work. |
| Weekly | 5 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | Same repeated guidance pattern as Daily. |
| Vision | 5 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | Clear canvas; support content should stay below. |
| Start Here | 5 | 5 | 4 | 5 | 5 | 5 | 3 | 4 | Good callable support pattern. |
| FollowUps | 4 | 4 | 3 | 4 | 4 | N/A | 3 | 3 | Primary action is clear; guidance competes with summary/list. |
| Life Ledger Events | 4 | 3 | 2 | 4 | 4 | 4 | 2 | 3 | Non-urgent AI/calendar/status panels precede event work. |
| Baby KB | 4 | 3 | 2 | 4 | 4 | 4 | 2 | 3 | Admin density is expected, but education appears before board controls. |
| REACH | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 4 | Upload is clear; AI/mobile panels should be conditional or lower. |
| Admin | 4 | 4 | 3 | 4 | 4 | N/A | 2 | 3 | Governance actions are findable; dense by nature. |
| Access denied / Not found | 4 | 4 | 4 | 4 | 4 | N/A | N/A | 4 | Recovery is clear enough. |

## Findings

### P1

None. Access, auth, QA, and data-isolation checks passed.

### P2

1. **Basic lanes repeat instruction before action.**
   Daily, Weekly, and Vision show next step, AI helper, and full step order before the canvas. This helps first-time orientation but increases cognitive load for returning users.

2. **Optional lanes often put support/status before the primary work.**
   REACH, Life Ledger Events, and Baby KB can show AI review, calendar/mobile placeholders, onboarding, or explanatory panels before upload/list/review-board work.

3. **Dashboard has several secondary sections at equal visual weight.**
   Brain Dump Setup and the Habit Canvas map should dominate; calendar/mobile/mode/work-lane explanations should read as secondary.

4. **Support rails are often visible as static labels.**
   They reinforce structure, but on small screens they add words without an action.

### P3

1. Public Home and auth evidence links are useful but should remain below conversion/auth actions.
2. Admin density is acceptable for the audience, but first governance action should stay visually strongest.

## Simplification Roadmap

### Phase A: Content Triage, No New Behavior

Target value: every page leads with the smallest useful action.

- Keep Basic lane hero, mood picker, one compact next-step block, and canvas visible first.
- Move full `Order Of Steps` into Start Here or a closed `How this works` / `More help` section.
- Keep AI trust visible as a small review-first badge near draft entry points; move repeated explanatory paragraphs into callable sections.
- On REACH, place upload/search/file list before AI metadata review and mobile placeholder unless active drafts exist.
- On Life Ledger Events, place event execution/list work before calendar import placeholder and delivery simulator unless items are due now.
- On FollowUps, place summary/filter/list controls before reminder guidance and onboarding.

Acceptance:

- No routes, forms, data fields, or API behavior removed.
- Existing production browser QA remains `passes=16`, `skips=0`.
- Basic mobile screenshots show the canvas before repeated explanatory panels.

### Phase B: Shared Surface Contract

Target value: all signed-in surfaces follow a predictable mental model.

Standardize signed-in pages around:

1. **Where am I?** Lane hero and access-safe context.
2. **What do I do next?** One primary action or editable surface.
3. **What is saved or waiting?** Active records, urgent drafts, due reminders, or empty state.
4. **What can I call on?** Help, onboarding, AI explanations, placeholders, and integrations.

Candidate implementation:

- Create a small frontend-only surface layout helper or composition convention.
- Keep Basic `More` sections as the first pattern.
- For optional lanes, add closed collapsible sections only where existing content cannot be placed under an existing section cleanly.

Acceptance:

- A neurodivergent user can identify the first action on Dashboard, Daily, Weekly, Vision, FollowUps, REACH, Life Ledger Events, and Admin within 10 seconds.
- No new persisted preferences or backend contracts.

### Phase C: Only-If-Needed Callable Help Layer

Target value: support remains available without occupying first-screen attention.

- Add one lightweight reusable `Help / How this works` disclosure only if Phase A cannot cover optional/admin guidance with existing sections.
- Do not add chat, tooltips, coach popovers, or persistent preference systems in this slice.
- Keep Start Here as the Basic user's primary callable tutorial.

Acceptance:

- Callable help uses existing copy, not new product education.
- Reduced-motion and mobile layouts remain stable.
- Browser QA and focused screenshots pass.

## Recommended Next Build Slice

Implement Phase A first as a frontend-only layout/content-order pass:

- Daily/Weekly/Vision: move full step order and repeated AI helper copy below the canvas into existing More/Start Here pathways.
- REACH: move AI review and mobile placeholder below upload/search/file list unless active drafts exist.
- Life Ledger Events: move non-urgent calendar/import/mobile delivery explanation below event work unless due-now reminders exist.
- FollowUps: move reminder guidance below summary/filter/list.

This is the highest-leverage simplification because it reduces first-screen cognitive load without deleting functionality or changing contracts.

## Exclusions

Not committed:

- raw screenshots under `test-results/`;
- auth storage state;
- `.env*`;
- `.vercel/`;
- build output;
- generated local browser artifacts.
