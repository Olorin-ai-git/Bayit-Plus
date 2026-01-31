/**
 * Subtitles API Service
 * Handles subtitle tracks, cues, and Hebrew mode features
 */

import axios from 'axios'
import { HebrewMode, SubtitleTrack, SubtitleCue } from '@/types/subtitle'

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'

export interface SubtitleTracksResponse {
  tracks: SubtitleTrack[]
}

export interface SubtitleCuesResponse {
  content_id: string
  language: string
  language_name: string
  has_nikud: boolean
  has_shoresh?: boolean
  hebrew_mode?: HebrewMode
  cues: SubtitleCue[]
}

export interface SubtitlePreferenceResponse {
  content_id: string
  preferred_language: string | null
  hebrew_mode: HebrewMode
  last_used_at?: string
}

export const subtitlesService = {
  /**
   * Get available subtitle tracks for content
   */
  async getTracks(contentId: string): Promise<SubtitleTracksResponse> {
    const response = await axios.get<SubtitleTracksResponse>(
      `${API_BASE_URL}/api/v1/subtitles/${contentId}`
    )
    return response.data
  },

  /**
   * Get subtitle cues with optional Hebrew mode
   */
  async getCues(
    contentId: string,
    language: string,
    hebrewMode: HebrewMode = 'regular'
  ): Promise<SubtitleCuesResponse> {
    const response = await axios.get<SubtitleCuesResponse>(
      `${API_BASE_URL}/api/v1/subtitles/${contentId}/cues`,
      {
        params: {
          language,
          hebrew_mode: hebrewMode,
        },
      }
    )
    return response.data
  },

  /**
   * Generate nikud (vocalization) for Hebrew subtitles
   */
  async generateNikud(contentId: string, language: string = 'he'): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/subtitles/${contentId}/nikud`, null, {
      params: { language },
    })
  },

  /**
   * Generate shoresh (root words) for Hebrew subtitles
   */
  async generateShoresh(contentId: string, language: string = 'he'): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/subtitles/${contentId}/shoresh`, null, {
      params: { language },
    })
  },

  /**
   * Import subtitles from URL
   */
  async importSubtitles(
    contentId: string,
    sourceUrl: string,
    language: string,
    languageName: string
  ): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/subtitles/${contentId}/import`, null, {
      params: {
        source_url: sourceUrl,
        language,
        language_name: languageName,
      },
    })
  },

  /**
   * Delete subtitle track
   */
  async deleteTrack(contentId: string, language: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/v1/subtitles/${contentId}/${language}`)
  },
}

export const subtitlePreferencesService = {
  /**
   * Get user's subtitle preference for content
   */
  async getPreference(contentId: string): Promise<SubtitlePreferenceResponse> {
    const response = await axios.get<SubtitlePreferenceResponse>(
      `${API_BASE_URL}/api/v1/subtitles/preferences/${contentId}`
    )
    return response.data
  },

  /**
   * Set user's subtitle preference (language + Hebrew mode)
   */
  async setPreference(
    contentId: string,
    language: string,
    hebrewMode: HebrewMode = 'regular'
  ): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/subtitles/preferences/${contentId}`, null, {
      params: {
        language,
        hebrew_mode: hebrewMode,
      },
    })
  },

  /**
   * Update Hebrew mode only (convenience method)
   */
  async setHebrewMode(contentId: string, hebrewMode: HebrewMode): Promise<void> {
    await axios.patch(
      `${API_BASE_URL}/api/v1/subtitles/preferences/${contentId}/hebrew-mode`,
      null,
      {
        params: {
          hebrew_mode: hebrewMode,
        },
      }
    )
  },

  /**
   * Delete user's subtitle preference
   */
  async deletePreference(contentId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/v1/subtitles/preferences/${contentId}`)
  },
}
