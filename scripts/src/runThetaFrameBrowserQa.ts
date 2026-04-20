import path from "node:path";
import process from "node:process";
import { chromium, type Page } from "playwright";
import { resolveAutomationBrowserPath } from "./browserPaths";
import {
  defaultAdminStorageStatePath,
  defaultBasicStorageStatePath,
  defaultSelectAuthorizedStorageStatePath,
  defaultUserStorageStatePath,
  ensureDir,
  getStorageStateCaptureTimestamp,
  qaOutputDir,
  resolveStorageStatePath,
} from "./thetaframeBrowserQaPaths";

type CheckResult = "pass" | "skip";

type Check = {
  label: string;
  run: (page: Page) => Promise<CheckResult>;
};

type ApiFetchResult = {
  status: number;
  json: unknown;
};

const headed = process.argv.includes("--headed");
const baseUrl = process.env.THETAFRAME_BROWSER_BASE_URL ?? "http://127.0.0.1:4173";
const storageStatePath = resolveStorageStatePath(
  process.env.THETAFRAME_BROWSER_STORAGE_STATE,
  defaultUserStorageStatePath,
);
const adminStorageStatePath = resolveStorageStatePath(
  process.env.THETAFRAME_BROWSER_ADMIN_STORAGE_STATE,
  defaultAdminStorageStatePath,
);
const basicStorageStatePath = resolveStorageStatePath(
  process.env.THETAFRAME_BROWSER_BASIC_STORAGE_STATE,
  defaultBasicStorageStatePath,
);
const selectAuthorizedStorageStatePath = resolveStorageStatePath(
  process.env.THETAFRAME_BROWSER_SELECT_AUTHORIZED_STORAGE_STATE,
  defaultSelectAuthorizedStorageStatePath,
);
const outputDir = process.env.THETAFRAME_BROWSER_OUTPUT_DIR ?? qaOutputDir;
const enableAIGenerationQa = process.env.THETAFRAME_BROWSER_ENABLE_AI_GENERATION_QA === "1";

function sanitizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function waitForAppReady(page: Page, pathname: string) {
  await page.goto(new URL(pathname, baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function ensureAuthenticatedSession(page: Page, expectedPathname: string, label: string) {
  const onSignInPage = await page
    .getByText("Sign in with your preferred method.", { exact: true })
    .isVisible()
    .catch(() => false);
  const onPublicHome = await page
    .getByRole("heading", { name: "A quiet place for your mind." })
    .isVisible()
    .catch(() => false);

  if (onSignInPage || onPublicHome) {
    throw new Error(
      `${label} did not reach an authenticated ThetaFrame shell for ${expectedPathname}. The saved browser auth state appears stale or invalid. Re-run 'pnpm run qa:browser:auth:capture' and try again.`,
    );
  }
}

async function expectWorkspaceColour(page: Page, colour: "green" | "yellow" | "red" | "blue" | "purple" | "neutral") {
  await page.locator(`[data-workspace-colour="${colour}"]`).first().waitFor();
}

async function dismissOnboardingIfVisible(page: Page) {
  const modal = page.getByTestId("signed-in-onboarding-modal");
  if (await modal.isVisible().catch(() => false)) {
    const button = page.getByTestId("button-dismiss-onboarding-modal");
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await modal.waitFor({ state: "hidden" }).catch(() => undefined);
    }
  }
}

async function expectAccessDenied(page: Page, pathname: string, label: string) {
  await waitForAppReady(page, pathname);
  await ensureAuthenticatedSession(page, pathname, label);
  await dismissOnboardingIfVisible(page);
  await page.getByTestId("text-access-denied").waitFor();
}

async function expectModalViewportFit(page: Page, label: string) {
  const modalBox = await page.getByTestId("signed-in-onboarding-modal").boundingBox();
  const bodyBox = await page.getByTestId("signed-in-onboarding-modal-body").boundingBox();
  const footerBox = await page.getByTestId("button-dismiss-onboarding-modal").boundingBox();

  if (!modalBox || !bodyBox || !footerBox) {
    throw new Error(`${label} modal fit check could not read modal, body, or footer bounds.`);
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error(`${label} modal fit check could not read viewport size.`);
  }

  const viewportBottom = viewport.height + 1;
  const viewportRight = viewport.width + 1;
  const isInViewport =
    modalBox.y >= -1 &&
    modalBox.x >= -1 &&
    modalBox.y + modalBox.height <= viewportBottom &&
    modalBox.x + modalBox.width <= viewportRight &&
    footerBox.y + footerBox.height <= viewportBottom &&
    bodyBox.y + bodyBox.height <= footerBox.y + 1;

  if (!isInViewport) {
    throw new Error(
      `${label} modal exceeds viewport or footer is not visible. ` +
      `modal=${JSON.stringify(modalBox)} body=${JSON.stringify(bodyBox)} footer=${JSON.stringify(footerBox)} viewport=${JSON.stringify(viewport)}`,
    );
  }
}

async function expectAuthPanelBeforeTheta(
  page: Page,
  panelTestId: string,
  thetaWrapperTestId: string,
  label: string,
) {
  const panel = page.getByTestId(panelTestId);
  const thetaWrapper = page.getByTestId(thetaWrapperTestId);
  await panel.waitFor();
  await thetaWrapper.waitFor();
  await thetaWrapper.getByTestId("theta-positioning").waitFor();

  const panelBox = await panel.boundingBox();
  const thetaBox = await thetaWrapper.boundingBox();
  if (!panelBox || !thetaBox) {
    throw new Error(`${label} could not read Clerk panel or theta positioning bounds.`);
  }
  if (panelBox.y >= thetaBox.y) {
    throw new Error(
      `${label} expected Clerk panel above theta positioning. panel=${JSON.stringify(panelBox)} theta=${JSON.stringify(thetaBox)}`,
    );
  }
}

async function expectElementBefore(page: Page, firstTestId: string, secondTestId: string, label: string) {
  const first = page.getByTestId(firstTestId);
  const second = page.getByTestId(secondTestId);
  await first.waitFor();
  await second.waitFor();

  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) {
    throw new Error(`${label} could not read element bounds.`);
  }
  if (firstBox.y >= secondBox.y) {
    throw new Error(
      `${label} expected ${firstTestId} above ${secondTestId}. ` +
      `first=${JSON.stringify(firstBox)} second=${JSON.stringify(secondBox)}`,
    );
  }
}

async function openDetailsSection(page: Page, testId: string) {
  const section = page.getByTestId(testId);
  await section.waitFor();
  const isOpen = (await section.getAttribute("open")) !== null;
  if (!isOpen) {
    await section.locator("summary").click();
  }
}

function parseSelectAuthorizedModules(): Set<string> {
  const raw = process.env.THETAFRAME_BROWSER_SELECT_AUTHORIZED_MODULES ?? "life-ledger";
  return new Set(
    raw
      .split(",")
      .map((module) => module.trim())
      .filter(Boolean),
  );
}

async function fetchApi(page: Page, apiPath: string): Promise<ApiFetchResult> {
  return page.evaluate(async (pathToFetch) => {
    const response = await fetch(pathToFetch, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    let json: unknown = null;
    try {
      json = await response.clone().json();
    } catch {
      json = null;
    }
    return { status: response.status, json };
  }, apiPath);
}

function assertStatus(result: ApiFetchResult, expectedStatuses: readonly number[], label: string) {
  if (!expectedStatuses.includes(result.status)) {
    throw new Error(`${label} returned ${result.status}; expected ${expectedStatuses.join(" or ")}.`);
  }
}

async function expectApiStatus(page: Page, apiPath: string, expectedStatuses: readonly number[], label: string) {
  const result = await fetchApi(page, apiPath);
  assertStatus(result, expectedStatuses, label);
}

async function expectApiNotUnauthorizedOrForbidden(page: Page, apiPath: string, label: string) {
  const result = await fetchApi(page, apiPath);
  if (result.status === 401 || result.status === 403) {
    throw new Error(`${label} returned ${result.status}; expected an authenticated allowed response.`);
  }
}

function getJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function expectPermissions(page: Page, expectedModules: readonly string[], expectedIsAdmin: boolean, label: string) {
  const result = await fetchApi(page, "/api/me/permissions");
  assertStatus(result, [200], `${label} permissions`);

  const body = getJsonRecord(result.json);
  const modules = Array.isArray(body.modules) ? body.modules.filter((module): module is string => typeof module === "string") : [];
  const moduleSet = new Set(modules);
  const expectedSet = new Set(expectedModules);
  const missingModules = expectedModules.filter((module) => !moduleSet.has(module));
  const unexpectedModules = modules.filter((module) => !expectedSet.has(module));

  if (missingModules.length > 0 || unexpectedModules.length > 0) {
    throw new Error(
      `${label} permissions modules mismatch; missing=${missingModules.join(",") || "none"} unexpected=${unexpectedModules.join(",") || "none"}.`,
    );
  }

  if (body.isAdmin !== expectedIsAdmin) {
    throw new Error(`${label} permissions isAdmin=${String(body.isAdmin)}; expected ${String(expectedIsAdmin)}.`);
  }
}

async function expectLifeLedgerEventsSurface(page: Page) {
  await page.getByTestId("text-life-ledger-title").waitFor();

  const markers = [
    "events-execution-board",
    "events-delivery-status-block",
    "calendar-placeholder-life-ledger-events",
    "button-empty-new-entry",
  ];

  const started = Date.now();
  while (Date.now() - started < 30000) {
    for (const marker of markers) {
      if (await page.getByTestId(marker).isVisible().catch(() => false)) {
        return;
      }
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Life Ledger events surface marker was not visible; checked ${markers.join(", ")}.`);
}

async function expectBasicApiAccess(page: Page) {
  await expectPermissions(page, ["daily", "weekly", "vision"], false, "Basic API matrix");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/daily-frames", "Basic daily API");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/weekly-frames", "Basic weekly API");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/vision-frames", "Basic vision API");
  await expectApiStatus(page, "/api/bizdev/brands", [403], "Basic FollowUps API");
  await expectApiStatus(page, "/api/life-ledger/events", [403], "Basic Life Ledger API");
  await expectApiStatus(page, "/api/reach/files", [403], "Basic REACH API");
  await expectApiStatus(page, "/api/admin/users", [403], "Basic Admin API");
  await expectApiStatus(page, "/api/life-ledger/baby", [403], "Basic Baby KB API");
}

async function expectSelectAuthorizedApiAccess(page: Page) {
  await expectPermissions(page, ["daily", "weekly", "vision", "life-ledger"], false, "Select Authorized API matrix");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/life-ledger/events", "Select Authorized Life Ledger API");
  await expectApiStatus(page, "/api/bizdev/brands", [403], "Select Authorized FollowUps API");
  await expectApiStatus(page, "/api/reach/files", [403], "Select Authorized REACH API");
  await expectApiStatus(page, "/api/admin/users", [403], "Select Authorized Admin API");
  await expectApiStatus(page, "/api/life-ledger/baby", [403], "Select Authorized Baby KB API");
}

async function expectAdminApiAccess(page: Page) {
  await expectPermissions(page, ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"], true, "Admin API matrix");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/admin/users", "Admin users API");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/life-ledger/baby", "Admin Baby KB API");
}

async function captureFailure(page: Page, label: string) {
  ensureDir(outputDir);
  const filename = `${sanitizeLabel(label)}.png`;
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: true,
  }).catch(() => undefined);
}

async function captureEvidence(page: Page, label: string) {
  ensureDir(outputDir);
  const filename = `${sanitizeLabel(label)}.png`;
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: true,
  }).catch(() => undefined);
}

async function runChecks(page: Page, checks: Check[]) {
  let passCount = 0;
  let skipCount = 0;

  for (const check of checks) {
    process.stdout.write(`- ${check.label}... `);
    try {
      const result = await check.run(page);
      if (result === "skip") {
        skipCount += 1;
        process.stdout.write("skip\n");
      } else {
        passCount += 1;
        process.stdout.write("ok\n");
      }
    } catch (error) {
      await captureFailure(page, check.label);
      throw error;
    }
  }

  return { passCount, skipCount };
}

function signedOutChecks(): Check[] {
  return [
    {
      label: "signed-out landing renders the public shell",
      run: async (page) => {
        await waitForAppReady(page, "/");
        await page.getByRole("heading", { name: "A quiet place for your mind." }).waitFor();
        await page.getByTestId("marketing-screamer-hero").waitFor();
        await page.getByTestId("marketing-screamer-stress").waitFor();
        await page.getByTestId("marketing-screamer-calm").waitFor();
        await page.getByTestId("theta-positioning").waitFor();
        await page.getByTestId("theta-example-cycle").waitFor();
        await page.getByTestId("link-sign-in").waitFor();
        await expectWorkspaceColour(page, "neutral");
        return "pass";
      },
    },
    {
      label: "auth lanes render Clerk before theta positioning",
      run: async (page) => {
        await waitForAppReady(page, "/sign-in");
        await page.getByText("Drop In · Rewire · Rise", { exact: true }).waitFor();
        await page.getByText("Sign in with your preferred method.", { exact: true }).waitFor();
        await expectAuthPanelBeforeTheta(
          page,
          "auth-clerk-panel-sign-in",
          "auth-theta-positioning-sign-in",
          "Sign In auth order",
        );

        await waitForAppReady(page, "/sign-up");
        await page.getByText("Create access with your preferred method.", { exact: true }).waitFor();
        await expectAuthPanelBeforeTheta(
          page,
          "auth-clerk-panel-sign-up",
          "auth-theta-positioning-sign-up",
          "Sign Up auth order",
        );
        return "pass";
      },
    },
    {
      label: "unknown public baby route resolves to not-found",
      run: async (page) => {
        await waitForAppReady(page, "/baby");
        await page.getByRole("heading", { name: "Lost in the theta waves" }).waitFor();
        return "pass";
      },
    },
    {
      label: "signed-out protected daily route falls back to the public home",
      run: async (page) => {
        await waitForAppReady(page, "/daily");
        await page.getByRole("heading", { name: "A quiet place for your mind." }).waitFor();
        return "pass";
      },
    },
  ];
}

function authenticatedChecks(storageState: string | undefined): Check[] {
  return [
    {
      label: "signed-in home lands on control center dashboard",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/");
        await ensureAuthenticatedSession(page, "/dashboard", "Dashboard browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("dashboard-control-center").waitFor();
        await page.getByTestId("link-dashboard").waitFor();
        await page.getByTestId("dashboard-brain-dump-setup").waitFor();
        await page.getByTestId("textarea-dashboard-brain-dump").waitFor();
        await page.getByTestId("button-generate-brain-dump").waitFor();
        await page.getByTestId("dashboard-start-today").waitFor();
        await page.getByTestId("habit-canvas-map").waitFor();
        await page.getByTestId("habit-focus-group-dashboard").waitFor();
        await page.getByTestId("habit-focus-card-dashboard-daily").waitFor();
        await page.getByTestId("habit-focus-card-dashboard-weekly").waitFor();
        await page.getByTestId("habit-focus-card-dashboard-vision").waitFor();
        await page.getByTestId("dashboard-needs-review").waitFor();
        await page.getByTestId("ai-draft-canvas-block").waitFor();
        await page.getByTestId("dashboard-calendar-planning").waitFor();

        if (await page.getByTestId("button-mode-badge").isVisible().catch(() => false)) {
          throw new Error("Header still exposed the old mode badge.");
        }

        await captureEvidence(page, "c37-dashboard-desktop");
        await captureEvidence(page, "c46-dashboard-brain-dump-setup-desktop");
        await captureEvidence(page, "c42-basic-dashboard-habit-canvas-desktop");
        await page.getByTestId("habit-focus-card-dashboard-daily").hover();
        await captureEvidence(page, "c43-dashboard-today-hover-focus-desktop");
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId("habit-focus-group-dashboard").scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await captureEvidence(page, "c37-dashboard-mobile");
        await captureEvidence(page, "c46-dashboard-brain-dump-setup-mobile");
        await captureEvidence(page, "c42-basic-dashboard-habit-canvas-mobile");
        await captureEvidence(page, "c43-dashboard-scroll-focus-mobile");
        await page.setViewportSize({ width: 1440, height: 960 });
        return "pass";
      },
    },
    {
      label: "daily lane mounts with hero and core step order",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/daily");
        await ensureAuthenticatedSession(page, "/daily", "Daily browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("text-daily-title").waitFor();
        await page.getByTestId("today-canvas").waitFor();
        await page.getByTestId("habit-focus-group-today").waitFor();
        await expectElementBefore(page, "today-canvas", "more-help-daily", "Daily content triage order");
        await openDetailsSection(page, "more-help-daily");
        await page.getByTestId("step-order-daily").waitFor();
        await captureEvidence(page, "c42-today-canvas-desktop");
        return "pass";
      },
    },
    {
      label: "weekly lane mounts with core step order",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/weekly");
        await ensureAuthenticatedSession(page, "/weekly", "Weekly browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("week-canvas").waitFor();
        await page.getByTestId("habit-focus-group-week").waitFor();
        await page.getByTestId("weekly-theme-island").waitFor();
        await expectElementBefore(page, "week-canvas", "more-help-weekly", "Weekly content triage order");
        await openDetailsSection(page, "more-help-weekly");
        await page.getByTestId("step-order-weekly").waitFor();
        await captureEvidence(page, "c42-week-canvas-desktop");
        return "pass";
      },
    },
    {
      label: "vision lane mounts with goals island and core step order",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/vision");
        await ensureAuthenticatedSession(page, "/vision", "Vision browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("goals-canvas").waitFor();
        await page.getByTestId("habit-focus-group-goals").waitFor();
        await page.getByTestId("vision-goals-island").waitFor();
        await expectElementBefore(page, "goals-canvas", "more-help-vision", "Vision content triage order");
        await openDetailsSection(page, "more-help-vision");
        await page.getByTestId("step-order-vision").waitFor();
        await captureEvidence(page, "c42-goals-canvas-desktop");
        return "pass";
      },
    },
    {
      label: "life ledger events surface mounts with execution board",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/life-ledger?tab=events");
        await ensureAuthenticatedSession(page, "/life-ledger?tab=events", "Life Ledger events browser QA");
        await dismissOnboardingIfVisible(page);
        await expectLifeLedgerEventsSurface(page);
        if (await page.getByTestId("events-execution-board").isVisible().catch(() => false)) {
          await expectElementBefore(
            page,
            "events-execution-board",
            "calendar-placeholder-life-ledger-events",
            "Life Ledger Events content triage order",
          );
        }
        return "pass";
      },
    },
    {
      label: "reach lane mounts with file intake surface",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/reach");
        await ensureAuthenticatedSession(page, "/reach", "REACH browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("text-reach-title").waitFor();
        await page.getByTestId("upload-panel").waitFor();
        await expectElementBefore(page, "upload-panel", "mobile-placeholder-reach", "REACH content triage order");
        return "pass";
      },
    },
    {
      label: "followups lane mounts with people follow-up surface",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/bizdev");
        await ensureAuthenticatedSession(page, "/bizdev", "FollowUps browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByRole("heading", { name: "People to get back to" }).waitFor();
        await page.getByText("People · Next promise · Reminder date · Calendar planning", { exact: true }).waitFor();
        await page.getByTestId("followups-reminder-guidance").waitFor();
        await page.getByTestId("filter-bar").waitFor();
        await expectElementBefore(page, "filter-bar", "followups-reminder-guidance", "FollowUps content triage order");
        return "pass";
      },
    },
  ];
}

function adminChecks(storageState: string | undefined): Check[] {
  return [
    {
      label: "life ledger baby tab mounts for admin sessions",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/life-ledger?tab=baby");
        await ensureAuthenticatedSession(page, "/life-ledger?tab=baby", "Life Ledger Baby browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("baby-kb-intro").waitFor();
        await page.getByTestId("baby-kb-operational-queue").waitFor();
        await expectAdminApiAccess(page);
        return "pass";
      },
    },
    {
      label: "admin lane mounts with governance and users list",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/dashboard");
        await ensureAuthenticatedSession(page, "/dashboard", "Admin dashboard browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("dashboard-control-center").waitFor();
        await page.getByText("Open Admin governance", { exact: true }).waitFor();

        await waitForAppReady(page, "/admin");
        await ensureAuthenticatedSession(page, "/admin", "Admin browser QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("text-admin-title").waitFor();
        await page.getByTestId("users-list").waitFor();
        await expectAdminApiAccess(page);
        return "pass";
      },
    },
  ];
}

function basicRouteMatrixChecks(storageState: string | undefined): Check[] {
  return [
    {
      label: "basic access matrix allows core lanes only",
      run: async (page) => {
        if (!storageState) return "skip";

        await waitForAppReady(page, "/daily");
        await ensureAuthenticatedSession(page, "/daily", "Basic Daily route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("text-daily-title").waitFor();

        await waitForAppReady(page, "/weekly");
        await ensureAuthenticatedSession(page, "/weekly", "Basic Weekly route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("weekly-theme-island").waitFor();

        await waitForAppReady(page, "/vision");
        await ensureAuthenticatedSession(page, "/vision", "Basic Vision route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("vision-goals-island").waitFor();

        await expectAccessDenied(page, "/bizdev", "Basic FollowUps route-matrix QA");
        await expectAccessDenied(page, "/life-ledger?tab=events", "Basic Life Ledger route-matrix QA");
        await expectAccessDenied(page, "/reach", "Basic REACH route-matrix QA");
        await expectAccessDenied(page, "/admin", "Basic Admin route-matrix QA");
        await expectBasicApiAccess(page);
        return "pass";
      },
    },
  ];
}

function basicOnboardingChecks(storageState: string | undefined): Check[] {
  return [
    {
      label: "basic repeatable guide and lane AI groundwork render",
      run: async (page) => {
        if (!storageState) return "skip";

        await waitForAppReady(page, "/daily");
        await ensureAuthenticatedSession(page, "/daily", "Basic guide QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("button-open-guide").waitFor();
        await page.getByTestId("button-open-guide").getByText("Start Here", { exact: true }).waitFor();

        await page.getByTestId("button-open-guide").click();
        await page.getByTestId("basic-start-guide").waitFor();
        await page.getByTestId("guide-surface-tabs").waitFor();
        await page.getByTestId("guide-tab-daily").waitFor();
        await page.getByTestId("guide-tab-weekly").waitFor();
        await page.getByTestId("guide-tab-vision").waitFor();
        await page.getByTestId("guide-restart-current-surface").waitFor();
        await page.getByTestId("button-dismiss-onboarding-modal").waitFor();
        await expectModalViewportFit(page, "Daily Start Here desktop");
        if (await page.getByTestId("guide-tab-daily").getAttribute("aria-selected") !== "true") {
          throw new Error("Start Here did not focus Today when opened from Daily.");
        }
        await page.getByTestId("guide-step-daily").waitFor();
        await page.getByTestId("guide-step-weekly").waitFor();
        await page.getByTestId("guide-step-vision").waitFor();
        await page.getByTestId("guide-step-daily").getByText("Step 1: Today").waitFor();
        await page.getByTestId("guide-step-weekly").getByText("Step 2: This Week").waitFor();
        await page.getByTestId("guide-step-vision").getByText("Step 3: Goals").waitFor();

        for (const hiddenLabel of ["FollowUps", "BizDev", "Life Ledger", "REACH", "Admin", "Baby KB"]) {
          if (await page.getByTestId("basic-start-guide").getByText(hiddenLabel, { exact: false }).isVisible().catch(() => false)) {
            throw new Error(`Basic guide exposed ${hiddenLabel}.`);
          }
        }

        await captureEvidence(page, "c37-basic-guide-daily-focus-desktop");
        await page.getByTestId("guide-tab-weekly").click();
        if (await page.getByTestId("guide-tab-weekly").getAttribute("aria-selected") !== "true") {
          throw new Error("Start Here tabs did not switch to This Week.");
        }
        await page
          .getByTestId("guide-restart-current-surface")
          .getByRole("heading", { name: "Step 2: This Week" })
          .waitFor();

        await page.getByTestId("button-dismiss-onboarding-modal").click();
        await page.getByTestId("signed-in-onboarding-modal").waitFor({ state: "hidden" }).catch(() => undefined);

        await waitForAppReady(page, "/dashboard");
        await ensureAuthenticatedSession(page, "/dashboard", "Basic dashboard QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("dashboard-control-center").waitFor();
        await page.getByTestId("dashboard-brain-dump-setup").waitFor();
        await page.getByTestId("textarea-dashboard-brain-dump").waitFor();
        await page.getByTestId("button-generate-brain-dump").waitFor();
        await page.getByTestId("dashboard-start-today").waitFor();
        await page.getByTestId("habit-canvas-map").waitFor();
        await page.getByTestId("habit-focus-group-dashboard").waitFor();
        await page.getByTestId("habit-focus-card-dashboard-daily").waitFor();
        await page.getByTestId("habit-focus-card-dashboard-weekly").waitFor();
        await page.getByTestId("habit-focus-card-dashboard-vision").waitFor();
        await page.getByTestId("dashboard-needs-review").waitFor();
        await page.getByTestId("ai-draft-canvas-block").waitFor();
        await page.getByTestId("dashboard-coming-up").waitFor();
        await page.getByTestId("dashboard-calendar-planning").waitFor();
        for (const hiddenLabel of ["FollowUps", "BizDev", "Life Ledger", "REACH", "Admin", "Baby KB"]) {
          if (await page.getByTestId("dashboard-control-center").getByText(hiddenLabel, { exact: false }).isVisible().catch(() => false)) {
            throw new Error(`Basic dashboard exposed ${hiddenLabel}.`);
          }
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId("button-open-guide").click();
        await page.getByTestId("basic-start-guide").waitFor();
        await page.getByTestId("guide-surface-tabs").waitFor();
        await expectModalViewportFit(page, "Dashboard Start Here mobile");
        await captureEvidence(page, "c37-basic-guide-dashboard-mobile");
        await captureEvidence(page, "c42-start-here-dashboard-mobile");
        await page.setViewportSize({ width: 1440, height: 960 });
        await page.getByTestId("button-dismiss-onboarding-modal").click();

        await waitForAppReady(page, "/daily");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("today-canvas").waitFor();
        await page.getByTestId("habit-focus-group-today").waitFor();
        await page.getByTestId("next-step-daily").waitFor();
        await page.getByTestId("ai-time-saver-daily").waitFor();
        await page.getByTestId("step-order-daily").waitFor();
        await page.getByTestId("workspace-mood-picker").waitFor();
        await page.getByTestId("button-add-daily-must-do").waitFor();
        for (const colour of ["green", "yellow", "red", "blue", "purple"] as const) {
          await page.getByTestId(`button-workspace-colour-${colour}`).click();
          await expectWorkspaceColour(page, colour);
        }
        await captureEvidence(page, "c36-basic-daily-purple-workspace");
        await captureEvidence(page, "c42-today-canvas-purple-workspace");
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId("habit-focus-group-today").scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await captureEvidence(page, "c43-today-scroll-focus-mobile");
        await page.setViewportSize({ width: 1440, height: 960 });

        await waitForAppReady(page, "/weekly");
        await dismissOnboardingIfVisible(page);
        await expectWorkspaceColour(page, "purple");
        await page.getByTestId("week-canvas").waitFor();
        await page.getByTestId("habit-focus-group-week").waitFor();
        await page.getByTestId("next-step-weekly").waitFor();
        await page.getByTestId("ai-time-saver-weekly").waitFor();
        await page.getByTestId("step-order-weekly").waitFor();
        await page.getByTestId("workspace-mood-picker").waitFor();
        await page.getByTestId("button-add-weekly-step").waitFor();
        await captureEvidence(page, "c36-basic-weekly-purple-workspace");
        await captureEvidence(page, "c42-week-canvas-purple-workspace");
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId("habit-focus-group-week").scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await captureEvidence(page, "c43-week-scroll-focus-mobile");
        await page.setViewportSize({ width: 1440, height: 960 });

        await waitForAppReady(page, "/vision");
        await dismissOnboardingIfVisible(page);
        await expectWorkspaceColour(page, "purple");
        await page.getByTestId("goals-canvas").waitFor();
        await page.getByTestId("habit-focus-group-goals").waitFor();
        await page.getByTestId("next-step-vision").waitFor();
        await page.getByTestId("ai-time-saver-vision").waitFor();
        await page.getByTestId("step-order-vision").waitFor();
        await page.getByTestId("workspace-mood-picker").waitFor();
        await page.getByTestId("button-add-vision-goal").waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId("habit-focus-group-goals").scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await captureEvidence(page, "c36-basic-vision-mobile-purple-workspace");
        await captureEvidence(page, "c42-goals-canvas-mobile-purple-workspace");
        await captureEvidence(page, "c43-goals-scroll-focus-mobile");
        await page.setViewportSize({ width: 1440, height: 960 });

        return "pass";
      },
    },
    ...(enableAIGenerationQa
      ? [
          {
            label: "basic dashboard brain dump can generate a review batch",
            run: async (page) => {
              if (!storageState) return "skip";
              const marker = `C46 browser QA ${new Date().toISOString()}`;
              await waitForAppReady(page, "/dashboard");
              await ensureAuthenticatedSession(page, "/dashboard", "Basic brain dump AI QA");
              await dismissOnboardingIfVisible(page);
              await page.getByTestId("dashboard-brain-dump-setup").waitFor();
              await page.getByTestId("textarea-dashboard-brain-dump").fill(
                [
                  marker,
                  "Today I need to answer the school email, pick one work task, and keep dinner simple.",
                  "This week I need protected quiet time and a backup plan if I get overloaded.",
                  "Longer term I want a calmer home routine with visible next steps.",
                ].join(" "),
              );
              await page.getByTestId("button-generate-brain-dump").click();
              await page.getByTestId("dashboard-brain-dump-batch").waitFor({ timeout: 45000 });
              await page.getByTestId("dashboard-brain-dump-draft-daily").waitFor();
              await page.getByTestId("dashboard-brain-dump-draft-weekly").waitFor();
              await page.getByTestId("dashboard-brain-dump-draft-vision").waitFor();
              await captureEvidence(page, "c46-dashboard-brain-dump-generated-batch");
              return "pass";
            },
          } satisfies Check,
        ]
      : []),
  ];
}

function selectAuthorizedRouteMatrixChecks(storageState: string | undefined): Check[] {
  return [
    {
      label: "select authorized access matrix matches assigned optional modules",
      run: async (page) => {
        if (!storageState) return "skip";
        const optionalModules = parseSelectAuthorizedModules();

        await waitForAppReady(page, "/dashboard");
        await ensureAuthenticatedSession(page, "/dashboard", "Select Authorized dashboard QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("dashboard-control-center").waitFor();
        await page.getByTestId("dashboard-start-today").waitFor();
        await page.getByTestId("dashboard-needs-review").waitFor();
        await page.getByTestId("dashboard-calendar-planning").waitFor();
        if (optionalModules.has("bizdev")) {
          await page.getByText("Open FollowUps", { exact: true }).waitFor();
        }
        if (optionalModules.has("life-ledger")) {
          await page.getByTestId("dashboard-coming-up").getByText("Life Ledger events", { exact: true }).waitFor();
          await page.getByTestId("dashboard-mobile-returns").waitFor();
        }

        await waitForAppReady(page, "/daily");
        await ensureAuthenticatedSession(page, "/daily", "Select Authorized Daily route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("text-daily-title").waitFor();

        await waitForAppReady(page, "/weekly");
        await ensureAuthenticatedSession(page, "/weekly", "Select Authorized Weekly route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("weekly-theme-island").waitFor();

        await waitForAppReady(page, "/vision");
        await ensureAuthenticatedSession(page, "/vision", "Select Authorized Vision route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("vision-goals-island").waitFor();

        if (optionalModules.has("bizdev")) {
          await waitForAppReady(page, "/bizdev");
          await ensureAuthenticatedSession(page, "/bizdev", "Select Authorized FollowUps route-matrix QA");
          await dismissOnboardingIfVisible(page);
          await page.getByRole("heading", { name: "People to get back to" }).waitFor();
          await page.getByTestId("followups-reminder-guidance").waitFor();
        } else {
          await expectAccessDenied(page, "/bizdev", "Select Authorized FollowUps route-matrix QA");
        }

        if (optionalModules.has("life-ledger")) {
          await waitForAppReady(page, "/life-ledger?tab=events");
          await ensureAuthenticatedSession(page, "/life-ledger?tab=events", "Select Authorized Life Ledger route-matrix QA");
          await dismissOnboardingIfVisible(page);
          await expectLifeLedgerEventsSurface(page);
          await waitForAppReady(page, "/life-ledger?tab=baby");
          await ensureAuthenticatedSession(page, "/life-ledger?tab=baby", "Select Authorized Baby KB route-matrix QA");
          await dismissOnboardingIfVisible(page);
          await page.getByTestId("text-life-ledger-title").waitFor();
          const babyIntroVisible = await page.getByTestId("baby-kb-intro").isVisible().catch(() => false);
          const babyTabVisible = await page.getByTestId("tab-baby").isVisible().catch(() => false);
          if (babyIntroVisible || babyTabVisible) {
            throw new Error("Select Authorized Life Ledger session exposed Baby KB admin UI.");
          }
        } else {
          await expectAccessDenied(page, "/life-ledger?tab=events", "Select Authorized Life Ledger route-matrix QA");
        }

        if (optionalModules.has("reach")) {
          await waitForAppReady(page, "/reach");
          await ensureAuthenticatedSession(page, "/reach", "Select Authorized REACH route-matrix QA");
          await dismissOnboardingIfVisible(page);
          await page.getByTestId("text-reach-title").waitFor();
          await page.getByTestId("upload-panel").waitFor();
        } else {
          await expectAccessDenied(page, "/reach", "Select Authorized REACH route-matrix QA");
        }

        await expectAccessDenied(page, "/admin", "Select Authorized Admin route-matrix QA");
        await expectSelectAuthorizedApiAccess(page);
        return "pass";
      },
    },
  ];
}

async function createContext(executablePath: string, storageState?: string) {
  const browser = await chromium.launch({
    headless: !headed,
    executablePath,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 960 },
    ...(storageState ? { storageState } : {}),
  });

  const page = await context.newPage();
  return { browser, context, page };
}

async function maybePauseForManualSignoff(page: Page) {
  if (!headed || !process.stdin.isTTY) return;

  process.stdout.write(
    [
      "",
      "Headed browser left open on the current route for manual signoff.",
      "Review the visible lane state, then press Enter to close the browser.",
      "",
    ].join("\n"),
  );

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  await page.context().browser()?.close();
}

async function main() {
  ensureDir(outputDir);

  const executablePath = resolveAutomationBrowserPath();
  process.stdout.write(`Using automation browser: ${executablePath}\n`);
  process.stdout.write(`Target base URL: ${baseUrl}\n`);
  process.stdout.write(`Evidence directory: ${outputDir}\n`);
  process.stdout.write(
    `User storage state: ${storageStatePath ? `${storageStatePath} (${getStorageStateCaptureTimestamp(storageStatePath) ?? "unknown"})` : "not provided"}\n`,
  );
  process.stdout.write(
    `Admin storage state: ${adminStorageStatePath ? `${adminStorageStatePath} (${getStorageStateCaptureTimestamp(adminStorageStatePath) ?? "unknown"})` : "not provided"}\n`,
  );
  process.stdout.write(
    `Basic storage state: ${basicStorageStatePath ? `${basicStorageStatePath} (${getStorageStateCaptureTimestamp(basicStorageStatePath) ?? "unknown"})` : "not provided"}\n`,
  );
  process.stdout.write(
    `Select Authorized storage state: ${selectAuthorizedStorageStatePath ? `${selectAuthorizedStorageStatePath} (${getStorageStateCaptureTimestamp(selectAuthorizedStorageStatePath) ?? "unknown"})` : "not provided"}\n`,
  );
  process.stdout.write(
    `Select Authorized optional modules: ${Array.from(parseSelectAuthorizedModules()).join(", ") || "none"}\n`,
  );

  const signedOut = await createContext(executablePath);
  const auth = storageStatePath ? await createContext(executablePath, storageStatePath) : null;
  const admin = adminStorageStatePath ? await createContext(executablePath, adminStorageStatePath) : null;
  const basic = basicStorageStatePath ? await createContext(executablePath, basicStorageStatePath) : null;
  const selectAuthorized = selectAuthorizedStorageStatePath
    ? await createContext(executablePath, selectAuthorizedStorageStatePath)
    : null;

  try {
    const signedOutResult = await runChecks(signedOut.page, signedOutChecks());
    const authResult = auth
      ? await runChecks(auth.page, authenticatedChecks(storageStatePath))
      : await runChecks(signedOut.page, authenticatedChecks(undefined));
    const adminResult = admin
      ? await runChecks(admin.page, adminChecks(adminStorageStatePath))
      : await runChecks(signedOut.page, adminChecks(undefined));
    const basicMatrixResult = basic
      ? await runChecks(basic.page, basicRouteMatrixChecks(basicStorageStatePath))
      : await runChecks(signedOut.page, basicRouteMatrixChecks(undefined));
    const basicOnboardingResult = basic
      ? await runChecks(basic.page, basicOnboardingChecks(basicStorageStatePath))
      : await runChecks(signedOut.page, basicOnboardingChecks(undefined));
    const selectAuthorizedMatrixResult = selectAuthorized
      ? await runChecks(selectAuthorized.page, selectAuthorizedRouteMatrixChecks(selectAuthorizedStorageStatePath))
      : await runChecks(signedOut.page, selectAuthorizedRouteMatrixChecks(undefined));

    process.stdout.write(
      `Browser smoke checks passed. passes=${
        signedOutResult.passCount +
        authResult.passCount +
        adminResult.passCount +
        basicMatrixResult.passCount +
        basicOnboardingResult.passCount +
        selectAuthorizedMatrixResult.passCount
      } skips=${
        signedOutResult.skipCount +
        authResult.skipCount +
        adminResult.skipCount +
        basicMatrixResult.skipCount +
        basicOnboardingResult.skipCount +
        selectAuthorizedMatrixResult.skipCount
      }\n`,
    );

    const manualPage = admin?.page ?? selectAuthorized?.page ?? basic?.page ?? auth?.page ?? signedOut.page;
    await maybePauseForManualSignoff(manualPage);
  } finally {
    await Promise.all([
      signedOut.browser.close().catch(() => undefined),
      auth?.browser.close().catch(() => undefined),
      admin?.browser.close().catch(() => undefined),
      basic?.browser.close().catch(() => undefined),
      selectAuthorized?.browser.close().catch(() => undefined),
    ]);
  }
}

main().catch((error) => {
  console.error("[qa:browser] failed:", error);
  process.exitCode = 1;
});
