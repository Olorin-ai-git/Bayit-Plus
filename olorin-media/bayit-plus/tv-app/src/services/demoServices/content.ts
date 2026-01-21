/**
 * DEMO-ONLY: Demo content, live TV, and radio services.
 * Not used in production.
 */

import {
  demoMovies,
  demoSeries,
  demoChannels,
  demoRadioStations,
  demoCategories,
  demoFeatured,
} from '../../demo';
import { delay } from './delay';

export const demoContentService = {
  getFeatured: async () => {
    await delay();
    return demoFeatured;
  },
  getCategories: async () => {
    await delay();
    return { categories: demoCategories };
  },
  getByCategory: async (categoryId: string) => {
    await delay();
    const category = demoCategories.find(c => c.id === categoryId);
    return { items: category?.items || [] };
  },
  getById: async (contentId: string) => {
    await delay();
    const content = [...demoMovies, ...demoSeries].find(c => c.id === contentId);
    return content || null;
  },
  getStreamUrl: async (contentId: string) => {
    await delay();
    return { stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' };
  },
};

export const demoLiveService = {
  getChannels: async () => {
    await delay();
    return { channels: demoChannels };
  },
  getChannel: async (channelId: string) => {
    await delay();
    return demoChannels.find(c => c.id === channelId) || null;
  },
  getStreamUrl: async (channelId: string) => {
    await delay();
    return { stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' };
  },
};

export const demoRadioService = {
  getStations: async () => {
    await delay();
    return { stations: demoRadioStations };
  },
  getStation: async (stationId: string) => {
    await delay();
    return demoRadioStations.find(s => s.id === stationId) || null;
  },
  getStreamUrl: async (stationId: string) => {
    await delay();
    return { stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3' };
  },
};
