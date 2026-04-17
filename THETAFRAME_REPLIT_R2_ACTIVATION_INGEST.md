# ThetaFrame Replit Activation Pack R2 Ingest

Date: 2026-04-13

## Source Packet
- `/home/mark/Downloads/ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip`

## Repo-Ingested Copies
The six extracted operator files are now copied into:
- `artifacts/replit-r2-activation/`

The complete outbound Replit send-set is also ingested at:
- `artifacts/replit-complete-send-set/`

## What This Packet Is
This is not an ARCH-1 return packet and it is not a replacement for the existing Replit UI master transport.

It is a downstream operator packet for the next Replit build pass after design approval. It adds:
- updated Replit activation prompts
- send-along checklist for the Replit build run
- actionable next steps from Replit back to Codex
- approved ThetaFrame brand assets
- approved loading-screen guidance

## Packet Contents
- `README__THETAFRAME_REPLIT_ACTIVATION_AND_BRAND_PACKET__2026-04-13__R1.md`
- `THETAFRAME_REPLIT_ACTIVATION_PROMPT__POST_APPROVAL_FULL_ARTIFACT_PLUS_BRAND__2026-04-13__R2.md`
- `THETAFRAME_REPLIT_ACTIVATION_PROMPT__COMPACT_PLUS_BRAND__2026-04-13__R2.txt`
- `THETAFRAME_REPLIT_SEND_ALONG_CHECKLIST__2026-04-13__R2.md`
- `THETAFRAME_ACTIONABLE_NEXT_STEPS__REPLIT_TO_CODEX__2026-04-13__R1.md`
- `THETAFRAME_LOGO_AND_LOADING_SCREEN_SPEC__2026-04-13__R1.md`
- `THETAFRAME_BRAND_ASSET_MANIFEST__2026-04-13__R1.json`
- `brand_assets/*`

## Ingested Repo Files
- `artifacts/replit-r2-activation/THETAFRAME_REPLIT_ACTIVATION_PROMPT__POST_APPROVAL_FULL_ARTIFACT_PLUS_BRAND__2026-04-13__R2.md`
- `artifacts/replit-r2-activation/THETAFRAME_REPLIT_ACTIVATION_PROMPT__COMPACT_PLUS_BRAND__2026-04-13__R2.txt`
- `artifacts/replit-r2-activation/THETAFRAME_ACTIONABLE_NEXT_STEPS__REPLIT_TO_CODEX__2026-04-13__R1.md`
- `artifacts/replit-r2-activation/THETAFRAME_REPLIT_SEND_ALONG_CHECKLIST__2026-04-13__R2.md`
- `artifacts/replit-r2-activation/THETAFRAME_LOGO_AND_LOADING_SCREEN_SPEC__2026-04-13__R1.md`
- `artifacts/replit-r2-activation/THETAFRAME_BRAND_ASSET_MANIFEST__2026-04-13__R1.json`

## New Authority Added By This Packet
- approved brand art for splash, login, compact mark, and startup/loading
- approved brand palette cues
- explicit rules for where loading art may and may not appear
- an operator-mode Replit build prompt for portable artifact generation

## Workflow Impact
This packet introduces a new execution lane:
1. design lock / architecture approval
2. Replit full-artifact build pass
3. Codex conformance transport into canonical code authority

It does not remove the existing local arbitration rules:
- ThetaFrame product contract still governs behavior
- Replit remains visual execution authority for this pass
- Baby KB remains inside Life Ledger
- Daily remains the primary execution lane

## Current Local Availability Check
Present locally in `~/Downloads`:
- `THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
- `THETAFRAME_ARCH1_TRANSPORT__2026-04-11__R1.zip`
- `ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip`
- `THETAFRAME_REPLIT_COMPLETE_SEND_SET__2026-04-13__R1.zip`

Present locally in the repo via the complete send-set:
- `artifacts/replit-complete-send-set/ThetaFrame_ARCH1_M2A_Implementation_Kit__2026-04-11.zip`
- `artifacts/replit-complete-send-set/ThetaFrame_ARCH1_M2_Blueprint__2026-04-11.zip`
- `artifacts/replit-complete-send-set/ARCH1_INSTRUCTIONAL__HOW_ARCH1_WORKS__20260204__R1.md`
- `artifacts/replit-complete-send-set/ARCH1_SYSTEM_TRAVEL__PROJECT_AGNOSTIC__20260204_R2.zip`
- `artifacts/replit-complete-send-set/THETAFRAME_OPERATOR_NOTE__SEND_ABOVE_PROMPT__2026-04-13__R1.txt`
- `artifacts/replit-complete-send-set/THETAFRAME_REPLIT_COMPLETE_SEND_SET_MANIFEST__2026-04-13__R1.json`

The remaining required external input is still:
- canonical ThetaFrame installable repo artifact if the outbound lane requires a zip/import separate from the local working repo

## Approved Brand Rules Captured
- primary splash/logo art is approved for signed-out splash and login
- compact mark is approved for shell-brand usage
- cosmic loading art is approved for startup, sync, and major background-job loading only
- full loading art must not appear on ordinary route changes
- artwork must not be required for operational readability
- motion must support `prefers-reduced-motion`

## Recommended Next Use
Use this packet as the operator overlay when preparing the Replit build pass.

Use the ingested repo copies as the local working references for prompts, checklist, next steps, spec, and manifest.
Use `artifacts/replit-complete-send-set/` as the canonical local outbound assembly for the next Replit pass.

Do not use it as a substitute for:
- the canonical ThetaFrame repo
- the Replit UI master transport
- the current ThetaFrame product-contract docs

## Continuation Rule
If the next step is still architecture selection, keep using the ARCH-1 gate first.

If design is approved and the next step is artifact production in Replit, use the new Replit R2 runbook and checklist before handing anything back to Codex.
