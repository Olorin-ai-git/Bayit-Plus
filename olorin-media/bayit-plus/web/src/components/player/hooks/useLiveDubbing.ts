/**
 * Custom hook for live dubbing management
 * Manages WebSocket connection, audio mixing, and dubbing state for live channels
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import liveDubbingService, {
  LiveDubbingService,
  DubbedAudioMessage,
  LatencyReport,
  DubbingConnectionInfo,
  DubbingAvailability,
} from '@/services/liveDubbingService'

export interface UseLiveDubbingOptions {
  channelId: string
  videoElement: HTMLVideoElement | null
  autoConnect?: boolean
  // Callback for raw audio data (for buffered playback mode)
  onRawDubbedAudio?: (audio: ArrayBuffer, text: string) => void
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
}

export function useLiveDubbing({ channelId, videoElement, autoConnect = false, onRawDubbedAudio }: UseLiveDubbingOptions) {
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
  })

  const [availability, setAvailability] = useState<DubbingAvailability | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Check availability when channelId changes
  useEffect(() => {
    if (!channelId) return

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
    })
  }, [channelId])

  // Dubbed audio callback
  const handleDubbedAudio = useCallback((message: DubbedAudioMessage) => {
    setState((prev) => ({
      ...prev,
      segmentsProcessed: message.sequence,
      lastTranscript: message.original_text,
      lastTranslation: message.translated_text,
      latencyMs: message.latency_ms,
    }))

    // If onRawDubbedAudio callback provided, decode and pass raw audio
    if (onRawDubbedAudio && message.data) {
      try {
        const binaryString = atob(message.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        onRawDubbedAudio(bytes.buffer, message.translated_text)
      } catch (error) {
        console.error('[useLiveDubbing] Failed to decode audio for buffered playback:', error)
      }
    }
  }, [onRawDubbedAudio])

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
    setState((prev) => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      syncDelayMs: info.sync_delay_ms,
      error: null,
    }))
  }, [])

  // Error callback
  const handleError = useCallback((error: string, recoverable: boolean) => {
    setState((prev) => ({
      ...prev,
      error,
      isConnecting: recoverable ? prev.isConnecting : false,
      isConnected: recoverable ? prev.isConnected : false,
    }))
  }, [])

  // Connect to dubbing service
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
          !!onRawDubbedAudio // Enable buffered mode if onRawDubbedAudio callback provided
        )
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        }))
      }
    },
    [channelId, videoElement, handleDubbedAudio, handleLatency, handleConnected, handleError]
  )

  // Disconnect from dubbing service
  const disconnect = useCallback(() => {
    liveDubbingService.disconnect()
    sessionIdRef.current = null
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      segmentsProcessed: 0,
      lastTranscript: '',
      lastTranslation: '',
    }))
  }, [])

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
