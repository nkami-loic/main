import { Router } from "express";
import authRoutes from "./auth.routes.js";
import tournamentRoutes from "./tournament.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tournaments", tournamentRoutes);
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "API Tourneo fonctionne correctement",
    timestamp: new Date().toISOString(),
  });
});

export default router;
