/**
 * Bilingual Bridge Dubbing Store
 * Manages Hebrew engagement proficiency tracking and bilingual dubbing sessions
 */

import { create } from 'zustand';
import api from '@/services/api';
import i18n from 'i18next';
import logger from '@/utils/logger';

const storeLogger = logger.scope('BilingualDubbing');

interface ProficiencyStatus {
  level: string;
  overall_score: number;
  hebrew_ratio: number;
  total_words_learned: number;
  vocabulary_known_count: number;
  vocabulary_learning_count: number;
}

interface ActiveSession {
  session_id: string;
  target_hebrew_ratio: number;
  actual_hebrew_ratio: number;
  vocabulary_introduced_count: number;
}

interface BilingualDubbingState {
  proficiency: ProficiencyStatus | null;
  activeSession: ActiveSession | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;

  fetchProficiency: (profileId: string) => Promise<void>;
  startSession: (contentId: string, profileId: string) => Promise<void>;
  endSession: () => Promise<void>;
  translateSegment: (data: {
    session_id: string;
    hebrew_text: string;
    timestamp_seconds: number;
  }) => Promise<void>;
  reset: () => void;
}

export const useBilingualDubbingStore = create<BilingualDubbingState>((set, get) => ({
  proficiency: null,
  activeSession: null,
  isActive: false,
  loading: false,
  error: null,

  fetchProficiency: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/bilingual-dubbing/proficiency', {
        params: { profile_id: profileId },
      }) as ProficiencyStatus;
      set({ proficiency: data, loading: false });
    } catch (err: any) {
      const msg = err?.detail || i18n.t('errors.bilingual.proficiencyFailed');
      storeLogger.error('Failed to fetch proficiency', { error: msg });
      set({ error: msg, loading: false });
    }
  },

  startSession: async (contentId: string, profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/bilingual-dubbing/session/start', {
        content_id: contentId,
        profile_id: profileId,
      }) as ActiveSession & { session_id: string };
      set({
        activeSession: {
          session_id: data.session_id,
          target_hebrew_ratio: data.target_hebrew_ratio,
          actual_hebrew_ratio: data.actual_hebrew_ratio,
          vocabulary_introduced_count: data.vocabulary_introduced_count,
        },
        isActive: true,
        loading: false,
      });
      storeLogger.info('Bilingual session started', { sessionId: data.session_id });
    } catch (err: any) {
      const msg = err?.detail || i18n.t('errors.bilingual.startFailed');
      storeLogger.error('Failed to start session', { error: msg });
      set({ error: msg, loading: false });
    }
  },

  endSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({ loading: true, error: null });
    try {
      await api.post(`/bilingual-dubbing/session/${activeSession.session_id}/end`, {});
      storeLogger.info('Bilingual session ended', { sessionId: activeSession.session_id });
      set({ activeSession: null, isActive: false, loading: false });
    } catch (err: any) {
      const msg = err?.detail || i18n.t('errors.bilingual.endFailed');
      storeLogger.error('Failed to end session', { error: msg });
      set({ error: msg, loading: false });
    }
  },

  translateSegment: async (data) => {
    try {
      const result = await api.post('/bilingual-dubbing/session/translate', data) as {
        actual_hebrew_ratio: number;
        vocabulary_introduced_count: number;
      };
      const { activeSession } = get();
      if (activeSession) {
        set({
          activeSession: {
            ...activeSession,
            actual_hebrew_ratio: result.actual_hebrew_ratio,
            vocabulary_introduced_count: result.vocabulary_introduced_count,
          },
        });
      }
    } catch (err: any) {
      storeLogger.error('Failed to translate segment', { error: err?.detail });
    }
  },

  reset: () => {
    set({ proficiency: null, activeSession: null, isActive: false, loading: false, error: null });
  },
}));
