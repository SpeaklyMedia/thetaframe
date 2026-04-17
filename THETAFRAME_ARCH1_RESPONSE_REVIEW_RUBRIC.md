# ThetaFrame ARCH-1 Response Review Rubric

Date: 2026-04-13

Use this rubric immediately after ARCH-1 returns and before classifying recommendations in the assimilation ledger.

## Pass Criteria
The response is usable only if all of these are true:
- it respects the role split: Replit = UI truth, ThetaFrame docs/code = behavioral truth
- it returns the full required output shape from `THETAFRAME_ARCH1_HANDOFF.md`
- it keeps Daily, Weekly, Vision, Life Ledger, and Baby KB aligned to their current purposes
- it does not require missing artwork to make the interface understandable
- it produces a shell-first staged rebuild order

## Findings-First Review Order
1. Hard product drift
2. Missing sections
3. Ambiguous hierarchy
4. Good recommendations safe to adopt

## Immediate Reject Conditions
Reject or constrain any recommendation that:
- turns Baby KB into a planner outside Life Ledger
- shifts execution weight away from Daily
- turns Weekly into backlog management
- turns Vision into a moodboard or inspiration gallery
- introduces new top-level modules instead of additive IA
- breaks route, permission, admin, onboarding, import, or promotion behavior

## Section Review Checklist

### 1. End-State UX Thesis
- does it describe ThetaFrame as an operating system rather than a generic productivity app
- does it preserve current-day execution as the center of gravity

### 2. Shell and Navigation Rules
- does it define stable shell behavior without changing route meaning
- does it support calmness and orientation without hiding utility

### 3. Per-Page Hierarchy
- does each lane have a clear primary region and secondary region
- is the hierarchy usable without hero artwork

### 4. Visual System Direction
- does it improve atmosphere, clarity, and rhythm
- does it avoid style choices that compete with daily execution

### 5. Copy and Language Rules
- does it define how the product should speak
- does it avoid turning Baby KB or Weekly into inflated concept language

### 6. Onboarding and First-Run Model
- does onboarding stay orientation-only
- does it preserve first-run setup where already validated

### 7. Baby KB Role and Limits
- does it keep Baby KB as admin-only feeder logic inside Life Ledger
- does it preserve provenance and import-based meaning

### 8. Future-Fit Guidance
- are reminders, Google Calendar, and iOS alarms/reminders treated as later constraints
- does the proposal avoid redesigning the app around those integrations prematurely

### 9. Anti-Patterns
- are there explicit things not to build
- do the anti-patterns actually guard against product drift

### 10. Staged Rebuild Order
- does it start with shared shell
- does it keep support lanes after core operational lanes

## Outcome Labels
- `usable as submitted`
- `usable with constraints`
- `not usable until clarified`

## Handoff To Assimilation
If the response is usable:
- move each recommendation into `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md`
- classify it
- update `THETAFRAME_UI_REBUILD_ROADMAP.md` only from accepted or constrained decisions

If the response is not usable:
- record the missing or conflicting sections in `Unresolved Deltas`
- do not start rebuild planning
