/**
 * Shared Services Stub
 * Temporary implementation with mock data until real API is connected
 */

// Mock data
const mockChannels = [
  { id: '1', number: '13', name: 'Channel 13', name_en: 'Channel 13', logo: 'https://via.placeholder.com/100', currentProgram: 'News', current_program: 'News', category: 'news' },
  { id: '2', number: '12', name: 'Channel 12', name_en: 'Channel 12', logo: 'https://via.placeholder.com/100', currentProgram: 'Drama', current_program: 'Drama', category: 'entertainment' },
  { id: '3', number: '11', name: 'Channel 11', name_en: 'Channel 11', logo: 'https://via.placeholder.com/100', currentProgram: 'Talk Show', current_program: 'Talk Show', category: 'talk' },
];

const mockContent = [
  { id: '1', title: 'Israeli Movie 1', title_en: 'Israeli Movie 1', poster: 'https://via.placeholder.com/200x300', year: 2023, rating: 8.5, category: 'movies' },
  { id: '2', title: 'Israeli Series 1', title_en: 'Israeli Series 1', poster: 'https://via.placeholder.com/200x300', year: 2024, rating: 9.0, category: 'series' },
  { id: '3', title: 'Documentary 1', title_en: 'Documentary 1', poster: 'https://via.placeholder.com/200x300', year: 2023, rating: 7.8, category: 'documentary' },
];

const mockCategories = [
  { id: 'all', name: 'All', name_en: 'All' },
  { id: 'news', name: 'News', name_en: 'News' },
  { id: 'entertainment', name: 'Entertainment', name_en: 'Entertainment' },
  { id: 'movies', name: 'Movies', name_en: 'Movies' },
  { id: 'series', name: 'Series', name_en: 'Series' },
];

export const contentService = {
  getFeatured: async () => ({
    items: mockContent,
    hero: mockContent[0],
    spotlight: mockContent,
    picks: mockContent,
  }),
  getVOD: async () => ({ items: mockContent }),
  getPodcasts: async () => ({ podcasts: [] }),
  getPodcastEpisodes: async (id: string) => ({ episodes: [] }),
  getRadioStations: async () => ({ stations: [] }),
  getCategories: async () => ({ categories: mockCategories }),
  search: async (query: string) => ({ live: [], vod: mockContent, radio: [], podcasts: [] }),
  getSearchSuggestions: async (query: string) => ({ suggestions: ['Israeli Movies', 'News', 'Comedy'] }),
};

export const liveService = {
  getChannels: async () => ({ channels: mockChannels }),
  getChannel: async (id: string) => mockChannels[0],
  getStreamUrl: async (id: string) => 'https://test-stream.m3u8',
  getCategories: async () => ({ categories: mockCategories }),
};

export const historyService = {
  getContinueWatching: async () => ({ items: [] }),
  addToHistory: async (contentId: string) => {},
  getWatchProgress: async (contentId: string) => ({ progress: 0 }),
};

export const ritualService = {
  getMorningRitual: async () => ({
    greeting: 'Good morning!',
    hebrewDate: 'Hebrew Date',
    zmanim: {},
    todayInHistory: 'Today in Jewish history...',
  }),
  checkShouldShowRitual: async () => false,
};

export const api = {
  get: async (url: string) => ({ data: {} }),
  post: async (url: string, data: any) => ({ data: {} }),
};
