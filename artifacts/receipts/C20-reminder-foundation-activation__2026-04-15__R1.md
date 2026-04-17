# C20 Reminder Foundation Activation For Life Ledger Events

Date: 2026-04-15

## Summary

Activated the first real `4B` reminder slice for Life Ledger `events`.

This slice keeps scope narrow:
- no Google Calendar sync
- no push delivery infrastructure
- no new top-level reminders surface
- no change to Daily / Weekly / Vision hero scope

The design choice in this slice is:
- `life_ledger_events` stays the dated execution source of truth
- reminder policy remains stored on the event row
- the API now exposes normalized reminder state instead of leaving reminder policy as opaque JSON
- Baby-derived projected events continue to synchronize reminder changes through the linked Baby assignment rather than drifting into a second reminder system

## Server And API Changes

Added normalized reminder serialization and a dedicated reminder-policy mutation surface.

New helper:
- `artifacts/api-server/src/lib/lifeLedgerEventReminders.ts`

Key behavior:
- derives reminder execution date from `nextDueDate ?? dueDate`
- normalizes `leadDays`
- exposes:
  - `reminderEnabled`
  - `reminderLeadDays`
  - `nextReminderAt`
  - `reminderState`
- keeps completed / superseded events non-active by returning `reminderState=inactive` and `nextReminderAt=null`

New route:
- `POST /api/life-ledger/events/{id}/reminder-policy`

Request body:
- `enabled: boolean`
- `leadDays?: number[]`

Response:
- updated `LifeLedgerEntry`

Files updated:
- `artifacts/api-server/src/routes/life-ledger.ts`
- `artifacts/api-server/src/routes/ai-drafts.ts`
- `artifacts/api-server/src/lib/babyKbAssignments.ts`
- `lib/api-spec/openapi.yaml`
- generated clients in:
  - `lib/api-client-react`
  - `lib/api-zod`

Important internal behavior:
- all Life Ledger entry responses now flow through `serializeLifeLedgerEntry(...)`, so the normalized reminder fields are present consistently on:
  - list entries
  - create entry
  - get entry
  - update entry
  - event execution-state updates
  - AI draft apply responses for Life Ledger tabs
- reminder updates for Baby-derived events call back into the assignment layer via `syncBabyKbAssignmentReminderPolicyForAssignee(...)` and then re-read the projected event

## Frontend Changes

Updated the Life Ledger `events` execution board in:
- `artifacts/thetaframe/src/pages/life-ledger.tsx`

What changed on event cards:
- visible reminder state:
  - `Reminders off`
  - normalized reminder summary
  - normalized `reminderState`
  - `Next reminder ...` when present
- lightweight reminder controls:
  - `7 / 2 / 0`
  - `2 / 0`
  - `Day of`
  - `Clear`

Behavior:
- controls only render on the `events` tab
- controls are disabled when an event has no due date / next due date
- successful reminder changes invalidate:
  - `events` list
  - `next-90-days`
  - Baby KB hero rollups
  - onboarding progress
- execution-state actions remain intact and continue to share the same board

## Validation

Completed:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-spec run postcodegen`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`

Expected non-failing build noise remained unchanged:
- Vite sourcemap warnings in `src/components/ui/tooltip.tsx`
- Vite sourcemap warnings in `src/components/ui/dropdown-menu.tsx`
- existing frontend chunk-size warning

## Runtime Proof

Production deploy:
- Inspect: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/C8xgXrk2fcUFpdbtgsNKiVo67RWK`
- Deployment: `https://thetaframe-h6vmne0hq-marks-projects-f03fd1cc.vercel.app`
- Alias: `https://thetaframe.vercel.app`
- Base URL validated: `https://thetaframe.mrksylvstr.com`

Authenticated reminder smoke was executed against production using a live Clerk token obtained from the saved Playwright browser auth state.

Manual event assertions passed:
- `POST /api/life-ledger/events` -> `201`
- `POST /api/life-ledger/events/{id}/reminder-policy` with `[7,2,0]` -> `200`
- normalized response exposed:
  - `reminderEnabled=true`
  - `reminderLeadDays=[7,2,0]`
  - `nextReminderAt` derived from due date
  - `reminderState=scheduled`
- reminder update to `[0]` changed the derived `nextReminderAt`
- reminder clear returned:
  - `reminderEnabled=false`
  - `reminderLeadDays=[]`
  - `nextReminderAt=null`
  - `reminderState=inactive`
- after re-enabling day-of reminder and marking the event completed:
  - `completionState=completed`
  - `reminderState=inactive`
  - `nextReminderAt=null`
- cleanup `DELETE /api/life-ledger/events/{id}` executed

Baby-derived reminder sync passed:
- existing projected event with `sourceType=baby_kb_assignment` was updated through the same reminder endpoint
- response preserved:
  - `sourceType=baby_kb_assignment`
  - `sourceAssignmentId`
- normalized reminder fields updated correctly
- original reminder configuration was restored afterward

## Result

- Pass / Fail / Blocked: `Pass`
- Notes:
  - this slice activates reminder semantics inside Life Ledger `events` without starting delivery, mobile notification plumbing, or calendar sync
  - the next reminder-delivery work can now build directly on normalized event reminder state instead of opaque reminder-policy JSON alone
