# `C29` Baby-4 Real Generated Draft Closeout

Date: 2026-04-16

## Scope

Closed Baby-4 by proving a real provider-generated `baby_kb_assignment_draft` in production without seeded draft setup.

Product code changed only to harden the existing Baby suggestion provider parser after the real provider returned JSON in a Markdown fence:
- `artifacts/api-server/src/lib/babyKbAssignmentSuggestions.ts`

## Environment Preflight

ThetaFrame Vercel project:
- linked project: `thetaframe`
- production domain used for QA: `https://thetaframe.mrksylvstr.com`

Production env presence checked with `vercel env ls`:
- `OPENAI_API_KEY`: `missing`
- `OPENAI_MODEL`: `missing`
- `OPENAI_BASE_URL`: `missing`

Local shell env-name check:
- no `OPENAI_*` env names present
- no `AI_INTEGRATIONS_OPENAI_*` env names present

Yuki cross-check:
- Yuki uses Render variable names `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`
- local Yuki operator env exposed only `RENDER_API_BASE_URL` and `RENDER_API_KEY` by name
- prior Yuki receipts record that the intended official OpenAI key was not present locally

Secret values were not printed or written to the repo during this preflight.

## Production Browser Gate

Command:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=/home/mark/vscode-projects/thetaframe/test-results/thetaframe-browser-qa/c29 \
pnpm run qa:browser
```

Result:
- `passes=12`
- `skips=0`

Covered:
- signed-out public shell
- sign-in shell
- unknown `/baby` not-found behavior
- signed-out `/daily` fallback
- authenticated `/daily`
- authenticated `/weekly`
- authenticated `/vision`
- authenticated `/life-ledger?tab=events`
- authenticated `/reach`
- authenticated `/bizdev`
- admin `/life-ledger?tab=baby`
- admin `/admin`

## Closeout Result

Status: `COMPLETE`

Final result:
- Yuki's working text-generation path was identified as OpenRouter, not Yuki's `AI_INTEGRATIONS_OPENAI_*` pair
- ThetaFrame production `OPENAI_API_KEY` / `OPENAI_BASE_URL` were updated to the working Yuki OpenRouter key/base URL pairing
- production was redeployed with the parser hardening patch
- real provider generation returned `201`
- generated draft kind was `baby_kb_assignment_draft`
- review-state update returned `200`
- apply returned `200` with `babyAssignment`
- proof assignment and temporary source entry were cleaned up

Projection note:
- the generated draft selected `projectionPolicy=event_only` but returned `dueDate=null`, so no projected Life Ledger event was created

## Initial Required Operator Action

Add a production-safe provider key to ThetaFrame Vercel:

```bash
vercel env add OPENAI_API_KEY production
```

Optional only if needed:

```bash
vercel env add OPENAI_MODEL production
vercel env add OPENAI_BASE_URL production
```

Then redeploy production and rerun the C29 proof:
- generate real Baby assignment suggestion from an eligible verified Baby KB entry
- verify `201` generation response and `baby_kb_assignment_draft`
- approve/apply generated draft
- confirm returned `babyAssignment`
- capture generated-draft and applied-assignment screenshots
- clean up generated proof state

## Roadmap Sync

Updated:
- `THETAFRAME_UI_REBUILD_ROADMAP.md`
- `THETAFRAME_PHASE4_EXECUTION_PLAN__2026-04-14__R1.md`

The roadmap now records `C28` as implemented and `C29` as complete with real provider-generated production proof.

## Follow-Up Attempt

After the operator requested `proceed`, before the later Yuki-provider reuse instruction, the production Vercel env was checked again.

Result:
- `OPENAI_API_KEY`: still `missing`
- no `OPENAI_*` or `AI_INTEGRATIONS_OPENAI_*` key names were present in the local shell

No redeploy was triggered because the required provider secret is still absent, and redeploying the existing production build without it would leave the Baby-4 generation route blocked in the same state.

## Yuki Provider Reuse Attempt

After the operator requested `USE WHAT YUKI IS USING`, ThetaFrame was configured from Yuki's live Render provider env names without printing or writing secret values.

Mapped:
- Yuki `AI_INTEGRATIONS_OPENAI_API_KEY` -> ThetaFrame `OPENAI_API_KEY`
- Yuki `AI_INTEGRATIONS_OPENAI_BASE_URL` -> ThetaFrame `OPENAI_BASE_URL`

ThetaFrame Vercel Production env presence after setup:
- `OPENAI_API_KEY`: present, encrypted
- `OPENAI_BASE_URL`: present, encrypted
- `OPENAI_MODEL`: not set; code default remains active

Production was redeployed so the serverless runtime picked up the new provider env.

Redeploy evidence:
- previous production deployment: `dpl_2q9WPxCJX64RRiy5xbL1cKb41rmc`
- new production deployment: `dpl_Bmnji4nbwgjjRPMoKArngjUTR97w`
- new production URL: `https://thetaframe-gp4pbd0qc-marks-projects-f03fd1cc.vercel.app`
- production aliases include `https://thetaframe.mrksylvstr.com`
- deployment status: `Ready`

Production browser gate after redeploy:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=/home/mark/vscode-projects/thetaframe/test-results/thetaframe-browser-qa/c29-final \
pnpm run qa:browser
```

Result:
- `passes=12`
- `skips=0`

Targeted real-generation proof against `https://thetaframe.mrksylvstr.com`:
- temporary eligible Baby KB entry created: `id=72`, status `201`
- generate control screenshot: `test-results/thetaframe-browser-qa/c29-final/c29-real-generate-control.png`
- generation request status: `503`
- returned error: `OpenAI suggestion request failed with HTTP 401.`
- generated draft id: none
- generated assignment id: none
- projected event id: none
- failure screenshot: `test-results/thetaframe-browser-qa/c29-final/c29-real-proof-failure.png`
- proof JSON: `test-results/thetaframe-browser-qa/c29-final/c29-real-proof.json`

Cleanup:
- temporary Baby KB entry delete status: `204`

Interim status after this attempt: `BLOCKED_ON_PROVIDER_CREDENTIAL`

The missing-env blocker is resolved. The remaining blocker is provider authentication for the copied Yuki credential/base URL pairing. Baby-4 is not fully closed because production did not mint a real `baby_kb_assignment_draft`.

Interim next action from this attempt:
- replace or refresh ThetaFrame `OPENAI_API_KEY` with a provider credential accepted by the configured `OPENAI_BASE_URL`, or update `OPENAI_BASE_URL` to the endpoint that accepts the copied Yuki credential
- redeploy production after changing either env value
- rerun the targeted C29 proof from generation through approve/apply and cleanup

## Why Yuki Works

Local Yuki inspection showed two separate provider paths:
- Yuki chat/reply generation imports `openrouter` from `@workspace/integrations-openrouter-ai` and calls `openrouter.chat.completions.create(...)`
- Yuki's `AI_INTEGRATIONS_OPENAI_*` vars are used by OpenAI SDK audio/image helpers, not by the main chat path

Sanitized Render-env/provider probes showed:
- `AI_INTEGRATIONS_OPENAI_BASE_URL` points at the official OpenAI API
- `AI_INTEGRATIONS_OPENAI_API_KEY` is OpenRouter-style, so official OpenAI rejects it with `401 invalid_api_key`
- `AI_INTEGRATIONS_OPENROUTER_BASE_URL` points at OpenRouter
- `AI_INTEGRATIONS_OPENROUTER_API_KEY` is accepted by OpenRouter
- OpenRouter accepted both `chat/completions` and `/responses` probes

Root cause:
- the first "use Yuki" attempt copied Yuki's non-working OpenAI pair instead of Yuki's working OpenRouter pair

## Final Provider Correction

ThetaFrame Vercel Production was updated to use Yuki's working OpenRouter provider path:
- Yuki `AI_INTEGRATIONS_OPENROUTER_API_KEY` -> ThetaFrame `OPENAI_API_KEY`
- Yuki `AI_INTEGRATIONS_OPENROUTER_BASE_URL` -> ThetaFrame `OPENAI_BASE_URL`
- `OPENAI_MODEL` remains unset; the code default was accepted by OpenRouter

Secret values were not printed or written to the repo.

Final deployment:
- deployment id: `dpl_7ckcNDD9sGMhjbV84nnEKnj1ne5e`
- production URL: `https://thetaframe-6yvfcyydu-marks-projects-f03fd1cc.vercel.app`
- production alias: `https://thetaframe.mrksylvstr.com`
- deployment status: `READY`

Provider-shape hardening:
- OpenRouter returned JSON wrapped in a Markdown code fence on the first corrected-provider proof
- `parseProviderJsonOutput` now accepts strict JSON, fenced JSON, and a JSON object embedded in provider text

Static/build verification:
- `pnpm run typecheck` — PASS
- `pnpm --filter @workspace/api-server run build` — PASS
- `pnpm --filter @workspace/thetaframe run build` — PASS
- Vercel production build — PASS

Final production browser gate:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=/home/mark/vscode-projects/thetaframe/test-results/thetaframe-browser-qa/c29-openrouter-r2-gate \
pnpm run qa:browser
```

Result:
- `passes=12`
- `skips=0`

## Final Real Draft Proof

Proof folder:
- `test-results/thetaframe-browser-qa/c29-openrouter-r2/`

Screenshots:
- generate control: `test-results/thetaframe-browser-qa/c29-openrouter-r2/c29-openrouter-r2-generate-control.png`
- generated draft: `test-results/thetaframe-browser-qa/c29-openrouter-r2/c29-openrouter-r2-generated-draft.png`
- applied assignment: `test-results/thetaframe-browser-qa/c29-openrouter-r2/c29-openrouter-r2-applied-assignment.png`

Proof JSON:
- `test-results/thetaframe-browser-qa/c29-openrouter-r2/c29-openrouter-r2-proof.json`

API statuses:
- temporary eligible Baby KB entry create: `201`
- real provider generation: `201`
- generated draft id: `36`
- generated draft kind: `baby_kb_assignment_draft`
- review-state update to `approved`: `200`
- apply draft: `200`
- generated Baby assignment id: `8`
- projected event id: none, because generated `dueDate` was `null`

Cleanup:
- supersede generated Baby assignment: `200`
- delete temporary Baby KB source entry: `204`
- authenticated post-cleanup source-entry check: `404`

Final status: `C29_COMPLETE_REAL_GENERATED_DRAFT_PROVEN`
