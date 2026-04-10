import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, reachFilesTable, pendingUploadsTable } from "@workspace/db";
import {
  CreateReachFileBody,
  DeleteReachFileParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates } from "../lib/serialize.js";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
router.use(requireAuth, requireModuleAccess("reach"));

router.get("/reach/files", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const files = await db
    .select()
    .from(reachFilesTable)
    .where(eq(reachFilesTable.userId, userId))
    .orderBy(reachFilesTable.createdAt);

  res.json(files.map(serializeDates));
});

router.post("/reach/files", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateReachFileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { objectPath } = body.data;

  if (!objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }

  const [pending] = await db
    .select()
    .from(pendingUploadsTable)
    .where(and(eq(pendingUploadsTable.objectPath, objectPath), eq(pendingUploadsTable.userId, userId)));

  if (!pending) {
    res.status(403).json({ error: "No pending upload found for this path" });
    return;
  }

  try {
    await objectStorageService.getObjectEntityFile(objectPath);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      await db.delete(pendingUploadsTable).where(eq(pendingUploadsTable.id, pending.id));
      res.status(422).json({ error: "Uploaded object not found in storage. Please re-upload the file." });
      return;
    }
    throw err;
  }

  await db
    .delete(pendingUploadsTable)
    .where(eq(pendingUploadsTable.id, pending.id));

  const [file] = await db
    .insert(reachFilesTable)
    .values({ userId, ...body.data })
    .returning();

  await markOnboardingSurfaceComplete(userId, "reach");
  res.status(201).json(serializeDates(file));
});

router.delete("/reach/files/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = DeleteReachFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [file] = await db
    .select()
    .from(reachFilesTable)
    .where(and(eq(reachFilesTable.userId, userId), eq(reachFilesTable.id, params.data.id)));

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(file.objectPath);
    await objectStorageService.deleteObject(objectFile);
  } catch (err) {
    if (!(err instanceof ObjectNotFoundError)) {
      req.log.error({ err }, "Failed to delete object from storage");
    }
  }

  await db
    .delete(reachFilesTable)
    .where(and(eq(reachFilesTable.userId, userId), eq(reachFilesTable.id, params.data.id)));

  res.status(204).send();
});

export default router;
