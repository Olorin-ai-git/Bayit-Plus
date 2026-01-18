/**
 * Shared Services Stub
 *
 * DEVELOPMENT STUB ONLY - DO NOT USE IN PRODUCTION
 *
 * This stub exists for build compatibility when the shared directory is unavailable.
 * All methods throw errors to ensure proper configuration before deployment.
 *
 * To use real services, ensure the shared directory is correctly linked
 * in metro.config.js.
 */

const STUB_ERROR = new Error(
  'Shared services stub active. Real shared services not linked. ' +
  'Ensure the shared directory exists at ../shared relative to mobile-app.'
);

export const contentService = {
  getFeatured: async () => { throw STUB_ERROR; },
  getVOD: async () => { throw STUB_ERROR; },
  getPodcasts: async () => { throw STUB_ERROR; },
  getPodcastEpisodes: async (_id: string) => { throw STUB_ERROR; },
  getRadioStations: async () => { throw STUB_ERROR; },
  getCategories: async () => { throw STUB_ERROR; },
  search: async (_query: string) => { throw STUB_ERROR; },
  getSearchSuggestions: async (_query: string) => { throw STUB_ERROR; },
};

export const liveService = {
  getChannels: async () => { throw STUB_ERROR; },
  getChannel: async (_id: string) => { throw STUB_ERROR; },
  getStreamUrl: async (_id: string) => { throw STUB_ERROR; },
  getCategories: async () => { throw STUB_ERROR; },
};

export const historyService = {
  getContinueWatching: async () => { throw STUB_ERROR; },
  addToHistory: async (_contentId: string) => { throw STUB_ERROR; },
  getWatchProgress: async (_contentId: string) => { throw STUB_ERROR; },
};

export const ritualService = {
  getMorningRitual: async () => { throw STUB_ERROR; },
  checkShouldShowRitual: async () => { throw STUB_ERROR; },
};

export const api = {
  get: async (_url: string) => { throw STUB_ERROR; },
  post: async (_url: string, _data: unknown) => { throw STUB_ERROR; },
};

export const profilesService = {
  getProfiles: async () => { throw STUB_ERROR; },
  getStats: async () => { throw STUB_ERROR; },
};
