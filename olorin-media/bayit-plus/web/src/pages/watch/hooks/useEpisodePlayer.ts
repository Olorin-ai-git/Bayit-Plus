/**
 * Episode Player Hook
 * Manages episode playback state and deletion
 */

import { useState } from 'react';
import { adminPodcastsService } from '@/services/adminApi';
import { Episode } from '../types';
import logger from '@/utils/logger';

interface UseEpisodePlayerResult {
  currentEpisodeId: string | null;
  handlePlayEpisode: (episode: Episode, setStreamUrl: (url: string) => void) => void;
  handleDeleteEpisode: (
    showId: string,
    episodeId: string,
    onConfirm: () => void
  ) => Promise<void>;
}

export function useEpisodePlayer(): UseEpisodePlayerResult {
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);

  const handlePlayEpisode = (episode: Episode, setStreamUrl: (url: string) => void) => {
    if (episode.audioUrl) {
      setStreamUrl(episode.audioUrl);
      setCurrentEpisodeId(episode.id);
    }
  };

  const handleDeleteEpisode = async (
    showId: string,
    episodeId: string,
    onConfirm: () => void
  ) => {
    try {
      await adminPodcastsService.deleteEpisode(showId, episodeId);
      onConfirm();
      logger.info('Episode deleted successfully');
    } catch (error) {
      logger.error('Failed to delete episode', 'useEpisodePlayer', error);
    }
  };

  return {
    currentEpisodeId,
    handlePlayEpisode,
    handleDeleteEpisode,
  };
}
