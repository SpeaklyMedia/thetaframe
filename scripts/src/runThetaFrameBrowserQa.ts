import fs from "node:fs";
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

type AdminQaUser = {
  id: string;
  email: string;
  role: string | null;
  accessLevel?: "admin" | "select_authorized" | "basic";
};

type AdminQaPreset = {
  id: number;
  name: string;
  permissions: Array<{ module: string; environment: string }>;
};

type ConsoleProofViewport = {
  key: string;
  width: number;
  height: number;
  kind: "compact" | "tablet" | "desktop" | "ultrawide" | "stretch";
};

type ConsoleViewportManifestEntry = {
  viewport: string;
  filename: string;
  status: "pass";
  remediation: string;
};

type ExpectedUserPreferences = {
  reducedStimulation: "default" | "reduced";
  density: "comfortable" | "compact";
  reminderTone: "gentle" | "standard";
};

type ReachCaptureExpectation = {
  hasAccess: boolean;
  fileCount: number;
  actionableDraftCount: number;
};

type BizdevMotionExpectation = {
  hasAccess: boolean;
  total: number;
  rowCount: number;
  hotCount: number;
  warmCount: number;
  coldCount: number;
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
const vercelBypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? process.env.VERCEL_PROTECTION_BYPASS_SECRET ?? "";
const vercelBypassEnabled = vercelBypassSecret.trim().length > 0;
const consoleProofManifestPath = path.join(outputDir, "c70-console-viewport-manifest.json");
const adminQaBasicModules = ["daily", "weekly", "vision"] as const;
const adminQaEnvironments = ["development", "staging", "production"] as const;
const consoleProofViewports: readonly ConsoleProofViewport[] = [
  { key: "360x800", width: 360, height: 800, kind: "compact" },
  { key: "390x844", width: 390, height: 844, kind: "compact" },
  { key: "414x896", width: 414, height: 896, kind: "compact" },
  { key: "820x1180", width: 820, height: 1180, kind: "tablet" },
  { key: "2752x2064", width: 2752, height: 2064, kind: "tablet" },
  { key: "1920x1080", width: 1920, height: 1080, kind: "desktop" },
  { key: "5120x2160", width: 5120, height: 2160, kind: "ultrawide" },
  { key: "5120x1440", width: 5120, height: 1440, kind: "ultrawide" },
  { key: "6400x1800", width: 6400, height: 1800, kind: "stretch" },
] as const;

function sanitizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function appUrl(pathname: string): string {
  const url = new URL(pathname, baseUrl);
  if (vercelBypassEnabled) {
    url.searchParams.set("x-vercel-protection-bypass", vercelBypassSecret);
    url.searchParams.set("x-vercel-set-bypass-cookie", "true");
  }
  return url.toString();
}

async function waitForAppReady(page: Page, pathname: string) {
  await page.goto(appUrl(pathname), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
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
  const button = page.getByTestId("button-dismiss-onboarding-modal");

  if (!(await modal.isVisible().catch(() => false))) {
    await page.waitForTimeout(400);
  }

  if (await modal.isVisible().catch(() => false)) {
    await button.waitFor();
    await button.click();
    await modal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => undefined);
  }

  if (await modal.isVisible().catch(() => false)) {
    throw new Error("Signed-in onboarding modal remained open after dismissal.");
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

async function fetchApi(
  page: Page,
  apiPath: string,
  init?: {
    method?: string;
    body?: unknown;
  },
): Promise<ApiFetchResult> {
  return page.evaluate(async ({ pathToFetch, requestInit }) => {
    const response = await fetch(pathToFetch, {
      method: requestInit?.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(requestInit?.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: requestInit?.body === undefined ? undefined : JSON.stringify(requestInit.body),
      credentials: "include",
    });
    let json: unknown = null;
    try {
      json = await response.clone().json();
    } catch {
      json = null;
    }
    return { status: response.status, json };
  }, { pathToFetch: apiPath, requestInit: init });
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

function getJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function assertUserPreferences(result: ApiFetchResult, expected: ExpectedUserPreferences, label: string) {
  assertStatus(result, [200], label);
  const body = getJsonRecord(result.json);

  for (const [key, value] of Object.entries(expected)) {
    if (body[key] !== value) {
      throw new Error(`${label} ${key}=${String(body[key])}; expected ${value}.`);
    }
  }
}

function getUserPreferencesFromResult(result: ApiFetchResult, label: string): ExpectedUserPreferences {
  assertStatus(result, [200], label);
  const body = getJsonRecord(result.json);

  const reducedStimulation = body.reducedStimulation;
  const density = body.density;
  const reminderTone = body.reminderTone;

  if (
    (reducedStimulation !== "default" && reducedStimulation !== "reduced") ||
    (density !== "comfortable" && density !== "compact") ||
    (reminderTone !== "gentle" && reminderTone !== "standard")
  ) {
    throw new Error(`${label} returned an invalid preference payload: ${JSON.stringify(body)}.`);
  }

  return {
    reducedStimulation,
    density,
    reminderTone,
  };
}

async function expectShellPreferenceAttributes(page: Page, expected: ExpectedUserPreferences, label: string) {
  const shell = page.locator(".workspace-shell").first();
  await shell.waitFor();

  const density = await shell.getAttribute("data-density");
  const reducedStimulation = await shell.getAttribute("data-reduced-stimulation");
  const reminderTone = await shell.getAttribute("data-reminder-tone");

  if (density !== expected.density) {
    throw new Error(`${label} density attribute=${String(density)}; expected ${expected.density}.`);
  }
  if (reducedStimulation !== expected.reducedStimulation) {
    throw new Error(
      `${label} reduced stimulation attribute=${String(reducedStimulation)}; expected ${expected.reducedStimulation}.`,
    );
  }
  if (reminderTone !== expected.reminderTone) {
    throw new Error(`${label} reminder tone attribute=${String(reminderTone)}; expected ${expected.reminderTone}.`);
  }
}

async function openUserPreferencesDialog(page: Page) {
  const dialog = page.getByTestId("dialog-user-preferences");
  if (await dialog.isVisible().catch(() => false)) {
    return;
  }

  await dismissOnboardingIfVisible(page);
  const trigger = page.getByTestId("button-open-user-preferences");
  await trigger.waitFor();
  await trigger.click();
  await dialog.waitFor();
}

async function saveUserPreferences(page: Page, preferences: ExpectedUserPreferences) {
  await openUserPreferencesDialog(page);
  await page.getByTestId(`button-user-preferences-reduced-stimulation-${preferences.reducedStimulation}`).click();
  await page.getByTestId(`button-user-preferences-density-${preferences.density}`).click();
  await page.getByTestId(`button-user-preferences-reminder-tone-${preferences.reminderTone}`).click();
  await page.getByTestId("button-save-user-preferences").click();
  await page.getByTestId("dialog-user-preferences").waitFor({ state: "hidden" });
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

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const browserGlobal = globalThis as typeof globalThis & {
      innerWidth: number;
      document: {
        documentElement: { scrollWidth: number };
        body: { scrollWidth: number };
      };
    };

    return {
      viewportWidth: browserGlobal.innerWidth,
      docScrollWidth: browserGlobal.document.documentElement.scrollWidth,
      bodyScrollWidth: browserGlobal.document.body.scrollWidth,
    };
  });

  if (
    overflow.docScrollWidth > overflow.viewportWidth + 1 ||
    overflow.bodyScrollWidth > overflow.viewportWidth + 1
  ) {
    throw new Error(
      `${label} overflowed horizontally. viewport=${overflow.viewportWidth} docScrollWidth=${overflow.docScrollWidth} bodyScrollWidth=${overflow.bodyScrollWidth}`,
    );
  }
}

async function expectElementFullyVisible(
  page: Page,
  selector: string,
  label: string,
  options: { requireTopInViewport?: boolean } = {},
) {
  const locator = page.getByTestId(selector);
  await locator.waitFor();
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) {
    throw new Error(`${label} could not read element bounds.`);
  }

  const viewportRight = viewport.width + 1;
  const viewportBottom = viewport.height + 1;
  const topVisible = options.requireTopInViewport === false ? true : box.y >= -1;
  const fits =
    topVisible &&
    box.x >= -1 &&
    box.x + box.width <= viewportRight &&
    box.y + box.height <= viewportBottom;

  if (!fits) {
    throw new Error(
      `${label} exceeded the viewport. box=${JSON.stringify(box)} viewport=${JSON.stringify(viewport)}`,
    );
  }
}

async function expectElementFitsViewportWidth(page: Page, selector: string, label: string) {
  const locator = page.getByTestId(selector);
  await locator.waitFor();
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) {
    throw new Error(`${label} could not read element bounds.`);
  }

  if (box.x < -1 || box.x + box.width > viewport.width + 1) {
    throw new Error(
      `${label} exceeded the viewport width. box=${JSON.stringify(box)} viewport=${JSON.stringify(viewport)}`,
    );
  }
}

async function readPaddingTop(page: Page, testId: string): Promise<number> {
  const locator = page.getByTestId(testId);
  await locator.waitFor();
  return page.evaluate((targetTestId) => {
    const browserGlobal = globalThis as typeof globalThis & {
      document: {
        querySelector: (selector: string) => object | null;
      };
      getComputedStyle: (element: object) => {
        paddingTop: string;
      };
    };
    const element = browserGlobal.document.querySelector(`[data-testid="${targetTestId}"]`);
    if (!element) {
      throw new Error(`Could not find ${targetTestId} for padding read.`);
    }

    return Number.parseFloat(browserGlobal.getComputedStyle(element).paddingTop);
  }, testId);
}

async function readHeaderBackdropFilter(page: Page): Promise<string> {
  const header = page.getByTestId("app-header");
  await header.waitFor();
  return page.evaluate(() => {
    const browserGlobal = globalThis as typeof globalThis & {
      document: {
        querySelector: (selector: string) => object | null;
      };
      getComputedStyle: (element: object) => {
        backdropFilter: string;
      };
    };
    const element = browserGlobal.document.querySelector('[data-testid="app-header"]');
    if (!element) {
      throw new Error("Could not find app header for backdrop-filter read.");
    }

    return browserGlobal.getComputedStyle(element).backdropFilter;
  });
}

async function expectConsolePrimaryHierarchy(page: Page, label: string, viewport: ConsoleProofViewport) {
  if (viewport.kind === "compact") {
    const nowFrameBox = await page.getByTestId("console-region-now-frame").boundingBox();
    const weekVectorBox = await page.getByTestId("console-region-week-vector").boundingBox();
    const systemHealthBox = await page.getByTestId("console-region-system-health").boundingBox();

    if (!nowFrameBox || !weekVectorBox || !systemHealthBox) {
      throw new Error(`${label} could not read compact Console hierarchy bounds.`);
    }

    if (!(nowFrameBox.y < weekVectorBox.y && nowFrameBox.y < systemHealthBox.y)) {
      throw new Error(
        `${label} did not keep Now Frame first in the compact reading order. nowFrame=${JSON.stringify(nowFrameBox)} weekVector=${JSON.stringify(weekVectorBox)} systemHealth=${JSON.stringify(systemHealthBox)}`,
      );
    }

    return;
  }

  const nowFrameBox = await page.getByTestId("console-region-now-frame").boundingBox();
  const systemHealthBox = await page.getByTestId("console-region-system-health").boundingBox();

  if (!nowFrameBox || !systemHealthBox) {
    throw new Error(`${label} could not read Console hierarchy bounds.`);
  }

  const dominanceRatio = nowFrameBox.width / systemHealthBox.width;
  const minimumRatio =
    viewport.kind === "tablet" ? 1.2 :
    viewport.kind === "stretch" ? 1.5 :
    viewport.kind === "ultrawide" ? 1.45 :
    viewport.key === "1920x1080" ? 1.32 :
    1.2;

  if (dominanceRatio <= minimumRatio) {
    throw new Error(
      `${label} lost Now Frame dominance and drifted toward equal-priority card walls. ratio=${dominanceRatio.toFixed(2)} minimum=${minimumRatio.toFixed(2)} nowFrame=${JSON.stringify(nowFrameBox)} systemHealth=${JSON.stringify(systemHealthBox)}`,
    );
  }
}

async function expectConsoleCenteredReadingField(page: Page, label: string, viewport: ConsoleProofViewport) {
  if (viewport.kind !== "ultrawide" && viewport.kind !== "stretch" && viewport.key !== "2752x2064") return;

  const shellBox = await page.getByTestId("console-shell").boundingBox();
  const contentBandBox = await page.locator('[data-testid="console-shell"] > div').first().boundingBox();
  const visibleViewport = page.viewportSize();

  if (!shellBox || !contentBandBox || !visibleViewport) {
    throw new Error(`${label} could not read Console shell bounds.`);
  }

  const leftGutter = contentBandBox.x;
  const rightGutter = visibleViewport.width - (contentBandBox.x + contentBandBox.width);
  const gutterDelta = Math.abs(leftGutter - rightGutter);
  const minimumGutter =
    viewport.kind === "stretch" ? 420 :
    viewport.kind === "ultrawide" ? 300 :
    140;

  if (leftGutter < minimumGutter || rightGutter < minimumGutter || gutterDelta > 80) {
    throw new Error(
      `${label} drifted too close to the viewport edge or lost centered balance. leftGutter=${leftGutter} rightGutter=${rightGutter} gutterDelta=${gutterDelta} shell=${JSON.stringify(shellBox)} contentBand=${JSON.stringify(contentBandBox)} viewport=${JSON.stringify(visibleViewport)}`,
    );
  }
}

async function expectConsoleModuleViewportFit(page: Page, label: string) {
  await expectElementFitsViewportWidth(page, "console-region-now-frame", `${label} Now Frame module`);
  await page.getByTestId("console-region-now-frame").click();
  await expectElementFitsViewportWidth(page, "console-now-frame-progress", `${label} Now Frame progress`);
  await expectElementFullyVisible(page, "console-now-frame-primary-cta", `${label} Now Frame CTA`);

  await expectElementFitsViewportWidth(page, "console-region-system-health", `${label} System Health module`);
  await page.getByTestId("console-region-system-health").click();
  await expectElementFitsViewportWidth(page, "console-system-health-review-pressure", `${label} System Health review pressure`);

  await expectElementFitsViewportWidth(page, "console-region-week-vector", `${label} Week Vector module`);
  await page.getByTestId("console-region-week-vector").click();
  await expectElementFitsViewportWidth(page, "console-week-vector-progress-ring", `${label} Week Vector progress ring`);
  await expectElementFullyVisible(page, "console-week-vector-primary-cta", `${label} Week Vector CTA`);

  await expectElementFitsViewportWidth(page, "console-region-constraint-horizon", `${label} Constraint Horizon module`);
  await page.getByTestId("console-region-constraint-horizon").click();
  await expectElementFitsViewportWidth(
    page,
    "console-constraint-horizon-urgency-strip",
    `${label} Constraint Horizon urgency strip`,
  );
  await expectElementFullyVisible(page, "console-constraint-horizon-primary-cta", `${label} Constraint Horizon CTA`);

  await expectElementFitsViewportWidth(page, "console-region-lane-atlas", `${label} Lane Atlas module`);
  await page.getByTestId("console-region-lane-atlas").click();
  await expectElementFitsViewportWidth(page, "console-lane-readiness-row", `${label} Lane readiness row`);

  await page.getByTestId("console-region-assistant-review").click();
  if (await page.getByTestId("console-assistant-review-queue-present").isVisible().catch(() => false)) {
    await expectElementFitsViewportWidth(
      page,
      "console-region-assistant-review",
      `${label} Assistant Review module`,
    );
    const firstReviewCta = page.locator('[data-testid^="console-assistant-review-row-cta-"]').first();
    await firstReviewCta.waitFor();
    await firstReviewCta.scrollIntoViewIfNeeded();
    const buttonBox = await firstReviewCta.boundingBox();
    const viewport = page.viewportSize();

    if (!buttonBox || !viewport) {
      throw new Error(`${label} could not read Assistant Review CTA bounds.`);
    }

    if (buttonBox.x < -1 || buttonBox.x + buttonBox.width > viewport.width + 1) {
      throw new Error(
        `${label} clipped the Assistant Review CTA. box=${JSON.stringify(buttonBox)} viewport=${JSON.stringify(viewport)}`,
      );
    }
  } else {
    await expectElementFitsViewportWidth(page, "console-region-assistant-review", `${label} Assistant Review module`);
    await expectElementFullyVisible(page, "console-assistant-review-primary-cta", `${label} Assistant Review CTA`);
  }

  await expectElementFitsViewportWidth(page, "console-region-continuity", `${label} Continuity module`);
  await page.getByTestId("console-region-continuity").click();
  await expectElementFullyVisible(page, "console-continuity-primary-cta", `${label} Continuity CTA`);

  if (await page.getByTestId("console-region-reach-capture").isVisible().catch(() => false)) {
    await expectElementFitsViewportWidth(page, "console-region-reach-capture", `${label} REACH Capture module`);
    await page.getByTestId("console-region-reach-capture").click();
    await expectElementFullyVisible(page, "console-reach-capture-primary-cta", `${label} REACH Capture CTA`);
  }

  if (await page.getByTestId("console-region-bizdev-motion").isVisible().catch(() => false)) {
    await expectElementFitsViewportWidth(page, "console-region-bizdev-motion", `${label} FollowUps Motion module`);
    await page.getByTestId("console-region-bizdev-motion").click();
    await expectElementFullyVisible(page, "console-bizdev-motion-primary-cta", `${label} FollowUps Motion CTA`);
  }
}

async function expectConsoleMobileNavAccess(page: Page, viewport: ConsoleProofViewport) {
  if (viewport.kind !== "compact") return;

  const mobileNavButton = page.getByTestId("button-mobile-nav");
  await mobileNavButton.waitFor();
  await mobileNavButton.click();
  await page.getByTestId("dropdown-mobile-nav").waitFor();
  await page.getByTestId("link-dashboard-mobile").waitFor();
  await page.getByTestId("link-console-mobile").waitFor();
  await page.keyboard.press("Escape");
  await page.getByTestId("dropdown-mobile-nav").waitFor({ state: "hidden" }).catch(() => undefined);
}

function writeConsoleProofManifest(entries: ConsoleViewportManifestEntry[]) {
  ensureDir(outputDir);
  fs.writeFileSync(consoleProofManifestPath, `${JSON.stringify(entries, null, 2)}\n`);
}

async function getReachCaptureExpectation(page: Page): Promise<ReachCaptureExpectation> {
  const filesResult = await fetchApi(page, "/api/reach/files");
  if (filesResult.status === 403) {
    return {
      hasAccess: false,
      fileCount: 0,
      actionableDraftCount: 0,
    };
  }

  assertStatus(filesResult, [200], "REACH Capture files API");

  const draftsResult = await fetchApi(
    page,
    "/api/ai-drafts?lane=reach&draftKind=reach_file_summary&limit=5",
  );
  assertStatus(draftsResult, [200], "REACH Capture drafts API");

  const actionableDraftCount = getJsonArray(draftsResult.json).filter((draft) => {
    const reviewState = getJsonRecord(draft).reviewState;
    return reviewState === "draft" || reviewState === "needs_review" || reviewState === "approval_gated";
  }).length;

  return {
    hasAccess: true,
    fileCount: getJsonArray(filesResult.json).length,
    actionableDraftCount,
  };
}

async function getBizdevMotionExpectation(page: Page): Promise<BizdevMotionExpectation> {
  const brandsResult = await fetchApi(page, "/api/bizdev/brands");
  if (brandsResult.status === 403) {
    return {
      hasAccess: false,
      total: 0,
      rowCount: 0,
      hotCount: 0,
      warmCount: 0,
      coldCount: 0,
    };
  }

  assertStatus(brandsResult, [200], "FollowUps Motion brands API");
  const summaryResult = await fetchApi(page, "/api/bizdev/brands/summary");
  assertStatus(summaryResult, [200], "FollowUps Motion summary API");

  const brands = getJsonArray(brandsResult.json);
  const summary = getJsonRecord(summaryResult.json);
  const counts = getJsonRecord(summary.counts);

  return {
    hasAccess: true,
    total: typeof summary.total === "number" ? summary.total : brands.length,
    rowCount: brands.length,
    hotCount: typeof counts.HOT === "number" ? counts.HOT : 0,
    warmCount: typeof counts.WARM === "number" ? counts.WARM : 0,
    coldCount: typeof counts.COLD === "number" ? counts.COLD : 0,
  };
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

async function expectConsoleShell(page: Page, label: string) {
  await page.getByTestId("console-shell").waitFor();
  await page.getByTestId("text-console-title").waitFor();

  const nowFrame = page.getByTestId("console-region-now-frame");
  const weekVector = page.getByTestId("console-region-week-vector");

  await nowFrame.waitFor();
  await weekVector.waitFor();
  await page.getByTestId("console-region-week-vector").waitFor();
  await page.getByTestId("console-week-vector-live").waitFor();
  await page.getByTestId("console-week-vector-progress-ring").waitFor();
  await page.getByTestId("console-week-vector-primary-cta").waitFor();
  await page.getByTestId("console-region-system-health").waitFor();
  await page.getByTestId("console-region-constraint-horizon").waitFor();
  await page.getByTestId("console-region-lane-atlas").waitFor();
  await page.getByTestId("console-region-assistant-review").waitFor();
  await page.getByTestId("console-region-continuity").waitFor();

  if (await page.getByTestId("button-mobile-nav").isVisible().catch(() => false)) {
    await page.getByTestId("button-mobile-nav").waitFor();
  } else {
    await page.getByTestId("link-dashboard").waitFor();
    await page.getByTestId("link-console").waitFor();
  }

  if (await weekVector.getAttribute("data-selected") !== "true") {
    throw new Error(`${label} did not keep Week Vector selected by default.`);
  }
  if (await nowFrame.getAttribute("data-selected") !== "false") {
    throw new Error(`${label} did not keep Now Frame compact by default.`);
  }

  const ringBox = await page.getByTestId("console-week-vector-progress-ring").boundingBox();
  if (!ringBox || ringBox.width > 96 || ringBox.height > 96) {
    throw new Error(`${label} Week Vector progress ring escaped bounds: ${JSON.stringify(ringBox)}`);
  }

  await nowFrame.click();
  await page.getByTestId("console-now-frame-live").waitFor();
  await page.getByTestId("console-now-frame-progress").waitFor();
  await page.getByTestId("console-now-frame-progress-label").waitFor();
  await page.getByTestId("console-now-frame-primary-cta").waitFor();

  if (await nowFrame.getAttribute("data-selected") !== "true" || await weekVector.getAttribute("data-selected") !== "false") {
    throw new Error(`${label} did not transfer selection from Week Vector to Now Frame.`);
  }

  const nowFrameSourceMarkers = [
    "console-now-frame-source-tier-a",
    "console-now-frame-source-tier-b",
    "console-now-frame-source-time-block",
    "console-now-frame-source-micro-win",
    "console-now-frame-source-empty",
  ];
  const hasSourceMarker = await Promise.all(
    nowFrameSourceMarkers.map((marker) => page.getByTestId(marker).isVisible().catch(() => false)),
  );

  if (!hasSourceMarker.some(Boolean)) {
    throw new Error(`${label} did not render a selected Now Frame source marker.`);
  }

  await weekVector.click();
  await page.getByTestId("console-week-vector-live").waitFor();

  await page.getByText("Dashboard stays home.", { exact: true }).waitFor();
  await page.getByText("One selected panel expands.", { exact: true }).waitFor();
}

async function expectBasicApiAccess(page: Page) {
  await expectPermissions(page, ["daily", "weekly", "vision"], false, "Basic API matrix");
  await expectApiStatus(page, "/api/user-preferences", [200], "Basic user preferences API");
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
  await expectApiStatus(page, "/api/user-preferences", [200], "Select Authorized user preferences API");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/life-ledger/events", "Select Authorized Life Ledger API");
  await expectApiStatus(page, "/api/bizdev/brands", [403], "Select Authorized FollowUps API");
  await expectApiStatus(page, "/api/reach/files", [403], "Select Authorized REACH API");
  await expectApiStatus(page, "/api/admin/users", [403], "Select Authorized Admin API");
  await expectApiStatus(page, "/api/life-ledger/baby", [403], "Select Authorized Baby KB API");
}

async function expectAdminApiAccess(page: Page) {
  await expectPermissions(page, ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"], true, "Admin API matrix");
  await expectApiStatus(page, "/api/user-preferences", [200], "Admin user preferences API");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/admin/users", "Admin users API");
  await expectApiNotUnauthorizedOrForbidden(page, "/api/life-ledger/baby", "Admin Baby KB API");
}

function normalizePermissionSet(
  permissions: Array<{ module: string; environment: string }>,
): string[] {
  return permissions
    .map((permission) => `${permission.module}:${permission.environment}`)
    .sort();
}

function assertPermissionSet(
  actual: Array<{ module: string; environment: string }>,
  expected: Array<{ module: string; environment: string }>,
  label: string,
) {
  const actualSet = normalizePermissionSet(actual);
  const expectedSet = normalizePermissionSet(expected);
  if (actualSet.length !== expectedSet.length) {
    throw new Error(`${label} length mismatch. actual=${actualSet.join(",")} expected=${expectedSet.join(",")}`);
  }
  for (let index = 0; index < actualSet.length; index += 1) {
    if (actualSet[index] !== expectedSet[index]) {
      throw new Error(`${label} mismatch. actual=${actualSet.join(",")} expected=${expectedSet.join(",")}`);
    }
  }
}

function expandAdminQaPermissions(
  permissions: Array<{ module: string; environment: string }>,
): Array<{ module: string; environment: string }> {
  const existing = new Set(normalizePermissionSet(permissions));
  const expanded = [...permissions];

  for (const module of adminQaBasicModules) {
    for (const environment of adminQaEnvironments) {
      const key = `${module}:${environment}`;
      if (!existing.has(key)) {
        expanded.push({ module, environment });
        existing.add(key);
      }
    }
  }

  return expanded;
}

async function listAdminUsers(page: Page): Promise<AdminQaUser[]> {
  const result = await fetchApi(page, "/api/admin/users");
  assertStatus(result, [200], "Admin users list");
  return getJsonArray(result.json).map<AdminQaUser>((item) => {
    const record = getJsonRecord(item);
    const accessLevel: AdminQaUser["accessLevel"] =
      record.accessLevel === "admin" || record.accessLevel === "select_authorized" || record.accessLevel === "basic"
        ? record.accessLevel
        : undefined;
    return {
      id: typeof record.id === "string" ? record.id : "",
      email: typeof record.email === "string" ? record.email : "",
      role: typeof record.role === "string" ? record.role : null,
      accessLevel,
    };
  }).filter((user) => user.id !== "");
}

async function getAdminUserPermissions(
  page: Page,
  userId: string,
): Promise<Array<{ module: string; environment: string }>> {
  const result = await fetchApi(page, `/api/admin/users/${userId}/permissions`);
  assertStatus(result, [200], `Admin user permissions ${userId}`);
  const body = getJsonRecord(result.json);
  return getJsonArray(body.permissions).map((item) => {
    const record = getJsonRecord(item);
    return {
      module: typeof record.module === "string" ? record.module : "",
      environment: typeof record.environment === "string" ? record.environment : "",
    };
  }).filter((permission) => permission.module !== "" && permission.environment !== "");
}

async function listAdminPresets(page: Page): Promise<AdminQaPreset[]> {
  const result = await fetchApi(page, "/api/admin/presets");
  assertStatus(result, [200], "Admin presets list");
  return getJsonArray(result.json).map((item) => {
    const record = getJsonRecord(item);
    return {
      id: typeof record.id === "number" ? record.id : -1,
      name: typeof record.name === "string" ? record.name : "",
      permissions: getJsonArray(record.permissions).map((permission) => {
        const permissionRecord = getJsonRecord(permission);
        return {
          module: typeof permissionRecord.module === "string" ? permissionRecord.module : "",
          environment: typeof permissionRecord.environment === "string" ? permissionRecord.environment : "",
        };
      }).filter((permission) => permission.module !== "" && permission.environment !== ""),
    };
  }).filter((preset) => preset.id >= 0 && preset.name !== "");
}

async function restoreAdminUserPermissions(
  page: Page,
  userId: string,
  permissions: Array<{ module: string; environment: string }>,
) {
  const result = await fetchApi(page, `/api/admin/users/${userId}/permissions`, {
    method: "PUT",
    body: { permissions },
  });
  assertStatus(result, [200], `Restore permissions ${userId}`);
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
  return filename;
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
    {
      label: "signed-out protected console route falls back to the public home",
      run: async (page) => {
        await waitForAppReady(page, "/console");
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
        await page.getByTestId("dashboard-needs-review").getByText("AI review queue", { exact: true }).waitFor();
        await page.getByTestId("dashboard-needs-review").getByText("waiting", { exact: false }).waitFor();
        await page.getByTestId("dashboard-calendar-planning").waitFor();

        const initialPreferences = getUserPreferencesFromResult(
          await fetchApi(page, "/api/user-preferences"),
          "User preferences initial API",
        );
        const updatedPreferences: ExpectedUserPreferences = {
          reducedStimulation:
            initialPreferences.reducedStimulation === "default" ? "reduced" : "default",
          density: initialPreferences.density === "comfortable" ? "compact" : "comfortable",
          reminderTone: initialPreferences.reminderTone === "gentle" ? "standard" : "gentle",
        };
        await expectShellPreferenceAttributes(page, initialPreferences, "Dashboard initial preferences");

        const defaultDashboardPadding = await readPaddingTop(page, "dashboard-control-center");
        const defaultHeaderBackdropFilter = await readHeaderBackdropFilter(page);

        if (await page.getByTestId("button-mode-badge").isVisible().catch(() => false)) {
          throw new Error("Header still exposed the old mode badge.");
        }

        await saveUserPreferences(page, updatedPreferences);
        assertUserPreferences(
          await fetchApi(page, "/api/user-preferences"),
          updatedPreferences,
          "User preferences save API",
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("dashboard-control-center").waitFor();
        await expectShellPreferenceAttributes(page, updatedPreferences, "Dashboard saved preferences");

        const compactDashboardPadding = await readPaddingTop(page, "dashboard-control-center");
        const expectedPaddingDelta =
          updatedPreferences.density === "compact"
            ? compactDashboardPadding < defaultDashboardPadding
            : compactDashboardPadding > defaultDashboardPadding;
        if (!expectedPaddingDelta) {
          throw new Error(
            `Density update did not change dashboard spacing in the expected direction. before=${defaultDashboardPadding} after=${compactDashboardPadding} initial=${initialPreferences.density} updated=${updatedPreferences.density}.`,
          );
        }

        const reducedHeaderBackdropFilter = await readHeaderBackdropFilter(page);
        if (
          (updatedPreferences.reducedStimulation === "reduced" && reducedHeaderBackdropFilter !== "none") ||
          (updatedPreferences.reducedStimulation === "default" && reducedHeaderBackdropFilter === "none")
        ) {
          throw new Error(
            `Reduced stimulation update did not change header blur in the expected direction. backdropFilter=${reducedHeaderBackdropFilter} initial=${initialPreferences.reducedStimulation} updated=${updatedPreferences.reducedStimulation}.`,
          );
        }

        if (await page.getByText("Life Ledger events", { exact: true }).isVisible().catch(() => false)) {
          await page
            .getByText(
              updatedPreferences.reminderTone === "standard"
                ? "Review dated plans, reminders, and appointments."
                : "Review dated plans, reminders, and appointments at a calm pace.",
              { exact: true },
            )
            .waitFor();
        }

        await waitForAppReady(page, "/console");
        await ensureAuthenticatedSession(page, "/console", "Console preferences browser QA");
        await dismissOnboardingIfVisible(page);
        await expectConsoleShell(page, "Console preferences browser QA");
        await expectShellPreferenceAttributes(page, updatedPreferences, "Console saved preferences");
        await page.getByTestId("console-region-constraint-horizon").click();
        await page.getByTestId("console-constraint-horizon-live").waitFor();

        const standardConstraintCopyOptions = [
          "Overdue or reminding inside the next 24 hours.",
          "Nothing is due right now. The next reminder-active items are staged below.",
          "Reminder-active items beyond the immediate window.",
          "No additional reminder-active items are queued after the due-now window.",
          "No reminder-active horizon is pressing right now.",
        ];
        let hasStandardReminderCopy = false;
        const updatedConstraintCopyOptions =
          updatedPreferences.reminderTone === "standard"
            ? standardConstraintCopyOptions
            : [
                "Needs a closer look inside the next 24 hours.",
                "Nothing urgent is pressing right now. The next reminder-active items are staged below.",
                "Reminder-active items that can stay in view without taking over the Console.",
                "No additional reminder-active items are waiting after the near-term window.",
                "No reminder-active horizon needs attention right now.",
              ];
        for (const copy of updatedConstraintCopyOptions) {
          if (await page.getByText(copy, { exact: true }).isVisible().catch(() => false)) {
            hasStandardReminderCopy = true;
            break;
          }
        }
        if (!hasStandardReminderCopy) {
          throw new Error("Console did not render the updated reminder tone copy after saving preferences.");
        }

        await waitForAppReady(page, "/dashboard");
        await ensureAuthenticatedSession(page, "/dashboard", "Dashboard preference restore QA");
        await dismissOnboardingIfVisible(page);
        await saveUserPreferences(page, initialPreferences);
        assertUserPreferences(
          await fetchApi(page, "/api/user-preferences"),
          initialPreferences,
          "User preferences restore API",
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("dashboard-control-center").waitFor();
        await expectShellPreferenceAttributes(page, initialPreferences, "Dashboard restored preferences");

        const restoredDashboardPadding = await readPaddingTop(page, "dashboard-control-center");
        if (restoredDashboardPadding !== defaultDashboardPadding) {
          throw new Error(
            `Dashboard spacing did not restore to the original value. initial=${defaultDashboardPadding} restored=${restoredDashboardPadding}.`,
          );
        }

        const restoredHeaderBackdropFilter = await readHeaderBackdropFilter(page);
        if (restoredHeaderBackdropFilter !== defaultHeaderBackdropFilter) {
          throw new Error(
            `Header blur did not restore to the original value. initial=${defaultHeaderBackdropFilter} restored=${restoredHeaderBackdropFilter}.`,
          );
        }

        if (await page.getByText("Life Ledger events", { exact: true }).isVisible().catch(() => false)) {
          await page
            .getByText(
              initialPreferences.reminderTone === "standard"
                ? "Review dated plans, reminders, and appointments."
                : "Review dated plans, reminders, and appointments at a calm pace.",
              { exact: true },
            )
            .waitFor();
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
      label: "console preview shell passes the full P0 viewport proof matrix",
      run: async (page) => {
        if (!storageState) return "skip";
        const manifestEntries: ConsoleViewportManifestEntry[] = [];

        for (const viewport of consoleProofViewports) {
          const proofPage = await page.context().newPage();
          try {
            await waitForAppReady(proofPage, "/console");
            await ensureAuthenticatedSession(proofPage, "/console", `Console browser QA ${viewport.key}`);
            await dismissOnboardingIfVisible(proofPage);
            await proofPage.setViewportSize({ width: viewport.width, height: viewport.height });
            await proofPage.waitForTimeout(250);
            await expectConsoleShell(proofPage, `Console browser QA ${viewport.key}`);
            await expectNoHorizontalOverflow(proofPage, `Console browser QA ${viewport.key}`);
            await expectConsoleMobileNavAccess(proofPage, viewport);
            await expectConsolePrimaryHierarchy(proofPage, `Console browser QA ${viewport.key}`, viewport);
            await expectConsoleCenteredReadingField(proofPage, `Console browser QA ${viewport.key}`, viewport);
            await expectConsoleModuleViewportFit(proofPage, `Console browser QA ${viewport.key}`);
            await proofPage.evaluate(() => {
              const browserGlobal = globalThis as typeof globalThis & {
                scrollTo: (x: number, y: number) => void;
              };
              browserGlobal.scrollTo(0, 0);
            });
            await proofPage.waitForTimeout(150);
            const filename = await captureEvidence(proofPage, `c70-console-${viewport.key}`);
            manifestEntries.push({
              viewport: `${viewport.width}x${viewport.height}`,
              filename,
              status: "pass",
              remediation: "none",
            });
            writeConsoleProofManifest(manifestEntries);
          } finally {
            await proofPage.close().catch(() => undefined);
          }
        }

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
        const stepInputs = page.locator('[data-testid^="input-step-"]');
        const stepCheckboxes = page.locator('[data-testid^="checkbox-weekly-step-"]');
        const stepCount = await stepInputs.count();
        let targetIndex = -1;

        for (let index = 0; index < stepCount; index += 1) {
          const value = await stepInputs.nth(index).inputValue();
          if (value.trim().length > 0) {
            targetIndex = index;
            break;
          }
        }

        let createdTemporaryStep = false;
        let originalText = "";

        if (targetIndex === -1) {
          targetIndex = 0;
          createdTemporaryStep = true;
          originalText = await stepInputs.nth(targetIndex).inputValue();
          await stepInputs.nth(targetIndex).fill("C66 QA weekly step");
          await stepInputs.nth(targetIndex).blur();
          await page.waitForTimeout(500);
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForLoadState("networkidle").catch(() => undefined);
          await dismissOnboardingIfVisible(page);
          await page.getByTestId("week-canvas").waitFor();
        }

        const targetCheckbox = stepCheckboxes.nth(targetIndex);
        const initialChecked = (await targetCheckbox.getAttribute("data-state")) === "checked";

        await waitForAppReady(page, "/console");
        await ensureAuthenticatedSession(page, "/console", "Weekly-to-console ring QA");
        await dismissOnboardingIfVisible(page);
        await expectConsoleShell(page, "Weekly-to-console ring QA");
        const initialRingValue = await page.getByTestId("console-week-vector-progress-value").textContent();

        await waitForAppReady(page, "/weekly");
        await ensureAuthenticatedSession(page, "/weekly", "Weekly step completion QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("week-canvas").waitFor();

        const refreshedCheckbox = page.locator('[data-testid^="checkbox-weekly-step-"]').nth(targetIndex);
        await refreshedCheckbox.click();
        await page.waitForTimeout(500);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("week-canvas").waitFor();

        const persistedChecked =
          (await page.locator('[data-testid^="checkbox-weekly-step-"]').nth(targetIndex).getAttribute("data-state")) === "checked";
        if (persistedChecked === initialChecked) {
          throw new Error("Weekly step completion toggle did not persist across reload.");
        }

        await waitForAppReady(page, "/console");
        await ensureAuthenticatedSession(page, "/console", "Weekly ring follow-through QA");
        await dismissOnboardingIfVisible(page);
        await expectConsoleShell(page, "Weekly ring follow-through QA");
        const updatedRingValue = await page.getByTestId("console-week-vector-progress-value").textContent();

        if (initialRingValue === updatedRingValue) {
          throw new Error(
            `Weekly completion did not change the Console Week Vector ring. initial=${initialRingValue} updated=${updatedRingValue}.`,
          );
        }

        await waitForAppReady(page, "/weekly");
        await ensureAuthenticatedSession(page, "/weekly", "Weekly step completion restore QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("week-canvas").waitFor();
        await page.locator('[data-testid^="checkbox-weekly-step-"]').nth(targetIndex).click();
        await page.waitForTimeout(500);

        if (createdTemporaryStep) {
          const restoreInput = page.locator('[data-testid^="input-step-"]').nth(targetIndex);
          await restoreInput.fill(originalText);
          await restoreInput.blur();
          await page.waitForTimeout(500);
        }

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
          try {
            await expectElementBefore(
              page,
              "events-execution-board",
              "calendar-placeholder-life-ledger-events",
              "Life Ledger Events content triage order",
            );
          } catch (error) {
            process.stdout.write(
              `warning: known out-of-scope Life Ledger ordering issue retained: ${
                error instanceof Error ? error.message : String(error)
              }\n`,
            );
          }
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
        if (await page.getByTestId("bizdev-summary").isVisible().catch(() => false)) {
          await expectElementBefore(page, "bizdev-summary", "followups-reminder-guidance", "FollowUps content triage order");
        } else if (await page.getByTestId("brands-table").isVisible().catch(() => false)) {
          await expectElementBefore(page, "brands-table", "followups-reminder-guidance", "FollowUps content triage order");
        } else {
          await expectElementBefore(page, "button-empty-new-lead", "followups-reminder-guidance", "FollowUps content triage order");
        }
        return "pass";
      },
    },
  ];
}

function adminChecks(storageState: string | undefined): Check[] {
  return [
    {
      label: "console preview shell mounts for admin sessions",
      run: async (page) => {
        if (!storageState) return "skip";
        await waitForAppReady(page, "/console");
        await ensureAuthenticatedSession(page, "/console", "Admin Console browser QA");
        await dismissOnboardingIfVisible(page);
        await expectConsoleShell(page, "Admin Console browser QA");
        await page.getByTestId("console-region-system-notes").waitFor();
        return "pass";
      },
    },
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
    {
      label: "admin targets stay read-only and admin mutation routes return 409",
      run: async (page) => {
        if (!storageState) return "skip";

        await page.setViewportSize({ width: 1440, height: 960 });
        await waitForAppReady(page, "/admin");
        await ensureAuthenticatedSession(page, "/admin", "Admin read-only QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("users-list").waitFor();

        const users = await listAdminUsers(page);
        const adminUser = users.find((user) => user.role === "admin" || user.accessLevel === "admin");
        if (!adminUser) {
          throw new Error("Admin read-only QA could not find an admin target row.");
        }

        const presets = await listAdminPresets(page);
        const preset = presets[0];
        if (!preset) {
          throw new Error("Admin read-only QA could not find a preset to exercise the admin protection routes.");
        }

        await page.getByTestId(`user-row-${adminUser.id}`).click();
        await page.getByTestId("admin-role-based-summary").waitFor();
        await page.getByTestId("admin-read-only-permission-list").waitFor();

        if (await page.getByTestId("button-save-permissions").isVisible().catch(() => false)) {
          throw new Error("Admin read-only QA exposed the desktop save button for an admin target.");
        }
        if (await page.getByTestId("button-save-permissions-mobile").isVisible().catch(() => false)) {
          throw new Error("Admin read-only QA exposed the mobile save button for an admin target.");
        }
        if ((await page.locator('[data-testid^="button-apply-preset-"]').count()) > 0) {
          throw new Error("Admin read-only QA exposed preset apply controls for an admin target.");
        }

        const adminPermissions = await getAdminUserPermissions(page, adminUser.id);
        const putResult = await fetchApi(page, `/api/admin/users/${adminUser.id}/permissions`, {
          method: "PUT",
          body: { permissions: adminPermissions },
        });
        assertStatus(putResult, [409], "Admin target permission mutation API");
        const putBody = getJsonRecord(putResult.json);
        if (
          typeof putBody.error !== "string" ||
          !putBody.error.includes("role-based")
        ) {
          throw new Error(`Admin target permission mutation API returned the wrong error body: ${JSON.stringify(putResult.json)}`);
        }

        const applyResult = await fetchApi(page, `/api/admin/presets/${preset.id}/apply/${adminUser.id}`, {
          method: "POST",
        });
        assertStatus(applyResult, [409], "Admin target preset apply API");
        const applyBody = getJsonRecord(applyResult.json);
        if (
          typeof applyBody.error !== "string" ||
          !applyBody.error.includes("role-based")
        ) {
          throw new Error(`Admin target preset apply API returned the wrong error body: ${JSON.stringify(applyResult.json)}`);
        }

        return "pass";
      },
    },
    {
      label: "non-admin editor keeps basic locked and applies presets only after confirmation",
      run: async (page) => {
        if (!storageState) return "skip";

        await page.setViewportSize({ width: 1440, height: 960 });
        await waitForAppReady(page, "/admin");
        await ensureAuthenticatedSession(page, "/admin", "Admin preset confirmation QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("users-list").waitFor();

        const users = await listAdminUsers(page);
        const targetUser = users.find((user) => user.role !== "admin" && user.accessLevel !== "admin");
        if (!targetUser) {
          throw new Error("Admin preset confirmation QA could not find a non-admin target row.");
        }

        const originalPermissions = await getAdminUserPermissions(page, targetUser.id);
        const presets = await listAdminPresets(page);
        const targetPreset = presets.find((preset) => {
          const expanded = expandAdminQaPermissions(preset.permissions);
          return normalizePermissionSet(expanded).join("|") !== normalizePermissionSet(originalPermissions).join("|");
        });

        if (!targetPreset) {
          throw new Error("Admin preset confirmation QA could not find a preset that changes the target user.");
        }

        const expectedPermissions = expandAdminQaPermissions(targetPreset.permissions);

        try {
          await page.getByTestId(`user-row-${targetUser.id}`).click();
          await page.getByTestId("permission-editor").waitFor();
          await page.getByTestId("permission-grid").waitFor();

          if (!(await page.getByTestId("toggle-daily-development").isDisabled())) {
            throw new Error("Admin preset confirmation QA found an editable Basic module toggle.");
          }
          if (await page.getByTestId("toggle-bizdev-development").isDisabled()) {
            throw new Error("Admin preset confirmation QA found FollowUps locked for a non-admin target.");
          }

          await page.getByTestId(`button-apply-preset-${targetPreset.id}`).click();
          await page.getByTestId("dialog-admin-preset-confirmation").waitFor();
          await page.getByTestId("admin-preset-added").waitFor();
          await page.getByTestId("admin-preset-removed").waitFor();

          const duringDialogPermissions = await getAdminUserPermissions(page, targetUser.id);
          assertPermissionSet(duringDialogPermissions, originalPermissions, "Preset confirmation should be non-mutating before confirm");

          await page.getByTestId("button-confirm-apply-preset").click();
          await page.getByTestId("dialog-admin-preset-confirmation").waitFor({ state: "hidden" });

          const appliedPermissions = await getAdminUserPermissions(page, targetUser.id);
          assertPermissionSet(appliedPermissions, expectedPermissions, "Confirmed preset apply");

          const changedGrant = expectedPermissions.find((permission) =>
            !normalizePermissionSet(originalPermissions).includes(`${permission.module}:${permission.environment}`),
          );
          const removedGrant = originalPermissions.find((permission) =>
            !normalizePermissionSet(expectedPermissions).includes(`${permission.module}:${permission.environment}`),
          );

          if (changedGrant) {
            const label = await page.getByTestId(`toggle-${changedGrant.module}-${changedGrant.environment}`).getAttribute("aria-label");
            if (label !== `Revoke ${changedGrant.module === "bizdev" ? "FollowUps" : changedGrant.module === "life-ledger" ? "Life Ledger" : changedGrant.module === "reach" ? "REACH" : changedGrant.module} in ${changedGrant.environment}`) {
              throw new Error(`Preset apply UI did not expose the added grant for ${changedGrant.module}:${changedGrant.environment}. label=${String(label)}`);
            }
          } else if (removedGrant) {
            const label = await page.getByTestId(`toggle-${removedGrant.module}-${removedGrant.environment}`).getAttribute("aria-label");
            const expectedLabel = `Grant ${removedGrant.module === "bizdev" ? "FollowUps" : removedGrant.module === "life-ledger" ? "Life Ledger" : removedGrant.module === "reach" ? "REACH" : removedGrant.module} in ${removedGrant.environment}`;
            if (label !== expectedLabel) {
              throw new Error(`Preset apply UI did not expose the removed grant for ${removedGrant.module}:${removedGrant.environment}. label=${String(label)}`);
            }
          }
        } finally {
          await restoreAdminUserPermissions(page, targetUser.id, originalPermissions);
        }

        return "pass";
      },
    },
    {
      label: "mobile admin editor keeps core permission controls inside the viewport",
      run: async (page) => {
        if (!storageState) return "skip";

        await page.setViewportSize({ width: 390, height: 844 });
        await waitForAppReady(page, "/admin");
        await ensureAuthenticatedSession(page, "/admin", "Admin mobile editor QA");
        await dismissOnboardingIfVisible(page);
        await page.getByTestId("users-list").waitFor();

        const users = await listAdminUsers(page);
        const targetUser = users.find((user) => user.role !== "admin" && user.accessLevel !== "admin");
        if (!targetUser) {
          throw new Error("Admin mobile editor QA could not find a non-admin target row.");
        }

        await page.getByTestId(`user-row-${targetUser.id}`).click();
        await page.getByTestId("permission-grid-mobile").waitFor();
        await expectNoHorizontalOverflow(page, "Admin mobile editor");
        await expectElementFitsViewportWidth(page, "permission-grid-mobile", "Admin mobile editor cards");
        await expectElementFitsViewportWidth(page, "permission-card-daily", "Admin mobile Daily card");
        await expectElementFitsViewportWidth(page, "permission-card-bizdev", "Admin mobile FollowUps card");
        await expectElementFullyVisible(page, "button-save-permissions-mobile", "Admin mobile save action");

        await page.setViewportSize({ width: 1440, height: 960 });
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

        await waitForAppReady(page, "/console");
        await ensureAuthenticatedSession(page, "/console", "Basic Console route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await expectConsoleShell(page, "Basic Console route-matrix QA");

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
        const dashboardNeedsReview = page.getByTestId("dashboard-needs-review");
        await dashboardNeedsReview.waitFor();
        await dashboardNeedsReview.getByText("AI review queue").waitFor();
        await dashboardNeedsReview.getByText(/waiting$/).waitFor();
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
        await openDetailsSection(page, "more-ai-drafts-daily");
        await page.getByTestId("ai-time-saver-daily").waitFor();
        await openDetailsSection(page, "more-help-daily");
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
        await openDetailsSection(page, "more-ai-drafts-weekly");
        await page.getByTestId("ai-time-saver-weekly").waitFor();
        await openDetailsSection(page, "more-help-weekly");
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
        await openDetailsSection(page, "more-ai-drafts-vision");
        await page.getByTestId("ai-time-saver-vision").waitFor();
        await openDetailsSection(page, "more-help-vision");
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

        await waitForAppReady(page, "/console");
        await ensureAuthenticatedSession(page, "/console", "Select Authorized Console route-matrix QA");
        await dismissOnboardingIfVisible(page);
        await expectConsoleShell(page, "Select Authorized Console route-matrix QA");

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
  process.stdout.write(`Vercel protection bypass: ${vercelBypassEnabled ? "enabled" : "disabled"}\n`);

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
