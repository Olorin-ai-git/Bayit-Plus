/**
 * VOD Services - Collections, Streaming, Audio Tracks, Interactive Moments, Recommendations
 *
 * Extends the base content service with VOD-specific endpoints that are not
 * covered by contentServices.ts, userServices.ts, or mediaServices.ts.
 */

import { api, contentApi } from './client';
import type {
  VODFilters,
  VODContentItem,
  PaginatedResponse,
} from '../../types/vod';

// Collections Service
export const apiCollectionsService = {
  getAll: (skip: number = 0, limit: number = 50) =>
    api.get('/content/collections', { params: { skip, limit } }),

  getRecommendations: () =>
    api.get('/content/collections/recommendations'),

  getDetail: (collectionId: string) =>
    api.get(`/content/collections/${collectionId}`),
};

// VOD Browse Service (extended content discovery)
export const apiVodBrowseService = {
  getMovies: (params?: {
    skip?: number;
    limit?: number;
    genre?: string;
    sort_by?: string;
    year?: number;
  }) => api.get('/content/movies', { params }),

  getTrending: (limit: number = 10) =>
    api.get('/trending/recommendations', { params: { limit } }),

  getRelated: (contentId: string, limit: number = 10) =>
    api.get(`/content/${contentId}/recommendations`, { params: { limit } }),

  search: (query: string, filters?: {
    genre?: string;
    year_from?: number;
    year_to?: number;
    rating_min?: number;
    has_subtitles?: boolean;
    subscription_tier?: string;
    page?: number;
    limit?: number;
  }) => api.get('/search/unified', { params: { q: query, ...filters } }),

  getSearchFilters: () =>
    api.get('/search/filters/options'),
};

// VOD Audio Tracks Service (AI-generated audio variants)
export const apiVodAudioService = {
  listTracks: (contentId: string) =>
    api.get(`/vod/${contentId}/audio-tracks`),

  getGenerationStatus: (contentId: string) =>
    api.get(`/vod/${contentId}/audio-tracks/status`),

  getHlsManifest: (contentId: string) =>
    contentApi.get(`/vod/${contentId}/hls/manifest.m3u8`),
};

// Interactive Moments Service
export const apiInteractiveMomentsService = {
  getMoments: (contentId: string) =>
    api.get(`/admin/interactive-moments/content/${contentId}/moments`),
};

// VOD Interactions Service (character interactions during playback)
export const apiVodInteractionsService = {
  startSession: (data: {
    content_id: string;
    character_name: string;
    timestamp_seconds: number;
  }) => api.post('/vod-interactions/sessions/start', data),

  sendMessage: (sessionId: string, message: string) =>
    api.post(`/vod-interactions/sessions/${sessionId}/message`, { message }),

  completeSession: (sessionId: string) =>
    api.post(`/vod-interactions/sessions/${sessionId}/complete`),
};
