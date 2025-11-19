import { Request, Response } from "express";
import { pool } from "../../config/db.js";

/**
 * Créer un tournoi
 */
export const createTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description, start_date, end_date, max_teams } = req.body;
    const organizerId = (req as any).user?.userId;

    // Validation
    if (!name || !start_date || !end_date) {
      res.status(400).json({
        success: false,
        message: "Nom et dates sont requis",
      });
      return;
    }

    // Insérer le tournoi
    const [result] = await pool.query(
      `INSERT INTO tournaments (name, description, start_date, end_date, max_teams, organizer_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, start_date, end_date, max_teams || 16, organizerId]
    );

    const tournamentId = (result as any).insertId;

    res.status(201).json({
      success: true,
      message: "Tournoi créé avec succès",
      data: {
        id: tournamentId,
        name,
        description,
        start_date,
        end_date,
        max_teams: max_teams || 16,
      },
    });
  } catch (error) {
    console.error("Erreur création tournoi:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du tournoi",
    });
  }
};

/**
 * Récupérer tous les tournois
 */
export const getAllTournaments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [tournaments] = await pool.query(`
            SELECT t.*, u.username as organizer_name,
                   COUNT(DISTINCT te.id) as teams_count
            FROM tournaments t
            LEFT JOIN users u ON t.organizer_id = u.id
            LEFT JOIN teams te ON t.id = te.tournament_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);

    res.status(200).json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    console.error("Erreur récupération tournois:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des tournois",
    });
  }
};

/**
 * Récupérer un tournoi par ID
 */
export const getTournamentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const [tournaments] = await pool.query(
      `
            SELECT t.*, u.username as organizer_name,
                   COUNT(DISTINCT te.id) as teams_count
            FROM tournaments t
            LEFT JOIN users u ON t.organizer_id = u.id
            LEFT JOIN teams te ON t.id = te.tournament_id
            WHERE t.id = ?
            GROUP BY t.id
        `,
      [id]
    );

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      res.status(404).json({
        success: false,
        message: "Tournoi non trouvé",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: tournaments[0],
    });
  } catch (error) {
    console.error("Erreur récupération tournoi:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du tournoi",
    });
  }
};

/**
 * Mettre à jour un tournoi
 */
export const updateTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date, max_teams, status } =
      req.body;
    const userId = (req as any).user?.userId;

    // Vérifier que l'utilisateur est l'organisateur
    const [tournaments] = await pool.query(
      "SELECT organizer_id FROM tournaments WHERE id = ?",
      [id]
    );

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      res.status(404).json({
        success: false,
        message: "Tournoi non trouvé",
      });
      return;
    }

    const tournament = tournaments[0] as any;

    if (tournament.organizer_id !== userId) {
      res.status(403).json({
        success: false,
        message: "Non autorisé à modifier ce tournoi",
      });
      return;
    }

    // Mettre à jour
    await pool.query(
      `UPDATE tournaments 
             SET name = ?, description = ?, start_date = ?, end_date = ?, 
                 max_teams = ?, status = ?
             WHERE id = ?`,
      [name, description, start_date, end_date, max_teams, status, id]
    );

    res.status(200).json({
      success: true,
      message: "Tournoi mis à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur mise à jour tournoi:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du tournoi",
    });
  }
};

/**
 * Supprimer un tournoi
 */
export const deleteTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // Vérifier l'organisateur
    const [tournaments] = await pool.query(
      "SELECT organizer_id FROM tournaments WHERE id = ?",
      [id]
    );

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      res.status(404).json({
        success: false,
        message: "Tournoi non trouvé",
      });
      return;
    }

    const tournament = tournaments[0] as any;

    if (tournament.organizer_id !== userId) {
      res.status(403).json({
        success: false,
        message: "Non autorisé à supprimer ce tournoi",
      });
      return;
    }

    // Supprimer
    await pool.query("DELETE FROM tournaments WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "Tournoi supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression tournoi:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du tournoi",
    });
  }
};
