import { create } from 'zustand';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';

const storyLogger = logger.scope('StarStoryStore');

interface StarStoryAvatar {
  avatar_id: string;
  child_first_name: string;
  style: 'cartoon_2d' | 'pixar_3d';
  status: string;
  primary_avatar_url: string | null;
  poses_count: number;
  created_at: string;
}

interface StarStoryEpisode {
  episode_id: string;
  title: string;
  theme: string;
  episode_number: number;
  status: string;
  hls_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  created_at: string;
}

interface GenerationProgress {
  episode_id: string;
  status: string;
  current_stage: string;
  progress_percent: number;
  error_message: string | null;
}

interface StarStoryStore {
  avatars: StarStoryAvatar[];
  episodes: StarStoryEpisode[];
  generatingEpisodeId: string | null;
  generationProgress: GenerationProgress | null;
  loading: boolean;
  error: string | null;

  fetchAvatars: (profileId: string) => Promise<void>;
  grantConsent: (data: { profile_id: string; child_first_name: string; pin_hash: string }) => Promise<void>;
  generateEpisode: (data: { profile_id: string; avatar_id: string; theme: string; target_vocabulary: string[] }) => Promise<void>;
  pollProgress: (episodeId: string) => Promise<GenerationProgress | null>;
  fetchEpisodes: (profileId: string) => Promise<void>;
  revokeConsent: (profileId: string) => Promise<void>;
  clearError: () => void;
}

export const useStarStoryStore = create<StarStoryStore>((set, get) => ({
  avatars: [],
  episodes: [],
  generatingEpisodeId: null,
  generationProgress: null,
  loading: false,
  error: null,

  fetchAvatars: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/star-story/avatars', { params: { profile_id: profileId } }) as { avatars: StarStoryAvatar[] };
      set({ avatars: data.avatars || [], loading: false });
      storyLogger.info('Fetched avatars', { count: data.avatars?.length || 0 });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || 'Failed to fetch avatars', loading: false });
      storyLogger.error('Failed to fetch avatars', error);
    }
  },

  grantConsent: async (data) => {
    set({ error: null });
    try {
      await api.post('/star-story/consent', data);
      storyLogger.info('Consent granted', { profileId: data.profile_id });
    } catch (error: any) {
      const msg = error?.detail || error?.message || 'Failed to grant consent';
      set({ error: msg });
      storyLogger.error('Failed to grant consent', error);
      throw error;
    }
  },

  generateEpisode: async (data) => {
    set({ error: null });
    try {
      const result = await api.post('/star-story/episodes/generate', data) as { episode_id: string };
      set({ generatingEpisodeId: result.episode_id });
      storyLogger.info('Episode generation started', { episodeId: result.episode_id });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || 'Failed to generate episode' });
      storyLogger.error('Failed to start generation', error);
      throw error;
    }
  },

  pollProgress: async (episodeId: string) => {
    try {
      const progress = await api.get(`/star-story/episodes/${episodeId}/progress`) as GenerationProgress;
      set({ generationProgress: progress });
      if (progress.status === 'completed' || progress.status === 'failed') {
        set({ generatingEpisodeId: null });
      }
      return progress;
    } catch (error: any) {
      storyLogger.error('Failed to poll progress', error);
      return null;
    }
  },

  fetchEpisodes: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/star-story/episodes', { params: { profile_id: profileId } }) as { episodes: StarStoryEpisode[] };
      set({ episodes: data.episodes || [], loading: false });
      storyLogger.info('Fetched episodes', { count: data.episodes?.length || 0 });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || 'Failed to fetch episodes', loading: false });
      storyLogger.error('Failed to fetch episodes', error);
    }
  },

  revokeConsent: async (profileId: string) => {
    set({ error: null });
    try {
      await api.delete(`/star-story/consent/${profileId}`);
      set({ avatars: [], episodes: [] });
      storyLogger.info('Consent revoked', { profileId });
    } catch (error: any) {
      set({ error: error?.detail || error?.message || 'Failed to revoke consent' });
      storyLogger.error('Failed to revoke consent', error);
    }
  },

  clearError: () => set({ error: null }),
}));
