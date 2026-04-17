import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const qaOutputDir = path.join(repoRoot, "test-results", "thetaframe-browser-qa");
export const authStateDir = path.join(repoRoot, "test-results", "auth");
export const defaultUserStorageStatePath = path.join(authStateDir, "thetaframe-user.json");
export const defaultAdminStorageStatePath = path.join(authStateDir, "thetaframe-admin.json");
export const defaultBasicStorageStatePath = path.join(authStateDir, "thetaframe-basic.json");
export const defaultBasicBStorageStatePath = path.join(authStateDir, "thetaframe-basic-b.json");
export const defaultSelectAuthorizedStorageStatePath = path.join(authStateDir, "thetaframe-select-authorized.json");

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function resolveStorageStatePath(
  override: string | undefined,
  fallbackPath: string,
): string | undefined {
  if (override?.trim()) return override.trim();
  return fs.existsSync(fallbackPath) ? fallbackPath : undefined;
}

export function getStorageStateCaptureTimestamp(filePath: string | undefined): string | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).mtime.toISOString();
}
