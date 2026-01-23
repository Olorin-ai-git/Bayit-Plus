export interface SystemStats {
  total_users_with_quotas: number;
  active_sessions: number;
  total_subtitle_minutes_today: number;
  total_dubbing_minutes_today: number;
  total_cost_today: number;
  total_cost_month: number;
}

export interface TopUser {
  user_id: string;
  user_name: string;
  user_email: string;
  subtitle_minutes: number;
  dubbing_minutes: number;
  total_cost: number;
}

export interface UsageReport {
  total_sessions: number;
  total_minutes: number;
  total_cost: number;
}
