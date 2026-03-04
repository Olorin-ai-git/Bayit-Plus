/**
 * Fetch Featured Audiobooks for Homepage Carousel
 *
 * Uses audiobookService with built-in 5-min cache and auth headers
 * instead of raw fetch.
 */

import { useEffect, useState } from "react";
import audiobookService from "@/services/audiobookService";
import logger from "@/utils/logger";
import type { Audiobook } from "@/types/audiobook";

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

const CAROUSEL_LIMIT = 10;

export function useFeaturedAudiobooksCarousel() {
  const [audiobooks, setAudiobooks] = useState<FeaturedAudiobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedAudiobooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const items =
          await audiobookService.getFeaturedAudiobooks(CAROUSEL_LIMIT);

        // Filter out audiobooks with empty or missing titles
        const validItems = items.filter(
          (item: Audiobook) =>
            item && item.id && item.title && item.title.trim() !== "",
        );

        const featured = validItems.filter(
          (item: Audiobook) => item.is_featured,
        );
        setAudiobooks(
          (featured.length > 0
            ? featured
            : validItems.slice(0, CAROUSEL_LIMIT)) as FeaturedAudiobook[],
        );
      } catch (err) {
        logger.error(
          "Failed to fetch featured audiobooks",
          "useFeaturedAudiobooksCarousel",
          err,
        );
        setError(
          err instanceof Error ? err.message : "Failed to fetch audiobooks",
        );
        setAudiobooks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedAudiobooks();
  }, []);

  return { audiobooks, isLoading, error };
}
