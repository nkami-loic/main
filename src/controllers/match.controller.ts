import { Request, Response } from "express";
import { pool } from "../../config/db.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthRequest } from "#types/auth.types";

//Créer un match dans une poule
export const createMatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tournament_id, pool_id, player1_id, player2_id, scheduled_date } =
      req.body;
    const organizerId = (req as any).user?.id;

    // Vérifier que l'utilisateur est l'organisateur du tournoi
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT organizer_id FROM tournaments WHERE id = ?",
      [tournament_id]
    );

    if (tournaments.length === 0) {
      res.status(404).json({
        error: "Tournoi non trouvé",
        message: "Ce tournoi n'existe pas",
      });
      return;
    }

    if (tournaments[0].organizer_id !== organizerId) {
      console.log(organizerId), console.log(tournaments[0].organizer_id);
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }

    // Vérifier que la poule existe et appartient au tournoi
    const [pools] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM pools WHERE id = ? AND tournament_id = ?",
      [pool_id, tournament_id]
    );

    if (pools.length === 0) {
      res.status(404).json({
        error: "Poule non trouvée",
        message: "Cette poule n'existe pas ou n'appartient pas à ce tournoi",
      });
      return;
    }

    // Vérifier que les joueurs sont dans la poule (si assignés)
    if (player1_id) {
      const [p1] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM pool_players WHERE pool_id = ? AND user_id = ?",
        [pool_id, player1_id]
      );
      if (p1.length === 0) {
        res.status(400).json({
          error: "Joueur non trouvé",
          message: "Le joueur 1 n'est pas dans cette poule",
        });
        return;
      }
    }

    if (player2_id) {
      const [p2] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM pool_players WHERE pool_id = ? AND user_id = ?",
        [pool_id, player2_id]
      );
      if (p2.length === 0) {
        res.status(400).json({
          error: "Joueur non trouvé",
          message: "Le joueur 2 n'est pas dans cette poule",
        });
        return;
      }
    }

    // Créer le match
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO matches (tournament_id, pool_id, player1_id, player2_id, scheduled_date, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        tournament_id,
        pool_id,
        player1_id || null,
        player2_id || null,
        scheduled_date || null,
      ]
    );

    res.status(201).json({
      message: "Match créé avec succès",
      match: {
        id: result.insertId,
        tournament_id,
        pool_id,
        player1_id,
        player2_id,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Erreur création match:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue lors de la création du match",
    });
  }
};

//Récupérer tous les matches d'une poule
export const getMatchesByPool = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const poolId = parseInt(req.params.poolId);

    const [matches] = await pool.query<RowDataPacket[]>(
      `SELECT 
        m.*,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name,
        po.name as pool_name
       FROM matches m
       LEFT JOIN users p1 ON m.player1_id = p1.id
       LEFT JOIN users p2 ON m.player2_id = p2.id
       LEFT JOIN users w ON m.winner_id = w.id
       LEFT JOIN pools po ON m.pool_id = po.id
       WHERE m.pool_id = ?
       ORDER BY m.scheduled_date ASC`,
      [poolId]
    );

    res.json({ matches });
  } catch (error) {
    console.error("Erreur récupération matches:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

//Récupérer tous les matches d'un tournoi
export const getMatchesByTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);

    const [matches] = await pool.query<RowDataPacket[]>(
      `SELECT 
        m.*,
        p1.first_name as player1_first_name,
        p1.last_name as player1_last_name,
        p2.first_name as player2_first_name,
        p2.last_name as player2_last_name,
        w.first_name as winner_first_name,
        w.last_name as winner_last_name,
        po.name as pool_name
       FROM matches m
       LEFT JOIN users p1 ON m.player1_id = p1.id
       LEFT JOIN users p2 ON m.player2_id = p2.id
       LEFT JOIN users w ON m.winner_id = w.id
       LEFT JOIN pools po ON m.pool_id = po.id
       WHERE m.tournament_id = ?
       ORDER BY po.pool_order, m.scheduled_date ASC`,
      [tournamentId]
    );

    res.json({ matches });
  } catch (error) {
    console.error("Erreur récupération matches:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

//Récupérer un match avec ses résultats détaillés
export const getMatchById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const matchId = parseInt(req.params.id);

    // Récupérer le match
    const [matches] = await pool.query<RowDataPacket[]>(
      `SELECT 
        m.*,
        p1.name as player1_name,
        p1.email as player1_email,
        p2.name as player2_name,
        p2.email as player2_email,
        w.name as winner_name,
        po.name as pool_name
       FROM matches m
       LEFT JOIN users p1 ON m.player1_id = p1.id
       LEFT JOIN users p2 ON m.player2_id = p2.id
       LEFT JOIN users w ON m.winner_id = w.id
       LEFT JOIN pools po ON m.pool_id = po.id
       WHERE m.id = ?`,
      [matchId]
    );

    if (matches.length === 0) {
      res.status(404).json({
        error: "Match non trouvé",
        message: "Ce match n'existe pas",
      });
      return;
    }

    // Récupérer les résultats des sets
    const [sets] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM match_results 
       WHERE match_id = ? 
       ORDER BY set_number ASC`,
      [matchId]
    );

    res.json({
      match: matches[0],
      sets: sets,
    });
  } catch (error) {
    console.error("Erreur récupération match:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

//Mettre à jour un match
export const updateMatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const matchId = parseInt(req.params.id);
    const { player1_id, player2_id, scheduled_date, status, winner_id } =
      req.body;
    const organizerId = req.user?.userId;

    // Vérifier que le match existe
    const [matches] = await pool.query<RowDataPacket[]>(
      "SELECT tournament_id FROM matches WHERE id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      res.status(404).json({
        error: "Match non trouvé",
        message: "Ce match n'existe pas",
      });
      return;
    }

    // Vérifier que l'utilisateur est l'organisateur
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT organizer_id FROM tournaments WHERE id = ?",
      [matches[0].tournament_id]
    );

    if (tournaments[0].organizer_id !== organizerId) {
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }

    // Construire la requête de mise à jour
    const updates: string[] = [];
    const values: any[] = [];

    if (player1_id !== undefined) {
      updates.push("player1_id = ?");
      values.push(player1_id);
    }
    if (player2_id !== undefined) {
      updates.push("player2_id = ?");
      values.push(player2_id);
    }
    if (scheduled_date !== undefined) {
      updates.push("scheduled_date = ?");
      values.push(scheduled_date);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);

      // Si le match est terminé, ajouter la date
      if (status === "completed") {
        updates.push("completed_date = NOW()");
      }
    }
    if (winner_id !== undefined) {
      updates.push("winner_id = ?");
      values.push(winner_id);
    }

    if (updates.length === 0) {
      res.status(400).json({
        error: "Aucune donnée à mettre à jour",
        message: "Veuillez fournir au moins un champ à modifier",
      });
      return;
    }

    values.push(matchId);

    await pool.query(
      `UPDATE matches SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    res.json({
      message: "Match mis à jour avec succès",
      match: { id: matchId },
    });
  } catch (error) {
    console.error("Erreur mise à jour match:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

//Ajouter ou mettre à jour le résultat d'un set
export const updateMatchResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const matchId = parseInt(req.params.id);
    const {
      set_number,
      player1_score,
      player2_score,
      is_tiebreak,
      is_super_tiebreak,
    } = req.body;
    const organizerId = req.user?.userId;

    // Vérifier que le match existe
    const [matches] = await pool.query<RowDataPacket[]>(
      "SELECT tournament_id, status FROM matches WHERE id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      res.status(404).json({
        error: "Match non trouvé",
        message: "Ce match n'existe pas",
      });
      return;
    }
    if (![1, 2, 3].includes(set_number)) {
      res.status(400).json({
        error: "Set invalide",
        message: "Le numéro de set doit être 1, 2 ou 3",
      });
      return;
    }
    await pool.query(
      `INSERT INTO match_results (match_id, set_number, player1_score, player2_score, is_tiebreak, is_super_tiebreak)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         player1_score = VALUES(player1_score),
         player2_score = VALUES(player2_score),
         is_tiebreak = VALUES(is_tiebreak),
         is_super_tiebreak = VALUES(is_super_tiebreak)`,
      [
        matchId,
        set_number,
        player1_score,
        player2_score,
        is_tiebreak || false,
        is_super_tiebreak || false,
      ]
    );

    if (matches[0].status === "pending") {
      await pool.query(
        "UPDATE matches SET status = 'in_progress' WHERE id = ?",
        [matchId]
      );
    }

    res.json({
      message: "Résultat du set enregistré avec succès",
    });
  } catch (error) {
    console.error("Erreur mise à jour résultat:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};

//Supprimer un match
export const deleteMatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const matchId = parseInt(req.params.id);
    const organizerId = req.user?.userId;

    // Vérifier que le match existe
    const [matches] = await pool.query<RowDataPacket[]>(
      "SELECT tournament_id FROM matches WHERE id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      res.status(404).json({
        error: "Match non trouvé",
        message: "Ce match n'existe pas",
      });
      return;
    }

    // Vérifier que l'utilisateur est l'organisateur
    const [tournaments] = await pool.query<RowDataPacket[]>(
      "SELECT organizer_id FROM tournaments WHERE id = ?",
      [matches[0].tournament_id]
    );

    if (tournaments[0].organizer_id !== organizerId) {
      res.status(403).json({
        error: "Accès refusé",
        message: "Vous n'êtes pas l'organisateur de ce tournoi",
      });
      return;
    }

    await pool.query("DELETE FROM matches WHERE id = ?", [matchId]);

    res.json({ message: "Match supprimé avec succès" });
  } catch (error) {
    console.error("Erreur suppression match:", error);
    res.status(500).json({
      error: "Erreur serveur",
      message: "Une erreur est survenue",
    });
  }
};
