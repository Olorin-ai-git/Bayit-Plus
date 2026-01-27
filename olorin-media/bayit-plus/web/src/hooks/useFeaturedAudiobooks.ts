import { useState, useEffect } from 'react';
import { audiobookService } from '@/services/api';
import logger from '@/utils/logger';

export interface FeaturedAudiobook {
  id: string;
  title: string;
  author?: string;
  narrator?: string;
  thumbnail?: string;
  description?: string;
  audio_quality?: string;
  avg_rating?: number;
  view_count?: number;
}

export function useFeaturedAudiobooks(limit: number = 10) {
  const [audiobooks, setAudiobooks] = useState<FeaturedAudiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeaturedAudiobooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await audiobookService.getFeaturedAudiobooks(limit);
        setAudiobooks(response || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load featured audiobooks';
        logger.error(msg, 'useFeaturedAudiobooks', err);
        setError(msg);
        setAudiobooks([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedAudiobooks();
  }, [limit]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await audiobookService.getFeaturedAudiobooks(limit);
      setAudiobooks(response || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh featured audiobooks';
      logger.error(msg, 'useFeaturedAudiobooks:refetch', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { audiobooks, loading, error, refetch };
}
