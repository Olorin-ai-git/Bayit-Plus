/**
 * Chromecast Native Hook
 * Manages Chromecast casting via react-native-google-cast
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import GoogleCast, { CastState as GCState } from 'react-native-google-cast'
import logger from '@/utils/logger'
import { CastMetadata, PlaybackState } from '../types/cast'

const log = logger.scope('ChromecastNative')

interface UseChromecastNativeOptions {
  enabled: boolean
  receiverAppId: string | null
  metadata?: CastMetadata
}

interface UseChromecastNativeReturn {
  isAvailable: boolean
  isConnecting: boolean
  isConnected: boolean
  deviceName: string | null
  startCast: () => void
  stopCast: () => void
  updateMetadata: (metadata: CastMetadata) => void
  syncPlaybackState: (state: PlaybackState) => void
}

export function useChromecastNative({
  enabled,
  receiverAppId,
  metadata,
}: UseChromecastNativeOptions): UseChromecastNativeReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const metadataRef = useRef<CastMetadata | undefined>(metadata)

  useEffect(() => {
    metadataRef.current = metadata
  }, [metadata])

  // Check Cast availability
  useEffect(() => {
    if (!enabled || !receiverAppId) return

    const checkAvailability = async () => {
      try {
        const state = await GoogleCast.getCastState()
        const available = state !== GCState.NO_DEVICES_AVAILABLE
        setIsAvailable(available)
        log.info('Chromecast availability checked', { available, state })
      } catch (error) {
        log.error('Failed to check Chromecast availability', error)
        setIsAvailable(false)
      }
    }

    checkAvailability()
  }, [enabled, receiverAppId])

  // Listen for session events
  useEffect(() => {
    if (!enabled) return

    const sessionStartedListener = GoogleCast.EventEmitter.addListener(
      GoogleCast.SESSION_STARTED,
      () => {
        log.info('Chromecast session started')
        setIsConnected(true)
        setIsConnecting(false)
        setDeviceName('Chromecast')

        // Load media if available
        if (metadataRef.current) {
          loadMedia(metadataRef.current)
        }
      }
    )

    const sessionEndedListener = GoogleCast.EventEmitter.addListener(
      GoogleCast.SESSION_ENDED,
      () => {
        log.info('Chromecast session ended')
        setIsConnected(false)
        setIsConnecting(false)
        setDeviceName(null)
      }
    )

    return () => {
      sessionStartedListener.remove()
      sessionEndedListener.remove()
    }
  }, [enabled])

  const loadMedia = useCallback(async (meta: CastMetadata) => {
    try {
      const mediaInfo = {
        contentUrl: meta.streamUrl,
        contentType: 'application/x-mpegURL',
        streamDuration: meta.duration || -1,
        metadata: {
          type: 'movie',
          title: meta.title,
          images: meta.posterUrl ? [{ url: meta.posterUrl }] : [],
        },
      }

      await GoogleCast.castMedia(mediaInfo)
      log.info('Media loaded to Chromecast', { title: meta.title })
    } catch (error) {
      log.error('Failed to load media to Chromecast', error)
    }
  }, [])

  const startCast = useCallback(async () => {
    if (!isAvailable) return

    try {
      setIsConnecting(true)
      log.info('Opening Chromecast device picker')
      await GoogleCast.showCastDialog()
    } catch (error) {
      log.error('Failed to show Chromecast dialog', error)
      setIsConnecting(false)
    }
  }, [isAvailable])

  const stopCast = useCallback(async () => {
    if (!isConnected) return

    try {
      log.info('Ending Chromecast session')
      await GoogleCast.endSession()
    } catch (error) {
      log.error('Failed to end Chromecast session', error)
    }
  }, [isConnected])

  const updateMetadata = useCallback((meta: CastMetadata) => {
    if (!isConnected) return
    loadMedia(meta)
  }, [isConnected, loadMedia])

  const syncPlaybackState = useCallback(async (state: PlaybackState) => {
    if (!isConnected) return

    try {
      // Sync play/pause
      if (state.isPlaying) {
        await GoogleCast.play()
      } else {
        await GoogleCast.pause()
      }

      // Sync current time
      await GoogleCast.seek(state.currentTime)
      log.debug('Playback state synced', { currentTime: state.currentTime, isPlaying: state.isPlaying })
    } catch (error) {
      log.error('Failed to sync playback state', error)
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
