import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  NewsClip,
  ShareResult,
  GrandparentBridgeStore,
} from './grandparentBridgeStore.types';

const bridgeLogger = logger.scope('GrandparentBridgeStore');

export const useGrandparentBridgeStore = create<GrandparentBridgeStore>((set) => ({
  clips: [],
  selectedClip: null,
  loading: false,
  generating: false,
  error: null,

  generateClip: async ({ avatarId, profileId, sessionSummary }) => {
    set({ generating: true, error: null });
    try {
      const clip = await api.post('/grandparent-bridge/generate-clip', {
        avatar_id: avatarId,
        profile_id: profileId,
        session_summary: sessionSummary,
      }) as NewsClip;
      set((state) => ({
        clips: [clip, ...state.clips],
        selectedClip: clip,
        generating: false,
      }));
      bridgeLogger.info('News clip generated', { clipId: clip.id });
      return clip;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('grandparentBridge.generating'),
        generating: false,
      });
      bridgeLogger.error('Failed to generate clip', error);
      return null;
    }
  },

  fetchClips: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/grandparent-bridge/clips', {
        params: { profile_id: profileId },
      }) as NewsClip[];
      set({ clips: data || [], loading: false });
      bridgeLogger.info('Fetched clips', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('grandparentBridge.clips.empty'),
        loading: false,
      });
      bridgeLogger.error('Failed to fetch clips', error);
    }
  },

  shareClip: async (clipId: string, recipientName: string, language = 'he') => {
    set({ error: null });
    try {
      const result = await api.post(`/grandparent-bridge/${clipId}/share`, {
        recipient_name: recipientName,
        language,
      }) as ShareResult;
      bridgeLogger.info('Clip shared', { clipId });
      return result;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('grandparentBridge.share.title'),
      });
      bridgeLogger.error('Failed to share clip', error);
      return null;
    }
  },

  setSelectedClip: (clip) => set({ selectedClip: clip }),
  clearError: () => set({ error: null }),
}));
