# User Preferences Contract

Date: 2026-04-25
Status: Canonical shared user-preferences contract after C75 current-contract completion

## Purpose

ThetaFrame now has one persisted per-user preference surface for signed-in presentation and reminder-copy behavior. This contract is separate from `user_modes` and separate from lane content.

Current preference scope:

- reduced stimulation
- density
- reminder tone

Current preference application scope:

- `/dashboard`
- `/console`
- `/daily`
- `/weekly`
- `/vision`

`/dashboard` remains the default signed-in home. Preferences do not change routing, permissions, lane ownership, or review/apply authority.

## Persisted Model

Database table: `user_preferences`

One row per Clerk `userId`.

Current fields:

- `userId`
- `reducedStimulation`
- `density`
- `reminderTone`
- `createdAt`
- `updatedAt`

Current enum values:

- `reducedStimulation`: `default`, `reduced`
- `density`: `comfortable`, `compact`
- `reminderTone`: `gentle`, `standard`

Defaults:

- `reducedStimulation=default`
- `density=comfortable`
- `reminderTone=gentle`

If no row exists yet, the read contract still returns the default preference object instead of `404`.

## API Contract

Authenticated endpoints:

- `GET /api/user-preferences`
- `PUT /api/user-preferences`

Read response shape:

- `reducedStimulation`
- `density`
- `reminderTone`

Write body shape:

- `reducedStimulation`
- `density`
- `reminderTone`

The first write upserts the row for the current user. The public API does not expose internal row ids or raw `userId`.

## Frontend Contract

Canonical frontend helpers:

- `artifacts/thetaframe/src/hooks/use-user-preferences.ts`
- `artifacts/thetaframe/src/lib/user-preferences.ts`

Signed-in shell application:

- `data-density`
- `data-reduced-stimulation`
- `data-reminder-tone`

Current signed-in entry point:

- header button: `Display + reminders`

Current dialog responsibilities:

- show only the three preferences above
- persist changes immediately on save
- keep copy plain-language and non-technical

## Behavior Contract

### Reduced Stimulation

`reduced` softens non-essential visual intensity:

- workspace atmosphere opacity
- header blur emphasis
- Console glow emphasis
- strong hover lift on shared buttons
- Habit Canvas hover/focus transform emphasis

This must not reduce functional contrast or hide important controls.

### Density

`compact` modestly tightens spacing through shared density classes and shell attributes.

This must not:

- reorder content
- hide modules
- clip controls
- create a second layout mode system for Console

### Reminder Tone

This changes reminder-oriented helper copy only.

Current tone targets:

- Dashboard reminder-oriented support copy
- Console `Constraint Horizon` helper and empty-state copy

It must not change counts, data ordering, permissions, or urgency logic.

## Non-Goals

This contract does not currently include:

- account/profile/security settings
- per-surface overrides
- admin-managed presets
- fullscreen presentation modes
- near/mid/far Console display modes
- routing or home-path changes
- module inventory changes

## Relationship To `user_modes`

`user_modes` remains responsible for:

- helper state / mode
- workspace color / `colourState`

Do not expand `user_modes` into a generic settings bucket.
