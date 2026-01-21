/**
 * Content Services - Content, Live TV, Radio, Podcast API endpoints
 */

import { api } from './client';

// Content Service (API)
export const apiContentService = {
  getFeatured: () => api.get('/content/featured'),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId: string) => api.get(`/content/category/${categoryId}`),
  getById: (contentId: string) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId: string) => api.get(`/content/${contentId}/stream`),

  // Series endpoints
  getSeriesDetails: (seriesId: string) => api.get(`/content/series/${seriesId}`),
  getSeriesSeasons: (seriesId: string) => api.get(`/content/series/${seriesId}/seasons`),
  getSeasonEpisodes: (seriesId: string, seasonNum: number) =>
    api.get(`/content/series/${seriesId}/season/${seasonNum}/episodes`),

  // Movie endpoints
  getMovieDetails: (movieId: string) => api.get(`/content/movie/${movieId}`),

  // Preview endpoint
  getContentPreview: (contentId: string) => api.get(`/content/${contentId}/preview`),

  // Recommendations endpoint
  getRecommendations: (contentId: string, limit: number = 10) =>
    api.get(`/content/${contentId}/recommendations`, { params: { limit } }),
};

// Live TV Service (API)
export const apiLiveService = {
  getChannels: (cultureId?: string, category?: string) =>
    api.get('/live/channels', { params: { culture_id: cultureId, category } }),
  getChannel: (channelId: string) => api.get(`/live/${channelId}`),
  getStreamUrl: (channelId: string) => api.get(`/live/${channelId}/stream`),
};

// Radio Service (API)
export const apiRadioService = {
  getStations: (cultureId?: string, genre?: string) =>
    api.get('/radio/stations', { params: { culture_id: cultureId, genre } }),
  getStation: (stationId: string) => api.get(`/radio/${stationId}`),
  getStreamUrl: (stationId: string) => api.get(`/radio/${stationId}/stream`),
};

// Podcast Service (API)
export const apiPodcastService = {
  getShows: (cultureId?: string, categoryId?: string) =>
    api.get('/podcasts', { params: { culture_id: cultureId, category: categoryId } }),
  getShow: (showId: string) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId: string) => api.get(`/podcasts/${showId}/episodes`),
  getCategories: (cultureId?: string) =>
    api.get('/podcasts/categories', { params: { culture_id: cultureId } }),
  syncPodcasts: () => api.post('/podcasts/sync'),
};
