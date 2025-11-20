import { Request, Response } from "express";
import { pool } from "../../config/db.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthRequest } from "#types/auth.types";

//
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

// Récupérer tous les matches d'une poule
export const getMatchesByPool = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const poolId = parseInt(req.params.poolId);

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

// Récupérer tous les matches d'un tournoi
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

// Récupérer un match avec ses résultats détaillés
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
        p1.first_name as player1_first_name,
        p1.last_name as player1_last_name,
        p1.email as player1_email,
        p2.first_name as player2_first_name,
        p2.last_name as player2_last_name,
        p2.email as player2_email,
        w.first_name as winner_first_name,
        w.last_name as winner_last_name,
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

// Mettre à jour un match
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

// Ajouter ou mettre à jour le résultat d'un set
export const updateMatchResult = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const matchId = parseInt(req.params.id);
    const { set_number, player1_score, player2_score } = req.body;

    //VALIDATION DES DONNÉES
    if (
      !set_number ||
      player1_score === undefined ||
      player2_score === undefined
    ) {
      return res.status(400).json({
        error: "Données manquantes : set_number, player1_score, player2_score",
      });
    }

    if (set_number < 1 || set_number > 3) {
      return res.status(400).json({
        error: "Le numéro de set doit être entre 1 et 3",
      });
    }

    await connection.beginTransaction();

    // Récupérer le match
    const [matchRows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM matches WHERE id = ?",
      [matchId]
    );

    if (matchRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Match non trouvé" });
    }

    const match = matchRows[0];

    if (match.status === "completed") {
      await connection.rollback();
      return res.status(400).json({
        error: "Ce match est déjà terminé",
      });
    }

    //  ENREGISTRER LE RÉSULTAT DU SET
    await connection.query(
      `INSERT INTO match_results 
       (match_id, set_number, player1_score, player2_score, is_tiebreak, is_super_tiebreak) 
       VALUES (?, ?, ?, ?, 0, 0)
       ON DUPLICATE KEY UPDATE 
         player1_score = VALUES(player1_score),
         player2_score = VALUES(player2_score)`,
      [matchId, set_number, player1_score, player2_score]
    );

    // COMPTER LES SETS GAGNÉS PAR CHAQUE JOUEUR
    const [setsResults] = await connection.query<RowDataPacket[]>(
      `SELECT 
         SUM(CASE WHEN player1_score > player2_score THEN 1 ELSE 0 END) as player1_sets,
         SUM(CASE WHEN player2_score > player1_score THEN 1 ELSE 0 END) as player2_sets
       FROM match_results 
       WHERE match_id = ?`,
      [matchId]
    );

    const player1Sets = setsResults[0]?.player1_sets || 0;
    const player2Sets = setsResults[0]?.player2_sets || 0;

    console.log(`Sets actuels - J1: ${player1Sets}, J2: ${player2Sets}`);

    // DÉTERMINER SI LE MATCH EST TERMINÉ (un joueur a 2 sets)
    if (player1Sets === 2 || player2Sets === 2) {
      const winnerId = player1Sets === 2 ? match.player1_id : match.player2_id;

      console.log(`Match ${matchId} terminé ! Gagnant: joueur ${winnerId}`);

      // Mettre à jour le match comme terminé
      await connection.query(
        `UPDATE matches 
         SET status = 'completed', 
             winner_id = ?,
             completed_date = NOW()
         WHERE id = ?`,
        [winnerId, matchId]
      );

      // METTRE À JOUR LE CLASSEMENT DE LA POULE
      if (match.pool_id) {
        console.log(
          `🔄 Mise à jour du classement de la poule ${match.pool_id}...`
        );
        await updatePoolStandings(connection, match.pool_id);
      }

      await connection.commit();

      res.json({
        message: "Résultat du set enregistré avec succès",
        match_status: "completed",
        winner_id: winnerId,
        sets: {
          player1: player1Sets,
          player2: player2Sets,
        },
      });
    } else {
      // Match toujours en cours
      await connection.query(
        `UPDATE matches 
         SET status = 'in_progress'
         WHERE id = ?`,
        [matchId]
      );

      await connection.commit();

      res.json({
        message: "Résultat du set enregistré avec succès",
        match_status: "in_progress",
        sets: {
          player1: player1Sets,
          player2: player2Sets,
        },
      });
    }
  } catch (error) {
    await connection.rollback();
    console.error("Erreur mise à jour résultat:", error);
    res.status(500).json({
      error: "Erreur lors de la mise à jour du résultat",
    });
  } finally {
    connection.release();
  }
};

//  Recalcul automatique du classement d'une poule
async function updatePoolStandings(
  connection: any,
  poolId: number
): Promise<void> {
  console.log(` Calcul du classement pour la poule ${poolId}...`);

  // Récupérer tous les matches terminés de la poule
  const [matchesResult] = await connection.query(
    `SELECT * FROM matches 
     WHERE pool_id = ? AND status = 'completed'`,
    [poolId]
  );

  const matches = matchesResult as RowDataPacket[];

  if (matches.length === 0) {
    console.log(`ℹ Aucun match terminé dans la poule ${poolId}`);
    return;
  }

  // Calculer les stats pour chaque joueur
  const stats: Record<
    number,
    {
      wins: number;
      losses: number;
      sets_won: number;
      sets_lost: number;
    }
  > = {};

  // Pour chaque match terminé
  for (const match of matches) {
    const p1Id = match.player1_id;
    const p2Id = match.player2_id;

    // Initialiser les stats si nécessaire
    if (!stats[p1Id]) {
      stats[p1Id] = { wins: 0, losses: 0, sets_won: 0, sets_lost: 0 };
    }
    if (!stats[p2Id]) {
      stats[p2Id] = { wins: 0, losses: 0, sets_won: 0, sets_lost: 0 };
    }

    // Compter les sets depuis match_results
    const [setsResults] = await connection.query(
      `SELECT 
         SUM(CASE WHEN player1_score > player2_score THEN 1 ELSE 0 END) as player1_sets,
         SUM(CASE WHEN player2_score > player1_score THEN 1 ELSE 0 END) as player2_sets
       FROM match_results 
       WHERE match_id = ?`,
      [match.id]
    );

    const p1Sets = setsResults[0]?.player1_sets || 0;
    const p2Sets = setsResults[0]?.player2_sets || 0;

    // Mettre à jour les statistiques
    stats[p1Id].sets_won += p1Sets;
    stats[p1Id].sets_lost += p2Sets;
    stats[p2Id].sets_won += p2Sets;
    stats[p2Id].sets_lost += p1Sets;

    // Déterminer le gagnant et le perdant
    if (match.winner_id === p1Id) {
      stats[p1Id].wins++;
      stats[p2Id].losses++;
    } else if (match.winner_id === p2Id) {
      stats[p2Id].wins++;
      stats[p1Id].losses++;
    }
  }

  // Mettre à jour tous les joueurs de la poule
  for (const [playerId, playerStats] of Object.entries(stats)) {
    await connection.query(
      `UPDATE pool_players 
       SET wins = ?, 
           losses = ?, 
           sets_won = ?, 
           sets_lost = ?,
           set_differential = ?
       WHERE pool_id = ? AND user_id = ?`,
      [
        playerStats.wins,
        playerStats.losses,
        playerStats.sets_won,
        playerStats.sets_lost,
        playerStats.sets_won - playerStats.sets_lost,
        poolId,
        parseInt(playerId),
      ]
    );

    console.log(
      ` Stats joueur ${playerId} : ${playerStats.wins}V-${playerStats.losses}D, Sets: ${playerStats.sets_won}-${playerStats.sets_lost}`
    );
  }

  console.log(`Classement de la poule ${poolId} mis à jour !`);
}

// Supprimer un match
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
