/**
 * useLiveSplitSubtitles Hook
 * Manages dual-language live subtitle streams with auto-expiration
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LiveSubtitleCue, SplitLanguages } from '@/types/subtitle'
import liveSplitSubtitleService from '@/services/liveSplitSubtitleService'
import logger from '@/utils/logger'

interface LiveSubtitleCueWithExpiry extends LiveSubtitleCue {
  displayUntil: number
}

interface UseLiveSplitSubtitlesOptions {
  channelId: string
  splitMode: boolean
  splitLanguages: SplitLanguages | null
  videoElement: HTMLVideoElement | null
  sourceLanguage?: string
  hebrewMode?: 'regular' | 'nikud' | 'shoresh'
  onError?: (error: string) => void
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export function useLiveSplitSubtitles({
  channelId,
  splitMode,
  splitLanguages,
  videoElement,
  sourceLanguage = 'he',
  hebrewMode = 'regular',
  onError,
}: UseLiveSplitSubtitlesOptions) {
  const [primaryCues, setPrimaryCues] = useState<LiveSubtitleCueWithExpiry[]>([])
  const [secondaryCues, setSecondaryCues] = useState<LiveSubtitleCueWithExpiry[]>([])
  const [primaryStatus, setPrimaryStatus] = useState<ConnectionStatus>('disconnected')
  const [secondaryStatus, setSecondaryStatus] = useState<ConnectionStatus>('disconnected')
  const [subtitleTick, setSubtitleTick] = useState(0)

  // Memoize visible cues (filter expired and get most recent)
  const visiblePrimaryCues = useMemo(() => {
    const now = Date.now()
    return primaryCues.filter((cue) => cue.displayUntil > now).slice(-1)
  }, [primaryCues, subtitleTick])

  const visibleSecondaryCues = useMemo(() => {
    const now = Date.now()
    return secondaryCues.filter((cue) => cue.displayUntil > now).slice(-1)
  }, [secondaryCues, subtitleTick])

  // Handle incoming subtitle cue
  const handleSubtitleCue = useCallback((cue: LiveSubtitleCue, position: 'primary' | 'secondary') => {
    const cueWithExpiry: LiveSubtitleCueWithExpiry = {
      ...cue,
      displayUntil: Date.now() + 3000, // 3 seconds display
    }

    if (position === 'primary') {
      setPrimaryCues((prev) => [...prev.slice(-50), cueWithExpiry])
    } else {
      setSecondaryCues((prev) => [...prev.slice(-50), cueWithExpiry])
    }
  }, [])

  // Handle errors from service
  const handleError = useCallback((error: string, position: 'primary' | 'secondary') => {
    logger.error(`Live split subtitle error (${position}): ${error}`, 'useLiveSplitSubtitles')
    onError?.(error)
  }, [onError])

  // Handle status updates
  const handleStatus = useCallback((status: ConnectionStatus, position: 'primary' | 'secondary') => {
    if (position === 'primary') {
      setPrimaryStatus(status)
    } else {
      setSecondaryStatus(status)
    }
  }, [])

  // Connect/disconnect based on split mode state
  useEffect(() => {
    if (!splitMode || !splitLanguages || !videoElement || !channelId) {
      liveSplitSubtitleService.disconnect()
      setPrimaryCues([])
      setSecondaryCues([])
      setPrimaryStatus('disconnected')
      setSecondaryStatus('disconnected')
      return
    }

    const [primaryLang, secondaryLang] = splitLanguages

    const connect = async () => {
      try {
        setPrimaryStatus('connecting')
        setSecondaryStatus('connecting')

        await liveSplitSubtitleService.connect(
          channelId,
          primaryLang,
          secondaryLang,
          videoElement,
          handleSubtitleCue,
          handleError,
          handleStatus,
          sourceLanguage,
          hebrewMode
        )

        logger.info('Live split subtitles connected', 'useLiveSplitSubtitles', {
          primaryLang,
          secondaryLang,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Connection failed'
        logger.error('Failed to connect live split subtitles', 'useLiveSplitSubtitles', error)
        onError?.(errorMsg)
        setPrimaryStatus('error')
        setSecondaryStatus('error')
      }
    }

    connect()

    return () => {
      liveSplitSubtitleService.disconnect()
    }
    // Note: onError is intentionally excluded to prevent infinite loops
    // The callback is captured in handleError which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    channelId,
    splitMode,
    splitLanguages,
    videoElement,
    sourceLanguage,
    hebrewMode,
    handleSubtitleCue,
    handleError,
    handleStatus,
  ])

  // Aggressive cleanup: Poll every 500ms to remove expired subtitles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()

      setPrimaryCues((prev) => {
        const active = prev.filter((cue) => cue.displayUntil > now)
        if (active.length !== prev.length) {
          setSubtitleTick((t) => t + 1)
        }
        return active
      })

      setSecondaryCues((prev) => {
        const active = prev.filter((cue) => cue.displayUntil > now)
        if (active.length !== prev.length) {
          setSubtitleTick((t) => t + 1)
        }
        return active
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Overall connection status
  const isConnected = primaryStatus === 'connected' && secondaryStatus === 'connected'
  const isConnecting = primaryStatus === 'connecting' || secondaryStatus === 'connecting'

  return {
    primaryCues: visiblePrimaryCues,
    secondaryCues: visibleSecondaryCues,
    primaryStatus,
    secondaryStatus,
    isConnected,
    isConnecting,
  }
}
