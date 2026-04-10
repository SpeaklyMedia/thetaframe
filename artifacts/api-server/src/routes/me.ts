import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import {
  detectEnvironment,
  ensureEnvironmentModules,
  getUserAndMaybeBootstrap,
} from "../lib/access.js";

const router = Router();

router.get("/me/permissions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const environment = detectEnvironment();
  await getUserAndMaybeBootstrap(userId, req.log);
  const modules = await ensureEnvironmentModules(userId, environment);

  res.json({
    modules,
    environment,
  });
});

export default router;
