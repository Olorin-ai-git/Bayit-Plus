/**
 * useSubtitleCues Hook
 * Fetches and manages subtitle cues for the currently selected language
 */

import { useState, useEffect, useCallback } from 'react'
import { SubtitleCue, HebrewMode, EnglishMode } from '@/types/subtitle'
import { subtitlesService } from '@/services/api'
import logger from '@/utils/logger'
import { useNotificationStore } from '@olorin/glass-ui/stores'

interface UseSubtitleCuesOptions {
  contentId?: string
  currentSubtitleLang: string | null
  hebrewMode: HebrewMode
  englishMode: EnglishMode
  subtitlesEnabled: boolean
  isLive?: boolean
}

export function useSubtitleCues({
  contentId,
  currentSubtitleLang,
  hebrewMode,
  englishMode,
  subtitlesEnabled,
  isLive = false,
}: UseSubtitleCuesOptions) {
  const addNotification = useNotificationStore((state) => state.add)

  const [currentCues, setCurrentCues] = useState<SubtitleCue[]>([])
  const [cuesLoading, setCuesLoading] = useState(false)
  const [cuesError, setCuesError] = useState<Error | null>(null)

  // Fetch cues when language or mode changes
  useEffect(() => {
    if (!contentId || !currentSubtitleLang || !subtitlesEnabled || isLive) {
      setCurrentCues([])
      setCuesError(null)
      return
    }

    const fetchCues = async () => {
      setCuesLoading(true)
      setCuesError(null)
      try {
        logger.debug('Fetching subtitle cues', 'useSubtitleCues', {
          contentId,
          language: currentSubtitleLang,
          hebrewMode: currentSubtitleLang === 'he' ? hebrewMode : 'regular',
          englishMode: currentSubtitleLang === 'en' ? englishMode : 'regular',
        })

        const response = await subtitlesService.getCues(
          contentId,
          currentSubtitleLang,
          currentSubtitleLang === 'he' ? hebrewMode : 'regular',
          currentSubtitleLang === 'en' ? englishMode : 'regular'
        )

        if (!response || response.detail || !Array.isArray(response.cues)) {
          throw new Error(response?.detail || 'Subtitle track not found')
        }

        logger.debug('Subtitle cues loaded', 'useSubtitleCues', {
          contentId,
          language: currentSubtitleLang,
          cueCount: response.cues.length,
        })
        setCurrentCues(response.cues)
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        setCuesError(errorObj)
        logger.error('Failed to fetch subtitle cues', 'useSubtitleCues', error)
        setCurrentCues([])
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
  }, [contentId, currentSubtitleLang, hebrewMode, englishMode, subtitlesEnabled, isLive])

  const retryFetchCues = useCallback(() => {
    if (!contentId || !currentSubtitleLang) return

    setCuesError(null)
    setCuesLoading(true)

    subtitlesService.getCues(
      contentId,
      currentSubtitleLang,
      currentSubtitleLang === 'he' ? hebrewMode : 'regular',
      currentSubtitleLang === 'en' ? englishMode : 'regular'
    ).then((response) => {
      if (response && Array.isArray(response.cues)) {
        setCurrentCues(response.cues)
      }
    }).catch((error) => {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      setCuesError(errorObj)
      logger.error('Failed to fetch subtitle cues', 'useSubtitleCues', error)
      setCurrentCues([])
    }).finally(() => {
      setCuesLoading(false)
    })
  }, [contentId, currentSubtitleLang, hebrewMode, englishMode])

  return {
    currentCues,
    cuesLoading,
    cuesError,
    retryFetchCues,
  }
}
