import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { accessPermissionsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const router = Router();

function detectEnvironment(): string {
  if (process.env.REPLIT_DEPLOYMENT === "1") return "production";
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "staging") return "staging";
  return "development";
}

router.get("/me/permissions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const environment = detectEnvironment();

  const perms = await db
    .select()
    .from(accessPermissionsTable)
    .where(
      and(
        eq(accessPermissionsTable.userId, userId),
        eq(accessPermissionsTable.environment, environment),
      ),
    );

  res.json({
    modules: perms.map((p) => p.module),
    environment,
  });
});

export default router;
