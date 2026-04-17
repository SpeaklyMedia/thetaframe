# ThetaFrame Replit Outbound Handoff

Date: 2026-04-13

## Objective
Prepare one deterministic outbound handoff for Replit using the canonical ThetaFrame repo artifact plus the complete local support packet.

## Outbound Payload Groups
Send exactly these two groups:

### 1. Canonical installable repo artifact
- `artifacts/replit-outbound-handoff/THETAFRAME_CANONICAL_INSTALLABLE_REPO__2026-04-13__R1.zip`
- duplicate copy for direct send/use:
  - `/home/mark/Downloads/THETAFRAME_CANONICAL_INSTALLABLE_REPO__2026-04-13__R1.zip`

### 2. Complete support packet
- `artifacts/replit-complete-send-set/`

This includes:
- Replit UI master transport
- activation and brand packet
- implementation kit
- blueprint
- ARCH-1 transport
- ARCH-1 helper docs
- operator note
- manifest

## Send Procedure
1. Attach or import the canonical repo artifact first.
2. Attach the complete support packet second.
3. Paste the operator note from:
   - `artifacts/replit-complete-send-set/THETAFRAME_OPERATOR_NOTE__SEND_ABOVE_PROMPT__2026-04-13__R1.txt`
4. Paste the full activation prompt from:
   - `artifacts/replit-r2-activation/THETAFRAME_REPLIT_ACTIVATION_PROMPT__POST_APPROVAL_FULL_ARTIFACT_PLUS_BRAND__2026-04-13__R2.md`
5. Do not add extra design discussion or alternate instructions.

## Authority Lock
- canonical repo + current ThetaFrame docs = behavior/data/auth/onboarding truth
- Replit UI master transport = visual truth
- activation pack = brand/loading truth
- implementation kit + blueprint + ARCH-1 helper docs = execution/process guidance

## Required Replit Return
Replit must return:
- portable full artifact zip
- build receipt
- screenshot pack
- screenshot manifest
- changed-file manifest
- patch notes
- assumptions/deviations
- Codex handoff note
- receipts
- brand-asset notes if transformations occurred

## Fail-Closed Conditions
Stop the handoff if:
- the canonical repo artifact is not attached
- the operator note is omitted
- the activation prompt is rewritten materially
- Replit cannot prove stack, route anchors, assistant safety path, preview path, or artifact export path
