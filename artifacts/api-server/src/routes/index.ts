import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import attendanceRouter from "./attendance";
import dashboardRouter from "./dashboard";
import excelRouter from "./excel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(attendanceRouter);
router.use(dashboardRouter);
router.use(excelRouter);

export default router;
