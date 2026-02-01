/**
 * Custom hook for live dubbing management
 * Manages WebSocket connection, audio mixing, and dubbing state for live channels
 * Uses ContinuousPlaybackController for zero-interruption dubbed audio playback
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import liveDubbingService, {
  LiveDubbingService,
  DubbedAudioMessage,
  LatencyReport,
  DubbingConnectionInfo,
  DubbingAvailability,
} from '@/services/liveDubbingService'
import { BufferStatus } from '@/services/audio/ContinuousPlaybackController'
import {
  getPersistedSessionForChannel,
  saveLiveDubbingState,
  clearPersistedSession,
} from '@/services/liveSessionPersistence'
import logger from '@/utils/logger'

/**
 * Check if a channelId looks like a valid MongoDB ObjectId
 * Prevents API calls with obviously stale/invalid IDs
 */
function isValidChannelId(channelId: string | undefined): boolean {
  if (!channelId) return false
  // MongoDB ObjectId: 24-character lowercase hex
  return /^[a-f0-9]{24}$/i.test(channelId)
}

export interface UseLiveDubbingOptions {
  channelId: string
  videoElement: HTMLVideoElement | null
  autoConnect?: boolean
}

export interface UseLiveDubbingState {
  isConnected: boolean
  isConnecting: boolean
  targetLanguage: string
  availableLanguages: string[]
  availableVoices: Array<{ id: string; name: string; language: string; description?: string }>
  originalVolume: number
  dubbedVolume: number
  latencyMs: number
  segmentsProcessed: number
  lastTranscript: string
  lastTranslation: string
  error: string | null
  syncDelayMs: number
  // Continuous flow state
  bufferHealth: 'healthy' | 'warning' | 'critical' | 'emergency' | null
  bufferAheadSeconds: number
  playbackStarted: boolean
}

export function useLiveDubbing({ channelId, videoElement, autoConnect = false }: UseLiveDubbingOptions) {
  const [state, setState] = useState<UseLiveDubbingState>({
    isConnected: false,
    isConnecting: false,
    targetLanguage: 'en',
    availableLanguages: [],
    availableVoices: [],
    originalVolume: 0,
    dubbedVolume: 1,
    latencyMs: 0,
    segmentsProcessed: 0,
    lastTranscript: '',
    lastTranslation: '',
    error: null,
    syncDelayMs: 600,
    // Continuous flow state
    bufferHealth: null,
    bufferAheadSeconds: 0,
    playbackStarted: false,
  })

  const [availability, setAvailability] = useState<DubbingAvailability | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const hasAttemptedRestoreRef = useRef(false)

  // Check availability when channelId changes
  useEffect(() => {
    if (!channelId) return

    // Validate channelId before making API call
    if (!isValidChannelId(channelId)) {
      logger.warn('Invalid channelId, skipping availability check', 'useLiveDubbing', { channelId })
      clearPersistedSession()
      return
    }

    LiveDubbingService.checkAvailability(channelId).then((avail: DubbingAvailability) => {
      setAvailability(avail)
      if (avail.available && avail.supported_target_languages) {
        setState((prev) => ({
          ...prev,
          availableLanguages: avail.supported_target_languages || [],
          availableVoices: avail.available_voices || [],
          syncDelayMs: avail.default_sync_delay_ms || 600,
        }))
      }
    }).catch((err) => {
      // If availability check fails (404), clear any stale session
      logger.warn('Availability check failed, clearing session', 'useLiveDubbing', err)
      clearPersistedSession()
    })
  }, [channelId])

  // Dubbed audio callback - updates state with latest transcript/translation
  const handleDubbedAudio = useCallback((message: DubbedAudioMessage) => {
    setState((prev) => ({
      ...prev,
      segmentsProcessed: message.sequence,
      lastTranscript: message.original_text,
      lastTranslation: message.translated_text,
      latencyMs: message.latency_ms,
    }))
  }, [])

  // Latency report callback
  const handleLatency = useCallback((report: LatencyReport) => {
    setState((prev) => ({
      ...prev,
      latencyMs: report.avg_total_ms,
      segmentsProcessed: report.segments_processed,
    }))
  }, [])

  // Connection callback
  const handleConnected = useCallback((info: DubbingConnectionInfo) => {
    sessionIdRef.current = info.session_id
    setState((prev) => {
      // Save session for persistence across refresh
      if (channelId) {
        saveLiveDubbingState(channelId, true, info.target_lang)
      }
      return {
        ...prev,
        isConnected: true,
        isConnecting: false,
        syncDelayMs: info.sync_delay_ms,
        error: null,
      }
    })
  }, [channelId])

  // Error callback
  const handleError = useCallback((error: string, recoverable: boolean) => {
    setState((prev) => ({
      ...prev,
      error,
      isConnecting: recoverable ? prev.isConnecting : false,
      isConnected: recoverable ? prev.isConnected : false,
    }))
  }, [])

  // Buffer status callback - continuous flow architecture
  const handleBufferStatus = useCallback((status: BufferStatus) => {
    setState((prev) => ({
      ...prev,
      bufferHealth: status.bufferHealth,
      bufferAheadSeconds: status.bufferAheadSeconds,
      playbackStarted: status.playbackStarted,
    }))
  }, [])

  // Playback started callback - continuous flow architecture
  const handlePlaybackStarted = useCallback(() => {
    logger.info('Continuous flow playback started', 'useLiveDubbing')
    setState((prev) => ({
      ...prev,
      playbackStarted: true,
    }))
  }, [])

  // Connect to dubbing service with continuous flow enabled
  const connect = useCallback(
    async (targetLang?: string, voiceId?: string) => {
      if (!videoElement || !channelId) {
        setState((prev) => ({ ...prev, error: 'Video element or channel not available' }))
        return
      }

      // Prevent multiple simultaneous connection attempts
      setState((prev) => {
        if (prev.isConnecting || prev.isConnected) {
          return prev
        }
        return { ...prev, isConnecting: true, error: null }
      })

      try {
        await liveDubbingService.connect(
          channelId,
          targetLang,
          videoElement,
          handleDubbedAudio,
          handleLatency,
          handleConnected,
          handleError,
          voiceId,
          'web',
          false, // bufferedMode - disabled, using continuous flow instead
          true,  // enableContinuousFlow - the new architecture
          handleBufferStatus,
          handlePlaybackStarted
        )
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        }))
      }
    },
    [channelId, videoElement, handleDubbedAudio, handleLatency, handleConnected, handleError, handleBufferStatus, handlePlaybackStarted]
  )

  // Auto-restore session from persistence (e.g., after browser refresh)
  useEffect(() => {
    if (hasAttemptedRestoreRef.current) return
    if (!channelId || !videoElement) return
    if (liveDubbingService.isServiceConnected()) return // Already connected
    if (!availability?.available) return // Not available yet

    const session = getPersistedSessionForChannel(channelId)
    if (!session?.liveDubbing?.enabled) return

    hasAttemptedRestoreRef.current = true
    logger.info('Restoring live dubbing session from persistence', 'useLiveDubbing', {
      channelId,
      targetLang: session.liveDubbing.targetLang,
      voiceId: session.liveDubbing.voiceId,
    })

    // Restore the session
    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    liveDubbingService
      .connect(
        channelId,
        session.liveDubbing.targetLang,
        videoElement,
        handleDubbedAudio,
        handleLatency,
        handleConnected,
        handleError,
        session.liveDubbing.voiceId,
        'web',
        false, // bufferedMode
        true,  // enableContinuousFlow
        handleBufferStatus,
        handlePlaybackStarted
      )
      .then(() => {
        logger.info('Live dubbing session restored successfully', 'useLiveDubbing')
        setState((prev) => ({
          ...prev,
          targetLanguage: session.liveDubbing?.targetLang || prev.targetLanguage,
        }))
      })
      .catch((err) => {
        logger.error('Session restore failed', 'useLiveDubbing', err)
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Session restore failed',
        }))
        // Clear persisted session on error
        saveLiveDubbingState(channelId, false, '')
      })
  }, [channelId, videoElement, availability, handleDubbedAudio, handleLatency, handleConnected, handleError, handleBufferStatus, handlePlaybackStarted])

  // Disconnect from dubbing service
  const disconnect = useCallback(() => {
    liveDubbingService.disconnect()
    sessionIdRef.current = null
    // Clear persisted session
    if (channelId) {
      saveLiveDubbingState(channelId, false, '')
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      segmentsProcessed: 0,
      lastTranscript: '',
      lastTranslation: '',
      bufferHealth: null,
      bufferAheadSeconds: 0,
      playbackStarted: false,
    }))
  }, [channelId])

  // Set target language (requires reconnect if connected)
  const setTargetLanguage = useCallback(
    (lang: string) => {
      setState((prev) => ({ ...prev, targetLanguage: lang }))
      // Only reconnect if currently connected, pass the new language explicitly
      setState((prevState) => {
        if (prevState.isConnected) {
          disconnect()
          setTimeout(() => connect(lang), 500)
        }
        return prevState
      })
    },
    [disconnect, connect]
  )

  // Volume controls
  const setOriginalVolume = useCallback((volume: number) => {
    liveDubbingService.setOriginalVolume(volume)
    setState((prev) => ({ ...prev, originalVolume: volume }))
  }, [])

  const setDubbedVolume = useCallback((volume: number) => {
    liveDubbingService.setDubbedVolume(volume)
    setState((prev) => ({ ...prev, dubbedVolume: volume }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveDubbingService.isServiceConnected()) {
        liveDubbingService.disconnect()
      }
    }
  }, [])

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && videoElement && channelId && availability?.available && !state.isConnected) {
      connect()
    }
  }, [autoConnect, videoElement, channelId, availability, state.isConnected, connect])

  return {
    ...state,
    availability,
    connect,
    disconnect,
    setTargetLanguage,
    setOriginalVolume,
    setDubbedVolume,
    isAvailable: availability?.available ?? false,
  }
}
