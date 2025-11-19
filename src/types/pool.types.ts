export interface Pool {
  id: number;
  tournament_id: number;
  name: string;
  pool_order: number;
  created_at: Date;
}

export interface PoolPlayer {
  id: number;
  pool_id: number;
  user_id: number;
  ranking: number | null;
  wins: number;
  losses: number;
  forfeits: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
}

export interface CreatePool {
  tournament_id: number;
  name: string;
  pool_order: number;
}

export interface AddPlayerToPool {
  pool_id: number;
  user_id: number;
}
