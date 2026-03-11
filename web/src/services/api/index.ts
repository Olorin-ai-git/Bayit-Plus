/**
 * API Services Index
 * Central export point for all API services
 * Re-exports from shared services and adds web-specific services
 */

export {
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
  jerusalemService,
  telAvivService,
  cultureService,
  securityService,
  triviaApi,
  playlistService,
  watchlistService,
  api,
  contentApi,
  API_BASE_URL,
} from "@bayit/shared-services/api";

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
} from "@bayit/shared-services/api";

export { default } from "@bayit/shared-services/api";

export * from "./subtitles";
export * from "./payment";

// Re-export web-specific services
export { audiobookService } from "../audiobookService";

// Scene search service (uses searchService under the hood)
import { api } from "@bayit/shared-services/api";
export const sceneSearchService = {
  searchScenes: (
    contentId: string,
    query: string,
    options?: Record<string, any>,
  ) => api.post(`/search/scenes/${contentId}`, { query, ...options }),
  getSceneContext: (contentId: string, timestamp: number) =>
    api.get(`/search/scenes/${contentId}/context?timestamp=${timestamp}`),
};

// LLM Search service - typed wrapper around POST /search/llm
import type { LLMSearchResponse } from "@bayit/shared-services/api";
export const llmSearchService = {
  search: (
    query: string,
    filters?: Record<string, any>,
  ): Promise<LLMSearchResponse> =>
    api.post("/search/llm", { query, ...filters }),
};
