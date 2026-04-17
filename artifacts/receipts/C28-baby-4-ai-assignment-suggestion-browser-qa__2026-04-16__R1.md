# `C28` Baby-4 AI Assignment Suggestion Browser QA

## Browser Baseline

Canonical browser gate on production:
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com pnpm run qa:browser`
- Result: `passes=12`, `skips=0`

Covered routes:
- `/`
- `/sign-in`
- signed-out `/daily`
- authenticated `/daily`
- authenticated `/weekly`
- authenticated `/vision`
- authenticated `/life-ledger?tab=events`
- authenticated `/reach`
- authenticated `/bizdev`
- admin `/life-ledger?tab=baby`
- admin `/admin`

## Targeted Baby-4 Proof

Evidence directory:
- `test-results/thetaframe-browser-qa/c28`

Screenshots captured on production:
- `c28-baby-generate-control.png`
- `c28-baby-draft-review.png`
- `c28-baby-assignment-applied.png`

Browser/API-backed Baby-4 findings:
- the Baby tab now shows `Generate AI assignment suggestion` only when the entry is temporarily made eligible
- the Baby AI review panel renders `baby_kb_assignment_draft` rows on the admin Baby tab
- seeded Baby assignment draft approve/apply succeeds against production APIs
- resulting Baby assignment projected through the existing Baby assignment path before cleanup

## Evidence Split

Browser-verified:
- Baby admin tab mounted successfully
- generate control rendered on an eligible Baby entry
- Baby AI review panel rendered the seeded assignment draft
- applied-assignment state rendered on the same Baby entry before cleanup

API-verified:
- eligible generation route returned `503` because `OPENAI_API_KEY` is missing in production
- ineligible generation route returned `409`
- seeded draft review-state update returned `200`
- seeded draft apply returned `200`
- apply response returned `babyAssignment` with a created assignment id and projected event id

Blocked:
- true model-generated success path on production
  - blocked by missing `OPENAI_API_KEY`
  - classified as environment/configuration, not product regression

## Cleanup

Temporary proof state was removed after capture:
- temporary Baby eligibility tag reverted
- seeded Baby AI draft deleted
- seeded Baby assignment deleted
- seeded projected Life Ledger event deleted

## Notes

- `qa:browser:headed` was not run in this slice.
- This receipt separates route/surface health from provider-runtime readiness. The browser surfaces and apply pipeline are real; only the live model generation success path remains blocked by missing production env.
