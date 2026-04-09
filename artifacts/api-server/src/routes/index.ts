import { Router } from "express";
import healthRouter from "./health.js";
import dailyFramesRouter from "./daily-frames.js";
import weeklyFramesRouter from "./weekly-frames.js";
import visionFramesRouter from "./vision-frames.js";
import userModeRouter from "./user-mode.js";
import bizdevRouter from "./bizdev.js";
import lifeLedgerRouter from "./life-ledger.js";
import reachRouter from "./reach.js";
import storageRouter from "./storage.js";
import adminRouter from "./admin.js";
import meRouter from "./me.js";

const router = Router();

router.use(healthRouter);
router.use(dailyFramesRouter);
router.use(weeklyFramesRouter);
router.use(visionFramesRouter);
router.use(userModeRouter);
router.use(bizdevRouter);
router.use(lifeLedgerRouter);
router.use(reachRouter);
router.use(storageRouter);
router.use(adminRouter);
router.use(meRouter);

export default router;
