import { create } from 'zustand';
import api from '@/services/api';


interface PlayerStats {
  user_id: string;
  chess_games_played: number;
  chess_wins: number;
  chess_losses: number;
  chess_draws: number;
  chess_win_rate: number;
  chess_rating: number;
  peak_rating: number;
  current_win_streak: number;
  best_win_streak: number;
  last_game_at: string | null;
  total_playtime_seconds: number;
  updated_at: string;
}


interface GameResult {
  game_id: string;
  game_type: string;
  white_player_id: string;
  white_player_name: string;
  black_player_id: string;
  black_player_name: string;
  winner_id: string | null;
  result: string;
  move_count: number;
  duration_seconds: number | null;
  played_at: string;
}


interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar: string | null;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  win_streak: number;
}


interface HeadToHeadStats {
  total_games: number;
  user1_wins: number;
  user2_wins: number;
  draws: number;
  recent_games: GameResult[];
}


interface StatsStore {
  myStats: PlayerStats | null;
  viewedPlayerStats: PlayerStats | null;
  matchHistory: GameResult[];
  leaderboard: LeaderboardEntry[];
  headToHead: HeadToHeadStats | null;
  loading: boolean;
  error: string | null;

  fetchMyStats: () => Promise<void>;
  fetchPlayerStats: (userId: string) => Promise<void>;
  fetchMatchHistory: (limit?: number) => Promise<void>;
  fetchLeaderboard: (limit?: number) => Promise<void>;
  fetchHeadToHead: (opponentId: string) => Promise<void>;
  clearViewedPlayer: () => void;
  clearHeadToHead: () => void;
}


export const useStatsStore = create<StatsStore>((set) => ({
  myStats: null,
  viewedPlayerStats: null,
  matchHistory: [],
  leaderboard: [],
  headToHead: null,
  loading: false,
  error: null,

  fetchMyStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await api.get('/stats/me') as PlayerStats;
      set({ myStats: stats, loading: false });
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to fetch stats',
        loading: false
      });
    }
  },

  fetchPlayerStats: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const stats = await api.get(`/stats/user/${userId}`) as PlayerStats;
      set({ viewedPlayerStats: stats, loading: false });
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to fetch player stats',
        loading: false
      });
    }
  },

  fetchMatchHistory: async (limit = 50) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/stats/history?limit=${limit}`) as { games: GameResult[] };
      set({ matchHistory: data.games, loading: false });
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to fetch match history',
        loading: false
      });
    }
  },

  fetchLeaderboard: async (limit = 100) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/stats/leaderboard?limit=${limit}`) as { leaderboard: LeaderboardEntry[] };
      set({ leaderboard: data.leaderboard, loading: false });
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to fetch leaderboard',
        loading: false
      });
    }
  },

  fetchHeadToHead: async (opponentId: string) => {
    set({ loading: true, error: null });
    try {
      const stats = await api.get(`/stats/head-to-head/${opponentId}`) as HeadToHeadStats;
      set({ headToHead: stats, loading: false });
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to fetch head-to-head stats',
        loading: false
      });
    }
  },

  clearViewedPlayer: () => {
    set({ viewedPlayerStats: null });
  },

  clearHeadToHead: () => {
    set({ headToHead: null });
  },
}));
