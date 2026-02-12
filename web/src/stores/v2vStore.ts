import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  V2VTransformResult,
  V2VSessionSummary,
  V2VStore,
} from './v2vStore.types';

const v2vLogger = logger.scope('V2VStore');

export const useV2VStore = create<V2VStore>((set) => ({
  lastResult: null,
  sessions: [],
  loading: false,
  error: null,
  wsConnected: false,

  transformVoice: async (
    avatarId: string,
    profileId: string,
    audioBase64: string,
    targetPhraseHe: string,
  ) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/zeh-ani/v2v/transform', {
        avatar_id: avatarId,
        profile_id: profileId,
        audio_base64: audioBase64,
        target_phrase_he: targetPhraseHe,
      }) as V2VTransformResult;
      set({ lastResult: data, loading: false });
      v2vLogger.info('Voice transform completed', {
        avatarId,
        latencyMs: String(data.latency_ms),
        scoreDelta: String(data.score_delta),
      });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.v2v.errors.transformFailed'),
        loading: false,
      });
      v2vLogger.error('Voice transform failed', error);
    }
  },

  fetchSessions: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(
        `/zeh-ani/v2v/sessions/${profileId}`,
      ) as V2VSessionSummary[];
      set({ sessions: data || [], loading: false });
      v2vLogger.info('Fetched V2V sessions', {
        profileId,
        count: String(data?.length || 0),
      });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.v2v.errors.fetchSessionsFailed'),
        loading: false,
      });
      v2vLogger.error('Failed to fetch V2V sessions', error);
    }
  },

  clearError: () => set({ error: null }),
}));
