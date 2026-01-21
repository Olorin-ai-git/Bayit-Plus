import { useState } from 'react';
import { watchlistService } from '@/services/api';

interface UseWatchlistResult {
  inWatchlist: boolean;
  toggleWatchlist: (seriesId: string | undefined) => Promise<void>;
}

export function useWatchlist(): UseWatchlistResult {
  const [inWatchlist, setInWatchlist] = useState(false);

  const toggleWatchlist = async (seriesId: string | undefined) => {
    if (!seriesId) {
      console.warn('Cannot toggle watchlist: seriesId is missing');
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
      console.error('Failed to toggle watchlist:', error);
      setInWatchlist(!inWatchlist);
    }
  };

  return {
    inWatchlist,
    toggleWatchlist,
  };
}
