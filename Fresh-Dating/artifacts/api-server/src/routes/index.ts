import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import discoveryRouter from "./discovery.js";
import likesRouter from "./likes.js";
import matchesRouter from "./matches.js";
import usersRouter from "./users.js";
import billingRouter from "./billing.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/discovery", discoveryRouter);
router.use("/profiles", profileRouter);
router.use("/likes", likesRouter);
router.use("/matches", matchesRouter);
router.use("/users", usersRouter);
router.use("/billing", billingRouter);

export default router;
