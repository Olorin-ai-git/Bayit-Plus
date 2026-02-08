/**
 * API Services Index
 *
 * Central export point for all API services.
 * Handles conditional switching between demo and production services.
 */

// Re-export client and types
export { api, contentApi, API_BASE_URL } from './client';
export type {
  SearchFilters,
  SearchResult,
  LLMSearchResponse,
  VoiceLanguage,
  TextSize,
  VADSensitivity,
  VoicePreferences,
  HomeSectionConfigAPI,
  HomePagePreferencesAPI,
  ResolvedContentItem,
  ResolveContentResponse,
  Download,
  DownloadAdd,
} from './types';

// Import API services
import { apiAuthService, apiVerificationService } from './authServices';
import { apiContentService, apiLiveService, apiRadioService, apiPodcastService } from './contentServices';
import {
  apiSubscriptionService,
  apiHistoryService,
  apiFavoritesService,
  apiProfilesService,
  apiChildrenService,
  apiYoungstersService,
} from './userServices';
import { apiSearchService, apiSubtitlesService, apiSubtitlePreferencesService, apiChaptersService } from './mediaServices';
import { apiZmanService, apiTrendingService, apiRitualService, apiJudaismService, apiFlowsService } from './specialtyServices';
import { apiChatService, apiPartyService, apiRecordingService, apiDownloadsService } from './socialServices';
import { apiJerusalemService, apiTelAvivService, apiCultureService } from './cultureServices';
import { securityService } from './securityService';
import { triviaApi } from './triviaServices';
import { apiPlaylistService } from './playlistServices';

// ===========================================
// SERVICE EXPORTS
// Service exports
// ===========================================

// Auth services
export const authService = apiAuthService;
export const verificationService = apiVerificationService;

// Content services
export const contentService = apiContentService;
export const liveService = apiLiveService;
export const radioService = apiRadioService;
export const podcastService = apiPodcastService;

// User services
export const subscriptionService = apiSubscriptionService;
export const historyService = apiHistoryService;
export const favoritesService = apiFavoritesService;
export const profilesService = apiProfilesService;
export const childrenService = apiChildrenService;
export const youngstersService = apiYoungstersService;

// Media services
export const searchService = apiSearchService;
export const subtitlesService = apiSubtitlesService;
export const subtitlePreferencesService = apiSubtitlePreferencesService;
export const chaptersService = apiChaptersService;

// Specialty services
export const zmanService = apiZmanService;
export const trendingService = apiTrendingService;
export const ritualService = apiRitualService;
export const judaismService = apiJudaismService;
export const flowsService = apiFlowsService;

// Social services
export const chatService = apiChatService;
export const partyService = apiPartyService;
export const recordingService = apiRecordingService;
export const downloadsService = apiDownloadsService;

// Culture services
export const jerusalemService = apiJerusalemService;
export const telAvivService = apiTelAvivService;
export const cultureService = apiCultureService;

// Security services
export { securityService };

// Trivia services
export { triviaApi };

// Playlist services
export const playlistService = apiPlaylistService;

// Backward-compat alias: watchlist now routes through playlist
export const watchlistService = playlistService;

// Re-export API services for direct access
export {
  apiAuthService,
  apiVerificationService,
  apiContentService,
  apiLiveService,
  apiRadioService,
  apiPodcastService,
  apiSubscriptionService,
  apiHistoryService,
  apiFavoritesService,
  apiProfilesService,
  apiChildrenService,
  apiYoungstersService,
  apiSearchService,
  apiSubtitlesService,
  apiSubtitlePreferencesService,
  apiChaptersService,
  apiZmanService,
  apiTrendingService,
  apiRitualService,
  apiJudaismService,
  apiFlowsService,
  apiChatService,
  apiPartyService,
  apiRecordingService,
  apiDownloadsService,
  apiJerusalemService,
  apiTelAvivService,
  apiCultureService,
  apiPlaylistService,
};

// Default export - main api instance
import { api } from './client';
export default api;
