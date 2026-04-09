import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, userModesTable } from "@workspace/db";
import {
  GetUserModeResponse,
  UpsertUserModeBody,
  UpsertUserModeResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/user-mode", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const [mode] = await db
    .select()
    .from(userModesTable)
    .where(eq(userModesTable.userId, userId));

  if (!mode) {
    res.status(404).json({ error: "User mode not found" });
    return;
  }

  res.json(GetUserModeResponse.parse(serializeDates(mode)));
});

router.put("/user-mode", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = UpsertUserModeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [mode] = await db
    .insert(userModesTable)
    .values({
      userId,
      mode: body.data.mode,
      colourState: body.data.colourState,
    })
    .onConflictDoUpdate({
      target: [userModesTable.userId],
      set: {
        mode: body.data.mode,
        colourState: body.data.colourState,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(UpsertUserModeResponse.parse(serializeDates(mode)));
});

export default router;
