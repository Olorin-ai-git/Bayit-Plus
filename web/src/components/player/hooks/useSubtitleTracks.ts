/**
 * useSubtitleTracks Hook
 * Fetches and manages available subtitle tracks for a content item
 */

import { useState, useEffect, useCallback } from 'react'
import { SubtitleTrack } from '@/types/subtitle'
import { subtitlesService, subtitlePreferencesService } from '@/services/api'
import logger from '@/utils/logger'
import { useNotificationStore } from '@olorin/glass-ui/stores'

interface UseSubtitleTracksOptions {
  contentId?: string
  isLive?: boolean
  subtitlesEnabled: boolean
  currentSubtitleLang: string | null
  setCurrentSubtitleLang: (lang: string | null) => void
}

export function useSubtitleTracks({
  contentId,
  isLive = false,
  subtitlesEnabled,
  currentSubtitleLang,
  setCurrentSubtitleLang,
}: UseSubtitleTracksOptions) {
  const addNotification = useNotificationStore((state) => state.add)

  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([])
  const [subtitlesLoading, setSubtitlesLoading] = useState(false)
  const [subtitlesError, setSubtitlesError] = useState<Error | null>(null)

  const fetchAvailableSubtitles = useCallback(async () => {
    if (!contentId || isLive) return

    setSubtitlesLoading(true)
    setSubtitlesError(null)
    try {
      logger.debug('Fetching available subtitle tracks', 'useSubtitleTracks', { contentId })
      const response = await subtitlesService.getTracks(contentId)

      if (!response || response.detail) {
        throw new Error(response?.detail || 'Failed to load subtitle tracks')
      }

      const tracks = Array.isArray(response.tracks) ? response.tracks : []

      // Sort tracks: Hebrew first, English second, then others
      const sortedTracks = tracks.sort((a, b) => {
        const aIsHebrew = a.language === 'he'
        const bIsHebrew = b.language === 'he'
        const aIsEnglish = a.language === 'en'
        const bIsEnglish = b.language === 'en'

        if (aIsHebrew && !bIsHebrew) return -1
        if (!aIsHebrew && bIsHebrew) return 1
        if (aIsEnglish && !bIsEnglish) return -1
        if (!aIsEnglish && bIsEnglish) return 1
        return 0
      })

      logger.debug('Subtitle tracks loaded', 'useSubtitleTracks', { contentId, trackCount: sortedTracks.length })
      setAvailableSubtitles(sortedTracks)

      // Auto-select language if enabled and not already set
      if (subtitlesEnabled && !currentSubtitleLang && sortedTracks.length > 0) {
        const selectedLang = await selectBestLanguage(contentId, sortedTracks)
        setCurrentSubtitleLang(selectedLang)
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      setSubtitlesError(errorObj)
      logger.error('Failed to fetch subtitle tracks', 'useSubtitleTracks', error)
      addNotification({
        message: 'Failed to load subtitle languages. Please try again.',
        level: 'error',
        duration: 5000,
      })
    } finally {
      setSubtitlesLoading(false)
    }
  }, [contentId, isLive, subtitlesEnabled, currentSubtitleLang, setCurrentSubtitleLang, addNotification])

  // Fetch tracks when contentId changes
  useEffect(() => {
    fetchAvailableSubtitles()
  }, [fetchAvailableSubtitles])

  const retryFetchSubtitles = useCallback(() => {
    setSubtitlesError(null)
    fetchAvailableSubtitles()
  }, [fetchAvailableSubtitles])

  return {
    availableSubtitles,
    subtitlesLoading,
    subtitlesError,
    fetchAvailableSubtitles,
    retryFetchSubtitles,
  }
}

// Helper function to select the best language based on user preference or fallback logic
async function selectBestLanguage(
  contentId: string,
  tracks: SubtitleTrack[]
): Promise<string> {
  const availableLanguages = tracks.map((t) => t.language)

  // Try user's saved preference first
  try {
    const prefResponse = await subtitlePreferencesService.getPreference(contentId)
    if (prefResponse.preferred_language && availableLanguages.includes(prefResponse.preferred_language)) {
      return prefResponse.preferred_language
    }
  } catch {
    // Preference not found - continue with fallback
  }

  // Fallback: Hebrew > English > Default > First
  if (availableLanguages.includes('he')) return 'he'
  if (availableLanguages.includes('en')) return 'en'

  const defaultTrack = tracks.find((t) => t.is_default) || tracks[0]
  return defaultTrack.language
}
