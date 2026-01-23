/**
 * Type definitions for Live Quota management
 */

export interface QuotaData {
  subtitle_minutes_per_hour: number;
  subtitle_minutes_per_day: number;
  subtitle_minutes_per_month: number;
  dubbing_minutes_per_hour: number;
  dubbing_minutes_per_day: number;
  dubbing_minutes_per_month: number;
  subtitle_usage_current_hour: number;
  subtitle_usage_current_day: number;
  subtitle_usage_current_month: number;
  dubbing_usage_current_hour: number;
  dubbing_usage_current_day: number;
  dubbing_usage_current_month: number;
  accumulated_subtitle_minutes: number;
  accumulated_dubbing_minutes: number;
  estimated_cost_current_month: number;
  max_rollover_multiplier?: number;
  warning_threshold_percentage?: number;
  notes?: string;
  limit_extended_by?: string;
  limit_extended_at?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  subscription_tier: string;
}
