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
  is_featured?: boolean;
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

        // Fetch audiobooks - backend sorts by is_featured DESC, so featured appear first
        const response = await fetch('/api/v1/audiobooks?page=1&page_size=10');

        if (!response.ok) {
          throw new Error('Failed to fetch featured audiobooks');
        }

        const data = await response.json();
        // Filter to only featured audiobooks for carousel, or use top 10 if none featured
        const items = data.items || [];

        // Filter out audiobooks with empty or missing titles (data quality check)
        const validItems = items.filter((item: FeaturedAudiobook) =>
          item && item.id && item.title && item.title.trim() !== ''
        );

        const featured = validItems.filter((item: FeaturedAudiobook) => item.is_featured);
        setAudiobooks(featured.length > 0 ? featured : validItems.slice(0, 10));
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
