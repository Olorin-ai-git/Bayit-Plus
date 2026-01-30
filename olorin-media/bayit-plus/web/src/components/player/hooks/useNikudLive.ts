/**
 * Custom hook for Live Nikud (real-time vocalized Hebrew subtitles)
 * Manages WebSocket connection and cue state for live nikud
 * Mirrors useSmartSubs.ts architecture
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import nikudLiveService, {
  NikudLiveServiceClass,
  NikudLiveConnectionInfo,
  NikudSubtitleCue,
  NikudLiveAvailability,
} from '@/services/nikudLiveService'

export type { NikudSubtitleCue }

export interface UseNikudLiveOptions {
  channelId: string
  videoElement: HTMLVideoElement | null
  autoConnect?: boolean
}

interface NikudCueWithExpiry {
  text: string
  text_nikud: string
  timestamp: number
  displayUntil: number
}

export interface UseNikudLiveState {
  isConnected: boolean
  isConnecting: boolean
  displayDurationMs: number
  error: string | null
}

export function useNikudLive({ channelId, videoElement, autoConnect = false }: UseNikudLiveOptions) {
  const [state, setState] = useState<UseNikudLiveState>({
    isConnected: false,
    isConnecting: false,
    displayDurationMs: 5000,
    error: null,
  })

  const [availability, setAvailability] = useState<NikudLiveAvailability | null>(null)
  const [cues, setCues] = useState<NikudCueWithExpiry[]>([])
  const [cueTick, setCueTick] = useState(0)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!channelId) return
    NikudLiveServiceClass.checkAvailability(channelId).then((avail) => {
      setAvailability(avail)
      if (avail.available) {
        setState((prev) => ({
          ...prev,
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

  const handleConnected = useCallback((info: NikudLiveConnectionInfo) => {
    sessionIdRef.current = info.session_id
    setState((prev) => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      displayDurationMs: info.display_duration_ms,
      error: null,
    }))
  }, [])

  const handleCue = useCallback((cue: NikudSubtitleCue) => {
    const displayDuration = cue.data.display_duration_ms || state.displayDurationMs
    const newCue: NikudCueWithExpiry = {
      text: cue.data.text,
      text_nikud: cue.data.text_nikud,
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
    async () => {
      if (!videoElement || !channelId) {
        setState((prev) => ({ ...prev, error: 'Video element or channel not available' }))
        return
      }

      setState((prev) => {
        if (prev.isConnecting || prev.isConnected) return prev
        return { ...prev, isConnecting: true, error: null }
      })

      try {
        await nikudLiveService.connect(
          channelId,
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
    [channelId, videoElement, handleConnected, handleCue, handleError],
  )

  const disconnect = useCallback(() => {
    nikudLiveService.disconnect()
    sessionIdRef.current = null
    setCues([])
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }))
  }, [])

  useEffect(() => {
    return () => {
      if (nikudLiveService.isServiceConnected()) {
        nikudLiveService.disconnect()
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
    isAvailable: availability?.available ?? false,
  }
}
