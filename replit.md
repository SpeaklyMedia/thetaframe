# ThetaFrame Platform

## Overview

ThetaFrame is a unified personal daily OS designed for neurodivergent brains, built as a pnpm monorepo with React+Vite frontend, Express 5 backend, PostgreSQL+Drizzle ORM, Clerk auth, and OpenAPI+Orval codegen.

## Product Modules

- **ThetaFrame Core** — Daily/Weekly/Vision frames, Emotional Color Model, Skip Protocol, Mode separation (Explore/Build/Release)
- **Speakly BizDev CRM** — (Task #2, upcoming)
- **Life Ledger** — Personal obligations tracker (Task #2, upcoming)
- **REACH File Manager** — (Task #2, upcoming)
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

## Frontend Pages

- `/` — public landing page (no sign-in redirect)
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/daily` — Daily Frame (protected)
- `/weekly` — Weekly Rhythm (protected)
- `/vision` — Vision Tracker (protected)

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
