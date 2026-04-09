import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dailyFramesRouter from "./daily-frames";
import weeklyFramesRouter from "./weekly-frames";
import visionFramesRouter from "./vision-frames";
import userModeRouter from "./user-mode";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dailyFramesRouter);
router.use(weeklyFramesRouter);
router.use(visionFramesRouter);
router.use(userModeRouter);

export default router;
