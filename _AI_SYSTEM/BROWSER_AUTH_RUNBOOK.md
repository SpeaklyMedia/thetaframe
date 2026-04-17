# Browser Auth Runbook

Date: 2026-04-16

## Rule For AI Agents

Do not mark authenticated browser QA as blocked just because a non-interactive shell reports:

```text
Interactive auth capture requires a TTY.
```

That error means the command was invoked incorrectly. In this Linux workspace, headed browser auth is feasible when:
- `DISPLAY` is set
- Chrome for Testing exists at `~/.local/opt/chrome-for-testing/stable/chrome`
- the command is run in a PTY-backed session

## Required Invocation Pattern

Use Chrome for Testing and a PTY for interactive auth capture:

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

For Codex, this means using `exec_command` with `tty: true`.

## Completion Flow

1. Start the capture command in a PTY-backed session.
2. Complete the Clerk sign-in in the opened Chrome window.
3. After the browser reaches the expected ThetaFrame lane, send Enter to the PTY session.
4. Verify the expected storage-state file was written:
   - Basic: `test-results/auth/thetaframe-basic.json`
   - Select Authorized: `test-results/auth/thetaframe-select-authorized.json`
5. Run the browser matrix:

```bash
THETAFRAME_BROWSER_BASE_URL=https://thetaframe.mrksylvstr.com \
THETAFRAME_BROWSER_OUTPUT_DIR=test-results/thetaframe-browser-qa/access-lanes-c31 \
pnpm run qa:browser
```

## When It Is Actually Blocked

Only mark auth capture blocked after trying the PTY + headed Chrome path and recording the concrete failure, such as:
- no `DISPLAY`
- Chrome binary missing or not executable
- Clerk login fails in the opened browser
- the expected QA account does not have the required access profile
