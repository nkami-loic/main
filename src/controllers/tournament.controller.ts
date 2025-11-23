import { Response, Request } from "express";
import { pool } from "../../config/db.js";
import { AuthenticatedRequest } from "../types/auth.types.js";
import {
  CreateTournamentRequest,
  UpdateTournamentRequest,
  Tournament,
} from "../types/tournament.types.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// creation tournoi
export const createTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      start_date,
      end_date,
      min_players = 4,
      max_players = 16,
      default_win_score_set1 = 6,
      default_win_score_set2 = 6,
      default_loss_score_set1 = 0,
      default_loss_score_set2 = 0,
      forfeit_deadline_hours = 24,
    } = req.body as CreateTournamentRequest;
    const userId = (req as any).user?.id;
    // Validation
    if (!name || !start_date || !end_date) {
      res.status(400).json({
        error: "Données manquantes",
        message: "Le nom, la date de début et la date de fin sont obligatoires",
      });
      return;
    }

    // Vérifier que la date de début est avant la date de fin
    if (new Date(start_date) >= new Date(end_date)) {
      res.status(400).json({
        error: "Dates invalides",
        message: "La date de début doit être avant la date de fin",
      });
      return;
    }

    // Vérifier que min_players <= max_players
    if (min_players > max_players) {
      res.status(400).json({
        error: "Paramètres invalides",
        message: "Le nombre minimum de joueurs ne peut pas dépasser le maximum",
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tournaments (
                name, description, start_date, end_date,
                min_players, max_players, status, organizer_id,
                default_win_score_set1, default_win_score_set2,
                default_loss_score_set1, default_loss_score_set2,
                forfeit_deadline_hours
            ) VALUES (?, ?, ?, ?, ?, ?, 'registration', ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        start_date,
        end_date,
        min_players,
        max_players,
        userId,
        default_win_score_set1,
        default_win_score_set2,
        default_loss_score_set1,
        default_loss_score_set2,
        forfeit_deadline_hours,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Tournoi créé avec succès",
      tournament: {
        id: result.insertId,
        name,
        description,
        start_date,
        end_date,
        status: "registration",
      },
    });
  } catch (error) {
    console.error("Erreur création tournoi:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de créer le tournoi",
    });
  }
};

//lister tous les tournois
export const getAllTournaments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, organizer_id } = req.query;

    let query = `
            SELECT 
                t.*,
                u.name as organizer_first_name,
                COUNT(DISTINCT r.id) as registered_players
            FROM tournaments t
            LEFT JOIN users u ON t.organizer_id = u.id
            LEFT JOIN registrations r ON t.id = r.tournament_id AND r.status = 'active'
            WHERE 1=1
        `;

    const params: any[] = [];

    if (status) {
      query += " AND t.status = ?";
      params.push(status);
    }

    if (organizer_id) {
      query += " AND t.organizer_id = ?";
      params.push(organizer_id);
    }

    query += " GROUP BY t.id ORDER BY t.start_date DESC";

    const [tournaments] = await pool.query<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      count: tournaments.length,
      tournaments,
    });
  } catch (error) {
    console.error("Erreur récupération tournois:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de récupérer les tournois",
    });
  }
};

// recuperer un tournoi par son id
export const getTournamentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id);

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    // Récupérer le tournoi
    const [tournaments] = await pool.query<RowDataPacket[]>(
      `SELECT 
                t.*,
                u.first_name as organizer_first_name,
                u.last_name as organizer_last_name,
                u.email as organizer_email
            FROM tournaments t
            LEFT JOIN users u ON t.organizer_id = u.id
            WHERE t.id = ?`,
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

    // Récupérer les joueurs inscrits
    const [players] = await pool.query<RowDataPacket[]>(
      `SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                r.registration_date,
                r.status
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            WHERE r.tournament_id = ? AND r.status = 'active'
            ORDER BY r.registration_date ASC`,
      [tournamentId]
    );

    res.json({
      success: true,
      tournament: {
        ...tournament,
        registered_players: players,
        player_count: players.length,
      },
    });
  } catch (error) {
    console.error("Erreur récupération tournoi:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de récupérer le tournoi",
    });
  }
};

// mettre a jour un tournoi
export const updateTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id);
    const updates = req.body as UpdateTournamentRequest;

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    // Vérifier que le tournoi existe
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT status FROM tournaments WHERE id = ?",
      [tournamentId]
    );

    if (tournaments.length === 0) {
      res.status(404).json({
        error: "Tournoi non trouvé",
        message: "Ce tournoi n'existe pas",
      });
      return;
    }

    // Construire la requête de mise à jour dynamiquement
    const allowedFields = [
      "name",
      "description",
      "start_date",
      "end_date",
      "min_players",
      "max_players",
      "default_win_score_set1",
      "default_win_score_set2",
      "default_loss_score_set1",
      "default_loss_score_set2",
      "forfeit_deadline_hours",
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.keys(updates).forEach((key) => {
      if (
        allowedFields.includes(key) &&
        updates[key as keyof UpdateTournamentRequest] !== undefined
      ) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key as keyof UpdateTournamentRequest]);
      }
    });

    if (updateFields.length === 0) {
      res.status(400).json({
        error: "Aucune modification",
        message: "Aucun champ valide à mettre à jour",
      });
      return;
    }

    updateValues.push(tournamentId);

    await pool.query(
      `UPDATE tournaments SET ${updateFields.join(
        ", "
      )}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: "Tournoi mis à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur mise à jour tournoi:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de mettre à jour le tournoi",
    });
  }
};

// supprimer un tournoi
export const deleteTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id);

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM tournaments WHERE id = ?",
      [tournamentId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        error: "Tournoi non trouvé",
        message: "Ce tournoi n'existe pas",
      });
      return;
    }

    res.json({
      success: true,
      message: "Tournoi supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression tournoi:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de supprimer le tournoi",
    });
  }
};

// s'inscrire a un tournoi
export const registerToTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = (req as any).user?.id;

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    // Vérifier que le tournoi existe et est en phase d'inscription
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT id, status, max_players FROM tournaments WHERE id = ?",
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

    if (tournament.status !== "registration") {
      res.status(400).json({
        error: "Inscriptions fermées",
        message: "Les inscriptions pour ce tournoi sont fermées",
      });
      return;
    }

    // Vérifier si l'utilisateur est déjà inscrit
    const [existingRegistrations] = await pool.query<RowDataPacket[]>(
      "SELECT id, status FROM registrations WHERE tournament_id = ? AND user_id = ?",
      [tournamentId, userId]
    );

    if (existingRegistrations.length > 0) {
      const registration = existingRegistrations[0];
      if (registration.status === "active") {
        res.status(400).json({
          error: "Déjà inscrit",
          message: "Vous êtes déjà inscrit à ce tournoi",
        });
        return;
      }
    }

    // Vérifier le nombre de places disponibles
    const [registrationCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM registrations WHERE tournament_id = ? AND status = "active"',
      [tournamentId]
    );

    if (registrationCount[0].count >= tournament.max_players) {
      res.status(400).json({
        error: "Tournoi complet",
        message: "Le nombre maximum de joueurs est atteint",
      });
      return;
    }

    // Inscrire l'utilisateur
    await pool.query(
      'INSERT INTO registrations (tournament_id, user_id, status) VALUES (?, ?, "active")',
      [tournamentId, userId]
    );

    res.status(201).json({
      success: true,
      message: "Inscription réussie",
    });
  } catch (error) {
    console.error("Erreur inscription tournoi:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de s'inscrire au tournoi",
    });
  }
};

// se desinscrire d'un tournoi
export const unregisterFromTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = (req as any).user?.id;

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    // Vérifier que le tournoi est en phase d'inscription
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT status FROM tournaments WHERE id = ?",
      [tournamentId]
    );

    if (tournaments.length === 0) {
      res.status(404).json({
        error: "Tournoi non trouvé",
        message: "Ce tournoi n'existe pas",
      });
      return;
    }

    if (tournaments[0].status !== "registration") {
      res.status(400).json({
        error: "Impossible de se désinscrire",
        message: "Le tournoi a déjà commencé",
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE registrations SET status = "withdrawn" WHERE tournament_id = ? AND user_id = ? AND status = "active"',
      [tournamentId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(400).json({
        error: "Non inscrit",
        message: "Vous n'êtes pas inscrit à ce tournoi",
      });
      return;
    }

    res.json({
      success: true,
      message: "Désinscription réussie",
    });
  } catch (error) {
    console.error("Erreur désinscription tournoi:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Impossible de se désinscrire du tournoi",
    });
  }
};
