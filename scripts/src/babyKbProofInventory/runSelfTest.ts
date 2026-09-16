import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathIsInside, runReport, runValidate } from "./cli.js";
import { validatePrivateRoot, validateProofInventory } from "./validator.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const fixtureDir = path.join(currentDir, "fixtures");
const repoRoot = path.resolve(currentDir, "../../..");
const privateRoot = "/tmp/thetaframe-baby-kb-proof-inventory-self-test";
const inventoryDir = path.join(privateRoot, "inventory");
const validFixturePath = path.join(fixtureDir, "fake-proof-inventory.valid.json");
const invalidFixturePath = path.join(fixtureDir, "fake-proof-inventory.invalid.json");

function readFixture(fixturePath: string): unknown {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function preparePrivateRoot(): void {
  fs.rmSync(privateRoot, { recursive: true, force: true });
  fs.mkdirSync(inventoryDir, { recursive: true });
  fs.copyFileSync(validFixturePath, path.join(inventoryDir, "proof-inventory.json"));
}

const validResult = validateProofInventory(readFixture(validFixturePath), { repoRoot, privateRoot });
assert.equal(validResult.ok, true, JSON.stringify(validResult.errors, null, 2));
assert.equal(validResult.summary.totalEntries, 4);
assert.equal(validResult.summary.answerEligibleCount, 1);
assert.equal(JSON.stringify(validResult.report).includes("PRIVATE SOURCE TEXT"), false);
assert.equal(JSON.stringify(validResult.report).includes("/tmp/private-proof-source"), false);

const invalidResult = validateProofInventory(readFixture(invalidFixturePath), { repoRoot, privateRoot });
assert.equal(invalidResult.ok, false);
assert.ok(invalidResult.errors.some((error) => error.message === "Duplicate sourceId"));
assert.ok(invalidResult.errors.some((error) => error.message === "Unsupported source class"));
assert.ok(invalidResult.errors.some((error) => error.message === "Unsupported review state"));
assert.ok(invalidResult.errors.some((error) => error.message === "Verified entries require citation metadata"));
assert.ok(
  invalidResult.errors.some(
    (error) => error.message === "Entry is marked answer-eligible but does not satisfy proof eligibility gates",
  ),
);
assert.ok(
  invalidResult.errors.some(
    (error) => error.message === "Private proof source paths must not point inside the public repository",
  ),
);
assert.ok(
  invalidResult.errors.some((error) => error.message === "Entry contains credential-like or auth/env material"),
);

assert.equal(validatePrivateRoot(path.join(repoRoot, ".baby-kb-private"), repoRoot).length > 0, true);
assert.equal(pathIsInside(repoRoot, path.join(repoRoot, "report.json")), true);

preparePrivateRoot();
assert.equal(runValidate({ root: privateRoot, repoRoot }), 0);
const reportOut = "/tmp/thetaframe-baby-kb-proof-inventory-self-test-report.json";
assert.equal(runReport({ root: privateRoot, repoRoot, out: reportOut }), 0);
const reportText = fs.readFileSync(reportOut, "utf8");
assert.equal(reportText.includes("PRIVATE SOURCE TEXT"), false);
assert.equal(reportText.includes("/tmp/private-proof-source"), false);
assert.equal(runValidate({ root: path.join(repoRoot, ".baby-kb-private"), repoRoot }), 1);
assert.equal(runReport({ root: privateRoot, repoRoot, out: path.join(repoRoot, "proof-inventory-report.local.json") }), 1);

console.log("Baby-KB proof inventory self-test PASS");
