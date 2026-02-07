/**
 * Episode Playlist Toggle Hook
 * Manages playlist check/toggle state for individual episode items
 */

import { useState, useEffect, useCallback } from 'react';
import { playlistService } from '@/services/api';
import logger from '@/utils/logger';

interface UseEpisodePlaylistToggleResult {
  inPlaylist: boolean;
  playlistLoading: boolean;
  handleTogglePlaylist: (e?: any) => void;
}

export function useEpisodePlaylistToggle(
  episodeId: string,
  contentType: string,
): UseEpisodePlaylistToggleResult {
  const [inPlaylist, setInPlaylist] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  useEffect(() => {
    if (!episodeId) return;
    playlistService.checkItem(episodeId)
      .then((result) => {
        if (result && typeof result.in_playlist === 'boolean') {
          setInPlaylist(result.in_playlist);
        }
      })
      .catch((error) => {
        logger.error('Failed to check episode playlist status', 'useEpisodePlaylistToggle', { episodeId, error });
      });
  }, [episodeId]);

  const handleTogglePlaylist = useCallback((e?: any) => {
    e?.stopPropagation?.();
    if (playlistLoading) return;
    setPlaylistLoading(true);
    const previousState = inPlaylist;
    setInPlaylist(!inPlaylist);

    playlistService.toggleItem(episodeId, contentType)
      .then((result) => {
        if (result && typeof result.in_playlist === 'boolean') {
          setInPlaylist(result.in_playlist);
        }
      })
      .catch((error) => {
        logger.error('Failed to toggle episode playlist', 'useEpisodePlaylistToggle', { episodeId, error });
        setInPlaylist(previousState);
      })
      .finally(() => setPlaylistLoading(false));
  }, [episodeId, contentType, inPlaylist, playlistLoading]);

  return { inPlaylist, playlistLoading, handleTogglePlaylist };
}
