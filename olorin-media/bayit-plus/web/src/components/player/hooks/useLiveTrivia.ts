/**
 * useLiveTrivia Hook
 *
 * Manages live trivia facts received from WebSocket during live streams.
 * Handles fact display, auto-dismissal, and user interactions.
 *
 * Features:
 * - WebSocket message handling for "live_trivia" type
 * - Auto-dismiss after display_duration (default: 12 seconds)
 * - Manual dismiss via user action
 * - Fact history tracking (last 20 facts)
 * - Multilingual support (Hebrew, English, Spanish)
 */

import { useState, useCallback, useEffect, useRef } from 'react'

export interface LiveTriviaFact {
  fact_id: string
  text: string  // Hebrew
  text_en: string
  text_es: string
  category: string
  display_duration: number
  priority: number
  detected_topic?: string
  topic_type?: string
}

interface UseLiveTriviaOptions {
  enabled?: boolean
  maxHistorySize?: number
}

interface UseLiveTriviaReturn {
  currentFact: LiveTriviaFact | null
  factHistory: LiveTriviaFact[]
  handleTriviaMessage: (fact: LiveTriviaFact) => void
  dismissCurrentFact: () => void
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
}

export function useLiveTrivia(
  options: UseLiveTriviaOptions = {}
): UseLiveTriviaReturn {
  const {
    enabled: initialEnabled = true,
    maxHistorySize = 20,
  } = options

  const [isEnabled, setEnabled] = useState(initialEnabled)
  const [currentFact, setCurrentFact] = useState<LiveTriviaFact | null>(null)
  const [factHistory, setFactHistory] = useState<LiveTriviaFact[]>([])

  // Auto-dismiss timer ref
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Clear the auto-dismiss timer
   */
  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  /**
   * Dismiss the current fact
   */
  const dismissCurrentFact = useCallback(() => {
    setCurrentFact(null)
    clearDismissTimer()
  }, [clearDismissTimer])

  /**
   * Handle incoming trivia fact from WebSocket
   */
  const handleTriviaMessage = useCallback(
    (fact: LiveTriviaFact) => {
      if (!isEnabled) {
        return
      }

      // Set as current fact
      setCurrentFact(fact)

      // Add to history (FIFO with max size)
      setFactHistory((prev) => {
        const newHistory = [...prev, fact]
        // Keep only last maxHistorySize facts
        return newHistory.slice(-maxHistorySize)
      })

      // Clear existing timer
      clearDismissTimer()

      // Set auto-dismiss timer
      const displayDuration = fact.display_duration * 1000 // Convert to ms
      dismissTimerRef.current = setTimeout(() => {
        dismissCurrentFact()
      }, displayDuration)
    },
    [isEnabled, maxHistorySize, clearDismissTimer, dismissCurrentFact]
  )

  /**
   * Cleanup timer on unmount
   */
  useEffect(() => {
    return () => {
      clearDismissTimer()
    }
  }, [clearDismissTimer])

  /**
   * Clear current fact when disabled
   */
  useEffect(() => {
    if (!isEnabled && currentFact) {
      dismissCurrentFact()
    }
  }, [isEnabled, currentFact, dismissCurrentFact])

  return {
    currentFact,
    factHistory,
    handleTriviaMessage,
    dismissCurrentFact,
    isEnabled,
    setEnabled,
  }
}
