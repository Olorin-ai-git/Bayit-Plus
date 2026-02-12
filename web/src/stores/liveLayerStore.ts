import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  SceneTrigger,
  LiveLayerStore,
} from './liveLayerStore.types';

const layerLogger = logger.scope('LiveLayerStore');

export const useLiveLayerStore = create<LiveLayerStore>((set) => ({
  activeTrigger: null,
  triggerResult: null,
  lipsyncWeights: null,
  wsConnected: false,
  loading: false,
  error: null,

  fetchTriggers: async (contentId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(
        `/zeh-ani/triggers/${contentId}`,
      ) as SceneTrigger[];
      set({ loading: false });
      layerLogger.info('Fetched scene triggers', {
        contentId,
        count: String(data?.length || 0),
      });
      return data || [];
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.liveLayer.errors.fetchTriggersFailed'),
        loading: false,
      });
      layerLogger.error('Failed to fetch scene triggers', error);
      return [];
    }
  },

  setActiveTrigger: (trigger) => {
    set({ activeTrigger: trigger, triggerResult: null });
    if (trigger) {
      layerLogger.info('Trigger activated', {
        triggerId: trigger.trigger_id,
        type: trigger.trigger_type,
      });
    }
  },

  setTriggerResult: (result) => {
    set({ triggerResult: result });
    if (result) {
      layerLogger.info('Trigger result received', {
        score: String(result.score),
        correct: String(result.correct),
      });
    }
  },

  setLipsyncWeights: (weights) => set({ lipsyncWeights: weights }),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  clearError: () => set({ error: null }),
}));
