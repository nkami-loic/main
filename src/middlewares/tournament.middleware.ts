import { Response, NextFunction } from "express";
import { pool } from "../../config/db.js";
import { AuthenticatedRequest } from "../types/auth.types.js";
import { RowDataPacket } from "mysql2";

/**
 * Vérifie que l'utilisateur est l'organisateur du tournoi
 */
export const isTournamentOrganizer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT id, organizer_id FROM tournaments WHERE id = ?",
      [tournamentId]
    );

    if (tournaments.length === 0) {
      res.status(404).json({
        error: "Tournoi non trouvé",
        message: "Ce tournoi n'existe pas",
      });
      return;
    }

    const tournament = tournaments[0];

    if (tournament.organizer_id !== userId) {
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Erreur middleware organisateur:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

/**
 * Vérifie que l'utilisateur est organisateur (rôle)
 */
export const isOrganizer = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const userRole = req.user.role;

  if (userRole !== "organizer" && userRole !== "admin") {
    res.status(403).json({
      error: "Accès refusé",
      message: "Vous devez être organisateur pour effectuer cette action",
    });
    return;
  }
  next();
};
