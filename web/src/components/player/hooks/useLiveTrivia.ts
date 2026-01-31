/**
 * useLiveTrivia Hook
 *
 * Manages live trivia facts received from WebSocket during live streams.
 * Handles WebSocket lifecycle, fact display, auto-dismissal, and user interactions.
 *
 * Features:
 * - WebSocket connection management (connect/disconnect based on enabled + channelId)
 * - Transcript forwarding via sendTranscript (text from live subtitle cues)
 * - Auto-dismiss after display_duration (default: 12 seconds)
 * - Manual dismiss via user action
 * - Fact history tracking (last 20 facts)
 * - "waiting for transcript" hint when connected but no subtitles flowing
 * - Multilingual support (Hebrew, English, Spanish)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import liveTriviaService from '@/services/liveTriviaService'
import logger from '@/utils/logger'

const LOG_CONTEXT = 'useLiveTrivia'

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
  channelId?: string
  language?: string
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
  isConnected: boolean
  connectionError: string | null
  sendTranscript: (text: string, language: string) => void
  waitingForTranscript: boolean
}

export function useLiveTrivia(
  options: UseLiveTriviaOptions = {}
): UseLiveTriviaReturn {
  const {
    channelId,
    language = 'he',
    enabled: initialEnabled = true,
    maxHistorySize = 20,
  } = options

  const [isEnabled, setEnabled] = useState(initialEnabled)
  const [currentFact, setCurrentFact] = useState<LiveTriviaFact | null>(null)
  const [factHistory, setFactHistory] = useState<LiveTriviaFact[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [waitingForTranscript, setWaitingForTranscript] = useState(false)

  // Auto-dismiss timer ref
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track whether we've received any fact since connecting
  const hasReceivedFactRef = useRef(false)
  // Waiting hint timer ref
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      hasReceivedFactRef.current = true
      setWaitingForTranscript(false)

      // Set as current fact
      setCurrentFact(fact)

      // Add to history (FIFO with max size)
      setFactHistory((prev) => {
        const newHistory = [...prev, fact]
        return newHistory.slice(-maxHistorySize)
      })

      // Clear existing timer
      clearDismissTimer()

      // Set auto-dismiss timer
      const displayDuration = fact.display_duration * 1000
      dismissTimerRef.current = setTimeout(() => {
        dismissCurrentFact()
      }, displayDuration)
    },
    [isEnabled, maxHistorySize, clearDismissTimer, dismissCurrentFact]
  )

  /**
   * Send transcript text to the trivia backend.
   * Called externally when live subtitle cues arrive.
   */
  const sendTranscript = useCallback((text: string, lang: string) => {
    liveTriviaService.sendTranscript(text, lang)
  }, [])

  /**
   * WebSocket lifecycle: connect when enabled + channelId, disconnect otherwise
   */
  useEffect(() => {
    if (!isEnabled || !channelId) {
      liveTriviaService.disconnect()
      setIsConnected(false)
      setConnectionError(null)
      setWaitingForTranscript(false)
      hasReceivedFactRef.current = false
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current)
        waitingTimerRef.current = null
      }
      return
    }

    hasReceivedFactRef.current = false
    setConnectionError(null)

    liveTriviaService.connect(
      channelId,
      handleTriviaMessage,
      (sourceLanguage: string) => {
        logger.info(
          `Connected to trivia, source language: ${sourceLanguage}`,
          LOG_CONTEXT,
        )
        setIsConnected(true)
        setConnectionError(null)

        // After 8 seconds, if no fact received, show hint
        waitingTimerRef.current = setTimeout(() => {
          if (!hasReceivedFactRef.current) {
            setWaitingForTranscript(true)
          }
        }, 8000)
      },
      (error) => {
        logger.error(`Trivia error: ${error.message}`, LOG_CONTEXT)
        setConnectionError(error.message)
        if (!error.recoverable) {
          setIsConnected(false)
        }
      },
    )

    return () => {
      liveTriviaService.disconnect()
      setIsConnected(false)
      setWaitingForTranscript(false)
      hasReceivedFactRef.current = false
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current)
        waitingTimerRef.current = null
      }
    }
  }, [isEnabled, channelId]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Cleanup timers on unmount
   */
  useEffect(() => {
    return () => {
      clearDismissTimer()
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current)
        waitingTimerRef.current = null
      }
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
    isConnected,
    connectionError,
    sendTranscript,
    waitingForTranscript,
  }
}
