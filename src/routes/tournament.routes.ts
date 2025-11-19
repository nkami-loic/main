import { Router } from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
} from "../controllers/tournament.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { isOrganizer } from "../middlewares/role.middleware.js";

const router = Router();

router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);
router.post("/", authenticateToken, isOrganizer, createTournament);
router.put("/:id", authenticateToken, isOrganizer, updateTournament);
router.delete("/:id", authenticateToken, isOrganizer, deleteTournament);

export default router;
