/**
 * DEMO-ONLY: Demo user services (watchlist, history, favorites).
 * Not used in production.
 */

import { demoSeries, demoContinueWatching } from '../../demo';
import { delay } from './delay';

export const demoWatchlistService = {
  getWatchlist: async () => {
    await delay();
    return { items: demoSeries.slice(0, 3) };
  },
  addToWatchlist: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to watchlist' };
  },
  removeFromWatchlist: async (contentId: string) => {
    await delay();
    return { message: 'Removed from watchlist' };
  },
  isInWatchlist: async (contentId: string) => {
    await delay();
    return { in_watchlist: Math.random() > 0.5 };
  },
  toggleWatchlist: async (contentId: string, contentType: string = 'vod') => {
    await delay();
    const inWatchlist = Math.random() > 0.5;
    return { in_watchlist: inWatchlist, message: inWatchlist ? 'Added to watchlist' : 'Removed from watchlist' };
  },
};

export const demoHistoryService = {
  getContinueWatching: async () => {
    await delay();
    return { items: demoContinueWatching };
  },
  updateProgress: async (contentId: string, contentType: string, position: number, duration: number) => {
    await delay();
    return { message: 'Progress updated' };
  },
};

export const demoFavoritesService = {
  getFavorites: async () => {
    await delay();
    return { items: demoSeries.slice(0, 4) };
  },
  addToFavorites: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to favorites' };
  },
  addFavorite: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to favorites' };
  },
  removeFromFavorites: async (contentId: string) => {
    await delay();
    return { message: 'Removed from favorites' };
  },
  removeFavorite: async (contentId: string) => {
    await delay();
    return { message: 'Removed from favorites' };
  },
  isFavorite: async (contentId: string) => {
    await delay();
    return { is_favorite: Math.random() > 0.5 };
  },
  toggleFavorite: async (contentId: string, contentType: string = 'vod') => {
    await delay();
    const isFavorite = Math.random() > 0.5;
    return { is_favorite: isFavorite, message: isFavorite ? 'Added to favorites' : 'Removed from favorites' };
  },
};
