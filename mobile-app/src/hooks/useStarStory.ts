/**
 * useStarStory Hook
 *
 * Manages Star Story generation state, episode history,
 * and progress polling for episode generation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@bayit/shared-services/api';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('useStarStory');

const POLL_INTERVAL_MS = 3000;

export interface StarStoryAvatar {
  id: string;
  name: string;
  thumbnail?: string;
  profileId: string;
}

export interface StarStoryEpisode {
  id: string;
  title: string;
  theme: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  thumbnail?: string;
  videoUrl?: string;
  createdAt: string;
  progress?: GenerationProgress;
}

export interface GenerationProgress {
  currentStep: 'script' | 'voiceover' | 'animation' | 'rendering';
  progress: number;
  estimatedTimeRemaining?: number;
}

interface GenerateParams {
  profileId: string;
  avatarId: string;
  theme: string;
  targetVocabulary: string[];
}

interface StarStoryState {
  avatars: StarStoryAvatar[];
  episodes: StarStoryEpisode[];
  activeGeneration: StarStoryEpisode | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

export function useStarStory(profileId: string) {
  const [state, setState] = useState<StarStoryState>({
    avatars: [],
    episodes: [],
    activeGeneration: null,
    isLoading: true,
    isGenerating: false,
    error: null,
  });

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (profileId) {
      loadData();
    }
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [profileId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!profileId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [avatarsRes, episodesRes] = await Promise.allSettled([
        api.get('/star-story/avatars', { params: { profile_id: profileId } }),
        api.get('/star-story/episodes', { params: { profile_id: profileId } }),
      ]);

      if (!isMountedRef.current) return;

      const avatars = avatarsRes.status === 'fulfilled'
        ? (avatarsRes.value?.avatars || [])
        : [];
      const episodes = episodesRes.status === 'fulfilled'
        ? (episodesRes.value?.episodes || [])
        : [];

      if (avatarsRes.status === 'rejected') {
        moduleLogger.warn('Failed to load avatars', { error: avatarsRes.reason });
      }
      if (episodesRes.status === 'rejected') {
        moduleLogger.warn('Failed to load episodes', { error: episodesRes.reason });
      }

      const activeGeneration = episodes.find(
        (ep: StarStoryEpisode) => ep.status === 'processing' || ep.status === 'pending'
      ) || null;

      setState(prev => ({
        ...prev,
        avatars,
        episodes,
        activeGeneration,
        isLoading: false,
      }));

      if (activeGeneration) {
        startPolling(activeGeneration.id);
      }
    } catch (err) {
      moduleLogger.error('Failed to load Star Story data', {
        error: err instanceof Error ? err.message : String(err),
        profileId,
      });
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
  }, [profileId]);

  const startPolling = useCallback((episodeId: string) => {
    stopPolling();

    pollTimerRef.current = setInterval(async () => {
      try {
        const progressData = await api.get(`/star-story/episodes/${episodeId}/progress`);

        if (!isMountedRef.current) {
          stopPolling();
          return;
        }

        const typedProgress = progressData as unknown as {
          status: string;
          current_step: string;
          progress: number;
          estimated_time_remaining?: number;
        };

        const episode: Partial<StarStoryEpisode> = {
          id: episodeId,
          status: typedProgress.status as StarStoryEpisode['status'],
          progress: {
            currentStep: typedProgress.current_step as GenerationProgress['currentStep'],
            progress: typedProgress.progress,
            estimatedTimeRemaining: typedProgress.estimated_time_remaining,
          },
        };

        setState(prev => {
          const updatedEpisodes = prev.episodes.map(ep =>
            ep.id === episodeId ? { ...ep, ...episode } : ep
          );

          const isComplete = typedProgress.status === 'complete' || typedProgress.status === 'error';

          if (isComplete) {
            stopPolling();
          }

          return {
            ...prev,
            episodes: updatedEpisodes,
            activeGeneration: isComplete ? null : { ...prev.activeGeneration!, ...episode } as StarStoryEpisode,
            isGenerating: !isComplete,
          };
        });
      } catch (err) {
        moduleLogger.warn('Progress poll failed', {
          episodeId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const generateEpisode = useCallback(async (params: GenerateParams) => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await api.post('/star-story/episodes/generate', {
        profile_id: params.profileId,
        avatar_id: params.avatarId,
        theme: params.theme,
        target_vocabulary: params.targetVocabulary,
      });

      if (!isMountedRef.current) return;

      const typedResponse = response as unknown as {
        episode_id: string;
        title: string;
        theme: string;
        status: string;
      };

      const newEpisode: StarStoryEpisode = {
        id: typedResponse.episode_id,
        title: typedResponse.title,
        theme: typedResponse.theme,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        episodes: [newEpisode, ...prev.episodes],
        activeGeneration: newEpisode,
      }));

      startPolling(newEpisode.id);
    } catch (err) {
      moduleLogger.error('Failed to generate episode', {
        error: err instanceof Error ? err.message : String(err),
        profileId: params.profileId,
      });
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
  }, [startPolling]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    avatars: state.avatars,
    episodes: state.episodes,
    activeGeneration: state.activeGeneration,
    isLoading: state.isLoading,
    isGenerating: state.isGenerating,
    error: state.error,
    generateEpisode,
    refresh,
  };
}

export default useStarStory;
