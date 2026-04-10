import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { accessPermissionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const OWNER_EMAIL = "mark@speaklymedia.com";
export const SYSTEM_GRANT_SOURCE = "system:auto-bootstrap";
export const OWNER_GRANT_SOURCE = "system:owner-bootstrap";
export const ALL_MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"] as const;
export const ALL_ENVIRONMENTS = ["development", "staging", "production"] as const;
export type AppModule = typeof ALL_MODULES[number];

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

export async function ensureEnvironmentModules(
  userId: string,
  environment: string,
): Promise<AppModule[]> {
  const perms = await db
    .select()
    .from(accessPermissionsTable)
    .where(eq(accessPermissionsTable.userId, userId));

  const envPerms = perms.filter((perm) => perm.environment === environment);

  if (envPerms.length === 0) {
    await db.insert(accessPermissionsTable).values(
      ALL_MODULES.map((module) => ({
        userId,
        module,
        environment,
        grantedBy: SYSTEM_GRANT_SOURCE,
      })),
    ).onConflictDoNothing();

    return [...ALL_MODULES];
  }

  return envPerms.map((perm) => perm.module as AppModule);
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
