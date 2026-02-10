/**
 * YouTube Playlist Channel Hook
 *
 * Manages synchronized YouTube playlist playback for channels like Kan Educational.
 * All users see the same video at the same time based on wall clock synchronization.
 *
 * Features:
 * - Loads YouTube IFrame Player API
 * - Seeks to correct position based on EPG schedule
 * - Auto-advances to next video
 * - Polls API for sync drift correction
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { liveService } from '@/services/api';
import logger from '@/utils/logger';

interface CurrentProgram {
  title: string;
  title_en?: string;
  description?: string;
  youtube_id?: string;
  started_at?: string;
  ends_at?: string;
  seek_to_seconds: number;
  thumbnail?: string;
}

interface NextProgram {
  title: string;
  title_en?: string;
  youtube_id?: string;
  starts_at?: string;
}

interface YouTubePlaylistStreamResponse {
  stream_url: string;
  stream_type: 'youtube-playlist';
  is_ai_enhanced: boolean;
  ai_features: string[];
  supports_pip_widget: boolean;
  current_program: CurrentProgram;
  next_program?: NextProgram;
  attribution?: string;
}

interface UseYouTubePlaylistChannelResult {
  streamUrl: string | null;
  currentProgram: CurrentProgram | null;
  nextProgram: NextProgram | null;
  seekPosition: number;
  isLoading: boolean;
  error: string | null;
  isAiEnhanced: boolean;
  aiFeatures: string[];
  supportsPipWidget: boolean;
  attribution: string | null;
  refreshProgram: () => Promise<void>;
}

const SYNC_INTERVAL_MS = 30000; // Poll every 30 seconds for sync

export function useYouTubePlaylistChannel(
  channelId: string,
  isYouTubePlaylist: boolean
): UseYouTubePlaylistChannelResult {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [currentProgram, setCurrentProgram] = useState<CurrentProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<NextProgram | null>(null);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAiEnhanced, setIsAiEnhanced] = useState(false);
  const [aiFeatures, setAiFeatures] = useState<string[]>([]);
  const [supportsPipWidget, setSupportsPipWidget] = useState(false);
  const [attribution, setAttribution] = useState<string | null>(null);

  const syncIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCurrentProgram = useCallback(async () => {
    if (!isYouTubePlaylist || !channelId) return;

    try {
      const response = await liveService.getStreamUrl(channelId) as YouTubePlaylistStreamResponse;

      if (response.stream_type === 'youtube-playlist' && response.current_program) {
        setStreamUrl(response.stream_url);
        setCurrentProgram(response.current_program);
        setNextProgram(response.next_program || null);
        setSeekPosition(response.current_program.seek_to_seconds);
        setIsAiEnhanced(response.is_ai_enhanced || false);
        setAiFeatures(response.ai_features || []);
        setSupportsPipWidget(response.supports_pip_widget || false);
        setAttribution(response.attribution || null);
        setError(null);

        logger.info('YouTube playlist program loaded', 'useYouTubePlaylistChannel', {
          channelId,
          program: response.current_program.title,
          seekTo: response.current_program.seek_to_seconds,
        });
      }
    } catch (err: any) {
      logger.error('Failed to fetch YouTube playlist program', 'useYouTubePlaylistChannel', err);
      setError(err.message || 'Failed to load program');
    } finally {
      setIsLoading(false);
    }
  }, [channelId, isYouTubePlaylist]);

  // Initial load
  useEffect(() => {
    if (isYouTubePlaylist && channelId) {
      setIsLoading(true);
      fetchCurrentProgram();
    }
  }, [channelId, isYouTubePlaylist, fetchCurrentProgram]);

  // Periodic sync to handle clock drift
  useEffect(() => {
    if (!isYouTubePlaylist || !channelId) return;

    syncIntervalRef.current = setInterval(() => {
      fetchCurrentProgram();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [channelId, isYouTubePlaylist, fetchCurrentProgram]);

  // Check for program end and auto-advance
  useEffect(() => {
    if (!currentProgram?.ends_at) return;

    const checkProgramEnd = () => {
      const now = new Date();
      const endTime = new Date(currentProgram.ends_at!);

      if (now >= endTime) {
        logger.info('Current program ended, fetching next', 'useYouTubePlaylistChannel');
        fetchCurrentProgram();
      }
    };

    // Check every second near program end
    const endTime = new Date(currentProgram.ends_at);
    const timeUntilEnd = endTime.getTime() - Date.now();

    if (timeUntilEnd > 0 && timeUntilEnd < 60000) {
      const checkInterval = setInterval(checkProgramEnd, 1000);
      return () => clearInterval(checkInterval);
    }
  }, [currentProgram?.ends_at, fetchCurrentProgram]);

  return {
    streamUrl,
    currentProgram,
    nextProgram,
    seekPosition,
    isLoading,
    error,
    isAiEnhanced,
    aiFeatures,
    supportsPipWidget,
    attribution,
    refreshProgram: fetchCurrentProgram,
  };
}
