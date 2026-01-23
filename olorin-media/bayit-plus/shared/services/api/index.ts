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
  apiWatchlistService,
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

// Import demo services
import {
  demoAuthService,
  demoContentService,
  demoLiveService,
  demoRadioService,
  demoPodcastService,
  demoSubscriptionService,
  demoWatchlistService,
  demoHistoryService,
  demoSearchService,
  demoFavoritesService,
  demoZmanService,
  demoTrendingService,
  demoRitualService,
  demoSubtitlesService,
  demoChaptersService,
  demoPartyService,
  demoRecordingService,
  demoChatService,
  demoDownloadsService,
  demoJerusalemService,
  demoTelAvivService,
  demoCultureService,
} from '../demoService';

// Import config
import { isDemo } from '../../config/appConfig';

// ===========================================
// CONDITIONAL SERVICE EXPORTS
// In demo mode: use mock services only, no API calls
// In production mode: use API services only, fail fast
// ===========================================

// Auth services - Always use real auth, no demo mode
export const authService = apiAuthService;
export const verificationService = apiVerificationService;

// Content services - Conditional
export const contentService = isDemo ? demoContentService : apiContentService;
export const liveService = isDemo ? demoLiveService : apiLiveService;
export const radioService = isDemo ? demoRadioService : apiRadioService;
export const podcastService = isDemo ? demoPodcastService : apiPodcastService;

// User services - Mixed (some require real auth)
export const subscriptionService = isDemo ? demoSubscriptionService : apiSubscriptionService;
export const watchlistService = isDemo ? demoWatchlistService : apiWatchlistService;
export const historyService = isDemo ? demoHistoryService : apiHistoryService;
export const favoritesService = isDemo ? demoFavoritesService : apiFavoritesService;
export const profilesService = apiProfilesService; // No demo mode - requires real auth
export const childrenService = apiChildrenService; // No demo mode for children
export const youngstersService = apiYoungstersService; // No demo mode for youngsters

// Media services - Conditional
export const searchService = isDemo ? demoSearchService : apiSearchService;
export const subtitlesService = isDemo ? demoSubtitlesService : apiSubtitlesService;
export const subtitlePreferencesService = apiSubtitlePreferencesService; // No demo mode - requires auth
export const chaptersService = isDemo ? demoChaptersService : apiChaptersService;

// Specialty services - Mixed
export const zmanService = isDemo ? demoZmanService : apiZmanService;
export const trendingService = isDemo ? demoTrendingService : apiTrendingService;
export const ritualService = isDemo ? demoRitualService : apiRitualService;
export const judaismService = apiJudaismService; // No demo mode for judaism
export const flowsService = apiFlowsService; // No demo mode for flows

// Social services - Conditional
export const chatService = isDemo ? demoChatService : apiChatService;
export const partyService = isDemo ? demoPartyService : apiPartyService;
export const recordingService = isDemo ? demoRecordingService : apiRecordingService;
export const downloadsService = isDemo ? demoDownloadsService : apiDownloadsService;

// Culture services - Conditional
export const jerusalemService = isDemo ? demoJerusalemService : apiJerusalemService;
export const telAvivService = isDemo ? demoTelAvivService : apiTelAvivService;
export const cultureService = isDemo ? demoCultureService : apiCultureService;

// Security services - No demo mode (requires real auth)
export { securityService };

// Trivia services - No demo mode
export { triviaApi };

// Re-export API services for direct access
export {
  apiAuthService,
  apiVerificationService,
  apiContentService,
  apiLiveService,
  apiRadioService,
  apiPodcastService,
  apiSubscriptionService,
  apiWatchlistService,
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
};

// Default export - main api instance
import { api } from './client';
export default api;
