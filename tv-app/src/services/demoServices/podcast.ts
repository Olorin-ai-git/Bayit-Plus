/**
 * DEMO-ONLY: Demo podcast service.
 * Not used in production.
 */

import { demoPodcasts, demoPodcastCategories } from '../../demo';
import { delay } from './delay';

export const demoPodcastService = {
  getShows: async (categoryId?: string) => {
    await delay();
    let shows = demoPodcasts;
    if (categoryId && categoryId !== 'all') {
      shows = demoPodcasts.filter(p => p.category === categoryId);
    }
    return { shows, categories: demoPodcastCategories };
  },
  getShow: async (showId: string) => {
    await delay();
    return demoPodcasts.find(p => p.id === showId) || null;
  },
  getEpisodes: async (showId: string) => {
    await delay();
    const podcast = demoPodcasts.find(p => p.id === showId);
    return { episodes: podcast?.episodes || [] };
  },
  getCategories: async () => {
    await delay();
    return { categories: demoPodcastCategories };
  },
};
