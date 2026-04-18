import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { accessPermissionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const OWNER_EMAIL = "mark@speaklymedia.com";
export const SYSTEM_GRANT_SOURCE = "system:auto-bootstrap";
export const OWNER_GRANT_SOURCE = "system:owner-bootstrap";
export const BASIC_MODULES = ["daily", "weekly", "vision"] as const;
export const ALL_MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"] as const;
export const ALL_ENVIRONMENTS = ["development", "staging", "production"] as const;
export const SELECT_AUTHORIZED_MODULES = ["bizdev", "life-ledger", "reach"] as const;
export type AppModule = typeof ALL_MODULES[number];

export type PermissionEntry = {
  module: AppModule;
  environment: typeof ALL_ENVIRONMENTS[number];
};

export const STANDARD_ACCESS_PRESETS = [
  { name: "Basic User", modules: BASIC_MODULES },
  { name: "Select Authorized: Core + FollowUps", modules: [...BASIC_MODULES, "bizdev"] as const },
  { name: "Select Authorized: Core + Life Ledger", modules: [...BASIC_MODULES, "life-ledger"] as const },
  { name: "Select Authorized: Core + REACH", modules: [...BASIC_MODULES, "reach"] as const },
  { name: "Select Authorized: Full Non-Admin", modules: ALL_MODULES },
] as const;

export const STANDARD_ACCESS_PRESET_NAMES = STANDARD_ACCESS_PRESETS.map((preset) => preset.name);

type ClerkEmailAddressLike = {
  id?: string | null;
  emailAddress?: string | null;
};

type ClerkUserLike = {
  id: string;
  publicMetadata?: unknown;
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailAddressLike[];
};

type LoggerLike = {
  warn?: (...args: unknown[]) => unknown;
};

export function detectEnvironment(): string {
  if (process.env.REPLIT_DEPLOYMENT === "1") return "production";
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "staging") return "staging";
  return "development";
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === OWNER_EMAIL;
}

export function getUserPrimaryEmail(user: ClerkUserLike): string | null {
  const matchedPrimary = user.emailAddresses?.find(
    (email) => email.id && email.id === user.primaryEmailAddressId,
  );

  return matchedPrimary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
}

export function isOwnerUser(user: ClerkUserLike): boolean {
  return isOwnerEmail(getUserPrimaryEmail(user));
}

export function isAdminUser(user: ClerkUserLike): boolean {
  if (isOwnerUser(user)) return true;
  const role = (user.publicMetadata as Record<string, unknown> | undefined)?.role;
  return role === "admin";
}

export async function ensureOwnerPermissions(userId: string): Promise<void> {
  await db.insert(accessPermissionsTable).values(
    ALL_ENVIRONMENTS.flatMap((environment) =>
      ALL_MODULES.map((module) => ({
        userId,
        module,
        environment,
        grantedBy: OWNER_GRANT_SOURCE,
      })),
    ),
  ).onConflictDoNothing();
}

function uniqueModules(modules: readonly string[]): AppModule[] {
  return Array.from(
    new Set(modules.filter((module): module is AppModule => ALL_MODULES.includes(module as AppModule))),
  );
}

export function buildPermissionEntriesForModules(
  modules: readonly AppModule[],
  environments: readonly typeof ALL_ENVIRONMENTS[number][] = ALL_ENVIRONMENTS,
): PermissionEntry[] {
  return environments.flatMap((environment) =>
    uniqueModules(modules).map((module) => ({
      module,
      environment,
    })),
  );
}

export function normalizePermissionEntries(
  permissions: readonly { module: string; environment: string }[],
): PermissionEntry[] {
  const byKey = new Map<string, PermissionEntry>();

  for (const permission of permissions) {
    if (!ALL_MODULES.includes(permission.module as AppModule)) continue;
    if (!ALL_ENVIRONMENTS.includes(permission.environment as typeof ALL_ENVIRONMENTS[number])) continue;
    const normalized = {
      module: permission.module as AppModule,
      environment: permission.environment as typeof ALL_ENVIRONMENTS[number],
    };
    byKey.set(`${normalized.module}:${normalized.environment}`, normalized);
  }

  for (const permission of buildPermissionEntriesForModules(BASIC_MODULES)) {
    byKey.set(`${permission.module}:${permission.environment}`, permission);
  }

  return Array.from(byKey.values());
}

export function getEffectivePermissionEntriesForUser(
  user: ClerkUserLike,
  storedPermissions: readonly { module: string; environment: string }[],
): PermissionEntry[] {
  if (isAdminUser(user)) {
    return buildPermissionEntriesForModules(ALL_MODULES);
  }

  return normalizePermissionEntries(storedPermissions);
}

export function getAccessLevelForUser(
  user: ClerkUserLike,
  effectivePermissions: readonly { module: string; environment: string }[],
): "admin" | "select_authorized" | "basic" {
  if (isAdminUser(user)) return "admin";
  const modules = new Set(effectivePermissions.map((permission) => permission.module));
  return SELECT_AUTHORIZED_MODULES.some((module) => modules.has(module)) ? "select_authorized" : "basic";
}

export async function ensureEnvironmentModules(
  userId: string,
  environment: string,
): Promise<AppModule[]> {
  const user = await getUserAndMaybeBootstrap(userId);
  if (isAdminUser(user)) {
    return [...ALL_MODULES];
  }

  const perms = await db
    .select()
    .from(accessPermissionsTable)
    .where(eq(accessPermissionsTable.userId, userId));

  const envPerms = perms.filter((perm) => perm.environment === environment);
  return uniqueModules([...BASIC_MODULES, ...envPerms.map((perm) => perm.module)]);
}

async function ensureOwnerAdminRole(user: ClerkUserLike, logger?: LoggerLike): Promise<void> {
  if (!isOwnerUser(user)) return;

  const publicMetadata = (user.publicMetadata as Record<string, unknown> | undefined) ?? {};
  if (publicMetadata.role === "admin") return;

  const usersApi = clerkClient.users as unknown as {
    updateUserMetadata?: (
      userId: string,
      params: { publicMetadata: Record<string, unknown> },
    ) => Promise<unknown>;
  };

  if (typeof usersApi.updateUserMetadata !== "function") return;

  try {
    await usersApi.updateUserMetadata(user.id, {
      publicMetadata: {
        ...publicMetadata,
        role: "admin",
      },
    });
  } catch (error) {
    logger?.warn?.(
      {
        err: error,
        userId: user.id,
        ownerEmail: OWNER_EMAIL,
      },
      "Failed to synchronize owner admin metadata in Clerk",
    );
  }
}

export async function ensureOwnerBootstrap(user: ClerkUserLike, logger?: LoggerLike): Promise<boolean> {
  if (!isOwnerUser(user)) return false;
  await ensureOwnerAdminRole(user, logger);
  await ensureOwnerPermissions(user.id);
  return true;
}

export async function getUserAndMaybeBootstrap(userId: string, logger?: LoggerLike) {
  const user = await clerkClient.users.getUser(userId);
  await ensureOwnerBootstrap(user, logger);
  return user;
}
