/**
 * Culture Services - Jerusalem, Tel Aviv, Culture API endpoints
 *
 * Note: Demo services contain sample data for demo mode.
 * These are used when isDemo=true in appConfig.
 */

import { api, contentApi } from './client';

// X Content Service (API) - uses contentApi for longer timeout
export const apiJerusalemService = {
  getContent: (category?: string, page?: number, limit?: number) =>
    contentApi.get('/jerusalem/content', { params: { category, page, limit } }),
  getFeatured: () => contentApi.get('/jerusalem/featured'),
  getCategories: () => contentApi.get('/jerusalem/categories'),
  getKotelContent: (page?: number, limit?: number) =>
    contentApi.get('/jerusalem/kotel', { params: { page, limit } }),
  getKotelEvents: () => contentApi.get('/jerusalem/kotel/events'),
  getIDFCeremonies: (page?: number, limit?: number) =>
    contentApi.get('/jerusalem/idf-ceremonies', { params: { page, limit } }),
  getDiasporaConnection: (page?: number, limit?: number) =>
    contentApi.get('/jerusalem/diaspora', { params: { page, limit } }),
  getSources: () => contentApi.get('/jerusalem/sources'),
};

// Tel Aviv Content Service (API) - uses contentApi for longer timeout
export const apiTelAvivService = {
  getContent: (category?: string, page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/content', { params: { category, page, limit } }),
  getFeatured: () => contentApi.get('/tel-aviv/featured'),
  getCategories: () => contentApi.get('/tel-aviv/categories'),
  getBeachesContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/beaches', { params: { page, limit } }),
  getNightlifeContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/nightlife', { params: { page, limit } }),
  getCultureContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/culture', { params: { page, limit } }),
  getMusicContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/music', { params: { page, limit } }),
  getSources: () => contentApi.get('/tel-aviv/sources'),
};

// Culture Service (API) - Generic multi-culture content
export const apiCultureService = {
  // Culture list
  getCultures: () => contentApi.get('/cultures'),
  getCulture: (cultureId: string) => contentApi.get(`/cultures/${cultureId}`),
  getDefaultCulture: () => contentApi.get('/cultures/default'),

  // Cities
  getCultureCities: (cultureId: string, featuredOnly: boolean = true) =>
    contentApi.get(`/cultures/${cultureId}/cities`, { params: { featured_only: featuredOnly } }),
  getCity: (cultureId: string, cityId: string) =>
    contentApi.get(`/cultures/${cultureId}/cities/${cityId}`),

  // Content
  getCityContent: (cultureId: string, cityId: string, category?: string, page?: number, limit?: number) =>
    contentApi.get(`/cultures/${cultureId}/cities/${cityId}/content`, { params: { category, page, limit } }),
  getTrending: (cultureId: string, limit?: number) =>
    contentApi.get(`/cultures/${cultureId}/trending`, { params: { limit } }),
  getFeatured: (cultureId: string) =>
    contentApi.get(`/cultures/${cultureId}/featured`),

  // Metadata
  getCategories: (cultureId: string, cityId?: string) =>
    contentApi.get(`/cultures/${cultureId}/categories`, { params: { city_id: cityId } }),
  getSources: (cultureId: string, cityId?: string) =>
    contentApi.get(`/cultures/${cultureId}/sources`, { params: { city_id: cityId } }),

  // Time
  getCultureTime: (cultureId: string) =>
    contentApi.get(`/cultures/${cultureId}/time`),
};
