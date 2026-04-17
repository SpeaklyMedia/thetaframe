import { Router } from "express";
import healthRouter from "./health.js";
import dailyFramesRouter from "./daily-frames.js";
import weeklyFramesRouter from "./weekly-frames.js";
import visionFramesRouter from "./vision-frames.js";
import userModeRouter from "./user-mode.js";
import bizdevRouter from "./bizdev.js";
import lifeLedgerRouter from "./life-ledger.js";
import reachRouter from "./reach.js";
import aiDraftsRouter from "./ai-drafts.js";
import storageRouter from "./storage.js";
import adminRouter from "./admin.js";
import meRouter from "./me.js";
import onboardingRouter from "./onboarding.js";
import mobileNotificationsRouter from "./mobile-notifications.js";

const router = Router();

router.use(healthRouter);
router.use(dailyFramesRouter);
router.use(weeklyFramesRouter);
router.use(visionFramesRouter);
router.use(userModeRouter);
router.use(bizdevRouter);
router.use(lifeLedgerRouter);
router.use(reachRouter);
router.use(aiDraftsRouter);
router.use(storageRouter);
router.use(adminRouter);
router.use(meRouter);
router.use(onboardingRouter);
router.use(mobileNotificationsRouter);

export default router;
