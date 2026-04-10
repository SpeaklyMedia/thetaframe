import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import {
  detectEnvironment,
  ensureEnvironmentModules,
  getUserAndMaybeBootstrap,
  isAdminUser,
} from "../lib/access.js";
import { listOnboardingProgressForUser } from "../lib/onboarding.js";

const router = Router();

router.get("/onboarding", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const user = await getUserAndMaybeBootstrap(userId, req.log);
    const modules = await ensureEnvironmentModules(userId, detectEnvironment());
    const surfaces = await listOnboardingProgressForUser(
      userId,
      isAdminUser(user) ? [...modules, "admin"] : modules,
    );

    res.json({ surfaces });
  } catch (error) {
    req.log.error(
      {
        err: error,
        route: "get_onboarding_progress",
        userId,
      },
      "Failed to load onboarding progress",
    );
    res.status(500).json({ error: "Failed to load onboarding progress" });
  }
});

export default router;
