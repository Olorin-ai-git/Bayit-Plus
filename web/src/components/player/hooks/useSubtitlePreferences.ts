/**
 * useSubtitlePreferences Hook
 * Manages subtitle preferences persistence (load/save from storage)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  SubtitleSettings,
  SubtitlePreferences,
  HebrewMode,
  EnglishMode,
  SplitLanguages,
} from '@/types/subtitle'
import { storageHelpers, STORAGE_KEYS, StorageSchemas } from '@/utils/storage'
import logger from '@/utils/logger'
import { useNotificationStore } from '@olorin/glass-ui/stores'

const DEFAULT_SETTINGS: SubtitleSettings = {
  fontSize: 'medium',
  position: 'bottom',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  textColor: '#ffffff',
}

export interface SubtitlePreferencesState {
  subtitlesEnabled: boolean
  currentSubtitleLang: string | null
  hebrewMode: HebrewMode
  englishMode: EnglishMode
  subtitleSettings: SubtitleSettings
  splitMode: boolean
  splitLanguages: SplitLanguages | null
}

export function useSubtitlePreferences() {
  const addNotification = useNotificationStore((state) => state.add)

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const [currentSubtitleLang, setCurrentSubtitleLang] = useState<string | null>(null)
  const [hebrewMode, setHebrewMode] = useState<HebrewMode>('regular')
  const [englishMode, setEnglishMode] = useState<EnglishMode>('regular')
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(DEFAULT_SETTINGS)
  const [splitMode, setSplitMode] = useState(false)
  const [splitLanguages, setSplitLanguages] = useState<SplitLanguages | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from storage
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
          setSplitMode(prefs.split_mode || false)
          setSplitLanguages(prefs.split_languages || null)
        }
      } catch (error) {
        logger.error('Failed to load subtitle preferences', 'useSubtitlePreferences', error)
      } finally {
        setIsLoaded(true)
      }
    }
    loadPreferences()
  }, [])

  // Save preferences to storage
  const savePreferences = useCallback(async () => {
    try {
      const prefs: SubtitlePreferences = {
        enabled: subtitlesEnabled,
        language: currentSubtitleLang,
        hebrew_mode: hebrewMode,
        english_mode: englishMode,
        settings: subtitleSettings,
        split_mode: splitMode,
        split_languages: splitLanguages,
      }
      await storageHelpers.setJSON(STORAGE_KEYS.SUBTITLE_PREFERENCES, prefs)
    } catch (error) {
      logger.error('Failed to save subtitle preferences', 'useSubtitlePreferences', error)
      addNotification({
        message: 'Could not save subtitle preferences',
        level: 'warning',
        duration: 3000,
      })
    }
  }, [subtitlesEnabled, currentSubtitleLang, hebrewMode, englishMode, subtitleSettings, splitMode, splitLanguages, addNotification])

  // Auto-save when preferences change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      savePreferences()
    }
  }, [isLoaded, savePreferences])

  return {
    // State
    subtitlesEnabled,
    currentSubtitleLang,
    hebrewMode,
    englishMode,
    subtitleSettings,
    splitMode,
    splitLanguages,
    isLoaded,
    // Setters
    setSubtitlesEnabled,
    setCurrentSubtitleLang,
    setHebrewMode,
    setEnglishMode,
    setSubtitleSettings,
    setSplitMode,
    setSplitLanguages,
  }
}
