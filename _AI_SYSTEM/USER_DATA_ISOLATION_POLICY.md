# ThetaFrame User Data Isolation Policy

Date: 2026-04-16
Status: Canonical AI-agent guardrail for C33 and later work

## Ownership Rule

Private lane records are owned by the current authenticated Clerk `userId`.

Every list, get, create, update, delete, review, apply, upload, object read, and object delete path for user-private data must constrain the operation to the current `userId`. A module permission answers whether a user may use a lane; it never grants access to another user's lane records.

This applies to:

- Daily frames
- Weekly frames
- Vision frames
- BizDev records
- Life Ledger people, events, financial, subscriptions, travel, and non-admin views
- REACH file records, pending uploads, and private object reads
- User mode and onboarding state
- Mobile devices and notification outbox state
- AI drafts, review state, and apply flows
- Parent-packet import/materialization rows

## Admin Boundary

Admin is governance access, not unrestricted private-lane browsing.

Admins may manage users, module permissions, presets, environment access, and explicit admin workflows such as Baby KB review/assignment. Admins using ordinary user-lane APIs still operate as their own `userId`. They must not be able to browse, update, or delete arbitrary private Daily, Weekly, Vision, BizDev, Life Ledger, REACH, or AI draft records through normal lane routes.

A future support view may intentionally expose cross-user private data only if it is designed as an explicit admin/support route with audit logging, scoped purpose, and visible policy documentation.

## Baby And Assignment Exception

Baby KB source entries remain admin-only. Source entries and parent-packet materializations are owned by the admin user who imported/materialized them.

Projection into another user's Life Ledger is allowed only through the explicit Baby assignment workflow:

- the admin must own the source Baby KB entry;
- the assignment must name the assignee;
- the apply/projection path writes to the assignee only through the assignment contract;
- generated AI drafts remain review-gated before apply.

No other AI apply route may write into another user's private lane data.

## Parent Packet Integrity

Parent-packet materializations must be scoped by uploader ownership. Two users importing the same packet/source keys must produce separate materialization rows and must not reuse or update each other's Baby source entries.

The materialization uniqueness boundary is:

`uploader_user_id + packet_key + source_path + source_record_key`

Promotion and assignment code must resolve materialization rows through the owner of the source Baby entry.

## Pass Definition

C33 passes only when automated QA proves:

- User A can create and read their own Basic records, and User B cannot read or overwrite those records by shared date/week/singleton keys.
- Basic users receive `403` for optional/admin lanes.
- Select Authorized users can use assigned optional lanes only for their own records.
- Admin ordinary lane APIs do not return another user's private records.
- Cross-user delete/update/review/apply/object attempts return `403` or `404`, never another user's data.
- REACH pending upload and private object paths require ownership.
- AI drafts require ownership for list/get/review/apply.
- Baby KB remains admin-only, and assignment projection is the only cross-user write exception.

Receipts for isolation work must record storage-state roles, API statuses, cleanup ids, and any remaining caveats without writing secrets, token URLs, `.env*`, or local Vercel state.
