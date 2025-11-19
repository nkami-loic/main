export interface Match {
  id: number;
  tournament_id: number;
  pool_id: number;
  player1_id: number | null;
  player2_id: number | null;
  winner_id: number | null;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "forfeit_player1"
    | "forfeit_player2"
    | "double_forfeit";
  scheduled_date: Date | null;
  completed_date: Date | null;
  created_at: Date;
}

export interface MatchResult {
  id: number;
  match_id: number;
  set_number: 1 | 2 | 3;
  player1_score: number;
  player2_score: number;
  is_tiebreak: boolean;
  is_super_tiebreak: boolean;
  created_at: Date;
}

export interface CreateMatchDto {
  tournament_id: number;
  pool_id: number;
  player1_id?: number;
  player2_id?: number;
  scheduled_date?: string;
}

export interface UpdateMatchDto {
  player1_id?: number;
  player2_id?: number;
  scheduled_date?: string;
  status?:
    | "pending"
    | "in_progress"
    | "completed"
    | "forfeit_player1"
    | "forfeit_player2"
    | "double_forfeit";
  winner_id?: number;
}

export interface UpdateMatchResultDto {
  set_number: 1 | 2 | 3;
  player1_score: number;
  player2_score: number;
  is_tiebreak?: boolean;
  is_super_tiebreak?: boolean;
}
