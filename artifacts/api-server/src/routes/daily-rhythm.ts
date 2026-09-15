import { Router, type IRouter, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates } from "../lib/serialize.js";
import {
  dailyRhythmDateParamsSchema,
  getDailyRhythmForUser,
  routineSessionParamsSchema,
  upsertDailyReflectionBodySchema,
  upsertDailyReflectionForUser,
  upsertRoutineSessionBodySchema,
  upsertRoutineSessionForUser,
} from "../lib/dailyRhythm.js";

const router: IRouter = Router();
router.use("/daily-rhythm", requireAuth, requireModuleAccess("daily"));

router.get(
  "/daily-rhythm/:date",
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;
    const params = dailyRhythmDateParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const rhythm = await getDailyRhythmForUser(userId, params.data.date);
    res.json(serializeDates(rhythm));
  },
);

router.put(
  "/daily-rhythm/:date/routine-sessions/:routineKey",
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;
    const params = routineSessionParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = upsertRoutineSessionBodySchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const session = await upsertRoutineSessionForUser({
      userId,
      date: params.data.date,
      routineKey: params.data.routineKey,
      data: body.data,
    });

    res.json(serializeDates(session));
  },
);

router.put(
  "/daily-rhythm/:date/reflection",
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;
    const params = dailyRhythmDateParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = upsertDailyReflectionBodySchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const reflection = await upsertDailyReflectionForUser({
      userId,
      date: params.data.date,
      data: body.data,
    });

    res.json(serializeDates(reflection));
  },
);

export default router;
