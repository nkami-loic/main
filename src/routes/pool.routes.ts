import { Router } from "express";
import {
  createPool,
  getPoolsByTournament,
  getPoolById,
  addPlayerToPool,
  removePlayerFromPool,
  deletePool,
} from "../controllers/pool.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { isOrganizer } from "../middlewares/tournament.middleware.js";

const router = Router();
router.post("/", authenticateToken, isOrganizer, createPool);
router.get(
  "/tournament/:tournamentId",
  authenticateToken,
  getPoolsByTournament
);
router.get("/:id", authenticateToken, getPoolById);
router.post("/:id/players", authenticateToken, isOrganizer, addPlayerToPool);
router.delete(
  "/:id/players/:userId",
  authenticateToken,
  isOrganizer,
  removePlayerFromPool
);
router.delete("/:id", authenticateToken, isOrganizer, deletePool);

export default router;
