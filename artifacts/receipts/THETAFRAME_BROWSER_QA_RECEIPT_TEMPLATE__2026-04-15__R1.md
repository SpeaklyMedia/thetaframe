# ThetaFrame Browser QA Receipt Template

- Date:
- Operator:
- Environment:
  - Base URL:
  - Browser:
  - Auth modes used:
  - User storage state:
  - User storage state captured at:
  - Admin storage state:
  - Admin storage state captured at:
  - Build / commit:

## Preconditions

- `pnpm run typecheck`
- `pnpm --filter @workspace/thetaframe run build`
- `pnpm run qa:browser`
- `pnpm run qa:browser:auth:capture` when authenticated browser proof is required

## Observed Product Truth

- Summarize what the browser run actually proved.

## Evidence Gathered

### Browser-verified behavior

- List route-level and visible-state proof here.

### API-only verified behavior

- List secondary authenticated smoke proof here.

### Blocked / manual signoff items

- List anything left unclosed and why.

## Checklist Result

- [ ] Signed-out shell
- [ ] Auth gate or redirect behavior
- [ ] Authenticated lane sweep
- [ ] Admin-only sweep when applicable
- [ ] Secondary API smoke where needed

## Result

- Pass / Fail / Blocked:
- Notes:
