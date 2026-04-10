import { type NextFunction, type Request, type Response } from "express";
import { type AuthenticatedRequest } from "./requireAuth.js";
import {
  detectEnvironment,
  ensureEnvironmentModules,
  getUserAndMaybeBootstrap,
  type AppModule,
} from "../lib/access.js";

export function requireModuleAccess(module: AppModule) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      await getUserAndMaybeBootstrap(userId, req.log);
      const modules = await ensureEnvironmentModules(userId, detectEnvironment());

      if (!modules.includes(module)) {
        req.log.warn(
          {
            route: "require_module_access",
            userId,
            module,
          },
          "Forbidden request: user does not have module access",
        );
        res.status(403).json({ error: "Forbidden", module });
        return;
      }

      next();
    } catch (error) {
      req.log.error(
        {
          err: error,
          route: "require_module_access",
          userId,
          module,
        },
        "Failed to resolve module access",
      );
      res.status(500).json({ error: "Failed to resolve module access" });
    }
  };
}
