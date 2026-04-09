import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dailyFramesRouter from "./daily-frames";
import weeklyFramesRouter from "./weekly-frames";
import visionFramesRouter from "./vision-frames";
import userModeRouter from "./user-mode";
import bizdevRouter from "./bizdev";
import lifeLedgerRouter from "./life-ledger";
import reachRouter from "./reach";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dailyFramesRouter);
router.use(weeklyFramesRouter);
router.use(visionFramesRouter);
router.use(userModeRouter);
router.use(bizdevRouter);
router.use(lifeLedgerRouter);
router.use(reachRouter);
router.use(storageRouter);

export default router;
