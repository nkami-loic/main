import { Request, Response } from "express";
import { pool } from "../../config/db.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: "player" | "organizer";
  };
}

// creation pool
export const createPool = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tournament_id, name, pool_order } = req.body;
    const organizerId = (req as any).user?.id;

    // Vérifier que le tournoi existe et appartient à l'organisateur
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM tournaments WHERE id = ? AND organizer_id = ?",
      [tournament_id, organizerId]
    );

    if (tournaments.length === 0) {
      res.status(404).json({
        error: "Tournoi non trouvé",
        message: "Ce tournoi n'existe pas ou vous n'êtes pas l'organisateur",
      });
      return;
    }

    // Si pool_order n'est pas fourni, prendre le prochain numéro
    let orderValue = pool_order;
    if (!orderValue) {
      const [pools] = await pool.query<RowDataPacket[]>(
        "SELECT MAX(pool_order) as max_order FROM pools WHERE tournament_id = ?",
        [tournament_id]
      );
      orderValue = (pools[0].max_order || 0) + 1;
    }

    // Créer la poule
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO pools (tournament_id, name, pool_order) VALUES (?, ?, ?)",
      [tournament_id, name, orderValue]
    );

    res.status(201).json({
      message: "Poule créée avec succès",
      poolId: result.insertId,
      pool: {
        id: result.insertId,
        tournament_id,
        name,
        pool_order: orderValue,
      },
    });
  } catch (error) {
    console.error("Erreur création poule:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue lors de la création de la poule",
    });
  }
};

//recuperation de toutes les poules du tournoi
export const getPoolsByTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);

    if (isNaN(tournamentId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID du tournoi doit être un nombre",
      });
      return;
    }

    const [pools] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.*,
        COUNT(DISTINCT pp.user_id) as player_count,
        COUNT(DISTINCT m.id) as match_count
       FROM pools p
       LEFT JOIN pool_players pp ON p.id = pp.pool_id
       LEFT JOIN matches m ON p.id = m.pool_id
       WHERE p.tournament_id = ?
       GROUP BY p.id
       ORDER BY p.pool_order`,
      [tournamentId]
    );

    res.json({ pools });
  } catch (error) {
    console.error("Erreur récupération poules:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

//recuperation d'une poule avec ses joueurs
export const getPoolById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const poolId = parseInt(req.params.id);

    // Récupérer les infos de la poule
    const [pools] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.name as tournament_name
       FROM pools p
       JOIN tournaments t ON p.tournament_id = t.id
       WHERE p.id = ?`,
      [poolId]
    );

    if (pools.length === 0) {
      res.status(404).json({
        error: "Poule non trouvée",
        message: "Cette poule n'existe pas",
      });
      return;
    }

    // Récupérer les joueurs avec classement
    const [players] = await pool.query<RowDataPacket[]>(
      `SELECT 
        pp.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        (pp.sets_won - pp.sets_lost) as set_differential,
        (pp.games_won - pp.games_lost) as game_differential
       FROM pool_players pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.pool_id = ?
       ORDER BY 
         pp.wins DESC,
         pp.losses ASC,
         set_differential DESC,
         game_differential DESC`,
      [poolId]
    );

    res.json({
      pool: pools[0],
      players: players,
    });
  } catch (error) {
    console.error("Erreur récupération poule:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

// ajouter un joueur à une poule
export const addPlayerToPool = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const poolId = parseInt(req.params.id);
    const { user_id } = req.body;
    const organizerId = (req as any).user?.id;

    if (isNaN(poolId)) {
      res.status(400).json({
        error: "ID invalide",
        message: "L'ID de la poule doit être un nombre",
      });
      return;
    }

    // Vérifier que la poule existe et que l'utilisateur est l'organisateur
    const [pools] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.organizer_id
       FROM pools p
       JOIN tournaments t ON p.tournament_id = t.id
       WHERE p.id = ?`,
      [poolId]
    );

    if (pools.length === 0) {
      res.status(404).json({
        error: "Poule non trouvée",
        message: "Cette poule n'existe pas",
      });
      return;
    }

    if (pools[0].organizer_id !== organizerId) {
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }
    console.log("🔍 pools[0].tournament_id:", pools[0].tournament_id);
    console.log("🔍 user_id:", user_id);
    // Vérifier que le joueur est inscrit au tournoi
    const [registrations] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM registrations WHERE tournament_id = ? AND user_id = ? AND status = 'active'",
      [pools[0].tournament_id, user_id]
    );

    if (registrations.length === 0) {
      res.status(400).json({
        error: "Joueur non inscrit",
        message: "Ce joueur n'est pas inscrit ou accepté dans ce tournoi",
      });
      return;
    }

    // Vérifier si le joueur n'est pas déjà dans la poule
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM pool_players WHERE pool_id = ? AND user_id = ?",
      [poolId, user_id]
    );

    if (existing.length > 0) {
      res.status(400).json({
        error: "Joueur déjà dans la poule",
        message: "Ce joueur est déjà dans cette poule",
      });
      return;
    }

    // Ajouter le joueur à la poule
    await pool.query(
      "INSERT INTO pool_players (pool_id, user_id) VALUES (?, ?)",
      [poolId, user_id]
    );

    res.status(201).json({
      message: "Joueur ajouté à la poule avec succès",
    });
  } catch (error) {
    console.error("Erreur ajout joueur poule:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

// retirer un joueur d'une poule
export const removePlayerFromPool = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const poolId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const organizerId = req.user?.userId;

    // Vérifier que l'utilisateur est l'organisateur
    const [pools] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.organizer_id
       FROM pools p
       JOIN tournaments t ON p.tournament_id = t.id
       WHERE p.id = ?`,
      [poolId]
    );

    if (pools.length === 0 || pools[0].organizer_id !== organizerId) {
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }

    // Supprimer le joueur de la poule
    await pool.query(
      "DELETE FROM pool_players WHERE pool_id = ? AND user_id = ?",
      [poolId, userId]
    );

    res.json({ message: "Joueur retiré de la poule avec succès" });
  } catch (error) {
    console.error("Erreur suppression joueur poule:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

// suppression d'une poule
export const deletePool = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const poolId = parseInt(req.params.id);
    const organizerId = req.user?.userId;

    // Vérifier que l'utilisateur est l'organisateur
    const [pools] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.organizer_id
       FROM pools p
       JOIN tournaments t ON p.tournament_id = t.id
       WHERE p.id = ?`,
      [poolId]
    );

    if (pools.length === 0 || pools[0].organizer_id !== organizerId) {
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }

    // Supprimer la poule (cascade supprimera les joueurs et matches)
    await pool.query("DELETE FROM pools WHERE id = ?", [poolId]);

    res.json({ message: "Poule supprimée avec succès" });
  } catch (error) {
    console.error("Erreur suppression poule:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};
