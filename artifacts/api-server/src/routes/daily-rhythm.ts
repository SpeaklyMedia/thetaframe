import { Router, type IRouter, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates } from "../lib/serialize.js";
import {
  DailyRhythmValidationError,
  dailyRhythmDateParamsSchema,
  getDailyRhythmForUser,
  patchDailyReflectionBodySchema,
  patchDailyReflectionForUser,
  routineSessionParamsSchema,
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

    try {
      const rhythm = await getDailyRhythmForUser(userId, params.data.date);
      res.json(serializeDates(rhythm));
    } catch (error) {
      if (error instanceof DailyRhythmValidationError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
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

    try {
      const session = await upsertRoutineSessionForUser({
        userId,
        date: params.data.date,
        routineKey: params.data.routineKey,
        data: body.data,
      });

      res.json(serializeDates(session));
    } catch (error) {
      if (error instanceof DailyRhythmValidationError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/daily-rhythm/:date/reflection",
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;
    const params = dailyRhythmDateParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = patchDailyReflectionBodySchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    try {
      const reflection = await patchDailyReflectionForUser({
        userId,
        date: params.data.date,
        data: body.data,
      });

      res.json(serializeDates(reflection));
    } catch (error) {
      if (error instanceof DailyRhythmValidationError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
  },
);

export default router;
