import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, reachFilesTable } from "@workspace/db";
import {
  CreateReachFileBody,
  DeleteReachFileParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { serializeDates } from "../lib/serialize";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.get("/reach/files", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const files = await db
    .select()
    .from(reachFilesTable)
    .where(eq(reachFilesTable.userId, userId))
    .orderBy(reachFilesTable.createdAt);

  res.json(files.map(serializeDates));
});

router.post("/reach/files", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateReachFileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (!body.data.objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }

  const [file] = await db
    .insert(reachFilesTable)
    .values({ userId, ...body.data })
    .returning();

  res.status(201).json(serializeDates(file));
});

router.delete("/reach/files/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
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
