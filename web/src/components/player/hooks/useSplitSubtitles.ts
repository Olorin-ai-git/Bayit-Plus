/**
 * useSplitSubtitles Hook
 * Manages split screen subtitle mode state and parallel cue fetching
 */

import { useState, useEffect, useCallback } from 'react'
import { SubtitleCue, HebrewMode, EnglishMode, SplitLanguages } from '@/types/subtitle'
import { subtitlesService } from '@/services/api'
import logger from '@/utils/logger'
import { useNotificationStore } from '@olorin/glass-ui/stores'

interface UseSplitSubtitlesOptions {
  contentId?: string
  splitMode: boolean
  splitLanguages: SplitLanguages | null
  hebrewMode: HebrewMode
  englishMode: EnglishMode
  subtitlesEnabled: boolean
  isLive?: boolean
  setSplitMode: (mode: boolean) => void
  setSplitLanguages: (langs: SplitLanguages | null) => void
  setSubtitlesEnabled: (enabled: boolean) => void
}

export function useSplitSubtitles({
  contentId,
  splitMode,
  splitLanguages,
  hebrewMode,
  englishMode,
  subtitlesEnabled,
  isLive = false,
  setSplitMode,
  setSplitLanguages,
  setSubtitlesEnabled,
}: UseSplitSubtitlesOptions) {
  const addNotification = useNotificationStore((state) => state.add)

  const [splitCues, setSplitCues] = useState<{
    primary: SubtitleCue[]
    secondary: SubtitleCue[]
  }>({ primary: [], secondary: [] })
  const [splitCuesLoading, setSplitCuesLoading] = useState(false)

  // Fetch cues for both languages when split mode is active
  useEffect(() => {
    if (!contentId || !splitMode || !splitLanguages || !subtitlesEnabled || isLive) {
      setSplitCues({ primary: [], secondary: [] })
      return
    }

    const fetchSplitCues = async () => {
      setSplitCuesLoading(true)
      try {
        const [primaryLang, secondaryLang] = splitLanguages

        const [primaryResponse, secondaryResponse] = await Promise.all([
          subtitlesService.getCues(
            contentId,
            primaryLang,
            (primaryLang === 'he' ? hebrewMode : 'regular') as any,
            (primaryLang === 'en' ? englishMode : 'regular') as any
          ),
          subtitlesService.getCues(
            contentId,
            secondaryLang,
            (secondaryLang === 'he' ? hebrewMode : 'regular') as any,
            (secondaryLang === 'en' ? englishMode : 'regular') as any
          ),
        ])

        setSplitCues({
          primary: primaryResponse.cues || [],
          secondary: secondaryResponse.cues || [],
        })
      } catch (error) {
        logger.error('Failed to fetch split subtitle cues', 'useSplitSubtitles', error)
        setSplitCues({ primary: [], secondary: [] })
        addNotification({
          message: 'Failed to load split screen subtitles. Please try again.',
          level: 'error',
          duration: 5000,
        })
      } finally {
        setSplitCuesLoading(false)
      }
    }

    fetchSplitCues()
  }, [contentId, splitMode, splitLanguages, hebrewMode, englishMode, subtitlesEnabled])

  // Toggle split mode
  const handleSplitModeToggle = useCallback((enabled: boolean) => {
    setSplitMode(enabled)
    if (!enabled) {
      setSplitLanguages(null)
      setSplitCues({ primary: [], secondary: [] })
    }
    logger.info('Split mode toggled', 'useSplitSubtitles', { enabled })
  }, [setSplitMode, setSplitLanguages])

  // Set split languages
  const handleSplitLanguagesChange = useCallback((languages: SplitLanguages | null) => {
    setSplitLanguages(languages)
    if (languages) {
      setSubtitlesEnabled(true)
      setSplitMode(true)
      logger.info('Split languages selected', 'useSplitSubtitles', { languages })
    }
  }, [setSplitLanguages, setSubtitlesEnabled, setSplitMode])

  return {
    splitCues,
    splitCuesLoading,
    handleSplitModeToggle,
    handleSplitLanguagesChange,
  }
}
