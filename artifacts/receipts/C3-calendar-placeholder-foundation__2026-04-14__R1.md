# C3 Calendar Placeholder Foundation Receipt

Date: 2026-04-14

## Contract Symbols Added
- `thetaCalendarLinkSchema`
- `ThetaCalendarLink`
- `isThetaCalendarLink`

These were added to `@workspace/integration-contracts` as Google Calendar-specific narrowing of the existing external-link contract.

## Frontend Lanes Touched
- Daily
- Weekly
- Life Ledger (`events` tab only)

## States Implemented
- `import`
- `export`
- `linked`
- `conflicted`

`linked` and `conflicted` are dormant in this slice. They are defined in the shared placeholder content map and supported by the presentational card, but not rendered by default yet.

## Lanes Intentionally Untouched
- BizDev
- REACH
- Admin
- Baby KB
- Life Ledger tabs other than `events`

## Non-Goals Preserved
- no runtime Google Calendar integration
- no DB changes
- no OpenAPI changes
- no API server changes
- no generated client changes
- no connect buttons, fake actions, or persisted connection state

## Placement Summary
- Daily: after `SupportRail`, before onboarding/helper content
- Weekly: after `SupportRail`, before `SkipProtocol`
- Life Ledger: after `SupportRail`, only when `activeTab === "events"`, before onboarding and `Next90Days`

## Best Next Action
Proceed to `C4` mobile deep-link and notification taxonomy scaffolding, unless AI draft/provenance work has been reprioritized ahead of mobile.
