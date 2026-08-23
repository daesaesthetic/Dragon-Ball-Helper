import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botDashboardRouter from "./bot-dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botDashboardRouter);

export default router;
