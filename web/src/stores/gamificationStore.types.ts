export interface GamificationProfile {
  current_level: number;
  current_xp: number;
  total_xp: number;
  xp_to_next_level: number;
  level_title: string;
  level_title_he: string;
  unlocked_perks: UnlockedPerk[];
  missions_completed: number;
  mirror_sessions: number;
  talk_back_attempts: number;
}

export interface UnlockedPerk {
  perk_id: string;
  perk_type: string;
  level_unlocked: number;
  unlocked_at: string;
}

export interface LevelDefinition {
  level: number;
  title: string;
  title_he: string;
  xp_threshold: number;
  perk_outfit: string;
}

export interface LeaderboardEntry {
  profile_id: string;
  level: number;
  total_xp: number;
  level_title: string;
  rank: number;
}

export interface GamificationStore {
  profile: GamificationProfile | null;
  levels: LevelDefinition[];
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  error: string | null;

  fetchProfile: (profileId: string) => Promise<void>;
  fetchLevels: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  claimPerk: (profileId: string, perkId: string) => Promise<boolean>;
  clearError: () => void;
}
