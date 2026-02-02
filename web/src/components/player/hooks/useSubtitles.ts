/**
 * useSubtitles Hook
 * Composes smaller hooks for subtitle management
 */

import { useCallback, useEffect, useRef } from 'react'
import { SubtitleSettings, HebrewMode, EnglishMode, SplitLanguages } from '@/types/subtitle'
import { subtitlePreferencesService } from '@/services/api'
import logger from '@/utils/logger'
import { useNotificationStore } from '@olorin/glass-ui/stores'
import { useSubtitlePreferences } from './useSubtitlePreferences'
import { useSubtitleTracks } from './useSubtitleTracks'
import { useSubtitleCues } from './useSubtitleCues'
import { useSplitSubtitles } from './useSplitSubtitles'

interface UseSubtitlesOptions {
  contentId?: string
  isLive?: boolean
  initialSubtitleLang?: string | null
}

export function useSubtitles({ contentId, isLive = false, initialSubtitleLang }: UseSubtitlesOptions) {
  const addNotification = useNotificationStore((state) => state.add)
  const initialSubtitleAppliedRef = useRef(false)

  // Load preferences from storage
  const preferences = useSubtitlePreferences()
  const {
    subtitlesEnabled,
    currentSubtitleLang,
    hebrewMode,
    englishMode,
    subtitleSettings,
    splitMode,
    splitLanguages,
    isLoaded: preferencesLoaded,
    setSubtitlesEnabled,
    setCurrentSubtitleLang,
    setHebrewMode,
    setEnglishMode,
    setSubtitleSettings,
    setSplitMode,
    setSplitLanguages,
  } = preferences

  // Fetch available subtitle tracks
  const { availableSubtitles, subtitlesLoading, subtitlesError, fetchAvailableSubtitles, retryFetchSubtitles } =
    useSubtitleTracks({
      contentId,
      isLive,
      subtitlesEnabled,
      currentSubtitleLang,
      setCurrentSubtitleLang,
    })

  // Fetch subtitle cues for current language
  const { currentCues, cuesLoading, cuesError, retryFetchCues } = useSubtitleCues({
    contentId,
    currentSubtitleLang,
    hebrewMode,
    englishMode,
    subtitlesEnabled,
  })

  // Split mode subtitle management
  const { splitCues, splitCuesLoading, handleSplitModeToggle, handleSplitLanguagesChange } = useSplitSubtitles({
    contentId,
    splitMode,
    splitLanguages,
    hebrewMode,
    englishMode,
    subtitlesEnabled,
    setSplitMode,
    setSplitLanguages,
    setSubtitlesEnabled,
  })

  // Apply initial subtitle selection from detail page (overrides stored preferences)
  // CRITICAL: Wait for preferences to load first to avoid race condition
  useEffect(() => {
    if (initialSubtitleLang && preferencesLoaded && !initialSubtitleAppliedRef.current) {
      logger.info('Applying pre-selected subtitle from detail page', 'useSubtitles', {
        language: initialSubtitleLang,
        currentLang: currentSubtitleLang,
        preferencesLoaded,
        override: true
      })

      // Mark as applied to prevent re-triggering
      initialSubtitleAppliedRef.current = true

      // Apply the pre-selected subtitle (overrides any stored preference)
      setCurrentSubtitleLang(initialSubtitleLang)
      setSubtitlesEnabled(true)
    }
  }, [initialSubtitleLang, preferencesLoaded, currentSubtitleLang, setCurrentSubtitleLang, setSubtitlesEnabled])

  // Handler: Toggle subtitles on/off
  const handleSubtitleToggle = useCallback((enabled: boolean) => {
    setSubtitlesEnabled(enabled)
    if (!enabled) {
      setCurrentSubtitleLang(null)
    }
  }, [setSubtitlesEnabled, setCurrentSubtitleLang])

  // Handler: Change subtitle language
  const handleSubtitleLanguageChange = useCallback(async (language: string | null) => {
    logger.info('Subtitle language change', 'useSubtitles', { from: currentSubtitleLang, to: language })
    setCurrentSubtitleLang(language)
    if (language) setSubtitlesEnabled(true)

    if (contentId && language) {
      try {
        await subtitlePreferencesService.setPreference(contentId, language)
      } catch (error) {
        logger.error('Failed to save subtitle preference', 'useSubtitles', error)
        addNotification({ message: 'Could not save language preference', level: 'warning', duration: 3000 })
      }
    }
  }, [contentId, currentSubtitleLang, setCurrentSubtitleLang, setSubtitlesEnabled])

  // Handler: Change subtitle settings
  const handleSubtitleSettingsChange = useCallback((settings: SubtitleSettings) => {
    setSubtitleSettings(settings)
  }, [setSubtitleSettings])

  // Handler: Change Hebrew mode
  const handleHebrewModeChange = useCallback(async (mode: HebrewMode) => {
    setHebrewMode(mode)
    const isAIMode = mode === 'nikud' || mode === 'shoresh'
    if (isAIMode) {
      if (currentSubtitleLang !== 'he') setCurrentSubtitleLang('he')
      if (!subtitlesEnabled) setSubtitlesEnabled(true)
    }
    if (contentId) {
      try {
        if (isAIMode) {
          await subtitlePreferencesService.setPreference(contentId, 'he', mode)
        } else if (currentSubtitleLang === 'he') {
          await subtitlePreferencesService.setHebrewMode(contentId, mode)
        }
      } catch (error) {
        logger.error('Failed to save Hebrew mode', 'useSubtitles', error)
        addNotification({ message: 'Could not save Hebrew mode preference', level: 'warning', duration: 3000 })
      }
    }
  }, [contentId, currentSubtitleLang, subtitlesEnabled, setHebrewMode, setCurrentSubtitleLang, setSubtitlesEnabled])

  // Handler: Change English mode
  const handleEnglishModeChange = useCallback(async (mode: EnglishMode) => {
    setEnglishMode(mode)
    const isAIMode = mode === 'heblish' || mode === 'grammarFlip' || mode === 'slangSynthesis'
    if (isAIMode) {
      if (currentSubtitleLang !== 'en') setCurrentSubtitleLang('en')
      if (!subtitlesEnabled) setSubtitlesEnabled(true)
    }
    if (contentId) {
      try {
        if (isAIMode) {
          await subtitlePreferencesService.setPreference(contentId, 'en', 'regular', mode)
        } else if (currentSubtitleLang === 'en') {
          await subtitlePreferencesService.setEnglishMode(contentId, mode)
        }
      } catch (error) {
        logger.error('Failed to save English mode', 'useSubtitles', error)
        addNotification({ message: 'Could not save English mode preference', level: 'warning', duration: 3000 })
      }
    }
  }, [contentId, currentSubtitleLang, subtitlesEnabled, setEnglishMode, setCurrentSubtitleLang, setSubtitlesEnabled])

  return {
    // State
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
    // Split mode state
    splitMode,
    splitLanguages,
    splitCues,
    splitCuesLoading,
    // Handlers
    handleSubtitleToggle,
    handleSubtitleLanguageChange,
    handleHebrewModeChange,
    handleEnglishModeChange,
    handleSubtitleSettingsChange,
    handleSplitModeToggle,
    handleSplitLanguagesChange,
    fetchAvailableSubtitles,
    retryFetchSubtitles,
    retryFetchCues,
  }
}
