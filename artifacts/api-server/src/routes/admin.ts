import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { accessPermissionsTable, accessPresetsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ensureOwnerBootstrap, getUserAndMaybeBootstrap, isAdminUser, isOwnerUser } from "../lib/access.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";

const router = Router();

interface AdminRequest extends Request {
  adminUserId: string;
}

const requireAdmin = async (req: Request, res: Response, next: Function): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const user = await getUserAndMaybeBootstrap(userId, req.log);
    if (!isAdminUser(user)) {
      res.status(403).json({ error: "Forbidden: admin access required" });
      return;
    }
    (req as AdminRequest).adminUserId = userId;
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
  }
};

const VALID_MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"] as const;
const VALID_ENVIRONMENTS = ["development", "staging", "production"] as const;

const PermissionEntrySchema = z.object({
  module: z.enum(VALID_MODULES),
  environment: z.enum(VALID_ENVIRONMENTS),
});

const PutUserPermissionsBody = z.object({
  permissions: z.array(PermissionEntrySchema),
});

const CreatePresetBody = z.object({
  name: z.string().min(1),
  permissions: z.array(PermissionEntrySchema),
});

const AdminUserIdParams = z.object({ userId: z.string() });
const PresetIdParams = z.object({ id: z.coerce.number().int().positive() });
const PresetApplyParams = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.string(),
});

function serializePreset(preset: typeof accessPresetsTable.$inferSelect) {
  return {
    id: preset.id,
    name: preset.name,
    permissions: preset.permissions as Array<{ module: string; environment: string }>,
    createdAt: preset.createdAt.toISOString(),
    createdBy: preset.createdBy,
  };
}

router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const allClerkUsers = [];
    let offset = 0;
    const pageSize = 100;
    while (true) {
      const page = await clerkClient.users.getUserList({ limit: pageSize, offset });
      allClerkUsers.push(...page.data);
      if (page.data.length < pageSize) break;
      offset += pageSize;
    }
    const clerkUsers = allClerkUsers;

    await Promise.all(clerkUsers.map((user) => ensureOwnerBootstrap(user, req.log)));

    const userIds = clerkUsers.map((u) => u.id);
    const allPerms = userIds.length > 0
      ? await db.select().from(accessPermissionsTable).where(inArray(accessPermissionsTable.userId, userIds))
      : [];

    const permsByUser: Record<string, Array<{ module: string; environment: string }>> = {};
    for (const perm of allPerms) {
      if (!permsByUser[perm.userId]) permsByUser[perm.userId] = [];
      permsByUser[perm.userId].push({ module: perm.module, environment: perm.environment });
    }

    const users = clerkUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
      lastActiveAt: u.lastActiveAt ?? null,
      createdAt: u.createdAt,
      role: isAdminUser(u)
        ? "admin"
        : (((u.publicMetadata as Record<string, unknown>)?.role as string) ?? null),
      permissions: permsByUser[u.id] ?? [],
    }));

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/admin/users/:userId/permissions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  const { userId } = params.data;
  const targetUser = await clerkClient.users.getUser(userId);
  await ensureOwnerBootstrap(targetUser, req.log);
  const perms = await db.select().from(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));
  res.json({
    userId,
    permissions: perms.map((p) => ({ module: p.module, environment: p.environment })),
  });
});

router.put("/admin/users/:userId/permissions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  const body = PutUserPermissionsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { userId } = params.data;
  const grantedBy = (req as AdminRequest).adminUserId;
  const targetUser = await clerkClient.users.getUser(userId);

  if (isOwnerUser(targetUser)) {
    await ensureOwnerBootstrap(targetUser, req.log);
  } else {
    await db.delete(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));

    if (body.data.permissions.length > 0) {
      await db.insert(accessPermissionsTable).values(
        body.data.permissions.map((p) => ({
          userId,
          module: p.module,
          environment: p.environment,
          grantedBy,
        })),
      );
    }
  }

  const updated = await db.select().from(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));
  await markOnboardingSurfaceComplete(grantedBy, "admin");
  res.json({
    userId,
    permissions: updated.map((p) => ({ module: p.module, environment: p.environment })),
  });
});

router.get("/admin/presets", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const presets = await db.select().from(accessPresetsTable);
  res.json(presets.map(serializePreset));
});

router.post("/admin/presets", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = CreatePresetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const createdBy = (req as AdminRequest).adminUserId;
  const [preset] = await db
    .insert(accessPresetsTable)
    .values({ name: body.data.name, permissions: body.data.permissions, createdBy })
    .returning();
  await markOnboardingSurfaceComplete(createdBy, "admin");
  res.status(201).json(serializePreset(preset));
});

router.delete("/admin/presets/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = PresetIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid preset id" });
    return;
  }
  const adminUserId = (req as AdminRequest).adminUserId;
  await db.delete(accessPresetsTable).where(eq(accessPresetsTable.id, params.data.id));
  await markOnboardingSurfaceComplete(adminUserId, "admin");
  res.status(204).end();
});

router.post("/admin/presets/:id/apply/:userId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = PresetApplyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { id, userId } = params.data;
  const grantedBy = (req as AdminRequest).adminUserId;
  const targetUser = await clerkClient.users.getUser(userId);

  const [preset] = await db.select().from(accessPresetsTable).where(eq(accessPresetsTable.id, id));
  if (!preset) {
    res.status(404).json({ error: "Preset not found" });
    return;
  }

  const perms = (preset.permissions as Array<{ module: string; environment: string }>);

  if (isOwnerUser(targetUser)) {
    await ensureOwnerBootstrap(targetUser, req.log);
  } else {
    await db.delete(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));

    if (perms.length > 0) {
      await db.insert(accessPermissionsTable).values(
        perms.map((p) => ({ userId, module: p.module, environment: p.environment, grantedBy })),
      );
    }
  }

  const updated = await db.select().from(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));
  await markOnboardingSurfaceComplete(grantedBy, "admin");
  res.json({
    userId,
    permissions: updated.map((p) => ({ module: p.module, environment: p.environment })),
  });
});

export default router;
