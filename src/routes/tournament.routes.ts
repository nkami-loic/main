import { Router } from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  registerToTournament,
  unregisterFromTournament,
} from "../controllers/tournament.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  isTournamentOrganizer,
  isOrganizer,
} from "../middlewares/tournament.middleware.js";

const router = Router();

router.get("/", getAllTournaments);
router.get("/:id", authenticateToken, getTournamentById);
router.post("/", createTournament);
router.put("/:id", authenticateToken, isTournamentOrganizer, updateTournament);
router.delete(
  "/:id",
  deleteTournament
);

router.post("/:id/register", authenticateToken, registerToTournament);
router.delete("/:id/register", authenticateToken, unregisterFromTournament);

export default router;
