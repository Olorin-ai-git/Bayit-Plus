/**
 * Playlist Manager Hook
 * Manages playlist state and navigation for flow playback
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlaylistItem, LocationState } from '../types/watch.types';
import logger from '@/utils/logger';

interface UsePlaylistManagerResult {
  playlist: PlaylistItem[];
  playlistIndex: number;
  flowName: string;
  showPlaylistPanel: boolean;
  hasNextItem: boolean;
  hasPrevItem: boolean;
  isInFlow: boolean;
  setShowPlaylistPanel: (show: boolean) => void;
  playNextItem: () => void;
  playPrevItem: () => void;
  playItemAtIndex: (index: number) => void;
  handleContentEnded: () => void;
  exitFlow: () => void;
}

export function usePlaylistManager(): UsePlaylistManagerResult {
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state as LocationState | null;

  const [playlist, setPlaylist] = useState<PlaylistItem[]>(locationState?.playlist || []);
  const [playlistIndex, setPlaylistIndex] = useState(locationState?.currentIndex || 0);
  const [flowName, setFlowName] = useState(locationState?.flowName || '');
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);

  useEffect(() => {
    if (locationState?.playlist) {
      setPlaylist(locationState.playlist);
      setPlaylistIndex(locationState.currentIndex || 0);
      setFlowName(locationState.flowName || '');
    }
  }, [locationState?.flowId]);

  const hasNextItem = playlist.length > 0 && playlistIndex < playlist.length - 1;
  const hasPrevItem = playlist.length > 0 && playlistIndex > 0;
  const isInFlow = playlist.length > 0;

  const playNextItem = useCallback(() => {
    if (hasNextItem) {
      setPlaylistIndex(prev => prev + 1);
    }
  }, [hasNextItem]);

  const playPrevItem = useCallback(() => {
    if (hasPrevItem) {
      setPlaylistIndex(prev => prev - 1);
    }
  }, [hasPrevItem]);

  const playItemAtIndex = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setPlaylistIndex(index);
    }
  }, [playlist.length]);

  const handleContentEnded = useCallback(() => {
    logger.info('Content ended, checking for next item', 'usePlaylistManager');
    if (hasNextItem) {
      playNextItem();
    }
  }, [hasNextItem, playNextItem]);

  const exitFlow = useCallback(() => {
    setPlaylist([]);
    setFlowName('');
    navigate('/');
  }, [navigate]);

  return {
    playlist,
    playlistIndex,
    flowName,
    showPlaylistPanel,
    hasNextItem,
    hasPrevItem,
    isInFlow,
    setShowPlaylistPanel,
    playNextItem,
    playPrevItem,
    playItemAtIndex,
    handleContentEnded,
    exitFlow,
  };
}
