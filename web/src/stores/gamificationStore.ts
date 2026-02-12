import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  GamificationProfile,
  LevelDefinition,
  LeaderboardEntry,
  GamificationStore,
} from './gamificationStore.types';

const gamificationLogger = logger.scope('GamificationStore');

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  profile: null,
  levels: [],
  leaderboard: [],
  loading: false,
  error: null,

  fetchProfile: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/gamification/profile', {
        params: { profile_id: profileId },
      }) as GamificationProfile;
      set({ profile: data, loading: false });
      gamificationLogger.info('Fetched gamification profile', {
        profileId,
        level: String(data.current_level),
        xp: String(data.current_xp),
      });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('gamification.errors.fetchProfileFailed'),
        loading: false,
      });
      gamificationLogger.error('Failed to fetch gamification profile', error);
    }
  },

  fetchLevels: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/gamification/levels') as LevelDefinition[];
      set({ levels: data || [], loading: false });
      gamificationLogger.info('Fetched gamification levels', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('gamification.errors.fetchLevelsFailed'),
        loading: false,
      });
      gamificationLogger.error('Failed to fetch gamification levels', error);
    }
  },

  fetchLeaderboard: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/gamification/leaderboard') as LeaderboardEntry[];
      set({ leaderboard: data || [], loading: false });
      gamificationLogger.info('Fetched gamification leaderboard', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('gamification.errors.fetchLeaderboardFailed'),
        loading: false,
      });
      gamificationLogger.error('Failed to fetch gamification leaderboard', error);
    }
  },

  claimPerk: async (profileId: string, perkId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/gamification/claim-perk', {
        profile_id: profileId,
        perk_id: perkId,
      });
      set({ loading: false });
      gamificationLogger.info('Claimed perk', { profileId, perkId });
      await get().fetchProfile(profileId);
      return true;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('gamification.errors.claimPerkFailed'),
        loading: false,
      });
      gamificationLogger.error('Failed to claim perk', error);
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
