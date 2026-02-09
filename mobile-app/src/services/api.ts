/**
 * API Service for Mobile App
 *
 * Re-exports from the shared API client which provides:
 * - Auth token injection from Zustand auth store
 * - Correlation ID tracking for request tracing
 * - CSRF protection for state-changing requests
 * - Security headers (HSTS, X-Content-Type-Options, etc.)
 * - 401 handling with automatic logout
 * - Platform-aware base URL detection
 *
 * New code should import directly from '@bayit/shared-services/api'.
 * This file maintains backward compatibility for existing imports.
 */

// Re-export the shared API client and all services
export {
  api,
  contentApi,
  API_BASE_URL,
  authService,
  verificationService,
  contentService,
  liveService,
  radioService,
  podcastService,
  subscriptionService,
  historyService,
  favoritesService,
  profilesService,
  childrenService,
  youngstersService,
  searchService,
  subtitlesService,
  subtitlePreferencesService,
  chaptersService,
  zmanService,
  trendingService,
  ritualService,
  judaismService,
  flowsService,
  chatService,
  partyService,
  recordingService,
  downloadsService,
  playlistService,
  watchlistService,
  securityService,
} from '@bayit/shared-services/api';

// Re-export types used by existing mobile screens
export type { SearchFilters, SearchResult } from '@bayit/shared-services/api';

// Backward-compatible type aliases for screens importing from this file
// These match the types previously defined here and used by Simple* screens
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

// Default export - main api instance
import { api } from '@bayit/shared-services/api';
export default api;
