import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import applicantsRouter from "./applicants";
import notesRouter from "./notes";
import webhookRouter from "./webhook";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(applicantsRouter);
router.use(notesRouter);
router.use(webhookRouter);
router.use(statsRouter);

export default router;
