import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import { v2vResultSchema, v2vSessionsSchema, v2vErrorText } from './v2vData';
import type {
  V2VStore,
} from './v2vStore.types';

const v2vLogger = logger.scope('V2VStore');
let transformGeneration = 0;
let sessionsGeneration = 0;

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
    const generation = ++transformGeneration;
    set({ loading: true, error: null, lastResult: null });
    try {
      const data = v2vResultSchema.parse(await api.post('/zeh-ani/v2v/transform', {
        avatar_id: avatarId,
        profile_id: profileId,
        audio_base64: audioBase64,
        target_phrase_he: targetPhraseHe,
      }));
      if (generation !== transformGeneration) return;
      set({ lastResult: data, loading: false });
      v2vLogger.info('Voice transform completed', {
        avatarId,
        latencyMs: String(data.latency_ms),
        scoreDelta: String(data.score_delta),
      });
    } catch (error: unknown) {
      if (generation !== transformGeneration) return;
      set({
        error: v2vErrorText(error, i18n.t('zehAni.v2v.errors.transformFailed')),
        loading: false,
      });
      v2vLogger.error('Voice transform failed', error);
    }
  },

  fetchSessions: async (profileId: string) => {
    const generation = ++sessionsGeneration;
    set({ loading: true, error: null, sessions: [] });
    try {
      const data = v2vSessionsSchema.parse(await api.get(
        `/zeh-ani/v2v/sessions/${encodeURIComponent(profileId)}`,
      ));
      if (generation !== sessionsGeneration) return;
      set({ sessions: data.sessions, loading: false });
      v2vLogger.info('Fetched V2V sessions', {
        profileId,
        count: String(data.sessions.length),
      });
    } catch (error: unknown) {
      if (generation !== sessionsGeneration) return;
      set({
        error: v2vErrorText(error, i18n.t('zehAni.v2v.errors.fetchSessionsFailed')),
        loading: false,
      });
      v2vLogger.error('Failed to fetch V2V sessions', error);
    }
  },

  clearError: () => set({ error: null }),
}));
