import { useState } from 'react';
import { watchlistService } from '@/services/api';
import logger from '@/utils/logger';

interface UseWatchlistResult {
  inWatchlist: boolean;
  toggleWatchlist: (seriesId: string | undefined) => Promise<void>;
}

export function useWatchlist(): UseWatchlistResult {
  const [inWatchlist, setInWatchlist] = useState(false);

  const toggleWatchlist = async (seriesId: string | undefined) => {
    if (!seriesId) {
      logger.warn('Cannot toggle watchlist: seriesId is missing', 'useWatchlist');
      return;
    }
    try {
      const result = await watchlistService.toggleWatchlist(seriesId, 'series');
      if (result && typeof result.in_watchlist === 'boolean') {
        setInWatchlist(result.in_watchlist);
      } else {
        setInWatchlist(!inWatchlist);
      }
    } catch (error) {
      logger.error('Failed to toggle watchlist', 'useWatchlist', error);
      setInWatchlist(!inWatchlist);
    }
  };

  return {
    inWatchlist,
    toggleWatchlist,
  };
}
