/**
 * API Service for Mobile App
 * Connects to the Bayit+ backend API
 */

import { getApiBaseUrl, shouldUseDemoMode } from '../config/apiConfig';

const API_BASE_URL = getApiBaseUrl();

// Types for content
export interface Channel {
  id: string;
  name: string;
  number?: string;
  logo?: string;
  category?: string;
  currentShow?: string;
  isLive?: boolean;
  streamUrl?: string;
}

export interface RadioStation {
  id: string;
  name: string;
  logo?: string;
  frequency?: string;
  genre?: string;
  currentShow?: string;
  streamUrl?: string;
}

export interface Podcast {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  description?: string;
  episodeCount?: number;
  category?: string;
  latestEpisode?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'episode';
  poster?: string;
  year?: string;
  rating?: number;
  duration?: string;
  category?: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

// API request helper
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Live TV Service
export const liveService = {
  getChannels: async (): Promise<{ channels: Channel[] }> => {
    return apiRequest('/live/channels');
  },
  getChannel: async (channelId: string): Promise<Channel> => {
    return apiRequest(`/live/${channelId}`);
  },
  getStreamUrl: async (channelId: string): Promise<{ url: string }> => {
    return apiRequest(`/live/${channelId}/stream`);
  },
};

// Radio Service
export const radioService = {
  getStations: async (): Promise<{ stations: RadioStation[]; categories?: Category[] }> => {
    return apiRequest('/radio/stations');
  },
  getStation: async (stationId: string): Promise<RadioStation> => {
    return apiRequest(`/radio/${stationId}`);
  },
  getStreamUrl: async (stationId: string): Promise<{ url: string }> => {
    return apiRequest(`/radio/${stationId}/stream`);
  },
};

// Podcast Service
export const podcastService = {
  getShows: async (params?: { category?: string; limit?: number; page?: number }): Promise<{ shows: Podcast[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    const query = queryParams.toString();
    return apiRequest(`/podcasts${query ? `?${query}` : ''}`);
  },
  getShow: async (showId: string): Promise<Podcast> => {
    return apiRequest(`/podcasts/${showId}`);
  },
  getCategories: async (): Promise<{ categories: Category[] }> => {
    return apiRequest('/podcasts/categories');
  },
  getEpisodes: async (showId: string): Promise<{ episodes: any[] }> => {
    return apiRequest(`/podcasts/${showId}/episodes`);
  },
};

// Content/VOD Service
export const contentService = {
  getFeatured: async (): Promise<{ items: ContentItem[] }> => {
    return apiRequest('/content/featured');
  },
  getAll: async (params?: { type?: string; category?: string; limit?: number }): Promise<{ items: ContentItem[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`/content/all${query ? `?${query}` : ''}`);
  },
  getCategories: async (): Promise<{ categories: Category[] }> => {
    return apiRequest('/content/categories');
  },
  getById: async (contentId: string): Promise<ContentItem> => {
    return apiRequest(`/content/${contentId}`);
  },
  getMovies: async (params?: { limit?: number }): Promise<{ items: ContentItem[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`/content/movies${query ? `?${query}` : ''}`);
  },
  getSeries: async (params?: { limit?: number }): Promise<{ items: ContentItem[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`/content/series${query ? `?${query}` : ''}`);
  },
};

// Search Service
export const searchService = {
  search: async (query: string): Promise<{ results: ContentItem[] }> => {
    return apiRequest(`/search/unified?q=${encodeURIComponent(query)}`);
  },
};
