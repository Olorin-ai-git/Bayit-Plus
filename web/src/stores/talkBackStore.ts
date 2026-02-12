import { create } from 'zustand';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';

const talkBackLogger = logger.scope('TalkBackStore');

export type TalkBackState = 'idle' | 'question' | 'listening' | 'evaluating' | 'result';

interface TalkBackPoint {
  id: string;
  content_id: string;
  trigger_time: number;
  character_name: string;
  question_text: string;
  question_text_he: string;
  prompt_audio_url: string | null;
  expected_language: string;
  answer_options: string[] | null;
  difficulty: string;
}

interface TalkBackEvaluation {
  score: number;
  points_earned: number;
  feedback: string;
  feedback_he: string;
  language_detected: string;
  pronunciation_score: number | null;
}

interface TalkBackStats {
  total_attempts: number;
  hebrew_response_rate: number;
  average_score: number;
  points_earned: number;
}

interface SubmitResponseData {
  session_id: string;
  content_id: string;
  talk_back_point_id: string;
  profile_id: string;
  response_transcript: string;
  language_detected: string;
}

interface TalkBackStore {
  talkBackPoints: TalkBackPoint[];
  currentQuestion: TalkBackPoint | null;
  state: TalkBackState;
  lastResult: TalkBackEvaluation | null;
  stats: TalkBackStats | null;
  loading: boolean;
  error: string | null;

  fetchPoints: (contentId: string) => Promise<void>;
  submitResponse: (data: SubmitResponseData) => Promise<void>;
  fetchStats: (profileId: string) => Promise<void>;
  setCurrentQuestion: (point: TalkBackPoint) => void;
  setListening: () => void;
  reset: () => void;
}

export const useTalkBackStore = create<TalkBackStore>((set) => ({
  talkBackPoints: [],
  currentQuestion: null,
  state: 'idle',
  lastResult: null,
  stats: null,
  loading: false,
  error: null,

  fetchPoints: async (contentId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/talk-back/points/${contentId}`) as { points: TalkBackPoint[] };
      set({ talkBackPoints: data.points || [], loading: false });
      talkBackLogger.info('Fetched talk back points', { contentId, count: String(data.points?.length || 0) });
    } catch (error: any) {
      const msg = error?.detail || error?.message || 'Failed to fetch talk back points';
      set({ error: msg, loading: false, talkBackPoints: [] });
      talkBackLogger.error('Failed to fetch talk back points', error);
    }
  },

  submitResponse: async (data: SubmitResponseData) => {
    set({ state: 'evaluating', error: null });
    try {
      const result = await api.post('/talk-back/respond', data) as TalkBackEvaluation;
      set({ lastResult: result, state: 'result' });
      talkBackLogger.info('Talk back response submitted', { pointId: data.talk_back_point_id });
    } catch (error: any) {
      const msg = error?.detail || error?.message || 'Failed to submit response';
      set({ error: msg, state: 'idle' });
      talkBackLogger.error('Failed to submit talk back response', error);
    }
  },

  fetchStats: async (profileId: string) => {
    try {
      const data = await api.get('/talk-back/stats', { params: { profile_id: profileId } }) as TalkBackStats;
      set({ stats: data });
    } catch (error: any) {
      talkBackLogger.error('Failed to fetch talk back stats', error);
    }
  },

  setCurrentQuestion: (point: TalkBackPoint) => {
    set({ currentQuestion: point, state: 'question', lastResult: null });
  },

  setListening: () => {
    set({ state: 'listening' });
  },

  reset: () => {
    set({ currentQuestion: null, state: 'idle', lastResult: null, error: null });
  },
}));
