# ThetaFrame Platform

## Overview

ThetaFrame is a unified personal daily OS designed for neurodivergent brains, built as a pnpm monorepo with React+Vite frontend, Express 5 backend, PostgreSQL+Drizzle ORM, Clerk auth, and OpenAPI+Orval codegen.

## Product Modules

- **ThetaFrame Core** — Daily/Weekly/Vision frames, Emotional Color Model, Skip Protocol, Mode separation (Explore/Build/Release)
- **BizDev** — Brand/client lead CRM with phase tracking (COLD/WARM/HOT), touch dates, blocker tracking, money pipeline
- **Life Ledger** — Personal obligations tracker with 5 tabs (people/events/financial/subscriptions/travel), next-90-days view, subscription audit
- **REACH** — File bundle manager with presigned URL uploads to GCS object storage, file deletion
- **Admin Panel** — Per-user, per-module, per-environment access control (Task #3, upcoming)

## Emotional Color Model

- Green = calm/ready
- Yellow = anxious/scattered
- Red = overwhelmed
- Blue = low/flat
- Purple = creative/energized

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite (`artifacts/thetaframe`, preview path `/`)
- **Backend**: Express 5 (`artifacts/api-server`, port 8080)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Auth**: Clerk (whitelabel, with proxy middleware)
- **API spec**: OpenAPI 3.0 (`lib/api-spec/openapi.yaml`)
- **API codegen**: Orval → `lib/api-client-react` (hooks) + `lib/api-zod` (Zod schemas)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Node.js**: 24, TypeScript 5.9

## Key Commands

```bash
# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build lib declaration files for TypeScript project references
cd lib/api-client-react && pnpm exec tsc --build
cd artifacts/api-server && pnpm tsc --build

# TypeScript check
cd artifacts/thetaframe && pnpm tsc --noEmit
```

## Database Tables

- `daily_frames` — userId + date (unique), colour state, tier A/B tasks, time blocks, micro-win, skip protocol
- `weekly_frames` — userId + weekStart (unique), theme, steps, non-negotiables, recovery plan
- `vision_frames` — userId (unique), goals, next steps
- `user_modes` — userId (unique), mode (explore/build/release), colour state
- `bizdev_brands` — userId, brand, phase (COLD/WARM/HOT), human status, next action, touch date/channel, owner, blocker, money open/notes
- `life_ledger_people` — userId, tab, name, tags (jsonb), impact level, review window, due date, notes
- `life_ledger_events` — same schema; stores events entries
- `life_ledger_financial` — same schema; stores financial entries (amount, currency)
- `life_ledger_subscriptions` — same schema; stores subscription entries (amount, currency, is_essential, billing_cycle)
- `life_ledger_travel` — same schema; stores travel entries
- `reach_files` — userId, name, file_type, size_bytes, object_path, notes

## API Routes

All routes prefixed with `/api`:
- `GET /api/healthz` — health check
- `GET /api/daily-frames/recent` — last 7 daily frames (auth required)
- `GET /api/daily-frames/:date` — get specific day (auth required)
- `PUT /api/daily-frames/:date` — upsert daily frame (auth required)
- `GET /api/weekly-frames/:weekStart` — get weekly frame (auth required)
- `PUT /api/weekly-frames/:weekStart` — upsert weekly frame (auth required)
- `GET /api/vision-frames/me` — get vision frame (auth required)
- `PUT /api/vision-frames/me` — upsert vision frame (auth required)
- `GET /api/user-mode` — get user mode (auth required)
- `PUT /api/user-mode` — upsert user mode (auth required)
- `GET /api/bizdev/brands` — list brands (auth required)
- `POST /api/bizdev/brands` — create brand (auth required)
- `GET /api/bizdev/brands/summary` — phase counts (auth required)
- `GET /api/bizdev/brands/:id` — get brand (auth required)
- `PUT /api/bizdev/brands/:id` — update brand (auth required)
- `DELETE /api/bizdev/brands/:id` — delete brand (auth required)
- `GET /api/life-ledger/:tab` — list entries for tab (auth required)
- `POST /api/life-ledger/:tab` — create entry (auth required)
- `GET /api/life-ledger/next-90-days` — upcoming obligations (auth required)
- `GET /api/life-ledger/subscription-audit` — subscription cost audit (auth required)
- `GET /api/life-ledger/:tab/:id` / `PUT` / `DELETE` — CRUD (auth required)
- `GET /api/reach/files` — list files (auth required)
- `POST /api/reach/files` — register uploaded file (auth required)
- `DELETE /api/reach/files/:id` — delete file and object (auth required)
- `POST /api/storage/uploads/request-url` — get GCS presigned upload URL

## Frontend Pages

- `/` — public landing page (no sign-in redirect)
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/daily` — Daily Frame (protected)
- `/weekly` — Weekly Rhythm (protected)
- `/vision` — Vision Tracker (protected)
- `/bizdev` — BizDev CRM (protected)
- `/life-ledger` — Life Ledger (protected)
- `/reach` — REACH File Manager (protected)

## Important Architecture Notes

- Home route `/` is always public — never redirects unauthenticated users to sign-in (Clerk rule)
- `requireAuth` middleware uses `getAuth()` from `@clerk/express` for server-side auth
- Clerk proxy middleware runs before CORS and body parsers
- Frontend uses `wouter` with `WouterRouter base={basePath}` for routing
- TypeScript project references: after changing OpenAPI spec, run codegen then `tsc --build` in each lib
- After adding new schema files to `lib/db/src/schema/`, run `pnpm --filter @workspace/db run push`

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `CLERK_SECRET_KEY` — Clerk server secret (auto-provisioned)
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (auto-provisioned)
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key for frontend (auto-provisioned)
- `VITE_CLERK_PROXY_URL` — set automatically in production deployments
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` — Replit object storage bucket ID (provisioned)
- `PUBLIC_OBJECT_SEARCH_PATHS` — comma-separated GCS search paths for public objects
- `PRIVATE_OBJECT_DIR` — GCS path for private uploaded objects (REACH files)
