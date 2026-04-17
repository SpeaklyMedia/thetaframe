import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  thetaMobileQuickCaptureIntentSchema,
  thetaMobileRequiredDeepLinks,
  thetaMobileQuickCaptureIntentTargets,
} from "@workspace/integration-contracts";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { requireModuleAccess } from "../middlewares/requireModuleAccess.js";
import {
  captureDailyQuickTaskForUser,
  DailyFrameValidationError,
} from "../lib/dailyFrames.js";
import {
  acknowledgeMobileNotificationOutboxItemForUser,
  LifeLedgerEventReminderError,
  listMobileDevicesForUser,
  listMobileNotificationOutboxForUser,
  MOBILE_DEVICE_PLATFORM_VALUES,
  markMobileNotificationOutboxItemSentForUser,
  deactivateMobileDeviceForUser,
  registerMobileDeviceForUser,
  simulateDispatchMobileNotificationOutboxItemForUser,
} from "../lib/lifeLedgerEventReminders.js";
import { markOnboardingSurfaceComplete } from "../lib/onboarding.js";

const router: IRouter = Router();
router.use("/mobile", requireAuth);

const mobileNotificationOutboxIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const mobileDeviceIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const registerMobileDeviceBody = z.object({
  installationId: z.string().min(1).max(255),
  deviceLabel: z.string().min(1).max(120),
  platform: z.enum(MOBILE_DEVICE_PLATFORM_VALUES),
});

const simulateDispatchBody = z.object({
  deviceId: z.number().int().positive().optional(),
});

const mobileQuickCaptureChannelValues = ["ios_shortcut", "android_shortcut"] as const;
const dailyQuickCaptureDeepLink =
  thetaMobileRequiredDeepLinks.find((deepLink) => deepLink.lane === "daily")?.uri ?? "thetaframe://daily/new";

const mobileQuickCaptureBody = z.object({
  intent: thetaMobileQuickCaptureIntentSchema.refine((value) => value === "current_work", {
    message: "Only current_work quick capture is supported in this slice.",
  }),
  text: z.string(),
  captureChannel: z.enum(mobileQuickCaptureChannelValues),
});

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

router.post(
  "/mobile/quick-capture",
  requireModuleAccess("daily"),
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;
    const parsed = mobileQuickCaptureBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    try {
      const resolvedLane = thetaMobileQuickCaptureIntentTargets[parsed.data.intent];
      const { frame, capturedTaskId } = await captureDailyQuickTaskForUser({
        userId,
        date: getTodayDateString(),
        text: parsed.data.text,
      });

      await markOnboardingSurfaceComplete(userId, "daily");

      res.json({
        lane: resolvedLane,
        route: "/daily",
        deepLink: dailyQuickCaptureDeepLink,
        dailyFrame: frame,
        capturedTaskId,
      });
    } catch (error) {
      if (error instanceof DailyFrameValidationError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      throw error;
    }
  },
);

router.get("/mobile/devices", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const items = await listMobileDevicesForUser(userId);
  res.json({ items });
});

router.post("/mobile/devices/register", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = registerMobileDeviceBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const item = await registerMobileDeviceForUser({
      userId,
      ...parsed.data,
    });
    res.json(item);
  } catch (error) {
    if (error instanceof LifeLedgerEventReminderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    throw error;
  }
});

router.post("/mobile/devices/:id/deactivate", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = mobileDeviceIdParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const item = await deactivateMobileDeviceForUser({
      userId,
      deviceId: params.data.id,
    });
    res.json(item);
  } catch (error) {
    if (error instanceof LifeLedgerEventReminderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    throw error;
  }
});

router.get("/mobile/notifications/outbox", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const items = await listMobileNotificationOutboxForUser(userId);
  res.json({ items });
});

router.post("/mobile/notifications/:id/mark-sent", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = mobileNotificationOutboxIdParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const item = await markMobileNotificationOutboxItemSentForUser({
      userId,
      outboxId: params.data.id,
    });
    res.json(item);
  } catch (error) {
    if (error instanceof LifeLedgerEventReminderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    throw error;
  }
});

router.post("/mobile/notifications/:id/simulate-dispatch", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = mobileNotificationOutboxIdParams.safeParse(req.params);
  const parsedBody = simulateDispatchBody.safeParse(req.body ?? {});

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  try {
    const item = await simulateDispatchMobileNotificationOutboxItemForUser({
      userId,
      outboxId: params.data.id,
      deviceId: parsedBody.data.deviceId,
    });
    res.json(item);
  } catch (error) {
    if (error instanceof LifeLedgerEventReminderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    throw error;
  }
});

router.post("/mobile/notifications/:id/acknowledge", requireModuleAccess("life-ledger"), async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const params = mobileNotificationOutboxIdParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const item = await acknowledgeMobileNotificationOutboxItemForUser({
      userId,
      outboxId: params.data.id,
    });
    res.json(item);
  } catch (error) {
    if (error instanceof LifeLedgerEventReminderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    throw error;
  }
});

export default router;
