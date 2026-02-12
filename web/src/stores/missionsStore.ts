import { create } from 'zustand';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';

const missionsLogger = logger.scope('MissionsStore');

interface MissionData {
  id: string;
  type: string;
  title: string;
  title_he: string;
  description: string;
  description_he: string;
  icon_name: string;
  target_value: number;
  current_value: number;
  reward_amount: number;
  status: 'active' | 'completed' | 'claimed' | 'expired';
  expires_at: string;
  completed_at?: string;
  claimed_at?: string;
}

interface WalletBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  streak: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
  my_rank: number | null;
  scope: 'global' | 'friends' | 'family';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

interface MissionsStore {
  dailyMissions: MissionData[];
  walletBalance: WalletBalance | null;
  leaderboard: LeaderboardData | null;
  loadingMissions: boolean;
  loadingBalance: boolean;
  loadingLeaderboard: boolean;
  error: string | null;

  fetchDailyMissions: (profileId?: string) => Promise<void>;
  claimMission: (missionId: string, profileId?: string) => Promise<void>;
  fetchBalance: (profileId?: string) => Promise<void>;
  fetchLeaderboard: (
    scope: 'global' | 'friends' | 'family',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time',
    page?: number,
    profileId?: string
  ) => Promise<void>;
}

export const useMissionsStore = create<MissionsStore>((set, get) => ({
  dailyMissions: [],
  walletBalance: null,
  leaderboard: null,
  loadingMissions: false,
  loadingBalance: false,
  loadingLeaderboard: false,
  error: null,

  fetchDailyMissions: async (profileId?: string) => {
    set({ loadingMissions: true, error: null });
    try {
      const params = profileId ? { profile_id: profileId } : {};
      const data = await api.get('/missions/daily', { params }) as { missions: MissionData[] };
      set({ dailyMissions: data.missions || [], loadingMissions: false });
      missionsLogger.info('Fetched daily missions', { count: data.missions?.length || 0 });
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch missions';
      set({ error: errorMessage, loadingMissions: false, dailyMissions: [] });
      missionsLogger.error('Failed to fetch daily missions', error);
    }
  },

  claimMission: async (missionId: string, profileId?: string) => {
    set({ error: null });
    try {
      const body = profileId ? { profile_id: profileId } : {};
      await api.post(`/missions/${missionId}/claim`, body);
      missionsLogger.info('Claimed mission', { missionId });
      await get().fetchDailyMissions(profileId);
      await get().fetchBalance(profileId);
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to claim mission';
      set({ error: errorMessage });
      missionsLogger.error('Failed to claim mission', error);
      throw error;
    }
  },

  fetchBalance: async (profileId?: string) => {
    set({ loadingBalance: true, error: null });
    try {
      const params = profileId ? { profile_id: profileId } : {};
      const data = await api.get('/shekels/balance', { params }) as WalletBalance;
      set({ walletBalance: data, loadingBalance: false });
      missionsLogger.info('Fetched wallet balance', { balance: data.balance });
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch balance';
      set({ error: errorMessage, loadingBalance: false, walletBalance: null });
      missionsLogger.error('Failed to fetch balance', error);
    }
  },

  fetchLeaderboard: async (
    scope: 'global' | 'friends' | 'family',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time',
    page: number = 1,
    profileId?: string
  ) => {
    set({ loadingLeaderboard: true, error: null });
    try {
      const params: any = { scope, period, page };
      if (profileId) {
        params.profile_id = profileId;
      }
      const data = await api.get('/leaderboard/', { params }) as LeaderboardData;
      set({ leaderboard: { ...data, scope, period }, loadingLeaderboard: false });
      missionsLogger.info('Fetched leaderboard', { scope, period, entries: data.entries?.length || 0 });
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch leaderboard';
      set({ error: errorMessage, loadingLeaderboard: false, leaderboard: null });
      missionsLogger.error('Failed to fetch leaderboard', error);
    }
  },
}));
