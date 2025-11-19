import { Router } from "express";
import {
  createMatch,
  getMatchesByPool,
  getMatchesByTournament,
  getMatchById,
  updateMatch,
  updateMatchResult,
  deleteMatch,
} from "../controllers/match.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { isOrganizer } from "../middlewares/tournament.middleware.js";

const router = Router();
router.post("/", authenticateToken, isOrganizer, createMatch);
router.get("/pool/:poolId", authenticateToken, getMatchesByPool);
router.get(
  "/tournament/:tournamentId",
  authenticateToken,
  getMatchesByTournament
);
router.get("/:id", authenticateToken, getMatchById);
router.put("/:id", authenticateToken, isOrganizer, updateMatch);
router.put("/:id/result", authenticateToken, isOrganizer, updateMatchResult);
router.delete("/:id", authenticateToken, isOrganizer, deleteMatch);

export default router;
