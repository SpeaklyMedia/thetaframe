import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";
import {
  GetUserPreferencesResponse,
  UpsertUserPreferencesBody,
  UpsertUserPreferencesResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";

const router: IRouter = Router();

const DEFAULT_USER_PREFERENCES = {
  reducedStimulation: "default",
  density: "comfortable",
  reminderTone: "gentle",
} as const;

function toUserPreferencesResponse(
  record: Partial<{
    reducedStimulation: string | null;
    density: string | null;
    reminderTone: string | null;
  }> | null | undefined,
) {
  return {
    reducedStimulation: record?.reducedStimulation ?? DEFAULT_USER_PREFERENCES.reducedStimulation,
    density: record?.density ?? DEFAULT_USER_PREFERENCES.density,
    reminderTone: record?.reminderTone ?? DEFAULT_USER_PREFERENCES.reminderTone,
  };
}

router.get("/user-preferences", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const [preferences] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));

  res.json(GetUserPreferencesResponse.parse(toUserPreferencesResponse(preferences)));
});

router.put("/user-preferences", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = UpsertUserPreferencesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [preferences] = await db
    .insert(userPreferencesTable)
    .values({
      userId,
      reducedStimulation: body.data.reducedStimulation,
      density: body.data.density,
      reminderTone: body.data.reminderTone,
    })
    .onConflictDoUpdate({
      target: [userPreferencesTable.userId],
      set: {
        reducedStimulation: body.data.reducedStimulation,
        density: body.data.density,
        reminderTone: body.data.reminderTone,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(UpsertUserPreferencesResponse.parse(toUserPreferencesResponse(preferences)));
});

export default router;
