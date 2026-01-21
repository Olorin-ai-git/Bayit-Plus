/**
 * Media Services - Search, Subtitles, Chapters API endpoints
 */

import { api } from './client';
import type { SearchFilters, LLMSearchResponse } from './types';

// Search Service (API)
export const apiSearchService = {
  search: (query: string, filters?: SearchFilters): Promise<LLMSearchResponse> =>
    api.post('/search/llm', { query, ...filters }),
  quickSearch: (query: string, limit: number = 5) =>
    api.get('/search/quick', { params: { q: query, limit } }),
  getSuggestions: () => api.get('/search/suggestions'),
  voiceSearch: (transcript: string, language: string, filters?: SearchFilters): Promise<LLMSearchResponse> =>
    api.post('/search/voice', { transcript, language, ...filters }),
};

// Subtitles Service (API)
export const apiSubtitlesService = {
  getLanguages: () => api.get('/subtitles/languages'),
  getTracks: (contentId: string, language?: string) =>
    api.get(`/subtitles/${contentId}`, { params: { language } }),
  getCues: (contentId: string, language: string = 'he', withNikud: boolean = false, startTime?: number, endTime?: number) =>
    api.get(`/subtitles/${contentId}/cues`, {
      params: { language, with_nikud: withNikud, start_time: startTime, end_time: endTime }
    }),
  generateNikud: (contentId: string, language: string = 'he', force: boolean = false) =>
    api.post(`/subtitles/${contentId}/nikud`, null, { params: { language, force } }),
  translateWord: (word: string, sourceLang: string = 'he', targetLang: string = 'en') =>
    api.post('/subtitles/translate/word', null, {
      params: { word, source_lang: sourceLang, target_lang: targetLang }
    }),
  translatePhrase: (phrase: string, sourceLang: string = 'he', targetLang: string = 'en') =>
    api.post('/subtitles/translate/phrase', null, {
      params: { phrase, source_lang: sourceLang, target_lang: targetLang }
    }),
  addNikudToText: (text: string) =>
    api.post('/subtitles/nikud/text', null, { params: { text } }),
  fetchExternal: (contentId: string, languages?: string[]) =>
    api.post(`/subtitles/${contentId}/fetch-external`, null, {
      params: languages ? { languages: languages.join(',') } : undefined
    }),
};

// Subtitle Preferences Service (API)
export const apiSubtitlePreferencesService = {
  getPreference: (contentId: string) =>
    api.get(`/subtitles/preferences/${contentId}`),
  setPreference: (contentId: string, language: string) =>
    api.post(`/subtitles/preferences/${contentId}`, null, { params: { language } }),
  deletePreference: (contentId: string) =>
    api.delete(`/subtitles/preferences/${contentId}`),
  getAllPreferences: () =>
    api.get('/subtitles/preferences'),
};

// Chapters Service (API)
export const apiChaptersService = {
  getChapters: (contentId: string) => api.get(`/chapters/${contentId}`),
  generateChapters: (contentId: string, force: boolean = false, transcript?: string) =>
    api.post(`/chapters/${contentId}/generate`, { transcript }, { params: { force } }),
  getLiveChapters: (channelId: string) => api.get(`/chapters/live/${channelId}`),
  getCategories: () => api.get('/chapters/categories/list'),
};
