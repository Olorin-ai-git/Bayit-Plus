/**
 * User Services - User-related API endpoints
 *
 * Includes subscription, watchlist, history, favorites, profiles, and children services.
 */

import { api } from './client';
import type { VoicePreferences, HomePagePreferencesAPI } from './types';

// Subscription Service (API)
export const apiSubscriptionService = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentPlan: () => api.get('/subscriptions/current'),
  createCheckout: (planId: string) => api.post('/subscriptions/checkout', { plan_id: planId }),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  getInvoices: () => api.get('/subscriptions/invoices'),
  getPaymentMethods: () => api.get('/subscriptions/payment-methods'),
  addPaymentMethod: (token: string) => api.post('/subscriptions/payment-methods', { token }),
  removePaymentMethod: (methodId: string) => api.delete(`/subscriptions/payment-methods/${methodId}`),
  setDefaultPaymentMethod: (methodId: string) => api.post(`/subscriptions/payment-methods/${methodId}/default`),
};

// Watchlist Service (API)
export const apiWatchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (contentId: string, contentType: string) =>
    api.post('/watchlist', { content_id: contentId, content_type: contentType }),
  removeFromWatchlist: (contentId: string) => api.delete(`/watchlist/${contentId}`),
  isInWatchlist: (contentId: string) => api.get(`/watchlist/check/${contentId}`),
  toggleWatchlist: (contentId: string, contentType: string = 'vod') =>
    api.post(`/watchlist/toggle/${contentId}?content_type=${contentType}`),
};

// History Service (API)
export const apiHistoryService = {
  getContinueWatching: () => api.get('/history/continue'),
  updateProgress: (contentId: string, contentType: string, position: number, duration: number) =>
    api.post('/history/progress', { content_id: contentId, content_type: contentType, position, duration }),
};

// Favorites Service (API)
export const apiFavoritesService = {
  getFavorites: () => api.get('/favorites'),
  addToFavorites: (contentId: string, contentType: string) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  addFavorite: (contentId: string, contentType: string) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  removeFromFavorites: (contentId: string) => api.delete(`/favorites/${contentId}`),
  removeFavorite: (contentId: string) => api.delete(`/favorites/${contentId}`),
  isFavorite: (contentId: string) => api.get(`/favorites/check/${contentId}`),
  toggleFavorite: (contentId: string, contentType: string = 'vod') =>
    api.post(`/favorites/toggle/${contentId}?content_type=${contentType}`),
};

// Profiles Service (API)
export const apiProfilesService = {
  getProfiles: () => api.get('/profiles'),
  getStats: () => api.get('/profile/stats'),
  createProfile: (data: {
    name: string;
    avatar?: string;
    avatar_color?: string;
    is_kids_profile?: boolean;
    kids_age_limit?: number;
    pin?: string;
  }) => api.post('/profiles', data),
  getProfile: (profileId: string) => api.get(`/profiles/${profileId}`),
  updateProfile: (profileId: string, data: {
    name?: string;
    avatar?: string;
    avatar_color?: string;
    is_kids_profile?: boolean;
    kids_age_limit?: number;
    pin?: string;
    preferences?: Record<string, any>;
  }) => api.put(`/profiles/${profileId}`, data),
  deleteProfile: (profileId: string) => api.delete(`/profiles/${profileId}`),
  selectProfile: (profileId: string, pin?: string) =>
    api.post(`/profiles/${profileId}/select`, { pin }),
  verifyPin: (profileId: string, pin: string) =>
    api.post(`/profiles/${profileId}/verify-pin`, { pin }),
  getRecommendations: (profileId: string) =>
    api.get(`/profiles/${profileId}/recommendations`),
  setKidsPin: (pin: string) => api.post('/profiles/kids-pin/set', { pin }),
  verifyKidsPin: (pin: string) => api.post('/profiles/kids-pin/verify', { pin }),
  // Voice Preferences
  getVoicePreferences: (): Promise<VoicePreferences> => api.get('/profiles/preferences/voice'),
  updateVoicePreferences: (prefs: VoicePreferences): Promise<{ message: string; preferences: VoicePreferences }> =>
    api.put('/profiles/preferences/voice', prefs),
  // Home Page Preferences
  getHomePagePreferences: (): Promise<HomePagePreferencesAPI> =>
    api.get('/profiles/preferences/home_page'),
  updateHomePagePreferences: (prefs: HomePagePreferencesAPI): Promise<{ message: string; preferences: HomePagePreferencesAPI }> =>
    api.put('/profiles/preferences/home_page', prefs),
};

// Children Service (API)
export const apiChildrenService = {
  getContent: (category?: string, maxAge?: number, limit?: number) =>
    api.get('/children/content', { params: { category, max_age: maxAge, limit } }),
  getCategories: () => api.get('/children/categories'),
  toggleParentalControls: (enabled: boolean) =>
    api.post('/children/parental-controls', { enabled }),
  verifyPin: (pin: string) => api.post('/children/verify-pin', { pin }),
  setPin: (pin: string) => api.post('/children/set-pin', { pin }),
  getSettings: () => api.get('/children/settings'),
  updateSettings: (settings: {
    parental_controls_enabled?: boolean;
    max_age_limit?: number;
    allowed_categories?: string[];
    screen_time_limit?: number;
    bedtime_enabled?: boolean;
    bedtime_start?: string;
    bedtime_end?: string;
  }) => api.put('/children/settings', settings),
};
