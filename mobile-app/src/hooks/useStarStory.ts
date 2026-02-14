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

export interface StarStoryAvatar { id: string; name: string; thumbnail?: string; profileId: string }

export interface GenerationProgress {
  currentStep: 'script' | 'voiceover' | 'animation' | 'rendering';
  progress: number;
  estimatedTimeRemaining?: number;
}

export interface StarStoryEpisode {
  id: string; title: string; theme: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  thumbnail?: string; videoUrl?: string; createdAt: string;
  progress?: GenerationProgress;
}

interface GenerateParams { profileId: string; avatarId: string; theme: string; targetVocabulary: string[] }

export function useStarStory(profileId: string) {
  const [avatars, setAvatars] = useState<StarStoryAvatar[]>([]);
  const [episodes, setEpisodes] = useState<StarStoryEpisode[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<StarStoryEpisode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (profileId) loadData();
    return () => { mountedRef.current = false; stopPolling(); };
  }, [profileId]);

  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }, []);

  const loadData = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true); setError(null);
    try {
      const [avRes, epRes] = await Promise.allSettled([
        api.get('/star-story/avatars', { params: { profile_id: profileId } }),
        api.get('/star-story/episodes', { params: { profile_id: profileId } }),
      ]);
      if (!mountedRef.current) return;

      const av = avRes.status === 'fulfilled' ? (avRes.value?.avatars || []) : [];
      const ep = epRes.status === 'fulfilled' ? (epRes.value?.episodes || []) : [];
      if (avRes.status === 'rejected') moduleLogger.warn('Avatars load failed', { error: avRes.reason });
      if (epRes.status === 'rejected') moduleLogger.warn('Episodes load failed', { error: epRes.reason });

      const active = ep.find((e: StarStoryEpisode) => e.status === 'processing' || e.status === 'pending') || null;
      setAvatars(av); setEpisodes(ep); setActiveGeneration(active); setIsLoading(false);
      if (active) startPolling(active.id);
    } catch (err) {
      moduleLogger.error('Star Story data load failed', { error: err instanceof Error ? err.message : String(err), profileId });
      if (mountedRef.current) { setIsLoading(false); setError(err instanceof Error ? err.message : String(err)); }
    }
  }, [profileId]);

  const startPolling = useCallback((episodeId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const pd = await api.get(`/star-story/episodes/${episodeId}/progress`) as unknown as {
          status: string; current_step: string; progress: number; estimated_time_remaining?: number;
        };
        if (!mountedRef.current) { stopPolling(); return; }

        const prog: GenerationProgress = { currentStep: pd.current_step as GenerationProgress['currentStep'], progress: pd.progress, estimatedTimeRemaining: pd.estimated_time_remaining };
        const isComplete = pd.status === 'complete' || pd.status === 'error';

        setEpisodes(prev => prev.map(ep => ep.id === episodeId ? { ...ep, status: pd.status as StarStoryEpisode['status'], progress: prog } : ep));
        if (isComplete) { stopPolling(); setActiveGeneration(null); setIsGenerating(false); }
        else { setActiveGeneration(prev => prev ? { ...prev, status: pd.status as StarStoryEpisode['status'], progress: prog } : prev); }
      } catch (err) { moduleLogger.warn('Progress poll failed', { episodeId, error: err instanceof Error ? err.message : String(err) }); }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const generateEpisode = useCallback(async (params: GenerateParams) => {
    setIsGenerating(true); setError(null);
    try {
      const resp = await api.post('/star-story/episodes/generate', {
        profile_id: params.profileId, avatar_id: params.avatarId, theme: params.theme, target_vocabulary: params.targetVocabulary,
      }) as unknown as { episode_id: string; title: string; theme: string; status: string };
      if (!mountedRef.current) return;

      const newEp: StarStoryEpisode = { id: resp.episode_id, title: resp.title, theme: resp.theme, status: 'pending', createdAt: new Date().toISOString() };
      setEpisodes(prev => [newEp, ...prev]);
      setActiveGeneration(newEp);
      startPolling(newEp.id);
    } catch (err) {
      moduleLogger.error('Episode generation failed', { error: err instanceof Error ? err.message : String(err), profileId: params.profileId });
      if (mountedRef.current) { setIsGenerating(false); setError(err instanceof Error ? err.message : String(err)); }
    }
  }, [startPolling]);

  return {
    avatars, episodes, activeGeneration, isLoading, isGenerating, error,
    generateEpisode, refresh: useCallback(async () => { await loadData(); }, [loadData]),
  };
}

export default useStarStory;
