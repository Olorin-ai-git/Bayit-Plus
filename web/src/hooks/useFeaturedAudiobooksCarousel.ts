/**
 * Fetch Featured Audiobooks for Homepage Carousel
 *
 * Hook to manage featured audiobooks state and fetching.
 */

import { useEffect, useState } from 'react';

interface FeaturedAudiobook {
  id: string;
  title: string;
  author: string;
  thumbnail?: string;
  backdrop?: string;
  description?: string;
  view_count: number;
  avg_rating: number;
}

export function useFeaturedAudiobooksCarousel() {
  const [audiobooks, setAudiobooks] = useState<FeaturedAudiobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedAudiobooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/v1/audiobooks?is_featured=true&limit=10');

        if (!response.ok) {
          throw new Error('Failed to fetch featured audiobooks');
        }

        const data = await response.json();
        setAudiobooks(data.audiobooks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audiobooks');
        setAudiobooks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedAudiobooks();
  }, []);

  return { audiobooks, isLoading, error };
}
