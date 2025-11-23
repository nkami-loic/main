export type TournamentStatus = "registration" | "pools" | "finished";
export type RegistrationStatus = "active" | "forfeit" | "withdrawn";

export interface Tournament {
  id?: number;
  name: string;
  description?: string;
  start_date: Date | string;
  end_date: Date | string;
  min_players: number;
  max_players: number;
  status: TournamentStatus;
  organizer_id: number;
  default_win_score_set1: number;
  default_win_score_set2: number;
  default_loss_score_set1: number;
  default_loss_score_set2: number;
  forfeit_deadline_hours: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Registration {
  id?: number;
  tournament_id: number;
  user_id: number;
  registration_date?: Date;
  status: RegistrationStatus;
}

export interface CreateTournamentRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  etat: string,
  organizer_id: string;
  min_players?: number;
  max_players?: number;
  default_win_score_set1?: number;
  default_win_score_set2?: number;
  default_loss_score_set1?: number;
  default_loss_score_set2?: number;
  forfeit_deadline_hours?: number;
}

export interface UpdateTournamentRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  min_players?: number;
  max_players?: number;
  default_win_score_set1?: number;
  default_win_score_set2?: number;
  default_loss_score_set1?: number;
  default_loss_score_set2?: number;
  forfeit_deadline_hours?: number;
}

export interface TournamentWithDetails extends Tournament {
  organizer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  registrations_count?: number;
  registered_players?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    registration_date: Date;
    status: RegistrationStatus;
  }[];
}
