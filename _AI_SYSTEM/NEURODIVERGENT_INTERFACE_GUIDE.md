# ThetaFrame Neurodivergent Interface Guide

Date: 2026-04-17
Status: Canonical AI-agent guardrail for Basic onboarding and AI usefulness work

## Product Rule

ThetaFrame should reduce decisions before it adds features. Basic users should always be able to answer:

- Where am I?
- What is the smallest useful next step?
- What can wait?
- Will AI change anything without my review?

## Basic Onboarding Pass Definition

The Basic onboarding path is Daily, Weekly, and Vision. Onboarding is repeatable: completion history is preserved, but the user can reopen the Guide from the header any time.

Daily, Weekly, and Vision should each show one compact next-step surface near the top of the lane. Copy should be calm, concrete, and free of shame or urgency language.

Start Here is route-aware:

- opening from Daily should focus Today;
- opening from Weekly should focus This Week;
- opening from Vision should focus Goals;
- opening from Dashboard should show the full Basic path;
- restart means show first-step guidance again, not erase saved data or onboarding history.

Start Here should keep visible tabs or segmented controls for the Basic surfaces so the user can switch without closing the guide.

## Control Center Rule

Signed-in users should land on the Control Center dashboard. It is one calm place to see what needs attention, not a second task system.

Dashboard content should stay lane-safe:

- Basic users see Today, This Week, Goals, AI review status, and honest calendar planning placeholders.
- Select Authorized users see Basic plus only assigned optional lane summaries.
- Admin users may see governance links, but the dashboard must not become a private cross-user browsing surface.

The old `Explore / Build / Release` mode badge should not appear as a primary header control. If mode is shown, use plain helper labels:

- Look Around
- Do The Work
- Wrap Up

Those labels may still write to the existing internal mode values for compatibility.

## Plain-Language Surface Rule

Basic surfaces should be written around a 6th grade reading level. Prefer short sentences, concrete verbs, and visible order of operations.

Use plain helper names in the user-facing Basic flow:

- Daily Frame -> Today
- Tier A -> Must Do Today
- Tier B -> Can Do Later
- Time Blocks -> Simple Time Plan
- Micro-Win -> Small Win
- Weekly Rhythm -> This Week
- Non-Negotiables -> Must Keep
- Recovery Plan -> If Things Get Hard
- Vision Tracker -> Goals
- Next Visible Steps -> Next Steps

Product/internal names may remain in code, schemas, and admin surfaces. Basic user copy should lead with the plain name.

## Basic First-Screen Order

Daily first screen:

- Workspace color picker sits under the hero as a top-level control surface, not as a numbered step or bounded inner box.
- Step 1. Add one must-do.
- Step 2. Add later tasks if needed.
- Step 3. Add a simple time plan if useful.
- Step 4. Add a small win.

Weekly first screen order:

1. Name this week.
2. Add main steps.
3. Add what must stay steady.
4. Add a backup plan.

Vision first screen order:

1. Add one goal.
2. Add one next step.
3. Review goals.

Secondary panels should come after the core flow. AI draft review, support rails, linked Baby items, calendar/mobile placeholders, and extra onboarding help belong under clear "More" sections unless the user is in that specific workflow.

## Workspace Color And Controls

The workspace color picker is a workspace state control, not a task step. When a signed-in user picks Green, Yellow, Red, Blue, or Purple, that color should tint the workspace across the user's allowed lanes. On Today, the selected workspace color should also keep the current Daily frame `colourState` in sync for compatibility.

Design rules:

- keep signed-out/public pages neutral;
- preserve lane atmosphere while adding the user's current workspace color;
- use subtle page/header tint, selected states, and focus accents rather than harsh full-page saturation;
- expose `data-workspace-colour` on the shared layout for QA;
- place the picker directly under hero heading areas on Today, This Week, and Goals;
- render the picker as a top-level control strip, not a card, step block, or bounded inner surface;
- make real action buttons visually stronger than cards, guide tiles, step blocks, and More sections;
- avoid styling informational blocks like primary actions.

Mood-aware AI context should treat color as user-declared interface state, not diagnosis. Green means calm/ready, Yellow means anxious/scattered, Red means overwhelmed, Blue means low/flat, and Purple means creative/energized. AI may adapt draft tone and structure from this context, but outputs remain review-first and must not silently write user data.

## AI Time-Saver Map

AI should be positioned as a sorting and drafting layer:

- Daily: convert messy current-work input into Tier A, Tier B, time blocks, and a micro-win draft.
- Weekly: compress scattered notes into a weekly theme, protected steps, non-negotiables, and recovery plan.
- Vision: turn vague long-term ideas into goals plus next visible steps.

AI outputs remain draft/review/apply by default. Do not add silent writes for user data. Do not let AI operate outside the user's allowed lanes.

## Interface Defaults

- Prefer one next step over many choices.
- Put the actual user action before support panels.
- Use obvious verb-first buttons, not abstract nouns.
- Use stronger button styling for real actions and calmer styling for blocks.
- Keep re-entry gentle after inactivity or overwhelm.
- Use visible review states for AI drafts.
- Keep Basic users focused on Daily, Weekly, and Vision.
- Avoid adding product education that blocks the primary work surface.
- Keep the Control Center dashboard sparse, action-first, and honest about deferred integrations.

Receipts for this area should record browser screenshots for Basic Daily, Weekly, Vision, and the reopened Guide.
