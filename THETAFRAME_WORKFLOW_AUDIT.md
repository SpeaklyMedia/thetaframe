# Thetaframe Workflow Audit

Date: 2026-04-10

## Product Contract

### Signed-Out Pages
- `Home`
  - Goal: explain ThetaFrame as a calm personal operating system and convert visitors into sign-up or sign-in.
  - Success condition: the user understands the product promise and can enter auth without confusion.
- `Sign In`
  - Goal: authenticate an existing user and hand them into the signed-in product shell.
  - Success condition: the user reaches their first allowed in-app lane after auth.
- `Sign Up`
  - Goal: create a new account and hand the user into the signed-in onboarding flow.
  - Success condition: a new user lands in the app with a guided first-use path.

### Signed-In Product Pages
- `Daily Frame`
  - Goal: help the user shape the current day around energy, priority, and realistic pacing.
  - First useful action: choose a color state and save a real Tier A task.
- `Weekly Rhythm`
  - Goal: help the user set a weekly theme, top steps, and recovery plan.
  - First useful action: name the week and save one real step.
- `Vision Tracker`
  - Goal: keep larger goals connected to the next visible steps.
  - First useful action: save one goal and one next step.
- `BizDev`
  - Goal: track leads, next touches, blockers, and open revenue.
  - First useful action: create a real lead.
- `Life Ledger`
  - Goal: keep obligations, people, finances, subscriptions, and plans in one structured place.
  - First useful action: save one real entry in any tab.
- `REACH`
  - Goal: store, open, and reuse the files the user needs across workflows.
  - First useful action: upload one real file through the normal upload chain.
- `Admin`
  - Goal: govern access, not personal planning.
  - First useful action: perform one real permission or preset mutation.

### Shared Shell Behaviors
- `User Mode`
  - Goal: persist the user’s chosen working posture from the header.
  - Success condition: the first manual selection sticks immediately and survives refresh.
- `Onboarding`
  - Goal: orient first-time users without replacing the real workflows.
  - Success condition:
    - a signed-in global modal appears when incomplete accessible surfaces exist
    - local onboarding cards remain on incomplete surfaces only
    - completion is driven only by real saves/uploads/mutations
- `Access Denied`
  - Goal: explain that the user is signed in but does not have access to that lane.
- `Not Found`
  - Goal: recover the user from a bad route and send them back into the app.

## Current Implementation Alignment

### Shell and Navigation
- Signed-in root now redirects to the first allowed lane instead of always forcing `/daily`.
- The onboarding entrypoint now exists at the shell level through a signed-in modal.
- Local onboarding cards remain in Daily, Weekly, Vision, BizDev, Life Ledger, REACH, and Admin.
- The header still provides desktop and mobile navigation for visible modules.

### Access Model
- Frontend routes for Daily, Weekly, Vision, BizDev, Life Ledger, and REACH are now gated by module access and fall back to `Access Denied` instead of relying only on hidden nav items.
- Backend module APIs for those same surfaces now enforce module access through middleware.
- Owner bootstrap for `mark@speaklymedia.com` remains deterministic and idempotent.
- `Admin` remains separately gated by admin semantics.

### Onboarding Model
- Onboarding progress remains persisted in `onboarding_progress`.
- The onboarding API now returns only the surfaces visible to the current user in the current environment, plus `admin` for admins.
- Existing real data still backfills completion without seeding fake content.
- The global modal is session-dismissable only; dismissing it does not mark completion.

### User Mode
- The old `404 -> create explore mode` bootstrap race has been removed from the header.
- First manual mode selection now creates the row with the user’s chosen mode.
- Mode changes now provide immediate visual feedback and explicit error feedback on failure.

## Gap Matrix

| Area | Intended Outcome | Previous Mismatch | Current Fix |
| --- | --- | --- | --- |
| User Mode | First choice persists immediately | Background bootstrap could overwrite first manual selection | Bootstrap removed from header; first selection writes chosen mode directly |
| Onboarding Entry | New users get a clear first-use orientation | No shell-level onboarding entry existed | Added signed-in onboarding modal |
| Onboarding Visibility | Incomplete surfaces stay visible until truly used | Frontend filtered onboarding against a separate permissions query and could hide everything | Onboarding API now returns visible surfaces directly |
| Access Governance | Hidden lanes should also be enforced | Module permissions only hid nav items; routes and APIs still worked | Added frontend lane gating and backend module middleware |
| Signed-In Landing | User should land in an allowed lane | Root redirect always forced `/daily` | Root redirect now chooses the first allowed module lane |
| Access Messaging | Denials should explain signed-in restricted access | Copy implied only generic module denial | Access Denied copy now reflects signed-in but ungranted access |

## Acceptance Criteria
- A first-time signed-in user sees the onboarding modal if they have incomplete accessible surfaces.
- Dismissing the onboarding modal does not mark anything complete.
- Each surface clears onboarding only after its real workflow succeeds.
- First mode selection persists immediately and survives refresh.
- Users cannot manually open unauthorized module pages or call unauthorized module APIs successfully.
- Signed-in users land on an allowed lane from `/`.
- `mark@speaklymedia.com` retains effective owner/admin access across environments.

## Residual Manual QA Lane
- Signed-in browser verification is still required for final acceptance of:
  - onboarding modal appearance after login
  - first mode selection behavior in the browser
  - per-surface completion clearing
  - mobile layout and lane access behavior
