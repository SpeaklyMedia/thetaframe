# ThetaFrame ARCH-1 Submission Runbook

Date: 2026-04-13

This runbook is the operator sequence for the pre-implementation design gate.

## Inputs
- transport zip: `/home/mark/Downloads/THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
- activation prompt inside transport: `00_READ_ME_FIRST/REPLIT2_MASTER_ACTIVATION_PROMPT.md`
- local arbitration docs:
  - `THETAFRAME_WORKFLOW_AUDIT.md`
  - `THETAFRAME_QA_REPORT.md`
  - `THETAFRAME_ARCH1_HANDOFF.md`
  - `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md`
  - `THETAFRAME_UI_REBUILD_ROADMAP.md`

## Submission Steps
1. Open ARCH-1 PM.
2. Upload the transport zip only.
3. Paste the activation prompt from the packet unchanged.
4. Request a single structured response matching the required output shape.
5. Save the response in full.

## Required Output Shape
ARCH-1 must return:
1. end-state UX thesis
2. shell and navigation rules
3. per-page hierarchy
4. visual system direction
5. copy and language rules
6. onboarding and first-run model
7. Baby KB role and limits
8. reminder/calendar/mobile future-fit guidance
9. anti-patterns
10. staged rebuild order

## Local Review Sequence
1. Review the response with `THETAFRAME_ARCH1_RESPONSE_REVIEW_RUBRIC.md`.
2. If incomplete or drifting, stop and record the issue.
3. If usable, classify every recommendation in `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md`.
4. Update `THETAFRAME_UI_REBUILD_ROADMAP.md` only with accepted or constrained decisions.
5. Start rebuild planning only after the assimilation gate passes.

## Stop Conditions
Stop and do not plan implementation if:
- the response is missing required sections
- the response depends on missing artwork for comprehension
- the response introduces product drift against the workflow audit
- the response leaves key lane hierarchy unresolved

## Expected Output Of This Gate
- one reviewed ARCH-1 response
- one classified assimilation ledger
- one updated rebuild roadmap
- zero UI implementation changes before the gate passes
