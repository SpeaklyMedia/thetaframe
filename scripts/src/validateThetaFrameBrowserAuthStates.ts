import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { resolveAutomationBrowserPath } from "./browserPaths";
import {
  defaultAdminStorageStatePath,
  defaultBasicStorageStatePath,
  defaultSelectAuthorizedStorageStatePath,
  resolveStorageStatePath,
} from "./thetaframeBrowserQaPaths";

type Role = "admin" | "basic" | "select-authorized";
type Permissions = { isAdmin?: unknown; modules?: unknown };

const baseUrl = process.env.THETAFRAME_BROWSER_BASE_URL ?? "https://thetaframe.mrksylvstr.com";
const allExpectations: Array<{
  role: Role;
  statePath: string | undefined;
  modules: string[];
  isAdmin: boolean;
}> = [
  {
    role: "admin",
    statePath: resolveStorageStatePath(
      process.env.THETAFRAME_BROWSER_ADMIN_STORAGE_STATE,
      defaultAdminStorageStatePath,
    ),
    modules: ["bizdev", "daily", "life-ledger", "reach", "vision", "weekly"],
    isAdmin: true,
  },
  {
    role: "basic",
    statePath: resolveStorageStatePath(
      process.env.THETAFRAME_BROWSER_BASIC_STORAGE_STATE,
      defaultBasicStorageStatePath,
    ),
    modules: ["daily", "vision", "weekly"],
    isAdmin: false,
  },
  {
    role: "select-authorized",
    statePath: resolveStorageStatePath(
      process.env.THETAFRAME_BROWSER_SELECT_AUTHORIZED_STORAGE_STATE,
      defaultSelectAuthorizedStorageStatePath,
    ),
    modules: ["daily", "life-ledger", "vision", "weekly"],
    isAdmin: false,
  },
];

const requestedRoles = new Set(
  (process.env.THETAFRAME_BROWSER_AUTH_VALIDATE_ROLES ?? "admin,basic,select-authorized")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);
const supportedRoles = new Set<Role>(["admin", "basic", "select-authorized"]);
for (const role of requestedRoles) {
  assert.ok(supportedRoles.has(role as Role), `Unsupported auth validation role: ${role}`);
}
const expectations = allExpectations.filter((expectation) => requestedRoles.has(expectation.role));
assert.ok(expectations.length > 0, "At least one auth validation role is required");

for (const expectation of expectations) {
  assert.ok(expectation.statePath, `${expectation.role} auth state is missing`);
  assert.ok(fs.existsSync(expectation.statePath), `${expectation.role} auth state does not exist`);
}

const browser = await chromium.launch({ executablePath: resolveAutomationBrowserPath(), headless: true });
const failures: string[] = [];
try {
  for (const expectation of expectations) {
    const context = await browser.newContext({ storageState: expectation.statePath });
    try {
      const page = await context.newPage();
      await page.goto(new URL("/daily", baseUrl).toString(), { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const response = await fetch("/api/me/permissions", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        return { status: response.status, body: (await response.json().catch(() => null)) as Permissions | null };
      });
      assert.equal(result.status, 200, `${expectation.role} auth state is stale or unauthorized`);
      assert.ok(result.body);
      assert.equal(result.body.isAdmin, expectation.isAdmin);
      const modules = Array.isArray(result.body.modules)
        ? result.body.modules.filter((value): value is string => typeof value === "string").sort()
        : [];
      assert.deepEqual(modules, expectation.modules);
      console.log(`[qa:browser:auth:validate] PASS: ${expectation.role} state is current with the expected access profile`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${expectation.role}: ${message}`);
      console.error(`[qa:browser:auth:validate] FAIL: ${expectation.role} state is stale or has the wrong access profile`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, [], `Saved browser auth validation failed:\n${failures.join("\n")}`);
