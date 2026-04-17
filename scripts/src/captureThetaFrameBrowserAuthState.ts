import process from "node:process";
import { chromium } from "playwright";
import { resolveAutomationBrowserPath } from "./browserPaths";
import {
  authStateDir,
  defaultAdminStorageStatePath,
  defaultBasicStorageStatePath,
  defaultSelectAuthorizedStorageStatePath,
  defaultUserStorageStatePath,
  ensureDir,
} from "./thetaframeBrowserQaPaths";

type CaptureRole = "user" | "admin" | "basic" | "select-authorized";

const roleArg = process.argv.find((arg) => arg.startsWith("--role="));
const role = (roleArg?.split("=")[1] ?? "user") as CaptureRole;
const baseUrl = process.env.THETAFRAME_BROWSER_BASE_URL ?? "https://thetaframe.mrksylvstr.com";
const authUrl = process.env.THETAFRAME_BROWSER_AUTH_URL?.trim();
const autoCapture = process.env.THETAFRAME_BROWSER_AUTH_AUTO_CAPTURE === "1";
const outputPath =
  process.env.THETAFRAME_BROWSER_STORAGE_STATE_OUTPUT?.trim() ||
  (role === "admin"
    ? defaultAdminStorageStatePath
    : role === "basic"
      ? defaultBasicStorageStatePath
      : role === "select-authorized"
        ? defaultSelectAuthorizedStorageStatePath
        : defaultUserStorageStatePath);
const signedInShellSelector = [
  '[data-testid="signed-in-onboarding-modal"]',
  '[data-testid="app-header"]',
  '[data-testid="main-nav"]',
  '[data-testid="button-sign-out"]',
  '[data-testid="text-username"]',
  '[data-testid="link-daily"]',
  '[data-testid="link-life-ledger"]',
  '[data-testid="link-reach"]',
  '[data-testid="text-daily-title"]',
  '[data-testid="weekly-theme-island"]',
  '[data-testid="vision-goals-island"]',
  '[data-testid="text-life-ledger-title"]',
  '[data-testid="text-reach-title"]',
  '[data-testid="text-access-denied"]',
].join(", ");

function isSupportedRole(value: string): value is CaptureRole {
  return value === "user" || value === "admin" || value === "basic" || value === "select-authorized";
}

function getRoleVerificationRoute(value: CaptureRole): string {
  if (value === "admin") return "/life-ledger?tab=baby";
  if (value === "select-authorized") return "/life-ledger?tab=events";
  return "/daily";
}

function getRoleVerificationCopy(value: CaptureRole): string {
  if (value === "admin") {
    return "After sign-in completes, the script will verify admin access by opening Life Ledger Baby KB.";
  }
  if (value === "basic") {
    return "After sign-in completes, the script will verify Basic access by opening Daily.";
  }
  if (value === "select-authorized") {
    return "After sign-in completes, the script will verify Select Authorized access by opening Life Ledger Events.";
  }
  return "After sign-in completes, the script will verify a signed-in lane shell.";
}

type PermissionPayload = {
  modules?: unknown;
  isAdmin?: unknown;
};

function assertExactModules(actualModules: string[], expectedModules: string[], roleLabel: string) {
  const actual = new Set(actualModules);
  const expected = new Set(expectedModules);
  const missing = expectedModules.filter((module) => !actual.has(module));
  const unexpected = actualModules.filter((module) => !expected.has(module));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${roleLabel} permissions mismatch. Missing: ${missing.join(",") || "none"}. Unexpected: ${unexpected.join(",") || "none"}.`,
    );
  }
}

async function verifyRolePermissions(page: import("playwright").Page, value: CaptureRole) {
  if (value === "user") return;

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/me/permissions", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return {
      status: response.status,
      body: await response.json().catch(() => null) as PermissionPayload | null,
    };
  });

  if (result.status !== 200 || !result.body) {
    throw new Error(`Could not verify ${value} permissions. /api/me/permissions returned ${result.status}.`);
  }

  const modules = Array.isArray(result.body.modules)
    ? result.body.modules.filter((module): module is string => typeof module === "string")
    : [];

  if (value === "admin") {
    if (result.body.isAdmin !== true) {
      throw new Error("Admin capture signed into a non-admin account.");
    }
    assertExactModules(modules, ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"], "Admin");
    return;
  }

  if (result.body.isAdmin === true) {
    throw new Error(`${value} capture signed into an admin account. Use the dedicated non-admin QA account.`);
  }

  if (value === "basic") {
    assertExactModules(modules, ["daily", "weekly", "vision"], "Basic");
  } else if (value === "select-authorized") {
    assertExactModules(modules, ["daily", "weekly", "vision", "life-ledger"], "Select Authorized");
  }
}

async function waitForRolePermissions(page: import("playwright").Page, value: CaptureRole) {
  if (value === "user") return;

  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started < 30000) {
    try {
      await verifyRolePermissions(page, value);
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(750);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Could not verify ${value} permissions before timeout.`);
}

async function waitForEnter(prompt: string) {
  process.stdout.write(prompt);
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });
}

async function canSeeSignedInShell(page: import("playwright").Page) {
  const checks = [
    page.getByTestId("signed-in-onboarding-modal"),
    page.getByTestId("app-header"),
    page.getByTestId("main-nav"),
    page.getByTestId("button-sign-out"),
    page.getByTestId("text-username"),
    page.getByTestId("link-daily"),
    page.getByTestId("link-life-ledger"),
    page.getByTestId("link-reach"),
    page.getByTestId("text-daily-title"),
    page.getByTestId("weekly-theme-island"),
    page.getByTestId("vision-goals-island"),
    page.getByTestId("text-life-ledger-title"),
    page.getByTestId("text-reach-title"),
    page.getByTestId("text-access-denied"),
  ];

  for (const locator of checks) {
    if (await locator.isVisible().catch(() => false)) {
      return true;
    }
  }

  return false;
}

async function canSeeAnyTestId(page: import("playwright").Page, testIds: string[]) {
  for (const testId of testIds) {
    if (await page.getByTestId(testId).isVisible().catch(() => false)) {
      return true;
    }
  }

  return false;
}

async function capture() {
  if (!isSupportedRole(role)) {
    throw new Error(`Unsupported role '${role}'. Use --role=user or --role=admin.`);
  }

  if (!process.stdin.isTTY) {
    throw new Error("Interactive auth capture requires a TTY. Run this command in a normal terminal session.");
  }

  ensureDir(authStateDir);

  const executablePath = resolveAutomationBrowserPath();
  const browser = await chromium.launch({
    headless: false,
    executablePath,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      baseURL: baseUrl,
      viewport: { width: 1440, height: 960 },
    });
    const page = await context.newPage();

    await page.goto(authUrl || new URL("/sign-in", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);

    process.stdout.write(
      [
        `Using automation browser: ${executablePath}`,
        `Target base URL: ${baseUrl}`,
        `Capture role: ${role}`,
        `Output path: ${outputPath}`,
        ...(authUrl ? ["Auth URL: provided via THETAFRAME_BROWSER_AUTH_URL"] : []),
        "",
        authUrl
          ? "The opened browser is consuming a short-lived sign-in token."
          : "Complete the ThetaFrame sign-in flow in the opened browser window.",
        getRoleVerificationCopy(role),
        "",
      ].join("\n") + "\n",
    );

    if (!autoCapture) {
      await waitForEnter("Press Enter after the browser has finished the sign-in flow.\n");
    }

    await page.waitForLoadState("networkidle").catch(() => undefined);
    await waitForRolePermissions(page, role);

    const signedInShellVisible = await page
      .waitForSelector(signedInShellSelector, { state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (!signedInShellVisible && !(await canSeeSignedInShell(page))) {
      throw new Error(
        "No signed-in ThetaFrame shell marker was visible after login. If auth was blocked or incomplete, retry the capture.",
      );
    }

    const verificationRoute = getRoleVerificationRoute(role);
    if (role !== "user") {
      await page.goto(new URL(verificationRoute, baseUrl).toString(), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => undefined);
    }

    if (role === "admin") {
      const hasBabyIntro = await page.getByTestId("baby-kb-intro").isVisible().catch(() => false);
      const hasQueue = await page.getByTestId("baby-kb-operational-queue").isVisible().catch(() => false);
      if (!hasBabyIntro || !hasQueue) {
        throw new Error(
          "Signed-in session did not resolve to the admin-only Baby KB surface. Re-authenticate with an admin-capable account and retry.",
        );
      }
    } else if (role === "basic") {
      const hasDailyTitle = await page.getByTestId("text-daily-title").isVisible().catch(() => false);
      if (!hasDailyTitle) {
        throw new Error(
          "Signed-in session did not resolve to the Basic Daily surface. Confirm this is a non-admin Basic account and retry.",
        );
      }
    } else if (role === "select-authorized") {
      const hasLifeLedgerTitle = await page.getByTestId("text-life-ledger-title").isVisible().catch(() => false);
      const hasEventsSurface = await canSeeAnyTestId(page, [
        "events-execution-board",
        "events-delivery-status-block",
        "calendar-placeholder-life-ledger-events",
        "button-empty-new-entry",
      ]);
      if (!hasLifeLedgerTitle || !hasEventsSurface) {
        throw new Error(
          "Signed-in session did not resolve to the Select Authorized Life Ledger surface. Confirm Life Ledger access is assigned and retry.",
        );
      }
    }

    await verifyRolePermissions(page, role);

    await context.storageState({ path: outputPath });
    process.stdout.write(`Saved Playwright storage state to ${outputPath}\n`);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

capture().catch((error) => {
  console.error("[qa:browser:auth:capture] failed:", error);
  process.exitCode = 1;
});
