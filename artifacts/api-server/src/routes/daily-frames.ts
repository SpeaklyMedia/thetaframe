import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, dailyFramesTable } from "@workspace/db";
import {
  ListDailyFramesResponse,
  CreateDailyFrameBody,
  CreateDailyFrameResponse,
  GetDailyFrameParams,
  GetDailyFrameResponse,
  UpsertDailyFrameParams,
  UpsertDailyFrameBody,
  UpsertDailyFrameResponse,
  GetRecentDailyFramesResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import { serializeDates, isValidDateString } from "../lib/serialize.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";

const router: IRouter = Router();
router.use(requireAuth, requireModuleAccess("daily"));

router.get("/daily-frames", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const frames = await db
    .select()
    .from(dailyFramesTable)
    .where(eq(dailyFramesTable.userId, userId))
    .orderBy(desc(dailyFramesTable.date));

  res.json(ListDailyFramesResponse.parse(frames.map(serializeDates)));
});

router.post("/daily-frames", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const body = CreateDailyFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.tierA.length > 3) {
    res.status(400).json({ error: "Tier A may not contain more than 3 tasks." });
    return;
  }

  const [frame] = await db
    .insert(dailyFramesTable)
    .values({
      userId,
      date: body.data.date,
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

  await markOnboardingSurfaceComplete(userId, "daily");
  res.json(CreateDailyFrameResponse.parse(serializeDates(frame)));
});

router.get("/daily-frames/recent", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const frames = await db
    .select()
    .from(dailyFramesTable)
    .where(eq(dailyFramesTable.userId, userId))
    .orderBy(desc(dailyFramesTable.date))
    .limit(7);

  res.json(GetRecentDailyFramesResponse.parse(frames.map(serializeDates)));
});

router.get("/daily-frames/:date", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = GetDailyFrameParams.safeParse(req.params);
  if (!params.success) {
    req.log.warn(
      {
        route: "get_daily_frame",
        userId,
        params: req.params,
      },
      "Daily frame request rejected: invalid route params",
    );
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!isValidDateString(params.data.date)) {
    req.log.warn(
      {
        route: "get_daily_frame",
        userId,
        date: params.data.date,
      },
      "Daily frame request rejected: invalid date format",
    );
    res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
    return;
  }

  req.log.info(
    {
      route: "get_daily_frame",
      userId,
      date: params.data.date,
      path: req.path,
    },
    "Daily frame request received",
  );

  try {
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
      req.log.info(
        {
          route: "get_daily_frame",
          userId,
          date: params.data.date,
          outcome: "not_found",
        },
        "Daily frame not found",
      );
      res.status(404).json({ error: "Daily frame not found" });
      return;
    }

    req.log.info(
      {
        route: "get_daily_frame",
        userId,
        date: params.data.date,
        outcome: "found",
        frameId: frame.id,
      },
      "Daily frame loaded",
    );

    res.json(GetDailyFrameResponse.parse(serializeDates(frame)));
  } catch (error) {
    req.log.error(
      {
        err: error,
        route: "get_daily_frame",
        userId,
        date: params.data.date,
      },
      "Daily frame request failed unexpectedly",
    );
    res.status(500).json({ error: "Failed to load daily frame" });
  }
});

router.put("/daily-frames/:date", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const params = UpsertDailyFrameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!isValidDateString(params.data.date)) {
    res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
    return;
  }

  const body = UpsertDailyFrameBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.tierA.length > 3) {
    res.status(400).json({ error: "Tier A may not contain more than 3 tasks." });
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

  await markOnboardingSurfaceComplete(userId, "daily");
  res.json(UpsertDailyFrameResponse.parse(serializeDates(frame)));
});

export default router;
