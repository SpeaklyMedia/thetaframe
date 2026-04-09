import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { db } from "@workspace/db";
import { accessPermissionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function detectEnvironment(): string {
  if (process.env.REPLIT_DEPLOYMENT === "1") return "production";
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "staging") return "staging";
  return "development";
}

const ALL_MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"] as const;
const ALL_ENVIRONMENTS = ["development", "staging", "production"] as const;

router.get("/me/permissions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const environment = detectEnvironment();

  const perms = await db
    .select()
    .from(accessPermissionsTable)
    .where(eq(accessPermissionsTable.userId, userId));

  const envPerms = perms.filter((p) => p.environment === environment);

  if (envPerms.length === 0) {
    const rows = ALL_MODULES.map((module) => ({ userId, module, environment }));
    await db.insert(accessPermissionsTable).values(rows).onConflictDoNothing();

    res.json({
      modules: [...ALL_MODULES],
      environment,
    });
    return;
  }

  res.json({
    modules: envPerms.map((p) => p.module),
    environment,
  });
});

export default router;
