/**
 * Custom hook for subtitle management
 */

import { useState, useEffect } from 'react'
import {
  SubtitleTrack,
  SubtitleCue,
  SubtitleSettings,
  SubtitlePreferences,
} from '@/types/subtitle'
import { subtitlesService, subtitlePreferencesService } from '@/services/api'
import logger from '@/utils/logger'

interface UseSubtitlesOptions {
  contentId?: string
  isLive?: boolean
}

export function useSubtitles({ contentId, isLive = false }: UseSubtitlesOptions) {
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const [currentSubtitleLang, setCurrentSubtitleLang] = useState<string | null>(null)
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([])
  const [subtitlesLoading, setSubtitlesLoading] = useState(false)
  const [currentCues, setCurrentCues] = useState<SubtitleCue[]>([])
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    fontSize: 'medium',
    position: 'bottom',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
  })

  // Load subtitle preferences from localStorage
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('bayit-subtitle-preferences')
      if (savedPrefs) {
        const prefs: SubtitlePreferences = JSON.parse(savedPrefs)
        setSubtitlesEnabled(prefs.enabled)
        setCurrentSubtitleLang(prefs.language)
        setSubtitleSettings(prefs.settings)
      }
    } catch (error) {
      logger.error('Failed to load subtitle preferences', 'useSubtitles', error)
    }
  }, [])

  // Function to fetch available subtitles
  const fetchAvailableSubtitles = async () => {
    if (!contentId || isLive) return

    setSubtitlesLoading(true)
    try {
      const response = await subtitlesService.getTracks(contentId)
      setAvailableSubtitles(response.tracks || [])

      // Auto-select subtitle language if enabled and not already set
      if (subtitlesEnabled && !currentSubtitleLang && response.tracks?.length > 0) {
        const availableLanguages = response.tracks.map((t: any) => t.language)

        // Priority: 1. User preference, 2. Hebrew, 3. English, 4. Default, 5. First available
        let selectedLanguage: string | null = null

        // Try to get user's saved preference for this content
        try {
          const prefResponse = await subtitlePreferencesService.getPreference(contentId)
          if (prefResponse.preferred_language && availableLanguages.includes(prefResponse.preferred_language)) {
            selectedLanguage = prefResponse.preferred_language
          }
        } catch (error) {
          // Preference not found or error - continue with fallback
        }

        // Fallback to Hebrew > English if no preference
        if (!selectedLanguage) {
          if (availableLanguages.includes('he')) {
            selectedLanguage = 'he'
          } else if (availableLanguages.includes('en')) {
            selectedLanguage = 'en'
          } else {
            // Fallback to default or first available
            const defaultTrack = response.tracks.find((t: any) => t.is_default) || response.tracks[0]
            selectedLanguage = defaultTrack.language
          }
        }

        setCurrentSubtitleLang(selectedLanguage)
      }
    } catch (error) {
      logger.error('Failed to fetch subtitle tracks', 'useSubtitles', error)
    } finally {
      setSubtitlesLoading(false)
    }
  }

  // Fetch available subtitles when contentId changes
  useEffect(() => {
    fetchAvailableSubtitles()
  }, [contentId, isLive])

  // Fetch subtitle cues when language changes
  useEffect(() => {
    if (!contentId || !currentSubtitleLang || !subtitlesEnabled) {
      setCurrentCues([])
      return
    }

    const fetchCues = async () => {
      try {
        const response = await subtitlesService.getCues(contentId, currentSubtitleLang)
        setCurrentCues(response.cues || [])
      } catch (error) {
        logger.error('Failed to fetch subtitle cues', 'useSubtitles', error)
      }
    }

    fetchCues()
  }, [contentId, currentSubtitleLang, subtitlesEnabled])

  // Save subtitle preferences to localStorage
  useEffect(() => {
    try {
      const prefs: SubtitlePreferences = {
        enabled: subtitlesEnabled,
        language: currentSubtitleLang,
        settings: subtitleSettings,
      }
      localStorage.setItem('bayit-subtitle-preferences', JSON.stringify(prefs))
    } catch (error) {
      logger.error('Failed to save subtitle preferences', 'useSubtitles', error)
    }
  }, [subtitlesEnabled, currentSubtitleLang, subtitleSettings])

  // Subtitle handlers
  const handleSubtitleToggle = (enabled: boolean) => {
    setSubtitlesEnabled(enabled)
  }

  const handleSubtitleLanguageChange = async (language: string | null) => {
    setCurrentSubtitleLang(language)

    // Save user preference for this content
    if (contentId && language) {
      try {
        await subtitlePreferencesService.setPreference(contentId, language)
      } catch (error) {
        logger.error('Failed to save subtitle preference', 'useSubtitles', error)
      }
    }
  }

  const handleSubtitleSettingsChange = (settings: SubtitleSettings) => {
    setSubtitleSettings(settings)
  }

  return {
    subtitlesEnabled,
    currentSubtitleLang,
    availableSubtitles,
    subtitlesLoading,
    currentCues,
    subtitleSettings,
    handleSubtitleToggle,
    handleSubtitleLanguageChange,
    handleSubtitleSettingsChange,
    fetchAvailableSubtitles,
  }
}
