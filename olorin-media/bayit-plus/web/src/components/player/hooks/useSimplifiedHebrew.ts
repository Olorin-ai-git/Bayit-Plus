/**
 * Custom hook for simplified Hebrew (Ivrit Kalla) management
 * Manages WebSocket connection and state for simplified Hebrew dubbing
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import simplifiedHebrewService, {
  SimplifiedHebrewServiceClass,
  SimplifiedHebrewConnectionInfo,
  SimplifiedTextMessage,
  SimplifiedAudioMessage,
  SimplifiedHebrewAvailability,
  VocabularyLevel,
} from '@/services/simplifiedHebrewService'

export interface UseSimplifiedHebrewOptions {
  channelId: string
  videoElement: HTMLVideoElement | null
  autoConnect?: boolean
  onRawAudio?: (audio: ArrayBuffer, text: string) => void
}

export interface UseSimplifiedHebrewState {
  isConnected: boolean
  isConnecting: boolean
  vocabularyLevel: VocabularyLevel
  voiceId: string | null
  speakingRate: number
  latencyMs: number
  lastOriginalText: string
  lastSimplifiedText: string
  error: string | null
}

export function useSimplifiedHebrew({
  channelId,
  videoElement,
  autoConnect = false,
  onRawAudio,
}: UseSimplifiedHebrewOptions) {
  const [state, setState] = useState<UseSimplifiedHebrewState>({
    isConnected: false,
    isConnecting: false,
    vocabularyLevel: 'alef',
    voiceId: null,
    speakingRate: 0.8,
    latencyMs: 0,
    lastOriginalText: '',
    lastSimplifiedText: '',
    error: null,
  })

  const [availability, setAvailability] = useState<SimplifiedHebrewAvailability | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!channelId) return
    SimplifiedHebrewServiceClass.checkAvailability(channelId).then((avail) => {
      setAvailability(avail)
      if (avail.available) {
        setState((prev) => ({
          ...prev,
          vocabularyLevel: avail.default_vocabulary_level || 'alef',
          speakingRate: avail.speaking_rate || 0.8,
          voiceId: avail.voice_id || null,
        }))
      }
    })
  }, [channelId])

  const handleConnected = useCallback((info: SimplifiedHebrewConnectionInfo) => {
    sessionIdRef.current = info.session_id
    setState((prev) => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      vocabularyLevel: info.vocabulary_level,
      voiceId: info.voice_id,
      speakingRate: info.speaking_rate,
      error: null,
    }))
  }, [])

  const handleText = useCallback((message: SimplifiedTextMessage) => {
    setState((prev) => ({
      ...prev,
      lastOriginalText: message.original_text,
      lastSimplifiedText: message.simplified_text,
    }))
  }, [])

  const handleAudio = useCallback((message: SimplifiedAudioMessage) => {
    setState((prev) => ({
      ...prev,
      latencyMs: message.latency_ms,
      lastOriginalText: message.original_text,
      lastSimplifiedText: message.simplified_text,
    }))

    if (onRawAudio && message.data) {
      try {
        const binaryString = atob(message.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        onRawAudio(bytes.buffer, message.simplified_text)
      } catch {
        // Audio decode failure handled silently
      }
    }
  }, [onRawAudio])

  const handleError = useCallback((error: string, recoverable: boolean) => {
    setState((prev) => ({
      ...prev,
      error,
      isConnecting: recoverable ? prev.isConnecting : false,
      isConnected: recoverable ? prev.isConnected : false,
    }))
  }, [])

  const connect = useCallback(
    async (vocabLevel?: VocabularyLevel, voiceId?: string) => {
      if (!videoElement || !channelId) {
        setState((prev) => ({ ...prev, error: 'Video element or channel not available' }))
        return
      }

      setState((prev) => {
        if (prev.isConnecting || prev.isConnected) return prev
        return { ...prev, isConnecting: true, error: null }
      })

      try {
        await simplifiedHebrewService.connect(
          channelId,
          vocabLevel || state.vocabularyLevel,
          videoElement,
          handleConnected,
          handleText,
          handleAudio,
          handleError,
          voiceId,
          'web',
        )
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        }))
      }
    },
    [channelId, videoElement, state.vocabularyLevel, handleConnected, handleText, handleAudio, handleError],
  )

  const disconnect = useCallback(() => {
    simplifiedHebrewService.disconnect()
    sessionIdRef.current = null
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      lastOriginalText: '',
      lastSimplifiedText: '',
    }))
  }, [])

  const setVocabularyLevel = useCallback(
    (level: VocabularyLevel) => {
      setState((prev) => ({ ...prev, vocabularyLevel: level }))
      if (state.isConnected) {
        disconnect()
        setTimeout(() => connect(level), 500)
      }
    },
    [disconnect, connect, state.isConnected],
  )

  useEffect(() => {
    return () => {
      if (simplifiedHebrewService.isServiceConnected()) {
        simplifiedHebrewService.disconnect()
      }
    }
  }, [])

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
    setVocabularyLevel,
    isAvailable: availability?.available ?? false,
  }
}
