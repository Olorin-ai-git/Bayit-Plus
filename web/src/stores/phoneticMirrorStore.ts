import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  MirrorState,
  MirrorAttemptResult,
  PracticePhrase,
  MirrorHistory,
  PhoneticMirrorStore,
} from './phoneticMirrorStore.types';

const mirrorLogger = logger.scope('PhoneticMirrorStore');

export type { MirrorState };

export const usePhoneticMirrorStore = create<PhoneticMirrorStore>((set, get) => ({
  mirrorState: 'idle',
  currentPhrase: null,
  phrases: [],
  lastResult: null,
  history: null,
  loading: false,
  error: null,

  fetchPhrases: async (profileId: string, difficulty = 'medium') => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/phonetic-mirror/phrases', {
        params: { profile_id: profileId, difficulty, count: 10 },
      }) as PracticePhrase[];
      set({ phrases: data || [], loading: false });
      mirrorLogger.info('Fetched practice phrases', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('phoneticMirror.errors.fetchFailed'),
        loading: false,
      });
      mirrorLogger.error('Failed to fetch phrases', error);
    }
  },

  submitAttempt: async (data) => {
    set({ mirrorState: 'processing', error: null });
    try {
      const formData = new FormData();
      formData.append('audio', data.audio, 'recording.wav');
      formData.append('target_phrase_he', data.targetPhraseHe);
      formData.append('target_transliteration', data.targetTransliteration);
      formData.append('avatar_id', data.avatarId);
      formData.append('profile_id', data.profileId);
      formData.append('source', 'standalone');

      const result = await api.post('/phonetic-mirror/attempt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as MirrorAttemptResult;

      set({ lastResult: result, mirrorState: 'feedback' });
      mirrorLogger.info('Attempt submitted', {
        score: String(result.pronunciation_score),
        quality: result.quality,
      });
      return result;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('phoneticMirror.errors.submitFailed'),
        mirrorState: 'error',
      });
      mirrorLogger.error('Failed to submit attempt', error);
      return null;
    }
  },

  fetchHistory: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/phonetic-mirror/history', {
        params: { profile_id: profileId },
      }) as MirrorHistory;
      set({ history: data, loading: false });
      mirrorLogger.info('Fetched history', { total: String(data?.total || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('phoneticMirror.errors.historyFailed'),
        loading: false,
      });
      mirrorLogger.error('Failed to fetch history', error);
    }
  },

  setCurrentPhrase: (phrase) => set({ currentPhrase: phrase }),
  setMirrorState: (state) => set({ mirrorState: state }),
  clearError: () => set({ error: null }),
  reset: () => set({
    mirrorState: 'idle',
    currentPhrase: null,
    lastResult: null,
    error: null,
  }),
}));
