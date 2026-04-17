# Runbooks

## Browser Automation Runbook

Date: 2026-04-15
Scope: ThetaFrame local and deployed UI verification

### Canonical Browser Standard

- Automation browser: Playwright-managed Chromium
- Signoff browser: Chrome for Testing Stable
- Unsupported for QA parity: Snap `chromium-browser`

### Browser Resolution

- `BROWSER_AUTOMATION_BIN`
  - optional override for the automation browser binary
  - default: newest valid Playwright Chromium under `~/.cache/ms-playwright/`
- `BROWSER_SIGNOFF_BIN`
  - optional override for the signoff browser binary
  - default: `~/.local/opt/chrome-for-testing/stable/chrome`

### Linux Workspace Auth Capture

If `$DISPLAY` is set in the Linux workspace, headed browser auth capture is feasible. Do not mark auth capture as blocked merely because a non-TTY shell reports `Interactive auth capture requires a TTY`; that is an invocation error, not a product or environment blocker.

For interactive auth capture, run the command in a PTY-backed session and prefer Chrome for Testing:

```bash
BROWSER_AUTOMATION_BIN=$HOME/.local/opt/chrome-for-testing/stable/chrome \
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
pnpm run qa:browser:auth:capture:basic
```

```bash
BROWSER_AUTOMATION_BIN=$HOME/.local/opt/chrome-for-testing/stable/chrome \
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
pnpm run qa:browser:auth:capture:select-authorized
```

Codex agents must use `exec_command` with `tty: true` for these capture commands, then send Enter to the PTY after the opened Chrome window has completed sign-in and reached the expected lane. See `_AI_SYSTEM/BROWSER_AUTH_RUNBOOK.md` for the full decision rule.

### Repo Commands

Install or refresh the automation browser if needed:

```bash
pnpm --dir scripts exec playwright install chromium
```

Run the headless route harness:

```bash
pnpm run qa:browser
```

Run the headed/manual signoff variant:

```bash
pnpm run qa:browser:headed
```

Capture a normal signed-in browser state on the production custom domain:

```bash
pnpm run qa:browser:auth:capture
```

Capture an admin-capable browser state on the production custom domain:

```bash
pnpm run qa:browser:auth:capture:admin
```

Capture a Basic browser state on the production custom domain:

```bash
pnpm run qa:browser:auth:capture:basic
```

Capture a Select Authorized browser state on the production custom domain:

```bash
pnpm run qa:browser:auth:capture:select-authorized
```

### Default Inputs

- Base URL:
  - `THETAFRAME_BROWSER_BASE_URL`
  - default: `http://127.0.0.1:4173`
- Optional signed-in storage state:
  - `THETAFRAME_BROWSER_STORAGE_STATE`
- Optional admin storage state:
  - `THETAFRAME_BROWSER_ADMIN_STORAGE_STATE`
- Optional Basic storage state:
  - `THETAFRAME_BROWSER_BASIC_STORAGE_STATE`
- Optional Select Authorized storage state:
  - `THETAFRAME_BROWSER_SELECT_AUTHORIZED_STORAGE_STATE`
- Optional Select Authorized module profile:
  - `THETAFRAME_BROWSER_SELECT_AUTHORIZED_MODULES`
  - default: `life-ledger`
- Optional evidence directory:
  - `THETAFRAME_BROWSER_OUTPUT_DIR`
  - default: `test-results/thetaframe-browser-qa`

Default local auth-state files:

- user: `test-results/auth/thetaframe-user.json`
- admin: `test-results/auth/thetaframe-admin.json`
- Basic: `test-results/auth/thetaframe-basic.json`
- Select Authorized: `test-results/auth/thetaframe-select-authorized.json`

If those files exist, `pnpm run qa:browser` uses them automatically.
Env vars still override them when needed.

### Expected Verification Order

1. `pnpm run typecheck`
2. `pnpm --filter @workspace/thetaframe run build`
3. `pnpm run qa:browser`
4. authenticated API smoke only for flows that remain browser-blocked or non-visual

### Route Checklist

Signed-out:

- `/`
- `/sign-in`
- `/baby` not-found behavior
- signed-out protected route fallback via `/daily`

Authenticated when storage state is provided:

- `/daily`
- `/weekly`
- `/vision`
- `/life-ledger?tab=events`
- `/reach`

Admin-only when admin storage state is provided:

- `/life-ledger?tab=baby`

Access matrix when Basic storage state is provided:

- allowed UI: `/daily`, `/weekly`, `/vision`
- denied UI: `/bizdev`, `/life-ledger?tab=events`, `/reach`, `/admin`
- allowed API: `/api/daily-frames`, `/api/weekly-frames`, `/api/vision-frames`
- denied API: `/api/bizdev/brands`, `/api/life-ledger/events`, `/api/reach/files`, `/api/admin/users`, `/api/life-ledger/baby`

Access matrix when Select Authorized storage state is provided with the default `life-ledger` profile:

- allowed UI: `/daily`, `/weekly`, `/vision`, `/life-ledger?tab=events`
- denied UI: `/bizdev`, `/reach`, `/admin`
- Baby KB tab and Baby KB admin content must remain hidden
- allowed API: `/api/life-ledger/events`
- denied API: `/api/bizdev/brands`, `/api/reach/files`, `/api/admin/users`, `/api/life-ledger/baby`

Admin API matrix:

- `/api/me/permissions` returns all modules with `isAdmin=true`
- `/api/admin/users` is allowed
- `/api/life-ledger/baby` is allowed

### Local Usage Notes

- For a local preview run, start the frontend preview separately:

```bash
pnpm --filter @workspace/thetaframe run build
pnpm --filter @workspace/thetaframe run serve -- --port 4173
```

- Use a deployed base URL if local runtime env vars for Clerk are unavailable in the shell.
- Headed mode is for manual signoff only. The repo-native pass/fail gate should come from the deterministic headless run.
- Production-domain interactive sign-in is the canonical auth-state source until localhost-compatible Clerk browser auth exists in this repo. In this Linux workspace, use the PTY + Chrome for Testing flow above.
- If an authenticated check fails by landing on the signed-out home or sign-in shell, treat the saved state as stale and recapture it with the auth-capture command before retrying.
