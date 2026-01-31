/**
 * Custom hook for subtitle management
 */

import { useState, useEffect } from 'react'
import {
  SubtitleTrack,
  SubtitleCue,
  SubtitleSettings,
  SubtitlePreferences,
  HebrewMode,
  EnglishMode,
} from '@/types/subtitle'
import { subtitlesService, subtitlePreferencesService } from '@/services/api'
import logger from '@/utils/logger'
import { storageHelpers, STORAGE_KEYS, StorageSchemas } from '@/utils/storage'
import { useNotificationStore } from '@olorin/glass-ui/stores'

interface UseSubtitlesOptions {
  contentId?: string
  isLive?: boolean
}

export function useSubtitles({ contentId, isLive = false }: UseSubtitlesOptions) {
  // Global notification system
  const addNotification = useNotificationStore((state) => state.add)

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const [currentSubtitleLang, setCurrentSubtitleLang] = useState<string | null>(null)
  const [hebrewMode, setHebrewMode] = useState<HebrewMode>('regular')
  const [englishMode, setEnglishMode] = useState<EnglishMode>('regular')
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([])
  const [subtitlesLoading, setSubtitlesLoading] = useState(false)
  const [subtitlesError, setSubtitlesError] = useState<Error | null>(null)
  const [cuesLoading, setCuesLoading] = useState(false)
  const [cuesError, setCuesError] = useState<Error | null>(null)
  const [currentCues, setCurrentCues] = useState<SubtitleCue[]>([])
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    fontSize: 'medium',
    position: 'bottom',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
  })

  // Load subtitle preferences from storage with validation
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await storageHelpers.getValidatedJSON(
          STORAGE_KEYS.SUBTITLE_PREFERENCES,
          StorageSchemas.SubtitlePreferences
        )
        if (prefs) {
          setSubtitlesEnabled(prefs.enabled)
          setCurrentSubtitleLang(prefs.language)
          setHebrewMode(prefs.hebrew_mode || 'regular')
          setEnglishMode(prefs.english_mode || 'regular')
          setSubtitleSettings(prefs.settings)
        }
      } catch (error) {
        logger.error('Failed to load subtitle preferences', 'useSubtitles', error)
      }
    }
    loadPreferences()
  }, [])

  // Function to fetch available subtitles
  const fetchAvailableSubtitles = async () => {
    if (!contentId || isLive) return

    setSubtitlesLoading(true)
    setSubtitlesError(null)
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
      const errorObj = error instanceof Error ? error : new Error(String(error))
      setSubtitlesError(errorObj)
      logger.error('Failed to fetch subtitle tracks', 'useSubtitles', error)

      // Show error notification
      addNotification({
        message: 'Failed to load subtitle languages. Please try again.',
        level: 'error',
        duration: 5000,
      })
    } finally {
      setSubtitlesLoading(false)
    }
  }

  // Fetch available subtitles when contentId changes
  useEffect(() => {
    fetchAvailableSubtitles()
  }, [contentId, isLive])

  // Fetch subtitle cues when language or mode changes
  useEffect(() => {
    if (!contentId || !currentSubtitleLang || !subtitlesEnabled) {
      setCurrentCues([])
      setCuesError(null)
      return
    }

    const fetchCues = async () => {
      setCuesLoading(true)
      setCuesError(null)
      try {
        // Pass appropriate mode based on language
        const response = await subtitlesService.getCues(
          contentId,
          currentSubtitleLang,
          currentSubtitleLang === 'he' ? hebrewMode : 'regular',
          currentSubtitleLang === 'en' ? englishMode : 'regular'
        )
        setCurrentCues(response.cues || [])
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        setCuesError(errorObj)
        logger.error('Failed to fetch subtitle cues', 'useSubtitles', error)
        setCurrentCues([])

        // Show error notification
        addNotification({
          message: 'Failed to load subtitle text. Please try again.',
          level: 'error',
          duration: 5000,
        })
      } finally {
        setCuesLoading(false)
      }
    }

    fetchCues()
  }, [contentId, currentSubtitleLang, hebrewMode, englishMode, subtitlesEnabled])

  // Save subtitle preferences to storage
  useEffect(() => {
    const savePreferences = async () => {
      try {
        const prefs: SubtitlePreferences = {
          enabled: subtitlesEnabled,
          language: currentSubtitleLang,
          hebrew_mode: hebrewMode,
          english_mode: englishMode,
          settings: subtitleSettings,
        }
        await storageHelpers.setJSON(STORAGE_KEYS.SUBTITLE_PREFERENCES, prefs)
      } catch (error) {
        logger.error('Failed to save subtitle preferences', 'useSubtitles', error)

        // Show warning notification (non-critical)
        addNotification({
          message: 'Could not save subtitle preferences',
          level: 'warning',
          duration: 3000,
        })
      }
    }
    savePreferences()
  }, [subtitlesEnabled, currentSubtitleLang, hebrewMode, englishMode, subtitleSettings])

  // Subtitle handlers
  const handleSubtitleToggle = (enabled: boolean) => {
    setSubtitlesEnabled(enabled)
    // When disabling, also clear the language selection
    if (!enabled) {
      setCurrentSubtitleLang(null)
    }
  }

  const handleSubtitleLanguageChange = async (language: string | null) => {
    setCurrentSubtitleLang(language)
    // Enable subtitles when selecting a language
    if (language) {
      setSubtitlesEnabled(true)
    }

    // Save user preference for this content
    if (contentId && language) {
      try {
        await subtitlePreferencesService.setPreference(contentId, language)
      } catch (error) {
        logger.error('Failed to save subtitle preference', 'useSubtitles', error)
        addNotification({
          message: 'Could not save language preference',
          level: 'warning',
          duration: 3000,
        })
      }
    }
  }

  const handleSubtitleSettingsChange = (settings: SubtitleSettings) => {
    setSubtitleSettings(settings)
  }

  const handleHebrewModeChange = async (mode: HebrewMode) => {
    setHebrewMode(mode)

    // Auto-select Hebrew and enable subtitles when choosing nikud or shoresh mode
    if (mode === 'nikud' || mode === 'shoresh') {
      if (currentSubtitleLang !== 'he') {
        setCurrentSubtitleLang('he')
        logger.info('Auto-selected Hebrew subtitles for AI mode', 'useSubtitles', { mode })
      }
      if (!subtitlesEnabled) {
        setSubtitlesEnabled(true)
        logger.info('Auto-enabled subtitles for AI mode', 'useSubtitles', { mode })
      }
    }

    // Save to backend if we have a contentId
    if (contentId) {
      try {
        // For nikud/shoresh, also save Hebrew as the language preference
        if (mode === 'nikud' || mode === 'shoresh') {
          await subtitlePreferencesService.setPreference(contentId, 'he', mode)
        } else if (currentSubtitleLang === 'he') {
          await subtitlePreferencesService.setHebrewMode(contentId, mode)
        }
      } catch (error) {
        logger.error('Failed to save Hebrew mode preference', 'useSubtitles', error)
        addNotification({
          message: 'Could not save Hebrew mode preference',
          level: 'warning',
          duration: 3000,
        })
      }
    }
  }

  const handleEnglishModeChange = async (mode: EnglishMode) => {
    setEnglishMode(mode)

    // Auto-select English and enable subtitles when choosing heblish mode
    if (mode === 'heblish') {
      if (currentSubtitleLang !== 'en') {
        setCurrentSubtitleLang('en')
        logger.info('Auto-selected English subtitles for Heblish mode', 'useSubtitles', { mode })
      }
      if (!subtitlesEnabled) {
        setSubtitlesEnabled(true)
        logger.info('Auto-enabled subtitles for Heblish mode', 'useSubtitles', { mode })
      }
    }

    // Save to backend if we have a contentId
    if (contentId) {
      try {
        // For heblish, also save English as the language preference
        if (mode === 'heblish') {
          await subtitlePreferencesService.setPreference(contentId, 'en', 'regular', mode)
        } else if (currentSubtitleLang === 'en') {
          await subtitlePreferencesService.setEnglishMode(contentId, mode)
        }
      } catch (error) {
        logger.error('Failed to save English mode preference', 'useSubtitles', error)
        addNotification({
          message: 'Could not save English mode preference',
          level: 'warning',
          duration: 3000,
        })
      }
    }
  }

  // Retry handlers
  const retryFetchSubtitles = () => {
    setSubtitlesError(null)
    fetchAvailableSubtitles()
  }

  const retryFetchCues = () => {
    setCuesError(null)
    // Trigger re-fetch by toggling a dependency
    if (contentId && currentSubtitleLang) {
      const fetchCues = async () => {
        setCuesLoading(true)
        setCuesError(null)
        try {
          const response = await subtitlesService.getCues(
            contentId,
            currentSubtitleLang,
            currentSubtitleLang === 'he' ? hebrewMode : 'regular',
            currentSubtitleLang === 'en' ? englishMode : 'regular'
          )
          setCurrentCues(response.cues || [])
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error))
          setCuesError(errorObj)
          logger.error('Failed to fetch subtitle cues', 'useSubtitles', error)
          setCurrentCues([])
        } finally {
          setCuesLoading(false)
        }
      }
      fetchCues()
    }
  }

  return {
    subtitlesEnabled,
    currentSubtitleLang,
    hebrewMode,
    englishMode,
    availableSubtitles,
    subtitlesLoading,
    subtitlesError,
    cuesLoading,
    cuesError,
    currentCues,
    subtitleSettings,
    handleSubtitleToggle,
    handleSubtitleLanguageChange,
    handleHebrewModeChange,
    handleEnglishModeChange,
    handleSubtitleSettingsChange,
    fetchAvailableSubtitles,
    retryFetchSubtitles,
    retryFetchCues,
  }
}
