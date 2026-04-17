# ThetaFrame ARCH-1 Handoff

Date: 2026-04-13

## Objective
Use ARCH-1 to choose the end-state interface architecture for ThetaFrame without allowing Replit visuals to override the current production-tested product contract.

This handoff is design-selection only. It is not an implementation request.

## Submission Packet
- Upload `/home/mark/Downloads/THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`
- Use `00_READ_ME_FIRST/REPLIT2_MASTER_ACTIVATION_PROMPT.md` from that packet as the governing prompt

## Operator Procedure
1. Upload the transport zip as the only source artifact.
2. Paste the activation prompt from the packet without rewriting its role split.
3. Ask ARCH-1 for a single structured response that matches the required output shape below.
4. Save the complete ARCH-1 response verbatim for local review.
5. Do not start local UI implementation from the response directly.
6. Move the response into `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md` first.

## Role Split
- Replit `ThetaFrame 2.0` is the visual/UI source of truth
- Current local/production ThetaFrame docs and key code are the behavioral/product source of truth

## What ARCH-1 Must Decide
- end-state UX thesis
- shared shell and navigation system
- page-by-page hierarchy for Daily, Weekly, Vision, BizDev, Life Ledger, REACH, and Admin
- Baby KB treatment inside Life Ledger
- language and copy system
- anti-patterns to avoid
- staged rebuild order

## Hard Constraints
- Daily must remain the primary current-day execution lane
- Weekly must remain the weekly alignment and protection lane
- Vision must remain the longer-range continuity lane
- Life Ledger must remain the structured obligations and plans lane
- Baby KB must remain an admin-only feeder inside Life Ledger
- no hero-art dependency for hierarchy or readability
- no redesign that breaks current route, module, admin, or onboarding behavior
- reminders, Google Calendar, and iOS reminders/alarms are future-fit constraints, not reasons to redesign the core product now

## Non-Negotiable Product Reading
ARCH-1 must preserve these meanings:
- Daily = current-day pacing, priority, and execution
- Weekly = weekly alignment, protection, and recovery
- Vision = longer-range continuity plus next visible step
- Life Ledger = structured obligations, plans, and records
- Baby KB = admin-only review, provenance, and feeder logic inside Life Ledger

## Reject Conditions
Reject any ARCH-1 recommendation that:
- recasts Baby KB into a standalone planner
- moves Daily out of the center of execution
- turns Weekly into a generic backlog board
- turns Vision into a loose inspiration board
- assumes missing artwork is required for comprehension
- conflicts with the locked product contract in `THETAFRAME_WORKFLOW_AUDIT.md`

## Expected Output Shape
Require ARCH-1 to return:
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

## Response Quality Gate
Treat the response as incomplete unless it:
- states the shell/navigation system clearly enough to rebuild without visual guessing
- gives page-by-page hierarchy for Daily, Weekly, Vision, BizDev, Life Ledger, REACH, and Admin
- explains Baby KB as subordinate to Life Ledger rather than parallel to it
- defines copy/language rules, not just layout preferences
- avoids relying on missing artwork to make hierarchy work
- provides a staged rebuild order that starts with the shared shell

## Local Arbitration Rule
If Replit visuals and current product purpose conflict:
- current product purpose wins
- Replit remains the visual reference only

## Next Local Step After ARCH-1
- record every recommendation in `THETAFRAME_ARCH1_ASSIMILATION_LEDGER.md`
- classify each recommendation as `adopt as-is`, `adopt with constraint`, or `reject due to product drift`
- only then update the rebuild roadmap or start implementation planning

## Required Review Sources
Use these files as the local arbitration set during review:
- `THETAFRAME_WORKFLOW_AUDIT.md`
- `THETAFRAME_QA_REPORT.md`
- `THETAFRAME_UI_REBUILD_ROADMAP.md`
- `/home/mark/Downloads/THETAFRAME_REPLIT2_UI_MASTER_TRANSPORT__2026-04-13__R1.zip`

## Downstream Note
If design lock is reached and the next step becomes Replit artifact production, use:
- `THETAFRAME_REPLIT_R2_ACTIVATION_INGEST.md`
- `THETAFRAME_REPLIT_R2_OPERATOR_RUNBOOK.md`

That Replit R2 lane is downstream of this ARCH-1 gate. It does not replace the local arbitration rules in this handoff.
