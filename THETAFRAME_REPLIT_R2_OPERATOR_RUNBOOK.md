# ThetaFrame Replit R2 Operator Runbook

Date: 2026-04-13

This runbook governs the Replit full-artifact pass described by `ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip`.

## Purpose
Use Replit to build a portable full artifact after design approval, using:
- canonical ThetaFrame code as code authority
- Replit UI master transport as visual authority
- current ThetaFrame docs as behavior authority
- brand/loading assets from the R2 activation pack as approved art references

## Required Inputs
Must be present before the Replit run starts:
1. canonical ThetaFrame repo
2. `THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
3. `ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip`

Strongly preferred:
4. `THETAFRAME_ARCH1_TRANSPORT__2026-04-11__R1.zip`
5. `ThetaFrame_ARCH1_M2A_Implementation_Kit__2026-04-11.zip`
6. `ThetaFrame_ARCH1_M2_Blueprint__2026-04-11.zip`

Process helpers if available:
7. `ARCH1_INSTRUCTIONAL__HOW_ARCH1_WORKS__20260204__R1.md`
8. `ARCH1_SYSTEM_TRAVEL__PROJECT_AGNOSTIC__20260204_R2.zip`

## Current Local State
Present now:
- canonical repo at `/home/mark/vscode-projects/thetaframe`
- canonical installable repo artifact at `artifacts/replit-outbound-handoff/THETAFRAME_CANONICAL_INSTALLABLE_REPO__2026-04-13__R1.zip`
- `/home/mark/Downloads/THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
- `/home/mark/Downloads/THETAFRAME_ARCH1_TRANSPORT__2026-04-11__R1.zip`
- `/home/mark/Downloads/ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip`
- `/home/mark/Downloads/THETAFRAME_REPLIT_COMPLETE_SEND_SET__2026-04-13__R1.zip`
- ingested operator docs at `artifacts/replit-r2-activation/`
- complete local send-set at `artifacts/replit-complete-send-set/`

Available now inside `artifacts/replit-complete-send-set/`:
- `ThetaFrame_ARCH1_M2A_Implementation_Kit__2026-04-11.zip`
- `ThetaFrame_ARCH1_M2_Blueprint__2026-04-11.zip`
- `ARCH1_INSTRUCTIONAL__HOW_ARCH1_WORKS__20260204__R1.md`
- `ARCH1_SYSTEM_TRAVEL__PROJECT_AGNOSTIC__20260204_R2.zip`
- `THETAFRAME_OPERATOR_NOTE__SEND_ABOVE_PROMPT__2026-04-13__R1.txt`
- the current Replit and ARCH1 transports

The canonical repo artifact is now locally available for outbound use.

## Operator Note To Send
`APPROVED_DESIGN_LOCK = YES. Build the portable full artifact only. No publish. No secrets. Fail closed if the canonical repo is missing or ambiguous.`

## Authority Order
1. live route, auth, onboarding, permission, and data contract = canonical repo + current ThetaFrame docs
2. visual target authority = `THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
3. brand and loading authority = `ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip` plus the ingested copies under `artifacts/replit-r2-activation/`
4. implementation process helpers = implementation kit / blueprint / ARCH-1 helper docs if present

## Non-Negotiables
- preserve current route set
- preserve user mode persistence
- preserve auth, onboarding, permission, and module gating
- do not create a top-level Baby KB route
- do not make calendar the system of record
- do not use large loading art for normal route changes
- do not make operational readability depend on hero art or splash art

## What Replit Must Return
- portable full artifact zip
- build receipt
- screenshot pack
- changed-file manifest
- patch notes
- assumptions/deviations
- Codex handoff note
- receipts
- brand-asset notes if the art was optimized or transformed

## Local Send Set From This Repo
Use these local copies when preparing the outbound operator packet:
- `artifacts/replit-r2-activation/THETAFRAME_REPLIT_ACTIVATION_PROMPT__POST_APPROVAL_FULL_ARTIFACT_PLUS_BRAND__2026-04-13__R2.md`
- `artifacts/replit-r2-activation/THETAFRAME_REPLIT_ACTIVATION_PROMPT__COMPACT_PLUS_BRAND__2026-04-13__R2.txt`
- `artifacts/replit-r2-activation/THETAFRAME_ACTIONABLE_NEXT_STEPS__REPLIT_TO_CODEX__2026-04-13__R1.md`
- `artifacts/replit-r2-activation/THETAFRAME_REPLIT_SEND_ALONG_CHECKLIST__2026-04-13__R2.md`
- `artifacts/replit-r2-activation/THETAFRAME_LOGO_AND_LOADING_SCREEN_SPEC__2026-04-13__R1.md`
- `artifacts/replit-r2-activation/THETAFRAME_BRAND_ASSET_MANIFEST__2026-04-13__R1.json`

For a one-folder outbound pack, use:
- `artifacts/replit-complete-send-set/`

That folder now contains the complete currently available support packet, including:
- implementation kit
- blueprint
- ARCH-1 helper docs
- operator note
- Replit UI master transport
- ARCH1 transport
- activation/brand packet zip

## Exact Outbound Payload Groups
Send exactly these two payload groups:
1. canonical repo artifact
   - `artifacts/replit-outbound-handoff/THETAFRAME_CANONICAL_INSTALLABLE_REPO__2026-04-13__R1.zip`
2. complete support packet
   - `artifacts/replit-complete-send-set/`

## Codex Continuation After Replit
Once the Replit artifact returns and is approved:
1. ingest the artifact zip
2. compare changed-file manifest against canonical repo structure
3. transport accepted UI into canonical code authority
4. normalize any Replit-specific scaffolding
5. preserve approved shell, lane, brand, and loading behavior
6. emit final conformance receipts
