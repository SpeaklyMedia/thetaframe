import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates } from "../lib/serialize.js";
import {
  FamilyCareValidationError,
  createFamilyCareEventBodySchema,
  createFamilyCareEventForUser,
  deleteFamilyCareEventForUser,
  familyCareContextBodySchema,
  familyCareEventIdParamsSchema,
  familyCareEventInputSchema,
  familyCareHandoffBodySchema,
  getFamilyCareForUser,
  updateFamilyCareEventForUser,
  upsertFamilyCareContextForUser,
  upsertFamilyCareHandoffForUser,
} from "../lib/familyCare.js";

const router: IRouter = Router();
router.use("/family-care", requireAuth, requireModuleAccess("daily"));

function respondWithFamilyCareError(error: unknown, res: Response): boolean {
  if (error instanceof FamilyCareValidationError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  return false;
}

router.get("/family-care", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  res.json(serializeDates(await getFamilyCareForUser(userId)));
});

router.put("/family-care/context", async (req: Request, res: Response): Promise<void> => {
  const body = familyCareContextBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  res.json(serializeDates(await upsertFamilyCareContextForUser(userId, body.data)));
});

router.post("/family-care/events", async (req: Request, res: Response): Promise<void> => {
  const body = createFamilyCareEventBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const event = await createFamilyCareEventForUser(userId, body.data);
    res.status(201).json(serializeDates(event));
  } catch (error) {
    if (!respondWithFamilyCareError(error, res)) throw error;
  }
});

router.put("/family-care/events/:eventId", async (req: Request, res: Response): Promise<void> => {
  const params = familyCareEventIdParamsSchema.safeParse(req.params);
  const body = familyCareEventInputSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    const message = !params.success ? params.error.message : !body.success ? body.error.message : "Invalid request.";
    res.status(400).json({ error: message });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const event = await updateFamilyCareEventForUser({ userId, eventId: params.data.eventId, data: body.data });
    res.json(serializeDates(event));
  } catch (error) {
    if (!respondWithFamilyCareError(error, res)) throw error;
  }
});

router.delete("/family-care/events/:eventId", async (req: Request, res: Response): Promise<void> => {
  const params = familyCareEventIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  try {
    await deleteFamilyCareEventForUser(userId, params.data.eventId);
    res.status(204).send();
  } catch (error) {
    if (!respondWithFamilyCareError(error, res)) throw error;
  }
});

router.put("/family-care/handoff", async (req: Request, res: Response): Promise<void> => {
  const body = familyCareHandoffBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  res.json(serializeDates(await upsertFamilyCareHandoffForUser(userId, body.data)));
});

export default router;
