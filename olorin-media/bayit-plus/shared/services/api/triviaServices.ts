/**
 * Trivia API Services
 * Shared trivia API client for all platforms
 */

import api from './client'
import type {
  TriviaResponse,
  TriviaEnrichedResponse,
  TriviaPreferences,
  TriviaHealthResponse,
} from '../../types/trivia'

export interface GenerateTriviaResponse {
  status: 'generated' | 'exists'
  message?: string
  trivia: TriviaResponse
}

export interface UpdatePreferencesResponse {
  message: string
  preferences: TriviaPreferences
}

export const triviaApi = {
  /**
   * Get trivia facts for content
   * Returns cached trivia or generates from TMDB if missing
   */
  getTrivia: async (contentId: string, language: string = 'he'): Promise<TriviaResponse> => {
    const queryParams = new URLSearchParams()
    queryParams.append('language', language)
    queryParams.append('multilingual', 'true')  // NEW: Request all language versions
    return await api.get(`/trivia/${contentId}?${queryParams.toString()}`)
  },

  /**
   * Get enriched trivia bundle for offline playback
   * Includes AI-generated facts in addition to TMDB data
   */
  getEnrichedTrivia: async (
    contentId: string,
    language: string = 'he'
  ): Promise<TriviaEnrichedResponse> => {
    const queryParams = new URLSearchParams()
    queryParams.append('language', language)
    queryParams.append('multilingual', 'true')  // NEW: Request all language versions
    return await api.get(`/trivia/${contentId}/enriched?${queryParams.toString()}`)
  },

  /**
   * Force regenerate trivia for content (admin only)
   */
  generateTrivia: async (
    contentId: string,
    options?: { force?: boolean; enrich?: boolean }
  ): Promise<GenerateTriviaResponse> => {
    const queryParams = new URLSearchParams()
    if (options?.force) {
      queryParams.append('force', 'true')
    }
    if (options?.enrich !== undefined) {
      queryParams.append('enrich', options.enrich.toString())
    }
    return await api.post(`/trivia/${contentId}/generate?${queryParams.toString()}`)
  },

  /**
   * Get current user's trivia preferences
   */
  getPreferences: async (): Promise<TriviaPreferences> => {
    return await api.get('/trivia/preferences/me')
  },

  /**
   * Update current user's trivia preferences
   */
  updatePreferences: async (
    preferences: Partial<TriviaPreferences>
  ): Promise<UpdatePreferencesResponse> => {
    return await api.put('/trivia/preferences/me', preferences)
  },

  /**
   * Check trivia service health
   */
  healthCheck: async (): Promise<TriviaHealthResponse> => {
    return await api.get('/trivia/health')
  },
}

export default triviaApi
