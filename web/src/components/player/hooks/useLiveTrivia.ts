/**
 * useLiveTrivia Hook
 *
 * Manages live trivia facts received from WebSocket during live streams.
 * Handles WebSocket lifecycle, fact display, auto-dismissal, and user interactions.
 *
 * Features:
 * - WebSocket connection management (connect/disconnect based on enabled + channelId)
 * - Transcript forwarding via sendTranscript (text from live subtitle cues)
 * - Auto-dismiss after display_duration
 * - Manual dismiss via user action
 * - Fact history tracking
 * - "waiting for transcript" hint when connected but no subtitles flowing
 * - Multilingual support (Hebrew, English, Spanish)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import liveTriviaService from '@/services/liveTriviaService'
import logger from '@/utils/logger'

const LOG_CONTEXT = 'useLiveTrivia'

/** Default number of facts to retain in history */
const DEFAULT_MAX_HISTORY_SIZE = 20

/** Delay before showing "enable subtitles" hint (ms) */
const WAITING_HINT_DELAY_MS = 8_000

/** Default source language for transcripts */
const DEFAULT_SOURCE_LANGUAGE = 'he'

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
    language = DEFAULT_SOURCE_LANGUAGE,
    enabled: initialEnabled = true,
    maxHistorySize = DEFAULT_MAX_HISTORY_SIZE,
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

      setCurrentFact(fact)

      setFactHistory((prev) => {
        const newHistory = [...prev, fact]
        return newHistory.slice(-maxHistorySize)
      })

      clearDismissTimer()

      const displayDuration = fact.display_duration * 1000
      dismissTimerRef.current = setTimeout(() => {
        dismissCurrentFact()
      }, displayDuration)
    },
    [isEnabled, maxHistorySize, clearDismissTimer, dismissCurrentFact]
  )

  // Ref always holds the latest handleTriviaMessage so the WebSocket
  // effect can invoke it without re-connecting when deps change.
  const handleTriviaMessageRef = useRef(handleTriviaMessage)
  useEffect(() => {
    handleTriviaMessageRef.current = handleTriviaMessage
  }, [handleTriviaMessage])

  /**
   * Send transcript text to the trivia backend.
   * Called externally when live subtitle cues arrive.
   */
  const sendTranscript = useCallback((text: string, lang: string) => {
    liveTriviaService.sendTranscript(text, lang)
  }, [])

  /**
   * WebSocket lifecycle: connect when enabled + channelId, disconnect otherwise.
   *
   * handleTriviaMessage is accessed via handleTriviaMessageRef to avoid
   * reconnecting when only the callback identity changes. The ref is
   * kept in sync by the useEffect above, so the latest callback is
   * always invoked without triggering a reconnect cycle.
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
      (fact: LiveTriviaFact) => handleTriviaMessageRef.current(fact),
      (sourceLanguage: string) => {
        logger.info(
          `Connected to trivia, source language: ${sourceLanguage}`,
          LOG_CONTEXT,
        )
        setIsConnected(true)
        setConnectionError(null)

        waitingTimerRef.current = setTimeout(() => {
          if (!hasReceivedFactRef.current) {
            setWaitingForTranscript(true)
          }
        }, WAITING_HINT_DELAY_MS)
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
