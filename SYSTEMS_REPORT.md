# ThetaFrame — Full Systems Report
**Owner:** Mark Sylvester  
**Purpose:** Personal daily OS for neurodivergent brains  
**Production URL:** https://thetaframe.vercel.app  
**GitHub:** https://github.com/SpeaklyMedia/thetaframe (branch: `main`)  
**Last deployed:** Vercel deployment `dpl_FdVXxDQctvQjv6QYTqiYB2U59gi5` (Task #9 fixes)

---

## What This App Is Supposed To Do

ThetaFrame is a personal productivity OS designed around how Mark's brain actually works. It is not a generic task manager. Every module is designed for executive function support — reducing friction, providing structure, and making each day feel manageable.

The core idea: every day, Mark opens the app, sets his color state (green/yellow/red — how he's feeling), picks a small number of top-priority tasks (Tier A, max 3), adds supporting tasks (Tier B), blocks time, and logs a micro-win. The other modules support the bigger picture across the week, year, life, and business.

**Design rules (non-negotiable):**
- No emojis anywhere
- Calm, minimal design
- No `<UserButton />` from Clerk (custom header with sign-out button instead)
- Neurodivergent-friendly: low cognitive load, high clarity

---

## Architecture

```
pnpm monorepo
├── artifacts/
│   ├── thetaframe/          React + Vite frontend (SPA)
│   └── api-server/          Express 5 backend (deployed as Vercel serverless /api/index)
├── lib/
│   ├── db/                  Drizzle ORM + PostgreSQL schema (Neon in production)
│   ├── api-spec/            OpenAPI spec (YAML) — source of truth for all API types
│   ├── api-client-react/    Auto-generated React Query hooks + customFetch
│   └── api-zod/             Auto-generated Zod validators from OpenAPI spec
```

### Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Wouter (routing), TanStack Query, Tailwind + shadcn/ui |
| Auth | Clerk v6 (`@clerk/react`, `@clerk/express`) |
| Backend | Express 5, TypeScript, Pino logging |
| Database | PostgreSQL via Drizzle ORM (Neon in production, local PG in Replit dev) |
| API contract | OpenAPI YAML → `pnpm --filter @workspace/api-spec run codegen` → generates Zod schemas + React Query hooks |
| Deployment | Vercel (file-upload API, NOT GitHub Actions — GitHub push was historically broken) |
| Object storage | Replit Object Storage (env vars: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`) |

---

## Deployment

### Vercel Config (`vercel.json`)
```json
{
  "buildCommand": "pnpm install && pnpm --filter @workspace/api-spec run codegen && pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/thetaframe run build",
  "outputDirectory": "artifacts/thetaframe/dist/public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- All `/api/*` traffic → `artifacts/api-server/dist/api/index.js` (Vercel serverless function)
- All other traffic → `artifacts/thetaframe/dist/public/index.html` (SPA catch-all)
- DB schema is pushed (`drizzle-kit push`) on every build to keep Neon in sync
- **Do NOT use `push-force`** — plain `push` is safer for additive schema changes

### Vercel Credentials (for file-upload deploys from Replit)
- Token: stored in Replit secrets as `VERCEL_TOKEN` (starts with `vcp_`) — get from Vercel dashboard → Account Settings → Tokens
- Team ID: `team_Fk5OMn1ovpKqUNQWuvLXJGGJ`
- Project ID: `prj_d3FNR6vUxS1eXu1zJGySVNjTbBRy`
- Vercel username: `mark-7660`
- Deploy endpoint: `POST /v13/deployments?teamId=<TEAM_ID>&projectId=<PROJECT_ID>&forceNew=1`
- File upload endpoint: `POST /v2/files?teamId=<TEAM_ID>` with `x-vercel-digest` (SHA1) header

---

## Authentication

### Clerk Setup
- Publishable key: set as `VITE_CLERK_PUBLISHABLE_KEY` in Vercel env vars and Replit secrets — get from Clerk dashboard
- This is currently a **dev key** (`pk_test_...`) — it works on any domain, which is why it works on Vercel production
- `VITE_CLERK_PROXY_URL` must NOT be set (was causing issues, was deleted)
- Admin access: set `{ "role": "admin" }` in Clerk `publicMetadata` for a user via the Clerk dashboard

### Auth Flow (Frontend)
1. `ClerkProvider` wraps everything in `App.tsx`
2. `ClerkAuthSetup` component (inside `ClerkProvider`) calls `setAuthTokenGetter(() => getToken())` on mount — this registers the Clerk JWT getter with `customFetch`
3. Every API call made by React Query hooks automatically attaches `Authorization: Bearer <jwt>` via `customFetch`
4. `@clerk/express`'s `clerkMiddleware()` on the API server reads the JWT from the Authorization header (fallback from cookie — critical for Vercel serverless where cookies may not forward)
5. `requireAuth` middleware extracts `userId` from `getAuth(req)` and injects it into `req.userId`

### Auth Flow (Routes)
- `/` — `HomeRedirect`: signed-in → `/daily`, signed-out → home page
- `/sign-in`, `/sign-up` — Clerk hosted components
- `/daily`, `/weekly`, `/vision`, `/bizdev`, `/life-ledger`, `/reach` — `ProtectedRoute`: signed-in → show page, signed-out → `/`
- `/admin` — `AdminRoute`: signed-in + `publicMetadata.role === "admin"` → `AdminPage`, else → `AccessDeniedPage`

### Permissions System
**File:** `artifacts/api-server/src/routes/me.ts`

The app has a module-based permissions system. Every user needs a row in `access_permissions` for each module they can access.

**Auto-provisioning logic:**
1. On `GET /api/me/permissions`, detect the current environment (`development` / `staging` / `production`) from env vars
2. Fetch all permission rows for the user from the DB
3. Filter to only rows for the current environment (`envPerms`)
4. If `envPerms.length === 0` → user has no rows for this environment → insert all 6 modules for this environment only, return all modules
5. If rows exist → return only the modules the user has for this environment

**Critical bug that was fixed:** Previously checked `perms.length === 0` (total rows across ALL environments). Mark had dev-env rows from testing, so this was non-zero, provisioning was skipped, and the production filter returned nothing.

**Frontend behavior (`usePermissions.ts`):**
- `hasModule(module)` returns `false` if not signed in
- Returns `true` if `isLoading || isError` (fail-open — nav always shows if API is flaky)
- Returns actual module check if data loaded successfully
- Nav links in header are filtered by `hasModule()`

---

## Database Schema

**Library:** `lib/db/` — Drizzle ORM  
**Connection:** `DATABASE_URL` env var → Neon (production), local PostgreSQL (dev)  
**Schema files:** `lib/db/src/schema/`

### Tables

#### `daily_frames`
The core of the app. One row per user per day.
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| userId | text | Clerk user ID |
| date | text | `YYYY-MM-DD` format |
| colourState | text | `green` / `yellow` / `red` |
| tierA | jsonb | Array of strings, max 3 items — top priority tasks |
| tierB | jsonb | Array of strings — supporting tasks |
| timeBlocks | jsonb | Array of time block objects |
| microWin | text nullable | Small win for the day |
| skipProtocolUsed | boolean | Whether skip protocol was used |
| skipProtocolChoice | text nullable | What they chose when skipping |
| createdAt | timestamp | |
| updatedAt | timestamp | |
Unique constraint: `(userId, date)`

#### `weekly_frames`
Weekly rhythm planning. One row per user per week.

#### `vision_frames`
Long-term vision / goal tracking.

#### `bizdev`
Business development tracking.

#### `life_ledger`
Life accounting / reflection entries.

#### `reach`
REACH framework entries (Reframe, Energy, Action, Connection, Habits or similar).

#### `user_modes`
| Column | Type | Notes |
|---|---|---|
| userId | text PK | Clerk user ID |
| mode | text | `explore` / `build` / `release` |
| colourState | text | `green` / `yellow` / `red` |
| updatedAt | timestamp | |

Stores the user's current operating mode, shown as a colored badge in the header. If no row exists, the header auto-creates one with `explore` + `green` via the `useEffect` in `header.tsx`.

#### `access_permissions`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| userId | text | Clerk user ID |
| module | text | `daily` / `weekly` / `vision` / `bizdev` / `life-ledger` / `reach` |
| environment | text | `development` / `staging` / `production` |
Unique constraint: `(userId, module, environment)`

#### `admin` table
Used by the admin page for system-level management.

---

## API Routes

All routes mounted under `/api/` in Express, served as Vercel serverless at `/api/index`.

### Health
- `GET /api/healthz` → `{ status: "ok" }` — no auth required

### Permissions
- `GET /api/me/permissions` → `{ modules: string[], environment: string }` — auto-provisions if needed

### User Mode
- `GET /api/user-mode` → current mode + colour
- `PUT /api/user-mode` → upsert mode + colour

### Daily Frames
- `GET /api/daily-frames` → list all frames for user
- `POST /api/daily-frames` → create frame (upserts on userId+date conflict)
- `GET /api/daily-frames/recent` → last 7 frames
- `GET /api/daily-frames/:date` → get single frame by date (`YYYY-MM-DD`)
- `PUT /api/daily-frames/:date` → upsert frame for date

### Weekly Frames
- `GET /api/weekly-frames` / `POST` / `GET /:weekId` / `PUT /:weekId`

### Vision Frames
- `GET /api/vision-frames` / `POST` / `GET /:id` / `PUT /:id` / `DELETE /:id`

### BizDev
- Standard CRUD under `/api/bizdev`

### Life Ledger
- Standard CRUD under `/api/life-ledger`

### REACH
- Standard CRUD under `/api/reach`

### Storage
- File upload/download routes under `/api/storage`

### Admin
- Admin-only routes under `/api/admin`

---

## Frontend Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `home.tsx` | Landing page (signed-out) or redirect to `/daily` (signed-in) |
| `/sign-in` | `sign-in.tsx` | Clerk sign-in component |
| `/sign-up` | `sign-up.tsx` | Clerk sign-up component |
| `/daily` | `daily.tsx` | Daily Frame — color state, Tier A/B tasks, time blocks, micro-win |
| `/weekly` | `weekly.tsx` | Weekly Rhythm planning |
| `/vision` | `vision.tsx` | Vision / long-term goal tracker |
| `/bizdev` | `bizdev.tsx` | Business development |
| `/life-ledger` | `life-ledger.tsx` | Life accounting entries |
| `/reach` | `reach.tsx` | REACH framework |
| `/admin` | `admin.tsx` | Admin panel (role gated) |
| `/access-denied` | `access-denied.tsx` | Shown when non-admin hits /admin |

---

## Header Component

**File:** `artifacts/thetaframe/src/components/header.tsx`

The header is the primary navigation. It:
- Shows the ThetaFrame logo/link (always)
- Shows nav links only when signed in, filtered through `hasModule()` from `usePermissions`
- Shows a color-coded mode badge (Explore / Build / Release) as a dropdown
- Auto-creates user mode row (`explore` + `green`) if none exists (404 from API)
- Shows user's first name or email + Sign Out button when signed in
- Shows Sign In / Sign Up links when signed out
- **No `<UserButton />`** — custom implementation

---

## API Client Generation

The API client is auto-generated. When you change the API:

1. Edit `lib/api-spec/src/openapi.yaml` — this is the source of truth
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. This regenerates:
   - `lib/api-zod/src/` — Zod validators for request/response
   - `lib/api-client-react/src/` — React Query hooks + TypeScript types
4. The generated hooks are used in frontend pages and the header

Never edit generated files directly.

---

## Known State of the App (as of last deploy)

### What Is Working
- Sign in / sign up via Clerk
- Redirect to `/daily` after auth
- Auto-provisioning of all 6 modules for new users (per-environment)
- Nav links visible after sign-in (fail-open: shown during loading/error states)
- Bearer token auth from frontend to backend (fixes cookie-forwarding issue on Vercel)
- DB schema auto-applied on each Vercel build
- Admin route gated by `publicMetadata.role === "admin"`
- Mode badge in header with color state
- Health check at `/api/healthz`

### What May Still Be Broken / Untested
- **Actual content on module pages** — the daily/weekly/vision/etc pages load (auth works) but it is unknown whether the forms, save, and data display are working correctly in production. These pages have never been confirmed working end-to-end in production with real data
- **"Couldn't load today's frame"** error — this was caused by 401s from the API. The Bearer token fix should resolve it, but it has not been confirmed by a real signed-in session test
- **Mobile nav** — the header nav is hidden on mobile (`hidden md:flex`). There is no mobile hamburger menu or drawer. Navigation on mobile is broken
- **Skip protocol flow** — `skipProtocolUsed` / `skipProtocolChoice` fields exist in the schema but the UI for this flow is unknown
- **Storage routes** — `/api/storage` exists but untested
- **Weekly / Vision / BizDev / Life Ledger / REACH pages** — scaffolded but content depth is unknown

### Architecture Debt
- The Clerk publishable key is a **dev key** (`pk_test_...`). For true production hardening, a production key (`pk_live_...`) should be created in Clerk and set as `VITE_CLERK_PUBLISHABLE_KEY` in Vercel environment variables
- GitHub push from Replit is done via the GitHub OAuth integration token. This has historically been unreliable. A PAT with `repo` write scope set as `GITHUB_TOKEN` secret in Replit would be more stable
- The `pnpm --filter @workspace/api-spec run codegen` step in the build command runs on every Vercel deploy, which is slow. Once the API is stable, this could be cached

---

## Environment Variables

### Vercel Production (already set)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk backend secret (starts with `sk_test_`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (starts with `pk_test_`) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit object storage |
| `PRIVATE_OBJECT_DIR` | Replit object storage |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit object storage |

### Replit Dev
Same variables available as Replit secrets. `REPLIT_DEV_DOMAIN` is auto-set by Replit.

---

## How To Deploy (from Replit)

GitHub push now works via the GitHub OAuth integration. From the terminal:

```bash
git add -A
git commit -m "your message"
git push github main
```

If GitHub push fails (OAuth token expired), fall back to Vercel file-upload API:
1. Walk workspace (exclude `node_modules`, `.git`, `.local`, `dist`, `coverage`, `snippets`)
2. SHA1 each file, POST to `https://api.vercel.com/v2/files?teamId=<TEAM_ID>` with `x-vercel-digest` header
3. POST to `https://api.vercel.com/v13/deployments?teamId=<TEAM_ID>&projectId=<PROJECT_ID>&forceNew=1`
4. Poll `GET /v13/deployments/<id>?teamId=<TEAM_ID>` every 10s until `readyState === "READY"`

The Vercel build command handles everything: codegen → db push → api build → frontend build.

---

## Immediate Next Priorities (for Codex)

1. **Confirm the app actually works when signed in** — open https://thetaframe.vercel.app, sign in as Mark, navigate to `/daily`, and verify the daily frame loads or shows an empty state (not an error). If it still shows "Couldn't load today's frame", check the browser network tab for the `/api/daily-frames/<date>` response — a 404 means no frame exists yet (correct), a 401 means auth is still broken

2. **Daily page functionality** — the `/daily` page should: show today's date, let user pick a colour state (green/yellow/red), enter up to 3 Tier A tasks, Tier B tasks, time blocks, a micro-win, and save to the DB. Confirm this form works and persists data

3. **Mobile navigation** — add a hamburger menu / drawer for the nav links on mobile (`md:hidden`). The current header nav is desktop-only

4. **Verify all module pages** — weekly, vision, bizdev, life-ledger, reach — confirm each page loads and has functional UI

5. **Upgrade to production Clerk key** — create a `pk_live_` key in Clerk dashboard and update `VITE_CLERK_PUBLISHABLE_KEY` in Vercel env vars. This is needed before the app is shared with anyone other than Mark
