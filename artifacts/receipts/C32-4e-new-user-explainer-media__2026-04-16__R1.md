# C32 4E New-User Explainer Media

Date: 2026-04-16

## Summary

Created the first `4E` explainer artifact for new users: a five-slide HTML deck using real production screenshots from `https://thetaframe.mrksylvstr.com`.

Deck:
- `artifacts/explainers/C32-4E-new-user-explainer__2026-04-16__R1.html`

No product runtime behavior changed. No paid-lane, billing, push-transport, access-rule, API, schema, or AI write behavior was implemented in this slice.

## Screenshot Assets

Captured from production with existing C31 storage states:

- `artifacts/explainers/c32-assets/01-public-shell.png`
- `artifacts/explainers/c32-assets/02-basic-daily.png`
- `artifacts/explainers/c32-assets/03-basic-weekly.png`
- `artifacts/explainers/c32-assets/04-basic-vision.png`
- `artifacts/explainers/c32-assets/05-select-life-ledger-events.png`
- `artifacts/explainers/c32-assets/06-admin-baby-review-privacy-safe.png`

Storage states used:

- Basic: `test-results/auth/thetaframe-basic.json`
- Select Authorized: `test-results/auth/thetaframe-select-authorized.json`
- Admin: `test-results/auth/thetaframe-admin.json`

Privacy caveat:
- The Admin/Baby KB screenshot is a real production UI capture with private card content blurred before the image was saved.
- The deck uses it only to demonstrate review-and-apply behavior, not as a new-user default feature.

## Deck Inspection

Inspected locally in Chrome through Playwright against the file URL.

Evidence screenshots:

- `scripts/test-results/thetaframe-browser-qa/c32-4e-explainer/c32-deck-desktop.png`
- `scripts/test-results/thetaframe-browser-qa/c32-4e-explainer/c32-deck-mobile.png`

Inspection result:

- slide count: `5`
- image count: `9`
- unloaded images: `0`
- detected text overflow at desktop viewport: `0`
- detected text overflow at mobile-sized viewport: `0`

The deck includes speaker notes/timing for a 60-90 second walkthrough.

## Verification

Static checks:

```bash
pnpm --filter @workspace/scripts run typecheck
pnpm run typecheck
```

Results:

- scripts typecheck: `PASS`
- workspace typecheck: `PASS`

Secret/token scan result:

- `PASS`, no matches

Production browser/API gate:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c32-4e-explainer \
pnpm run qa:browser
```

Result:

- `PASS`
- `passes=14`
- `skips=0`

## Status

Status: `COMPLETE`

Recommended next discussion: paid-lane packaging definition on top of the now-proven Basic, Select Authorized, and Admin access framework.
