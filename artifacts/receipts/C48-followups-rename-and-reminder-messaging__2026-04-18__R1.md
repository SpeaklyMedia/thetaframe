# C48 FollowUps Rename And Reminder Messaging

Date: 2026-04-18
Status: PASS

## Scope

Renamed the user-facing BizDev lane to FollowUps and reframed it around remembering people or organizations the user said they would get back to.

This was a safe UI/copy/docs slice. Internal compatibility was preserved:

- route remains `/bizdev`;
- API routes remain `/api/bizdev/*`;
- module key remains `bizdev`;
- database table remains `bizdev_brands`;
- generated client hooks and schema contracts were not regenerated or renamed;
- no Life Ledger event, reminder policy, mobile outbox, calendar link, or AI provider behavior was added.

Implementation commit:

- `03eeade563ca80d18a9bb83efe7c643e16a6eb21` (`Rename BizDev lane to FollowUps`)

## Product Result

User-facing rename:

- header desktop/mobile nav now shows `FollowUps`;
- Dashboard Work lanes now opens `Open FollowUps`;
- Admin module and preset display copy now uses `FollowUps`;
- AI draft display mapping now uses `FollowUps`.

FollowUps lane copy:

- hero label: `FollowUps`;
- hero title: `People to get back to`;
- support rail: `People · Next promise · Reminder date · Calendar planning`;
- phase display labels now read `Later`, `Soon`, and `Needs attention` while keeping stored values `COLD`, `WARM`, and `HOT`;
- form labels now focus on person/organization, next promise, reminder date, follow-up channel, responsible person, blockers, and optional value notes.

Reminder/calendar messaging:

- added a non-persisted FollowUps guidance block;
- copy explicitly says calendar sync is not active yet;
- Life Ledger-enabled users get a link to reminders/events;
- users without Life Ledger get neutral guidance to bring the next step into Today or This Week when it is time.

## Production Deploy

Command:

```bash
vercel deploy --prod --yes
```

Deployment:

- status: `READY`
- deployment id: `dpl_8yRCw6piYM8XaKDQqtznE78K7EM8`
- deployment URL: `https://thetaframe-b5e9we7ol-marks-projects-f03fd1cc.vercel.app`
- inspect URL: `https://vercel.com/marks-projects-f03fd1cc/thetaframe/8yRCw6piYM8XaKDQqtznE78K7EM8`
- canonical production target: `https://thetaframe.mrksylvstr.com`

## Verification

Static/build:

```bash
pnpm run typecheck
pnpm --filter @workspace/thetaframe run build
pnpm --filter @workspace/api-server run build
git diff --check
```

Results:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/thetaframe run build`: PASS
- `pnpm --filter @workspace/api-server run build`: PASS
- `git diff --check`: PASS
- build notes:
  - Vite emitted the existing sourcemap-location warnings for `src/components/ui/tooltip.tsx` and `src/components/ui/dropdown-menu.tsx`;
  - Vite emitted the existing large chunk warning.

Production smoke:

- `GET https://thetaframe.mrksylvstr.com/api/healthz`: `{"status":"ok"}`
- `HEAD https://thetaframe.mrksylvstr.com/`: `HTTP/2 200`

Production browser QA:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/c48-followups-rename \
pnpm run qa:browser
```

Result:

- `passes=16`
- `skips=0`

Coverage notes:

- FollowUps lane mounted at `/bizdev` for authenticated allowed users.
- Basic route matrix still denied `/bizdev`.
- Basic Start Here and Dashboard checks assert neither `FollowUps` nor `BizDev` is exposed.
- Select Authorized test account for this run had `life-ledger` optional access, so `/bizdev` denial was verified for that role.

## Git Hygiene

Committed durable source, QA harness, and AI-system docs only.

Excluded local/transient artifact classes:

- `.env*`;
- `.vercel/`;
- auth storage state JSON;
- root `test-results/`;
- `scripts/test-results/`;
- build output;
- `dist`;
- `node_modules`;
- `*.tsbuildinfo`;
- raw screenshot directories;
- extracted transport folders;
- zip bundles.

## Decision

C48 is live in production. The optional `bizdev` lane now presents as FollowUps, with reminder/calendar-oriented messaging that helps users remember who they said they would get back to while preserving the existing route, API, schema, permissions, and data behavior.
