import { Router } from "express";
import authRoutes from "./auth.routes.js";
import tournamentRoutes from "./tournament.routes.js";
import matchRoutes from "./match.routes.js";
import poolRoutes from "./pool.routes.js";
const router = Router();

router.use("/auth", authRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/matches", matchRoutes);
router.use("/pools", poolRoutes);

export default router;
