import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { accessPermissionsTable, accessPresetsTable, reachFilesTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  ALL_ENVIRONMENTS,
  ALL_MODULES,
  STANDARD_ACCESS_PRESET_NAMES,
  STANDARD_ACCESS_PRESETS,
  SYSTEM_GRANT_SOURCE,
  buildPermissionEntriesForModules,
  ensureOwnerBootstrap,
  getAccessLevelForUser,
  getEffectivePermissionEntriesForUser,
  getUserAndMaybeBootstrap,
  isAdminUser,
} from "../lib/access.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";
import {
  importParentPacketFromReachFile,
  listParentPacketImportRunsForUser,
  listParentPacketMaterializationsForUser,
} from "../lib/parentPacketImport.js";
import {
  bulkUpdateBabyKbEntries,
  listBabyKbPromotionsForUser,
  promoteBabyKbEntry,
} from "../lib/babyKbAdmin.js";
import {
  babyAssignmentManualCreateDataSchema,
  babyAssignmentUpdateDataSchema,
  createBabyKbAssignment,
  listBabyKbAssignmentsForUser,
  updateBabyKbAssignment,
} from "../lib/babyKbAssignments.js";
import {
  BabyAssignmentSuggestionEligibilityError,
  BabyAssignmentSuggestionGenerationError,
  BabyAssignmentSuggestionProviderUnavailableError,
  generateBabyAssignmentSuggestionDraftInput,
} from "../lib/babyKbAssignmentSuggestions.js";
import { createStoredAIDraft } from "../lib/aiDrafts.js";

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

const PermissionEntrySchema = z.object({
  module: z.enum(ALL_MODULES),
  environment: z.enum(ALL_ENVIRONMENTS),
});

const PutUserPermissionsBody = z.object({
  permissions: z.array(PermissionEntrySchema),
});

const CreatePresetBody = z.object({
  name: z.string().min(1),
  permissions: z.array(PermissionEntrySchema),
});

const CreateBabyKbAssignmentBody = babyAssignmentManualCreateDataSchema;
const UpdateBabyKbAssignmentBody = babyAssignmentUpdateDataSchema;
const CreateBabyKbAssignmentSuggestionBody = z.object({
  sourceEntryId: z.number().int().positive(),
});

const BabyKbAssignmentIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const AdminUserIdParams = z.object({ userId: z.string() });
const PresetIdParams = z.object({ id: z.coerce.number().int().positive() });
const PresetApplyParams = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.string(),
});
const ParentPacketImportBody = z
  .object({
    reachFileId: z.coerce.number().int().positive().optional(),
    sourceReachFileId: z.coerce.number().int().positive().optional(),
    importScope: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reachFileId == null && value.sourceReachFileId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reachFileId or sourceReachFileId is required",
        path: ["reachFileId"],
      });
    }
  });
const BabyPromotionSurfaceSchema = z.enum(["daily", "weekly", "vision"]);
const CreateBabyKbPromotionBody = z.object({
  sourceEntryId: z.coerce.number().int().positive(),
  targetSurface: BabyPromotionSurfaceSchema,
  targetContainerKey: z.string().min(1),
});
const BulkUpdateBabyKbBody = z.object({
  entryIds: z.array(z.coerce.number().int().positive()).min(1),
  operation: z.enum(["mark-verified", "add-tag", "remove-tag"]),
  tag: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  if ((value.operation === "add-tag" || value.operation === "remove-tag") && !value.tag) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tag"],
      message: "tag is required for add-tag and remove-tag operations",
    });
  }
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

async function ensureStandardAccessPresets(): Promise<void> {
  await db.insert(accessPresetsTable).values(
    STANDARD_ACCESS_PRESETS.map((preset) => ({
      name: preset.name,
      permissions: buildPermissionEntriesForModules(preset.modules),
      createdBy: SYSTEM_GRANT_SOURCE,
    })),
  ).onConflictDoNothing();
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
      accessLevel: getAccessLevelForUser(u, getEffectivePermissionEntriesForUser(u, permsByUser[u.id] ?? [])),
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
      permissions: getEffectivePermissionEntriesForUser(u, permsByUser[u.id] ?? []),
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
    permissions: getEffectivePermissionEntriesForUser(
      targetUser,
      perms.map((p) => ({ module: p.module, environment: p.environment })),
    ),
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

  if (isAdminUser(targetUser)) {
    await ensureOwnerBootstrap(targetUser, req.log);
  } else {
    const normalizedPermissions = getEffectivePermissionEntriesForUser(targetUser, body.data.permissions);

    await db.delete(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));

    if (normalizedPermissions.length > 0) {
      await db.insert(accessPermissionsTable).values(
        normalizedPermissions.map((p) => ({
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
    permissions: getEffectivePermissionEntriesForUser(
      targetUser,
      updated.map((p) => ({ module: p.module, environment: p.environment })),
    ),
  });
});

router.get("/admin/presets", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  await ensureStandardAccessPresets();
  const presets = await db.select().from(accessPresetsTable);
  res.json(presets.map(serializePreset));
});

router.get("/admin/parent-packet-imports", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUserId = (req as AdminRequest).adminUserId;
  const runs = await listParentPacketImportRunsForUser(adminUserId);
  res.json(runs);
});

router.get("/admin/parent-packet-materializations", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUserId = (req as AdminRequest).adminUserId;
  const materializations = await listParentPacketMaterializationsForUser(adminUserId);
  res.json(materializations);
});

router.get("/admin/baby-kb/promotions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUserId = (req as AdminRequest).adminUserId;
  const promotions = await listBabyKbPromotionsForUser(adminUserId);
  res.json(promotions);
});

router.get("/admin/baby-kb/assignments", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUserId = (req as AdminRequest).adminUserId;
  const assignments = await listBabyKbAssignmentsForUser(adminUserId);
  res.json(assignments);
});

router.post("/admin/parent-packet-imports", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = ParentPacketImportBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const adminUserId = (req as AdminRequest).adminUserId;
  const reachFileId = body.data.reachFileId ?? body.data.sourceReachFileId;
  const [sourceFile] = await db
    .select()
    .from(reachFilesTable)
    .where(and(eq(reachFilesTable.id, reachFileId!), eq(reachFilesTable.userId, adminUserId)));

  if (!sourceFile) {
    res.status(404).json({ error: "Reach source file not found" });
    return;
  }

  const imported = await importParentPacketFromReachFile(sourceFile, adminUserId);
  res.status(201).json(imported);
});

router.post("/admin/baby-kb/promotions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = CreateBabyKbPromotionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const adminUserId = (req as AdminRequest).adminUserId;

  try {
    const promotion = await promoteBabyKbEntry(
      adminUserId,
      body.data.sourceEntryId,
      body.data.targetSurface,
      body.data.targetContainerKey,
    );
    res.status(201).json(promotion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to promote Baby KB entry";
    res.status(409).json({ error: message });
  }
});

router.post("/admin/baby-kb/assignments", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = CreateBabyKbAssignmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const adminUserId = (req as AdminRequest).adminUserId;

  try {
    const assignment = await createBabyKbAssignment(adminUserId, body.data);
    res.status(201).json(assignment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Baby KB assignment";
    res.status(409).json({ error: message });
  }
});

router.post("/admin/baby-kb/assignment-suggestions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = CreateBabyKbAssignmentSuggestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const adminUserId = (req as AdminRequest).adminUserId;

  try {
    const suggestion = await generateBabyAssignmentSuggestionDraftInput(adminUserId, body.data.sourceEntryId);
    const draft = await createStoredAIDraft({
      userId: adminUserId,
      draftKind: "baby_kb_assignment_draft",
      confidenceMode: "suggest_only",
      inputChannels: ["typed_text"],
      proposedPayload: suggestion.proposedPayload,
      sourceRefs: suggestion.sourceRefs,
      reviewNotes: suggestion.reviewNotes,
      metadata: suggestion.metadata,
    });
    res.status(201).json(draft);
  } catch (error) {
    if (error instanceof BabyAssignmentSuggestionEligibilityError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof BabyAssignmentSuggestionProviderUnavailableError) {
      res.status(503).json({ error: error.message });
      return;
    }
    if (error instanceof BabyAssignmentSuggestionGenerationError) {
      res.status(502).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Failed to generate Baby KB assignment suggestion";
    res.status(500).json({ error: message });
  }
});

router.patch("/admin/baby-kb/assignments/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = BabyKbAssignmentIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid Baby KB assignment id" });
    return;
  }

  const body = UpdateBabyKbAssignmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const adminUserId = (req as AdminRequest).adminUserId;

  try {
    const assignment = await updateBabyKbAssignment(adminUserId, params.data.id, body.data);
    res.json(assignment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update Baby KB assignment";
    res.status(409).json({ error: message });
  }
});

router.post("/admin/baby-kb/bulk-update", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = BulkUpdateBabyKbBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const adminUserId = (req as AdminRequest).adminUserId;
  const result = await bulkUpdateBabyKbEntries(
    adminUserId,
    body.data.entryIds,
    body.data.operation,
    body.data.tag ?? null,
  );

  res.json(result);
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
    .values({
      name: body.data.name,
      permissions: getEffectivePermissionEntriesForUser({ id: createdBy }, body.data.permissions),
      createdBy,
    })
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
  const [preset] = await db.select().from(accessPresetsTable).where(eq(accessPresetsTable.id, params.data.id));
  if (preset && (STANDARD_ACCESS_PRESET_NAMES as readonly string[]).includes(preset.name)) {
    res.status(409).json({ error: "Standard access presets cannot be deleted." });
    return;
  }
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

  if (isAdminUser(targetUser)) {
    await ensureOwnerBootstrap(targetUser, req.log);
  } else {
    const normalizedPermissions = getEffectivePermissionEntriesForUser(targetUser, perms);

    await db.delete(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));

    if (normalizedPermissions.length > 0) {
      await db.insert(accessPermissionsTable).values(
        normalizedPermissions.map((p) => ({ userId, module: p.module, environment: p.environment, grantedBy })),
      );
    }
  }

  const updated = await db.select().from(accessPermissionsTable).where(eq(accessPermissionsTable.userId, userId));
  await markOnboardingSurfaceComplete(grantedBy, "admin");
  res.json({
    userId,
    permissions: getEffectivePermissionEntriesForUser(
      targetUser,
      updated.map((p) => ({ module: p.module, environment: p.environment })),
    ),
  });
});

export default router;
