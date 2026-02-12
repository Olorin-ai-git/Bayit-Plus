import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  MissionPlayState,
  InteractiveMission,
  InteractiveManifest,
  PrerenderedScene,
  OnDemandBranch,
  ManifestPath,
  SceneAttemptResult,
  GenerationProgress,
  InteractiveMissionStore,
} from './interactiveMissionStore.types';

const missionLogger = logger.scope('InteractiveMissionStore');

export type { MissionPlayState };

export const useInteractiveMissionStore = create<InteractiveMissionStore>((set, get) => ({
  missions: [],
  currentMission: null,
  playState: 'idle',
  currentScene: 1,
  lastAttemptResult: null,
  generatingMissionId: null,
  generationProgress: null,
  loading: false,
  error: null,

  fetchAvailableMissions: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/interactive-missions/available', {
        params: { profile_id: profileId },
      }) as InteractiveMission[];
      set({ missions: data || [], loading: false });
      missionLogger.info('Fetched available missions', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || i18n.t('interactiveMission.errors.fetchFailed'), loading: false });
      missionLogger.error('Failed to fetch missions', error);
    }
  },

  generateMission: async (data) => {
    set({ error: null });
    try {
      const result = await api.post('/interactive-missions/generate', data) as { mission_id: string };
      set({ generatingMissionId: result.mission_id });
      missionLogger.info('Mission generation started', { missionId: result.mission_id });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || i18n.t('interactiveMission.errors.generateFailed') });
      missionLogger.error('Failed to start mission generation', error);
      throw error;
    }
  },

  loadMission: async (missionId: string) => {
    set({ loading: true, error: null });
    try {
      const mission = await api.get(`/interactive-missions/${missionId}`) as InteractiveMission;
      set({ currentMission: mission, loading: false, playState: 'playing', currentScene: 1 });
      missionLogger.info('Mission loaded', { missionId });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || i18n.t('interactiveMission.errors.loadFailed'), loading: false });
      missionLogger.error('Failed to load mission', error);
    }
  },

  pollProgress: async (missionId: string) => {
    try {
      const progress = await api.get(`/interactive-missions/${missionId}/progress`) as GenerationProgress;
      set({ generationProgress: progress });
      if (progress.status === 'ready' || progress.status === 'failed') {
        set({ generatingMissionId: null });
      }
      return progress;
    } catch (error: any) {
      missionLogger.error('Failed to poll progress', error);
      return null;
    }
  },

  submitAttempt: async (data) => {
    set({ playState: 'evaluating', error: null });
    try {
      const result = await api.post(
        `/interactive-missions/${data.missionId}/scenes/${data.sceneNumber}/attempt`,
        {
          profile_id: data.profileId,
          response_transcript: data.transcript,
          language_detected: data.language,
        },
      ) as SceneAttemptResult;
      set({ lastAttemptResult: result, playState: 'result' });
      missionLogger.info('Scene attempt submitted', { scene: String(data.sceneNumber), quality: result.quality });
      return result;
    } catch (error: any) {
      set({ error: error?.detail || error?.message || i18n.t('interactiveMission.errors.submitFailed'), playState: 'decision' });
      missionLogger.error('Failed to submit attempt', error);
      return null;
    }
  },

  completeMission: async (missionId: string) => {
    try {
      const result = await api.post(`/interactive-missions/${missionId}/complete`) as {
        shekels_earned: number;
        total_score: number;
      };
      set({ playState: 'complete' });
      missionLogger.info('Mission completed', { missionId, shekels: String(result.shekels_earned) });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || i18n.t('interactiveMission.errors.completeFailed') });
      missionLogger.error('Failed to complete mission', error);
    }
  },

  setPlayState: (state: MissionPlayState) => set({ playState: state }),
  setCurrentScene: (scene: number) => set({ currentScene: scene }),
  clearError: () => set({ error: null }),
  reset: () => set({
    currentMission: null,
    playState: 'idle',
    currentScene: 1,
    lastAttemptResult: null,
    generatingMissionId: null,
    generationProgress: null,
    error: null,
  }),
}));
