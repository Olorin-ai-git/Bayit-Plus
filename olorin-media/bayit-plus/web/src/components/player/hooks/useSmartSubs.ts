/**
 * Custom hook for Smart Subs (dual-view subtitles with shoresh highlighting)
 * Manages WebSocket connection and cue state for Smart Subs
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import smartSubsService, {
  SmartSubsServiceClass,
  SmartSubsConnectionInfo,
  SmartSubtitleCue,
  SmartSubsAvailability,
  ShoreshHighlight,
} from '@/services/smartSubsService'

export type { ShoreshHighlight, SmartSubtitleCue }

export interface UseSmartSubsOptions {
  channelId: string
  videoElement: HTMLVideoElement | null
  autoConnect?: boolean
}

interface SmartSubCueWithExpiry {
  simplified_hebrew: string
  english: string
  shoresh_highlights: ShoreshHighlight[]
  timestamp: number
  displayUntil: number
}

export interface UseSmartSubsState {
  isConnected: boolean
  isConnecting: boolean
  targetLanguage: string
  showShoresh: boolean
  shoreshHighlightColor: string
  displayDurationMs: number
  error: string | null
}

export function useSmartSubs({ channelId, videoElement, autoConnect = false }: UseSmartSubsOptions) {
  const [state, setState] = useState<UseSmartSubsState>({
    isConnected: false,
    isConnecting: false,
    targetLanguage: 'en',
    showShoresh: true,
    shoreshHighlightColor: '#FFD700',
    displayDurationMs: 5000,
    error: null,
  })

  const [availability, setAvailability] = useState<SmartSubsAvailability | null>(null)
  const [cues, setCues] = useState<SmartSubCueWithExpiry[]>([])
  const [cueTick, setCueTick] = useState(0)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!channelId) return
    SmartSubsServiceClass.checkAvailability(channelId).then((avail) => {
      setAvailability(avail)
      if (avail.available) {
        setState((prev) => ({
          ...prev,
          shoreshHighlightColor: avail.shoresh_highlight_color || '#FFD700',
          displayDurationMs: avail.display_duration_ms || 5000,
        }))
      }
    })
  }, [channelId])

  // Show only the most recent non-expired cue
  const visibleCues = useMemo(() => {
    const now = Date.now()
    return cues.filter((cue) => cue.displayUntil > now).slice(-1)
  }, [cues, cueTick])

  // Cleanup expired cues every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCues((prev) => {
        const active = prev.filter((cue) => cue.displayUntil > now)
        if (active.length !== prev.length) {
          setCueTick((t) => t + 1)
        }
        return active
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const handleConnected = useCallback((info: SmartSubsConnectionInfo) => {
    sessionIdRef.current = info.session_id
    setState((prev) => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      targetLanguage: info.target_language,
      showShoresh: info.show_shoresh,
      shoreshHighlightColor: info.shoresh_highlight_color,
      displayDurationMs: info.display_duration_ms,
      error: null,
    }))
  }, [])

  const handleCue = useCallback((cue: SmartSubtitleCue) => {
    const displayDuration = cue.data.display_duration_ms || state.displayDurationMs
    const newCue: SmartSubCueWithExpiry = {
      simplified_hebrew: cue.data.simplified_hebrew,
      english: cue.data.english,
      shoresh_highlights: cue.data.shoresh_highlights,
      timestamp: cue.data.timestamp,
      displayUntil: Date.now() + displayDuration,
    }
    setCues((prev) => [...prev.slice(-50), newCue])
  }, [state.displayDurationMs])

  const handleError = useCallback((error: string, recoverable: boolean) => {
    setState((prev) => ({
      ...prev,
      error,
      isConnecting: recoverable ? prev.isConnecting : false,
      isConnected: recoverable ? prev.isConnected : false,
    }))
  }, [])

  const connect = useCallback(
    async (targetLang?: string, showShoreshFlag?: boolean) => {
      if (!videoElement || !channelId) {
        setState((prev) => ({ ...prev, error: 'Video element or channel not available' }))
        return
      }

      setState((prev) => {
        if (prev.isConnecting || prev.isConnected) return prev
        return { ...prev, isConnecting: true, error: null }
      })

      try {
        await smartSubsService.connect(
          channelId,
          targetLang || state.targetLanguage,
          showShoreshFlag ?? state.showShoresh,
          videoElement,
          handleConnected,
          handleCue,
          handleError,
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
    [channelId, videoElement, state.targetLanguage, state.showShoresh, handleConnected, handleCue, handleError],
  )

  const disconnect = useCallback(() => {
    smartSubsService.disconnect()
    sessionIdRef.current = null
    setCues([])
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }))
  }, [])

  const setTargetLanguage = useCallback(
    (lang: string) => {
      setState((prev) => ({ ...prev, targetLanguage: lang }))
      if (state.isConnected) {
        disconnect()
        setTimeout(() => connect(lang), 500)
      }
    },
    [disconnect, connect, state.isConnected],
  )

  const toggleShoresh = useCallback(() => {
    const newValue = !state.showShoresh
    setState((prev) => ({ ...prev, showShoresh: newValue }))
    if (state.isConnected) {
      disconnect()
      setTimeout(() => connect(undefined, newValue), 500)
    }
  }, [disconnect, connect, state.isConnected, state.showShoresh])

  useEffect(() => {
    return () => {
      if (smartSubsService.isServiceConnected()) {
        smartSubsService.disconnect()
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
    cues: visibleCues,
    connect,
    disconnect,
    setTargetLanguage,
    toggleShoresh,
    isAvailable: availability?.available ?? false,
  }
}
