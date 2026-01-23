/**
 * Custom hook for trivia management during video playback
 * Handles loading, displaying, and timing of trivia facts
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTriviaStore } from '@bayit/shared-stores'
import { TriviaFact, TriviaPreferences } from '@bayit/shared-types/trivia'
import logger from '@/utils/logger'

interface UseTriviaOptions {
  contentId?: string
  language?: string
  currentTime?: number
  isPlaying?: boolean
  onFactShown?: (fact: TriviaFact) => void
}

interface UseTriviaReturn {
  triviaEnabled: boolean
  currentFact: TriviaFact | null
  facts: TriviaFact[]
  triviaSettings: TriviaPreferences
  isLoading: boolean
  error: string | null
  toggleTrivia: () => void
  dismissFact: () => void
  updateSettings: (updates: Partial<TriviaPreferences>) => Promise<void>
}

export function useTrivia({
  contentId,
  language = 'he',
  currentTime,
  isPlaying = false,
  onFactShown,
}: UseTriviaOptions): UseTriviaReturn {
  const {
    preferences,
    currentFact,
    facts,
    isLoading,
    error,
    isEnabled,
    intervalMs,
    loadTrivia,
    loadPreferences,
    toggleEnabled,
    updatePreferences,
    showNextFact,
    dismissFact: storeDismissFact,
    clearError,
  } = useTriviaStore()

  const [lastCheckTime, setLastCheckTime] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences().catch((err) => {
      logger.error('Failed to load trivia preferences', 'useTrivia', err)
    })
  }, [loadPreferences])

  // Load trivia when contentId changes
  useEffect(() => {
    if (contentId) {
      loadTrivia(contentId, language).catch((err) => {
        logger.error('Failed to load trivia', 'useTrivia', err)
      })
    }
  }, [contentId, language, loadTrivia])

  // Check for new trivia to show based on current time and interval
  const checkForTrivia = useCallback(() => {
    if (!isEnabled() || !isPlaying) return

    const fact = showNextFact(currentTime)
    if (fact && onFactShown) {
      onFactShown(fact)
    }
  }, [isEnabled, isPlaying, currentTime, showNextFact, onFactShown])

  // Set up interval for checking trivia
  useEffect(() => {
    if (!isEnabled() || !isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Check immediately on play
    checkForTrivia()

    // Set up periodic checks
    intervalRef.current = setInterval(checkForTrivia, 10000) // Check every 10 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isEnabled, isPlaying, checkForTrivia])

  // Auto-dismiss current fact after display duration
  useEffect(() => {
    if (currentFact && preferences.auto_dismiss) {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current)
      }

      const displayDuration = currentFact.display_duration || preferences.display_duration
      autoDismissRef.current = setTimeout(() => {
        storeDismissFact()
      }, displayDuration * 1000)

      return () => {
        if (autoDismissRef.current) {
          clearTimeout(autoDismissRef.current)
          autoDismissRef.current = null
        }
      }
    }
  }, [currentFact, preferences.auto_dismiss, preferences.display_duration, storeDismissFact])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current)
      }
      clearError()
    }
  }, [clearError])

  const handleToggleTrivia = useCallback(async () => {
    try {
      await toggleEnabled()
    } catch (err) {
      logger.error('Failed to toggle trivia', 'useTrivia', err)
    }
  }, [toggleEnabled])

  const handleDismissFact = useCallback(() => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current)
      autoDismissRef.current = null
    }
    storeDismissFact()
  }, [storeDismissFact])

  const handleUpdateSettings = useCallback(
    async (updates: Partial<TriviaPreferences>) => {
      try {
        await updatePreferences(updates)
      } catch (err) {
        logger.error('Failed to update trivia settings', 'useTrivia', err)
      }
    },
    [updatePreferences]
  )

  return {
    triviaEnabled: isEnabled(),
    currentFact,
    facts,
    triviaSettings: preferences,
    isLoading,
    error,
    toggleTrivia: handleToggleTrivia,
    dismissFact: handleDismissFact,
    updateSettings: handleUpdateSettings,
  }
}

export default useTrivia
