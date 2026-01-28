/**
 * Audiobook Data Hook
 * Manages audiobook details, chapters, and user interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { audiobookService, watchlistService } from '@/services/api';
import type { AudiobookWithChapters, AudiobookChapter } from '@/types/audiobook';
import logger from '@/utils/logger';

interface UseAudiobookDataProps {
  audiobookId: string | undefined;
}

interface UseAudiobookDataReturn {
  audiobook: AudiobookWithChapters | null;
  chapters: AudiobookChapter[];
  selectedChapter: AudiobookChapter | null;
  loading: boolean;
  inWatchlist: boolean;
  setSelectedChapter: (chapter: AudiobookChapter | null) => void;
  toggleWatchlist: () => Promise<void>;
}

export function useAudiobookData({ audiobookId }: UseAudiobookDataProps): UseAudiobookDataReturn {
  const [audiobook, setAudiobook] = useState<AudiobookWithChapters | null>(null);
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<AudiobookChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  const loadAudiobookDetails = useCallback(async () => {
    if (!audiobookId) return;

    setLoading(true);
    try {
      const data = await audiobookService.getAudiobookWithChapters(audiobookId);
      setAudiobook(data);
      setChapters(data.chapters || []);

      if (data.chapters && data.chapters.length > 0) {
        setSelectedChapter(data.chapters[0]);
      }
    } catch (error) {
      logger.error('Failed to load audiobook details', 'useAudiobookData', error);
    } finally {
      setLoading(false);
    }
  }, [audiobookId]);

  const toggleWatchlist = useCallback(async () => {
    if (!audiobook || !audiobook.id) {
      logger.warn('Cannot toggle watchlist: audiobook or audiobook.id is missing', 'useAudiobookData');
      return;
    }

    const previousState = inWatchlist;

    try {
      setInWatchlist(!inWatchlist);

      logger.info('Toggling watchlist', 'useAudiobookData', {
        audiobookId: audiobook.id,
        contentType: 'audiobook',
        currentState: inWatchlist
      });

      const result = await watchlistService.toggleWatchlist(audiobook.id, 'audiobook');

      logger.info('Watchlist toggle response', 'useAudiobookData', { result });

      if (result && typeof result.in_watchlist === 'boolean') {
        setInWatchlist(result.in_watchlist);
      }
    } catch (error) {
      logger.error('Failed to toggle watchlist', 'useAudiobookData', error);
      setInWatchlist(previousState);
    }
  }, [audiobook, inWatchlist]);

  useEffect(() => {
    if (audiobookId) {
      loadAudiobookDetails();
    }
  }, [audiobookId, loadAudiobookDetails]);

  useEffect(() => {
    const checkWatchlistStatus = async () => {
      if (audiobook && audiobook.id) {
        try {
          const result = await watchlistService.isInWatchlist(audiobook.id);
          if (result && typeof result.in_watchlist === 'boolean') {
            setInWatchlist(result.in_watchlist);
          }
        } catch (error) {
          logger.error('Failed to check watchlist status', 'useAudiobookData', error);
        }
      }
    };

    checkWatchlistStatus();
  }, [audiobook?.id]);

  return {
    audiobook,
    chapters,
    selectedChapter,
    loading,
    inWatchlist,
    setSelectedChapter,
    toggleWatchlist,
  };
}
