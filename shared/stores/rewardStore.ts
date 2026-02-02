/**
 * Reward Store
 * Manages user rewards, badges, and stats for kids quiz feature.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getPlatformStorage } from '../utils/storage';

export interface Badge {
  badge_id: string;
  name: string;
  name_he: string;
  description: string;
  description_he: string;
  icon_url: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points_bonus: number;
  earned: boolean;
  earned_date?: string;
}

export interface RewardStats {
  total_points: number;
  quizzes_completed: number;
  perfect_scores: number;
  current_streak: number;
  longest_streak: number;
}

interface RewardState {
  stats: RewardStats | null;
  earnedBadges: Badge[];
  allBadges: Badge[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface RewardActions {
  fetchRewards: (profileId?: string) => Promise<void>;
  fetchBadges: () => Promise<void>;
  fetchStats: (profileId?: string) => Promise<void>;
  addEarnedBadge: (badge: Badge) => void;
  updateStats: (stats: Partial<RewardStats>) => void;
  clearRewards: () => void;
}

export type RewardStore = RewardState & RewardActions;

const initialState: RewardState = {
  stats: null,
  earnedBadges: [],
  allBadges: [],
  isLoading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const useRewardStore = create<RewardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchRewards: async (profileId?: string) => {
        const { lastFetched } = get();
        const now = Date.now();

        if (lastFetched && now - lastFetched < CACHE_TTL_MS) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { rewardsService } = await import('../services/api');
          const rewards = await rewardsService.getMyRewards(profileId);

          set({
            stats: {
              total_points: rewards.total_points,
              quizzes_completed: rewards.quizzes_completed,
              perfect_scores: rewards.perfect_scores,
              current_streak: rewards.current_streak,
              longest_streak: rewards.longest_streak,
            },
            earnedBadges: rewards.earned_badges,
            isLoading: false,
            lastFetched: now,
          });
        } catch (error: any) {
          const message = error?.message || 'Failed to load rewards';
          set({ isLoading: false, error: message });
        }
      },

      fetchBadges: async () => {
        try {
          const { rewardsService } = await import('../services/api');
          const badges = await rewardsService.getAllBadges();
          set({ allBadges: badges });
        } catch (error: any) {
          const message = error?.message || 'Failed to load badges';
          set({ error: message });
        }
      },

      fetchStats: async (profileId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { rewardsService } = await import('../services/api');
          const stats = await rewardsService.getRewardStats(profileId);

          set({
            stats: {
              total_points: stats.total_points,
              quizzes_completed: stats.quizzes_completed,
              perfect_scores: 0,
              current_streak: stats.current_streak,
              longest_streak: 0,
            },
            isLoading: false,
          });
        } catch (error: any) {
          const message = error?.message || 'Failed to load stats';
          set({ isLoading: false, error: message });
        }
      },

      addEarnedBadge: (badge: Badge) => {
        const { earnedBadges } = get();
        const exists = earnedBadges.some((b) => b.badge_id === badge.badge_id);
        if (!exists) {
          set({ earnedBadges: [...earnedBadges, badge] });
        }
      },

      updateStats: (updates: Partial<RewardStats>) => {
        const { stats } = get();
        if (stats) {
          set({ stats: { ...stats, ...updates } });
        } else {
          set({
            stats: {
              total_points: updates.total_points || 0,
              quizzes_completed: updates.quizzes_completed || 0,
              perfect_scores: updates.perfect_scores || 0,
              current_streak: updates.current_streak || 0,
              longest_streak: updates.longest_streak || 0,
            },
          });
        }
      },

      clearRewards: () => {
        set(initialState);
      },
    }),
    {
      name: 'bayit-rewards-store',
      storage: createJSONStorage(() => getPlatformStorage()),
      partialize: (state) => ({
        stats: state.stats,
        earnedBadges: state.earnedBadges,
        allBadges: state.allBadges,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

export default useRewardStore;
