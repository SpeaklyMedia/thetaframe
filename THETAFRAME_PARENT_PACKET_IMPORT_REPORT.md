# Thetaframe Parent Packet Import Report

Date: 2026-04-11
Environment: Production (`https://thetaframe.mrksylvstr.com`)
Uploader/Admin: `mark@speaklymedia.com`
Source archive: `SESSION_4_REVIEW_GATE__20260324_R1(1).zip`

## Purpose
This packet is not Thetaframe default seed data.

It is a user-specific admin import packet intended to help one Thetaframe user adapt daily routines, planning, and life administration around the realities of parenting becoming a top priority. The imported material is framework/reference content and remains distinct from verified personal truth until it is reviewed and personalized.

## Source Preservation
- REACH file id: `1`
- Stored object path: `/objects/uploads/a6b3476b-4c07-4078-9834-5ef75738d087`
- REACH file name: `SESSION_4_REVIEW_GATE__20260324_R1(1).zip`
- REACH notes: `Admin imported parent framework packet; non-default user-specific content.`

The raw zip was preserved in production through the normal REACH upload chain before any Baby KB materialization happened.

## Import Run
- Import run id: `1`
- Packet key: `SESSION_4_REVIEW_GATE__20260324_R1`
- Packet version: `20260324_R1`
- Import scope: `broader-dual-layer`
- Status: `completed`

## Materialization Summary
- Materialized entry count: `83`
- Created on first import: `71`
- Updated during import: `12`
- Source file count: `12`

## Source Files Materialized Into Baby KB
- `BABY_KB/BABY_KB_GAPS_AND_UNKNOWNS.md` -> `1`
- `BABY_KB/BABY_KB_MASTER.md` -> `1`
- `BABY_KB/CARE_TIMELINE.md` -> `1`
- `BABY_KB/INFANT_DEVELOPMENT_FRAMEWORK.md` -> `1`
- `BABY_KB/INSURANCE_AND_ADMIN_CHECKPOINTS.md` -> `1`
- `STRUCTURED_DATA/baby_kb_appointments_and_screenings.csv` -> `16`
- `STRUCTURED_DATA/baby_kb_categories.csv` -> `10`
- `STRUCTURED_DATA/baby_kb_milestones.csv` -> `21`
- `STRUCTURED_DATA/family_planning.csv` -> `8`
- `STRUCTURED_DATA/infant_development_framework.csv` -> `6`
- `STRUCTURED_DATA/insurance_and_admin_checkpoints.csv` -> `5`
- `STRUCTURED_DATA/life_admin.csv` -> `12`

## Content Semantics
The imported Baby KB entries were materialized as admin-owned Baby KB entries with framework/reference provenance. They are intended to support:
- parenting-related planning
- milestone awareness
- routine and capacity adjustments
- insurance and administrative readiness
- future rewiring into richer parenting-focused interfaces

They are not intended to assert verified personal data by default.

The imported content preserves distinctions like:
- `Framework`
- `Planning`
- `Needs verification`
- `Known now`
- phase/category tags where source data provided them

## Current Examples In Production
Examples now present in Baby KB include:
- `BABY_KB_MASTER`
- `BABY_KB_GAPS_AND_UNKNOWNS`
- `CARE_TIMELINE`
- `Coverage changes`
- `Daily routine reset`
- `special enrollment / plan update`
- `newborn blood spot screening`
- `well-child visit + developmental screening`

## Rewire Strategy
This import is designed to be rewired later without pretending to be default product data.

The stable contracts are:
- the raw packet remains preserved in REACH as the canonical uploaded source
- import runs are tracked separately from the derived Baby KB entries
- reruns should update mapped entries instead of duplicating them
- broader packet assets that are not yet materialized can be wired into future interfaces from the same source packet

## Current Admin Review Layer
- Baby KB now exposes an admin-only review board on top of the imported entries.
- Review actions currently supported:
  - bulk mark verified
  - bulk add tag
  - bulk remove tag
  - grouping by source file or phase
  - source-aware collapse and expand
- Baby KB now also exposes an admin-only `Items in Motion` queue so the imported parenting framework can be reviewed as an input to the live operating system.
- These actions only mutate the Baby KB entry tags and editable content. They do not rewrite the import registry or original packet provenance.

## Current Promotion Layer
- Imported Baby KB entries can now be promoted into operational surfaces as linked copies:
  - `Daily` -> unchecked `Tier B` task
  - `Weekly` -> `steps`
  - `Vision` -> `nextSteps`
- Promotions are tracked separately from the source entry through a dedicated registry.
- Promotions are idempotent per source entry and target container, so rerunning the same promotion does not duplicate the operational item.
- Promotions are snapshots, not bidirectional sync. Editing the target surface does not overwrite the Baby KB source entry, and editing Baby KB does not silently rewrite an already-promoted target item.
- The intended use is operational support:
  - Baby KB helps review parenting-related material
  - Daily, Weekly, and Vision remain the live surfaces where that material turns into behavior and planning

## Product Intent
This packet should be treated as:
- admin-imported user content
- planning and adaptation framework for parenting-related life changes
- non-default and non-global Thetaframe data

It should not be shown as sample content for other users and should not be folded into normal end-user onboarding.
