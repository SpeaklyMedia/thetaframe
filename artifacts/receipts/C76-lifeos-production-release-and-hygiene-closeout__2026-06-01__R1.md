# C76 LifeOS Production Release And Hygiene Closeout

Date: 2026-06-01
Status: Production verified

## Summary

C76 records the June 1 LifeOS / ThetaFrame production release that followed the Slice 1 dashboard widget, Console visual polish, Life Ledger ordering hardening, production auth-state correction, and deploy hygiene work.

This closeout exists to keep the repo-local receipt lineage aligned with the deployed production artifact and the external working receipts created during the release.

## Approval

Mark explicitly approved the production mutation:

> approve production deploy of the current local ThetaFrame artifact to Vercel production.

## Delivered

- Deployed the current local ThetaFrame artifact to Vercel production.
- Preserved `/dashboard` as the signed-in home while adding the LifeOS dashboard widget.
- Kept `/console` as an additive, read-only orientation surface with the approved lighter flow-state visual treatment.
- Hardened Life Ledger Events ordering so the execution board is visible earlier in the Events tab.
- Refreshed Basic and Select Authorized production browser auth states through the proven short-lived Clerk sign-in-token helper.
- Corrected browser QA to verify the current dashboard review-queue surface instead of the stale `ai-draft-canvas-block` marker.
- Hardened the preview-only QA auth callback so it is lazy-loaded only when the preview callback flag is enabled.
- Excluded the ARCH-1 research-ingest ZIP folder from Vercel uploads through `.vercelignore`.

## Deployment

- deployment id: `dpl_FhoXCFVYQAmVMVED19TU8My3kKmq`
- deployment URL: `https://thetaframe-d1omdflqn-marks-projects-f03fd1cc.vercel.app`
- production URL: `https://thetaframe.mrksylvstr.com`
- ready state: `READY`
- target: production

Production aliases recorded by Vercel:

- `https://thetaframe.mrksylvstr.com`
- `https://thetaframe.vercel.app`
- `https://thetaframe-marks-projects-f03fd1cc.vercel.app`
- `https://thetaframe-mark-7660-marks-projects-f03fd1cc.vercel.app`

## Verification

Pre-deploy:

- `git diff --check`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/thetaframe run build`
- production `.vercel/output` bundle safety search
  - no `qa-auth`
  - no `consume-ticket`
  - no `ticket_start`
  - no `missing_ticket`
  - no `blocked_flag_off`
  - no `lifeos_qa_auth_callback_status`
  - no `VITE_LIFEOS_PREVIEW_AUTH_CALLBACK_ENABLED`

Post-deploy:

- `curl https://thetaframe.mrksylvstr.com/api/healthz`
  - result: `200`
  - body: `{"status":"ok"}`
- `THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com ... pnpm --filter @workspace/scripts run qa:browser`
  - result: `passes=22`, `skips=0`
  - Basic role enabled
  - Select Authorized role enabled
  - Vercel protection bypass disabled

## External Working Receipts

- `/home/mark/mark_communication_logic_model/receipts/THETAFRAME_PRODUCTION_DEPLOYMENT_VERIFIED__20260601T160824Z.md`
- `/home/mark/mark_communication_logic_model/receipts/THETAFRAME_POST_RELEASE_AUTH_STATE_REFRESH_AND_FULL_MATRIX_VERIFIED__20260601T060034Z.md`
- `/home/mark/mark_communication_logic_model/receipts/THETAFRAME_RELEASE_HYGIENE_CLOSEOUT__20260601T133158Z.md`
- `/home/mark/mark_communication_logic_model/receipts/THETAFRAME_PRODUCTION_DEPLOY_GATE_READY__20260601T133602Z.md`

## Evidence

- `/home/mark/mark_communication_logic_model/analysis/visual_qa/thetaframe_production_postdeploy_full_matrix__20260601T160300Z`

## Notes

- The untracked ARCH-1 research-ingest ZIP remained in the working tree but was excluded from Vercel upload and is not part of the production artifact.
- The production deployment was verified before this source-control closeout receipt was added.
