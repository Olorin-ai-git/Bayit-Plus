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
  followUpFact: () => void
  updateSettings: (updates: Partial<TriviaPreferences>) => Promise<void>
  onHoverStart: () => void
  onHoverEnd: () => void
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
    loadEnrichedTrivia,
    loadPreferences,
    toggleEnabled,
    updatePreferences,
    showNextFact,
    dismissFact: storeDismissFact,
    followUpFact: storeFollowUpFact,
    clearError,
  } = useTriviaStore()

  const [lastCheckTime, setLastCheckTime] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoveredRef = useRef<boolean>(false)
  const remainingDismissMs = useRef<number>(0)
  const dismissStartedAt = useRef<number>(0)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences().catch((err) => {
      logger.error('Failed to load trivia preferences', 'useTrivia', err)
    })
  }, [loadPreferences])

  // Load enriched trivia (with AI chains) when contentId changes
  useEffect(() => {
    if (contentId) {
      loadEnrichedTrivia(contentId, language).catch((err) => {
        logger.error('Failed to load enriched trivia', 'useTrivia', err)
      })
    }
  }, [contentId, language, loadEnrichedTrivia])

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

  // Start or restart the auto-dismiss timer with a given duration
  const startAutoDismissTimer = useCallback((durationMs: number) => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current)
    }
    remainingDismissMs.current = durationMs
    dismissStartedAt.current = Date.now()
    autoDismissRef.current = setTimeout(() => {
      storeDismissFact()
    }, durationMs)
  }, [storeDismissFact])

  // Auto-dismiss current fact after display duration
  useEffect(() => {
    if (currentFact && preferences.auto_dismiss) {
      const displayDuration = currentFact.display_duration || preferences.display_duration
      if (!isHoveredRef.current) {
        startAutoDismissTimer(displayDuration * 1000)
      } else {
        remainingDismissMs.current = displayDuration * 1000
      }

      return () => {
        if (autoDismissRef.current) {
          clearTimeout(autoDismissRef.current)
          autoDismissRef.current = null
        }
      }
    }
  }, [currentFact, preferences.auto_dismiss, preferences.display_duration, startAutoDismissTimer])

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

  const handleFollowUpFact = useCallback(() => {
    // Reset auto-dismiss timer when following up
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current)
      autoDismissRef.current = null
    }
    storeFollowUpFact()
  }, [storeFollowUpFact])

  const handleHoverStart = useCallback(() => {
    isHoveredRef.current = true
    if (autoDismissRef.current) {
      const elapsed = Date.now() - dismissStartedAt.current
      remainingDismissMs.current = Math.max(0, remainingDismissMs.current - elapsed)
      clearTimeout(autoDismissRef.current)
      autoDismissRef.current = null
    }
  }, [])

  const handleHoverEnd = useCallback(() => {
    isHoveredRef.current = false
    if (currentFact && preferences.auto_dismiss && remainingDismissMs.current > 0) {
      startAutoDismissTimer(remainingDismissMs.current)
    }
  }, [currentFact, preferences.auto_dismiss, startAutoDismissTimer])

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
    followUpFact: handleFollowUpFact,
    updateSettings: handleUpdateSettings,
    onHoverStart: handleHoverStart,
    onHoverEnd: handleHoverEnd,
  }
}

export default useTrivia
