import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { resolveAutomationBrowserPath } from "./browserPaths";
import {
  defaultAdminStorageStatePath,
  defaultBasicBStorageStatePath,
  defaultBasicStorageStatePath,
  defaultSelectAuthorizedStorageStatePath,
  defaultUserStorageStatePath,
  ensureDir,
  qaOutputDir,
  resolveStorageStatePath,
} from "./thetaframeBrowserQaPaths";

type CheckRecord = {
  label: string;
  status: number | string;
  expected: string;
  detail?: string;
};

type ApiResult = {
  status: number;
  body: unknown;
  text: string;
};

type ApiAccount = {
  label: string;
  context: BrowserContext;
  page: Page;
};

const baseUrl = (process.env.THETAFRAME_BROWSER_BASE_URL ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const outputDir = process.env.THETAFRAME_ISOLATION_OUTPUT_DIR
  ?? process.env.THETAFRAME_BROWSER_OUTPUT_DIR
  ?? path.join(qaOutputDir, "c33-isolation");
const marker = `C33-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
const records: CheckRecord[] = [];

function requiredStorageState(label: string, envName: string, fallbackPath: string): string {
  const resolved = resolveStorageStatePath(process.env[envName], fallbackPath);
  if (!resolved || !fs.existsSync(resolved)) {
    throw new Error(`${label} storage state is required at ${fallbackPath}; set ${envName} or capture the role state first.`);
  }
  return resolved;
}

async function createAccount(browser: Browser, label: string, storageState: string): Promise<ApiAccount> {
  const context = await browser.newContext({
    baseURL: baseUrl,
    storageState,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(new URL("/daily", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return {
    label,
    context,
    page,
  };
}

async function api(account: ApiAccount, method: string, url: string, data?: unknown): Promise<ApiResult> {
  return account.page.evaluate(
    async ({ method: fetchMethod, url: fetchUrl, data: fetchData }) => {
      const response = await fetch(fetchUrl, {
        method: fetchMethod,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(fetchData === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: fetchData === undefined ? undefined : JSON.stringify(fetchData),
      });
      const text = await response.text();
      let body: unknown = null;
      if (text.trim()) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      return { status: response.status, body, text };
    },
    { method, url, data },
  );
}

function record(label: string, result: ApiResult | number | string, expected: string, detail?: string) {
  records.push({
    label,
    status: typeof result === "object" && result !== null && "status" in result ? result.status : result,
    expected,
    detail,
  });
}

function expectStatus(label: string, result: ApiResult, expected: readonly number[]) {
  record(label, result, expected.join(" or "));
  if (!expected.includes(result.status)) {
    throw new Error(`${label} returned ${result.status}; expected ${expected.join(" or ")}. Body: ${result.text.slice(0, 500)}`);
  }
}

function expectNoMarker(label: string, result: ApiResult, forbiddenMarker: string) {
  const serialized = JSON.stringify(result.body);
  record(label, result, `body does not include ${forbiddenMarker}`, serialized.includes(forbiddenMarker) ? "marker leaked" : undefined);
  if (serialized.includes(forbiddenMarker)) {
    throw new Error(`${label} leaked marker ${forbiddenMarker}.`);
  }
}

function expectContainsMarker(label: string, result: ApiResult, expectedMarker: string) {
  const serialized = JSON.stringify(result.body);
  record(label, result, `body includes ${expectedMarker}`);
  if (!serialized.includes(expectedMarker)) {
    throw new Error(`${label} did not include marker ${expectedMarker}. Body: ${serialized.slice(0, 500)}`);
  }
}

function bodyRecord(result: ApiResult): Record<string, unknown> {
  return result.body && typeof result.body === "object" && !Array.isArray(result.body)
    ? result.body as Record<string, unknown>
    : {};
}

function bodyId(label: string, result: ApiResult): number {
  const id = bodyRecord(result).id;
  if (typeof id !== "number") {
    throw new Error(`${label} response did not include numeric id.`);
  }
  return id;
}

function expectModules(label: string, result: ApiResult, expectedModules: readonly string[], expectedIsAdmin: boolean) {
  expectStatus(label, result, [200]);
  const body = bodyRecord(result);
  const modules = Array.isArray(body.modules) ? body.modules.filter((item): item is string => typeof item === "string") : [];
  const moduleSet = new Set(modules);
  const missing = expectedModules.filter((module) => !moduleSet.has(module));
  const unexpected = modules.filter((module) => !expectedModules.includes(module));
  if (missing.length > 0 || unexpected.length > 0 || body.isAdmin !== expectedIsAdmin) {
    throw new Error(
      `${label} mismatch. missing=${missing.join(",") || "none"} unexpected=${unexpected.join(",") || "none"} isAdmin=${String(body.isAdmin)}`,
    );
  }
}

function dailyPayload(text: string) {
  return {
    colourState: "green",
    tierA: [{ id: `${text}-tier-a`, text, completed: false, emoji: null }],
    tierB: [],
    timeBlocks: [],
    microWin: text,
    skipProtocolUsed: false,
    skipProtocolChoice: null,
  };
}

function weeklyPayload(text: string) {
  return {
    theme: text,
    steps: [{ id: `${text}-step`, text, emoji: null }],
    nonNegotiables: [],
    recoveryPlan: null,
  };
}

function visionPayload(text: string) {
  return {
    goals: [{ id: `${text}-goal`, text, emoji: null }],
    nextSteps: [{ id: `${text}-next`, text: `${text} next`, emoji: null }],
  };
}

function lifeLedgerEventPayload(text: string) {
  return {
    name: text,
    tags: ["C33 isolation"],
    impactLevel: "low",
    reviewWindow: "situational",
    dueDate: "2027-04-16",
    notes: text,
    amount: null,
    currency: null,
    isEssential: null,
    billingCycle: null,
  };
}

function aiDraftPayload(text: string, date: string) {
  const now = new Date().toISOString();
  return {
    metadata: {
      thetaObjectId: `ai-draft:${text}`,
      lane: "daily",
      objectType: "ai-draft",
      title: text,
      summary: text,
      provenanceSource: "user_manual",
      captureChannel: "web_form",
      reviewStatus: "needs_review",
      confidence: "low",
      approvalRequired: "one_tap",
      externalLinkRefs: [],
      sourcePayloadRef: null,
      sourcePayloadHash: null,
      sourceExcerpt: text,
      rationale: "C33 isolation QA draft.",
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    },
    draftKind: "daily_frame_draft",
    targetLane: "daily",
    targetSurfaceKey: date,
    targetObjectType: "daily-frame",
    mutationRisk: "low",
    confidenceMode: "suggest_only",
    commitTool: "upsertDailyFrame",
    inputChannels: ["typed_text"],
    proposedPayload: dailyPayload(text),
    sourceRefs: [{ sourceType: "raw_input", ref: text, label: "C33 isolation QA" }],
    reviewNotes: text,
  };
}

async function run() {
  ensureDir(outputDir);

  const storageStates = {
    basicA: requiredStorageState("basic_a", "THETAFRAME_BROWSER_BASIC_A_STORAGE_STATE", defaultBasicStorageStatePath),
    basicB: requiredStorageState("basic_b", "THETAFRAME_BROWSER_BASIC_B_STORAGE_STATE", defaultBasicBStorageStatePath),
    selectAuthorized: requiredStorageState(
      "select_authorized",
      "THETAFRAME_BROWSER_SELECT_AUTHORIZED_STORAGE_STATE",
      defaultSelectAuthorizedStorageStatePath,
    ),
    admin: requiredStorageState("admin", "THETAFRAME_BROWSER_ADMIN_STORAGE_STATE", defaultAdminStorageStatePath),
    reachOwner: requiredStorageState("reach owner", "THETAFRAME_BROWSER_REACH_STORAGE_STATE", defaultUserStorageStatePath),
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveAutomationBrowserPath(),
    args: ["--disable-gpu", "--no-sandbox"],
  });
  const accounts = {
    basicA: await createAccount(browser, "basic_a", storageStates.basicA),
    basicB: await createAccount(browser, "basic_b", storageStates.basicB),
    selectAuthorized: await createAccount(browser, "select_authorized", storageStates.selectAuthorized),
    admin: await createAccount(browser, "admin", storageStates.admin),
    reachOwner: await createAccount(browser, "reach_owner", storageStates.reachOwner),
  };

  const cleanup: Array<() => Promise<void>> = [];

  try {
    expectModules("basic_a permissions", await api(accounts.basicA, "GET", "/api/me/permissions"), ["daily", "weekly", "vision"], false);
    expectModules("basic_b permissions", await api(accounts.basicB, "GET", "/api/me/permissions"), ["daily", "weekly", "vision"], false);
    expectModules(
      "select_authorized permissions",
      await api(accounts.selectAuthorized, "GET", "/api/me/permissions"),
      ["daily", "weekly", "vision", "life-ledger"],
      false,
    );
    const adminPerms = await api(accounts.admin, "GET", "/api/me/permissions");
    expectStatus("admin permissions", adminPerms, [200]);
    if (bodyRecord(adminPerms).isAdmin !== true) throw new Error("admin permissions did not return isAdmin=true.");

    const dailyDate = "2027-04-16";
    const dailyA = `${marker}-daily-a`;
    const dailyB = `${marker}-daily-b`;
    expectStatus("basic_a create daily", await api(accounts.basicA, "PUT", `/api/daily-frames/${dailyDate}`, dailyPayload(dailyA)), [200]);
    expectContainsMarker("basic_a read own daily", await api(accounts.basicA, "GET", `/api/daily-frames/${dailyDate}`), dailyA);
    const basicBReadsDailyA = await api(accounts.basicB, "GET", `/api/daily-frames/${dailyDate}`);
    expectStatus("basic_b direct daily same key", basicBReadsDailyA, [200, 404]);
    expectNoMarker("basic_b cannot read basic_a daily", basicBReadsDailyA, dailyA);
    expectStatus("basic_b write same daily key", await api(accounts.basicB, "PUT", `/api/daily-frames/${dailyDate}`, dailyPayload(dailyB)), [200]);
    expectNoMarker("basic_a daily not overwritten by basic_b", await api(accounts.basicA, "GET", `/api/daily-frames/${dailyDate}`), dailyB);
    const adminReadsDailyA = await api(accounts.admin, "GET", `/api/daily-frames/${dailyDate}`);
    expectStatus("admin ordinary daily same key", adminReadsDailyA, [200, 404]);
    expectNoMarker("admin ordinary lane cannot browse basic_a daily", adminReadsDailyA, dailyA);

    const weekStart = "2027-04-12";
    const weeklyA = `${marker}-weekly-a`;
    const weeklyB = `${marker}-weekly-b`;
    expectStatus("basic_a create weekly", await api(accounts.basicA, "PUT", `/api/weekly-frames/${weekStart}`, weeklyPayload(weeklyA)), [200]);
    expectContainsMarker("basic_a read own weekly", await api(accounts.basicA, "GET", `/api/weekly-frames/${weekStart}`), weeklyA);
    const basicBReadsWeeklyA = await api(accounts.basicB, "GET", `/api/weekly-frames/${weekStart}`);
    expectStatus("basic_b direct weekly same key", basicBReadsWeeklyA, [200, 404]);
    expectNoMarker("basic_b cannot read basic_a weekly", basicBReadsWeeklyA, weeklyA);
    expectStatus("basic_b write same weekly key", await api(accounts.basicB, "PUT", `/api/weekly-frames/${weekStart}`, weeklyPayload(weeklyB)), [200]);
    expectNoMarker("basic_a weekly not overwritten by basic_b", await api(accounts.basicA, "GET", `/api/weekly-frames/${weekStart}`), weeklyB);

    const previousVision = await api(accounts.basicA, "GET", "/api/vision-frames/me");
    const visionA = `${marker}-vision-a`;
    expectStatus("basic_a upsert vision", await api(accounts.basicA, "PUT", "/api/vision-frames/me", visionPayload(visionA)), [200]);
    expectContainsMarker("basic_a read own vision", await api(accounts.basicA, "GET", "/api/vision-frames/me"), visionA);
    const basicBVision = await api(accounts.basicB, "GET", "/api/vision-frames/me");
    expectStatus("basic_b own vision lookup", basicBVision, [200, 404]);
    expectNoMarker("basic_b cannot read basic_a vision", basicBVision, visionA);
    const adminVision = await api(accounts.admin, "GET", "/api/vision-frames/me");
    expectStatus("admin ordinary vision lookup", adminVision, [200, 404]);
    expectNoMarker("admin ordinary lane cannot browse basic_a vision", adminVision, visionA);
    if (previousVision.status === 200) {
      const previous = bodyRecord(previousVision);
      cleanup.push(async () => {
        await api(accounts.basicA, "PUT", "/api/vision-frames/me", {
          goals: previous.goals,
          nextSteps: previous.nextSteps,
        });
      });
    }

    const eventText = `${marker}-life-ledger-event`;
    const selectEvent = await api(accounts.selectAuthorized, "POST", "/api/life-ledger/events", lifeLedgerEventPayload(eventText));
    expectStatus("select_authorized create life ledger event", selectEvent, [201]);
    const selectEventId = bodyId("select event", selectEvent);
    cleanup.push(async () => { await api(accounts.selectAuthorized, "DELETE", `/api/life-ledger/events/${selectEventId}`); });
    expectContainsMarker("select_authorized read own event", await api(accounts.selectAuthorized, "GET", `/api/life-ledger/events/${selectEventId}`), eventText);
    expectStatus("basic_a denied optional life ledger list", await api(accounts.basicA, "GET", "/api/life-ledger/events"), [403]);
    expectStatus("basic_a denied direct life ledger id", await api(accounts.basicA, "GET", `/api/life-ledger/events/${selectEventId}`), [403]);
    const adminReadsSelectEvent = await api(accounts.admin, "GET", `/api/life-ledger/events/${selectEventId}`);
    expectStatus("admin ordinary lane direct select event", adminReadsSelectEvent, [404]);
    expectNoMarker("admin ordinary lane cannot browse select event", adminReadsSelectEvent, eventText);
    expectStatus("admin ordinary lane cannot delete select event", await api(accounts.admin, "DELETE", `/api/life-ledger/events/${selectEventId}`), [404]);

    const draftText = `${marker}-ai-draft`;
    const draft = await api(accounts.basicA, "POST", "/api/ai-drafts", aiDraftPayload(draftText, dailyDate));
    expectStatus("basic_a create ai draft", draft, [201]);
    const draftId = bodyId("ai draft", draft);
    cleanup.push(async () => {
      await api(accounts.basicA, "PATCH", `/api/ai-drafts/${draftId}/review-state`, { reviewState: "rejected", reviewNotes: "C33 cleanup" });
    });
    expectContainsMarker("basic_a read own ai draft", await api(accounts.basicA, "GET", `/api/ai-drafts/${draftId}`), draftText);
    expectStatus("basic_b cannot read basic_a ai draft", await api(accounts.basicB, "GET", `/api/ai-drafts/${draftId}`), [404]);
    expectStatus(
      "basic_b cannot review basic_a ai draft",
      await api(accounts.basicB, "PATCH", `/api/ai-drafts/${draftId}/review-state`, { reviewState: "approved", reviewNotes: "cross-user attempt" }),
      [404],
    );
    expectStatus("basic_b cannot apply basic_a ai draft", await api(accounts.basicB, "POST", `/api/ai-drafts/${draftId}/apply`, { date: dailyDate }), [404]);

    expectStatus("basic_a baby kb denied", await api(accounts.basicA, "GET", "/api/life-ledger/baby"), [403]);
    expectStatus("select_authorized baby kb denied", await api(accounts.selectAuthorized, "GET", "/api/life-ledger/baby"), [403]);
    expectStatus("admin baby kb allowed", await api(accounts.admin, "GET", "/api/life-ledger/baby"), [200]);
    expectStatus("basic_a admin users denied", await api(accounts.basicA, "GET", "/api/admin/users"), [403]);
    expectStatus("select_authorized admin users denied", await api(accounts.selectAuthorized, "GET", "/api/admin/users"), [403]);
    expectStatus("admin users allowed", await api(accounts.admin, "GET", "/api/admin/users"), [200]);

    const reachPerms = await api(accounts.reachOwner, "GET", "/api/me/permissions");
    expectStatus("reach owner permissions", reachPerms, [200]);
    const reachModules = bodyRecord(reachPerms).modules;
    if (!Array.isArray(reachModules) || !reachModules.includes("reach")) {
      throw new Error("reach owner storage state must belong to a user with reach module access.");
    }
    const upload = await api(accounts.reachOwner, "POST", "/api/storage/uploads/request-url", {
      name: `${marker}.txt`,
      size: 16,
      contentType: "text/plain",
    });
    expectStatus("reach owner request upload path", upload, [200]);
    const objectPath = bodyRecord(upload).objectPath;
    if (typeof objectPath !== "string") throw new Error("upload response did not include objectPath.");
    expectStatus(
      "admin cannot register reach owner pending object",
      await api(accounts.admin, "POST", "/api/reach/files", {
        name: `${marker}.txt`,
        fileType: "text/plain",
        sizeBytes: 16,
        objectPath,
        notes: marker,
      }),
      [403],
    );
    const storagePath = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
    expectStatus("admin cannot read unowned private object", await api(accounts.admin, "GET", storagePath), [404]);
    expectStatus(
      "reach owner cleans pending missing object",
      await api(accounts.reachOwner, "POST", "/api/reach/files", {
        name: `${marker}.txt`,
        fileType: "text/plain",
        sizeBytes: 16,
        objectPath,
        notes: marker,
      }),
      [422],
    );
  } finally {
    for (const cleanupAction of cleanup.reverse()) {
      try {
        await cleanupAction();
      } catch {
        // Cleanup must not hide the proof result; details are recorded in the receipt if manual cleanup is needed.
      }
    }
    await Promise.all(Object.values(accounts).map((account) => account.context.close().catch(() => undefined)));
    await browser.close().catch(() => undefined);
  }
}

run()
  .then(() => {
    const outPath = path.join(outputDir, "c33-isolation-results.json");
    fs.writeFileSync(outPath, JSON.stringify({ baseUrl, marker, checks: records }, null, 2));
    console.log(`[c33-isolation] PASS checks=${records.length} evidence=${outPath}`);
  })
  .catch((error) => {
    ensureDir(outputDir);
    const outPath = path.join(outputDir, "c33-isolation-results.failed.json");
    fs.writeFileSync(outPath, JSON.stringify({ baseUrl, marker, checks: records, error: String(error) }, null, 2));
    console.error(`[c33-isolation] FAIL checks=${records.length} evidence=${outPath}`);
    console.error(error);
    process.exitCode = 1;
  });
