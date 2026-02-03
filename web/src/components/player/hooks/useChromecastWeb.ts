/**
 * Chromecast Web Hook
 * Manages Chromecast casting via Google Cast SDK
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/utils/logger'
import { CastMetadata, PlaybackState, ChromecastGlobal } from '../types/cast'
import { loadCastSDK, loadChromecastMedia } from '../utils/chromecastUtils'

const log = logger.scope('ChromecastWeb')
const DEBUG_CAST = import.meta.env.VITE_DEBUG_CAST === 'true'

// Check if browser supports Chrome Cast (Chrome/Edge/Chromium-based)
const isChromeBasedBrowser = (): boolean => {
  const ua = navigator.userAgent
  return /Chrome/.test(ua) && !/Safari/.test(ua.replace(/Chrome/g, ''))
}

interface UseChromecastWebOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled: boolean
  receiverAppId: string | null
  metadata?: CastMetadata
}

interface UseChromecastWebReturn {
  isAvailable: boolean
  isConnecting: boolean
  isConnected: boolean
  deviceName: string | null
  startCast: () => void
  stopCast: () => void
  updateMetadata: (metadata: CastMetadata) => void
  syncPlaybackState: (state: PlaybackState) => void
}

export function useChromecastWeb({
  videoRef,
  enabled,
  receiverAppId,
  metadata,
}: UseChromecastWebOptions): UseChromecastWebReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  const sessionRef = useRef<any>(null)
  const metadataRef = useRef<CastMetadata | undefined>(metadata)

  // Update metadata ref
  useEffect(() => {
    metadataRef.current = metadata
  }, [metadata])

  // Set availability based on browser support (before SDK loads)
  // This allows button to show as enabled while SDK is loading
  useEffect(() => {
    if (!enabled || !receiverAppId) {
      log.info('Chromecast not enabled', { enabled, receiverAppId })
      setIsAvailable(false)
      return
    }

    if (isChromeBasedBrowser()) {
      log.info('Chrome-based browser detected - Chromecast potentially available', {
        userAgent: navigator.userAgent.substring(0, 100),
      })
      setIsAvailable(true)
    } else {
      log.info('Non-Chrome browser - Chromecast not supported', {
        userAgent: navigator.userAgent.substring(0, 100),
      })
      setIsAvailable(false)
    }
  }, [enabled, receiverAppId])

  // Load Cast SDK
  useEffect(() => {
    if (!enabled || !receiverAppId) {
      return
    }

    log.info('Loading Chromecast SDK', { receiverAppId })

    return loadCastSDK(
      () => {
        log.info('Chromecast SDK loaded successfully')
        setSdkLoaded(true)
      },
      () => {
        log.warn('Chromecast SDK failed to load')
        setSdkLoaded(false)
        // Keep isAvailable true - button will show error when clicked
      }
    )
  }, [enabled, receiverAppId])

  // Initialize Cast context
  useEffect(() => {
    if (!sdkLoaded || !receiverAppId) {
      log.info('Chromecast context not initializing', { sdkLoaded, receiverAppId })
      return
    }

    // Check if Cast SDK framework is available
    if (!window.chrome?.cast?.framework?.CastContext) {
      log.warn('Cast framework not available - disabling Chromecast support', {
        hasChromeObject: !!window.chrome,
        hasCastObject: !!window.chrome?.cast,
        hasFrameworkObject: !!window.chrome?.cast?.framework,
      })
      setIsAvailable(false)
      return
    }

    log.info('Initializing Chromecast context', { receiverAppId })

    try {
      const castContext = window.chrome.cast.framework.CastContext.getInstance()
      castContext.setOptions({
        receiverApplicationId: receiverAppId,
        autoJoinPolicy: 'origin_scoped',
      })

      log.info('Chromecast context initialized successfully')

      // Listen for session state changes
      const handleSessionChange = (event: any) => {
        const session = castContext.getCurrentSession()

        if (session) {
          sessionRef.current = session
          setIsConnected(true)
          setIsConnecting(false)
          setDeviceName(session.getCastDevice?.()?.friendlyName || 'Chromecast')
          log.info('Session started', { sessionId: session.getSessionId() })

          // Load current media if metadata available
          if (metadataRef.current) {
            loadChromecastMedia(session, metadataRef.current, videoRef.current)
          }
        } else {
          sessionRef.current = null
          setIsConnected(false)
          setIsConnecting(false)
          setDeviceName(null)
          log.info('Session ended')
        }
      }

      castContext.addEventListener('SESSION_STATE_CHANGED', handleSessionChange)

      return () => {
        castContext.removeEventListener('SESSION_STATE_CHANGED', handleSessionChange)
      }
    } catch (error) {
      log.error('Failed to initialize context', error)
      setIsAvailable(false)
    }
  }, [sdkLoaded, receiverAppId])

  const startCast = useCallback(async () => {
    if (!isAvailable) {
      log.warn('Cannot start cast - Chromecast not available on this browser')
      return
    }

    if (!window.chrome?.cast?.framework?.CastContext) {
      log.warn('Cast SDK not loaded yet - please try again', {
        sdkLoaded,
        hasChromeObject: !!window.chrome,
        hasCastObject: !!window.chrome?.cast,
      })
      return
    }

    try {
      setIsConnecting(true)
      const castContext = window.chrome.cast.framework.CastContext.getInstance()
      await castContext.requestSession()
    } catch (error) {
      log.error('Failed to start Chromecast session', error)
      setIsConnecting(false)
    }
  }, [isAvailable, sdkLoaded])

  const stopCast = useCallback(() => {
    if (!isConnected || !sessionRef.current) return

    try {
      sessionRef.current.endSession(true)
    } catch (error) {
      log.error('Failed to end session', error)
    }
  }, [isConnected])

  const updateMetadata = useCallback((meta: CastMetadata) => {
    if (!isConnected || !sessionRef.current) return
    loadChromecastMedia(sessionRef.current, meta, videoRef.current)
  }, [isConnected, videoRef])

  const syncPlaybackState = useCallback((state: PlaybackState) => {
    if (!isConnected || !sessionRef.current) return

    try {
      const mediaSession = sessionRef.current.getMediaSession()
      if (!mediaSession) return

      // Seek if time difference is significant
      if (Math.abs(mediaSession.getEstimatedTime() - state.currentTime) > 2) {
        mediaSession.seek(state.currentTime)
      }

      // Play/pause
      if (state.isPlaying && mediaSession.playerState === 'PAUSED') {
        mediaSession.play()
      } else if (!state.isPlaying && mediaSession.playerState === 'PLAYING') {
        mediaSession.pause()
      }

      // Volume
      if (mediaSession.volume !== state.volume) {
        mediaSession.setVolume(state.volume)
      }
    } catch (error) {
      log.error('Failed to sync playback', error)
    }
  }, [isConnected])

  return {
    isAvailable,
    isConnecting,
    isConnected,
    deviceName,
    startCast,
    stopCast,
    updateMetadata,
    syncPlaybackState,
  }
}
