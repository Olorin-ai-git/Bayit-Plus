/**
 * useLiveDubbing - Cross-Platform Hook
 * Manages WebSocket connection and dubbing state for live channels
 * Platform-specific audio playback is injected via IAudioPlayer interface
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  liveDubbingService,
  LiveDubbingService,
  DubbedAudioMessage,
  LatencyReport,
  DubbingConnectionInfo,
  DubbingAvailability,
  DubbingVoice,
  IAudioPlayer,
} from '../services/liveDubbingService'

export interface UseLiveDubbingOptions {
  channelId: string
  audioPlayer?: IAudioPlayer | null
  autoConnect?: boolean
}

export interface UseLiveDubbingState {
  isConnected: boolean
  isConnecting: boolean
  targetLanguage: string
  availableLanguages: string[]
  availableVoices: DubbingVoice[]
  originalVolume: number
  dubbedVolume: number
  latencyMs: number
  segmentsProcessed: number
  lastTranscript: string
  lastTranslation: string
  error: string | null
  syncDelayMs: number
}

export function useLiveDubbing({
  channelId,
  audioPlayer,
  autoConnect = false,
}: UseLiveDubbingOptions) {
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

  // Set audio player when provided
  useEffect(() => {
    if (audioPlayer) {
      liveDubbingService.setAudioPlayer(audioPlayer)
    }
  }, [audioPlayer])

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
      if (!channelId) {
        setState((prev) => ({ ...prev, error: 'Channel not available' }))
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
          handleDubbedAudio,
          handleLatency,
          handleConnected,
          handleError,
          voiceId
        )
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        }))
      }
    },
    [channelId, handleDubbedAudio, handleLatency, handleConnected, handleError]
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
    if (autoConnect && channelId && availability?.available && !state.isConnected && audioPlayer) {
      connect()
    }
  }, [autoConnect, channelId, availability, state.isConnected, connect, audioPlayer])

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

export type UseLiveDubbingReturn = ReturnType<typeof useLiveDubbing>
