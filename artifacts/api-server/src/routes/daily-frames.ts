import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, dailyFramesTable } from "@workspace/db";
import {
  GetDailyFrameParams,
  GetDailyFrameResponse,
  UpsertDailyFrameParams,
  UpsertDailyFrameBody,
  UpsertDailyFrameResponse,
  GetRecentDailyFramesResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/daily-frames/recent", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const frames = await db
    .select()
    .from(dailyFramesTable)
    .where(
      and(
        eq(dailyFramesTable.userId, userId),
      )
    )
    .orderBy(desc(dailyFramesTable.date))
    .limit(7);

  res.json(GetRecentDailyFramesResponse.parse(frames));
});

router.get("/daily-frames/:date", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetDailyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [frame] = await db
    .select()
    .from(dailyFramesTable)
    .where(
      and(
        eq(dailyFramesTable.userId, userId),
        eq(dailyFramesTable.date, params.data.date),
      )
    );

  if (!frame) {
    res.status(404).json({ error: "Daily frame not found" });
    return;
  }

  res.json(GetDailyFrameResponse.parse(frame));
});

router.put("/daily-frames/:date", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpsertDailyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpsertDailyFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [frame] = await db
    .insert(dailyFramesTable)
    .values({
      userId,
      date: params.data.date,
      colourState: body.data.colourState,
      tierA: body.data.tierA,
      tierB: body.data.tierB,
      timeBlocks: body.data.timeBlocks,
      microWin: body.data.microWin ?? null,
      skipProtocolUsed: body.data.skipProtocolUsed,
      skipProtocolChoice: body.data.skipProtocolChoice ?? null,
    })
    .onConflictDoUpdate({
      target: [dailyFramesTable.userId, dailyFramesTable.date],
      set: {
        colourState: body.data.colourState,
        tierA: body.data.tierA,
        tierB: body.data.tierB,
        timeBlocks: body.data.timeBlocks,
        microWin: body.data.microWin ?? null,
        skipProtocolUsed: body.data.skipProtocolUsed,
        skipProtocolChoice: body.data.skipProtocolChoice ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(UpsertDailyFrameResponse.parse(frame));
});

export default router;
