/**
 * AirPlay Web Hook
 * Manages AirPlay casting via WebKit API (Safari)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/utils/logger'
import { WebKitVideoElement, CastMetadata, PlaybackState } from '../types/cast'

const log = logger.scope('AirPlayWeb')
const DEBUG_CAST = import.meta.env.VITE_DEBUG_CAST === 'true'
const FORCE_AVAILABLE = import.meta.env.VITE_CAST_FORCE_SHOW === 'true'

interface UseAirPlayWebOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled: boolean
  metadata?: CastMetadata
  // HLS-specific options for AirPlay compatibility
  isHLS?: boolean
  originalStreamUrl?: string
  destroyHLS?: () => void
}

interface UseAirPlayWebReturn {
  isAvailable: boolean
  isConnected: boolean
  deviceName: string | null
  startCast: () => void
  stopCast: () => void
  updateMetadata: (metadata: CastMetadata) => void
  syncPlaybackState: (state: PlaybackState) => void
}

export function useAirPlayWeb({
  videoRef,
  enabled,
  metadata,
  isHLS = false,
  originalStreamUrl,
  destroyHLS,
}: UseAirPlayWebOptions): UseAirPlayWebReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const metadataRef = useRef<CastMetadata | undefined>(metadata)
  const originalBlobUrlRef = useRef<string | null>(null)

  // Update metadata ref when it changes
  useEffect(() => {
    metadataRef.current = metadata
  }, [metadata])

  // Check if WebKit AirPlay is supported
  const isWebKitSupported = useCallback(() => {
    const video = videoRef.current as WebKitVideoElement | null
    return video && typeof video.webkitShowPlaybackTargetPicker === 'function'
  }, [videoRef])

  // Handle availability changes
  useEffect(() => {
    if (!enabled || !isWebKitSupported()) {
      if (enabled) {
        log.info('AirPlay not available', {
          enabled,
          isWebKitSupported: isWebKitSupported(),
          hasWebkitShowPlaybackTargetPicker: typeof (videoRef.current as WebKitVideoElement | null)?.webkitShowPlaybackTargetPicker === 'function',
          browser: navigator.userAgent.substring(0, 100),
        })
      }
      setIsAvailable(false)
      return
    }

    const video = videoRef.current as WebKitVideoElement

    // Set available immediately if browser supports AirPlay API
    // Safari's webkitplaybacktargetavailabilitychanged event is unreliable with HLS blob URLs
    // Better UX: Show clickable button, let picker display "No AirPlay Devices" if none found
    log.info('AirPlay WebKit support detected - enabling button', {
      hasVideo: !!video,
      hasPickerFunction: typeof video?.webkitShowPlaybackTargetPicker === 'function',
      currentPlaybackTargetIsWireless: video?.webkitCurrentPlaybackTargetIsWireless,
      forceAvailable: FORCE_AVAILABLE,
    })
    setIsAvailable(true)

    const handleAvailabilityChange = (event: Event) => {
      // AirPlay is available when this event fires
      // The event fires when AirPlay devices become available on the network
      log.info('AirPlay availability changed - devices detected on network')
      setIsAvailable(true)
    }

    const handleWirelessChange = (event: Event) => {
      const target = event.target as WebKitVideoElement
      const connected = target.webkitCurrentPlaybackTargetIsWireless === true
      setIsConnected(connected)

      if (connected) {
        log.info('Connected to AirPlay device', {
          isHLS,
          hasOriginalStreamUrl: !!originalStreamUrl,
          currentSrc: target.src.substring(0, 50),
          isBlobUrl: target.src.startsWith('blob:'),
          isEmpty: target.src === '',
        })

        // CRITICAL FIX: AirPlay cannot cast HLS.js blob URLs
        // When casting HLS content, switch to native .m3u8 URL that Apple TV can access
        // Safari may clear the src before this event fires, so check for both blob and empty
        if (isHLS && originalStreamUrl && (target.src.startsWith('blob:') || target.src === '')) {
          originalBlobUrlRef.current = target.src // Save blob URL for restoration
          const currentTime = target.currentTime
          const wasPaused = target.paused

          log.info('Switching from HLS blob URL to native .m3u8 for AirPlay', {
            originalBlobUrl: target.src.substring(0, 50),
            nativeUrl: originalStreamUrl,
            currentTime,
            wasPaused,
          })

          // CRITICAL: Destroy HLS.js instance BEFORE switching to native HLS
          // This prevents HLS.js from trying to parse VTT subtitles as HLS manifests
          if (destroyHLS) {
            log.info('Destroying HLS.js before switching to native HLS for AirPlay')
            destroyHLS()
          }

          // Switch to native HLS URL that Apple TV can access
          target.src = originalStreamUrl

          // Wait for new source to be ready, then restore playback state
          const handleCanPlay = () => {
            target.removeEventListener('canplay', handleCanPlay)

            log.info('Native HLS ready for AirPlay, restoring playback', {
              currentTime,
              wasPaused,
              readyState: target.readyState,
            })

            // Subtitles are embedded in HLS manifest - Apple TV handles them automatically
            // No need to manipulate text tracks manually

            // Restore playback position after buffer is ready
            target.currentTime = currentTime
            if (!wasPaused) {
              target.play().catch(err => {
                log.warn('Failed to resume playback after AirPlay source switch', { error: err.message })
              })
            }
          }

          // Use 'canplay' instead of 'loadedmetadata' to ensure buffer is ready
          target.addEventListener('canplay', handleCanPlay)
        }
      } else {
        log.info('Disconnected from AirPlay device')

        // Restore HLS.js blob URL when disconnecting from AirPlay
        // The page will need to reload the HLS stream to use HLS.js again
        if (isHLS && originalBlobUrlRef.current) {
          log.info('Disconnected from AirPlay - HLS stream needs reload for HLS.js', {
            note: 'Player will continue with native HLS, reload page to restore HLS.js features',
          })
          // Note: We don't switch back to blob URL here because the blob URL
          // is no longer valid (HLS.js instance was destroyed). The video will
          // continue playing via native HLS, which works but loses HLS.js features.
          // A full page reload is needed to restore HLS.js functionality.
          originalBlobUrlRef.current = null
        }
      }
    }

    // Add event listeners (still listen for events even if force-enabled)
    video.addEventListener('webkitplaybacktargetavailabilitychanged', handleAvailabilityChange)
    video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleWirelessChange)

    // Check initial wireless state
    if (video.webkitCurrentPlaybackTargetIsWireless) {
      setIsConnected(true)
    }

    return () => {
      video.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAvailabilityChange)
      video.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleWirelessChange)
    }
  }, [enabled, videoRef, isWebKitSupported, isHLS, originalStreamUrl, destroyHLS])

  const startCast = useCallback(() => {
    const video = videoRef.current as WebKitVideoElement

    if (!isWebKitSupported() || !video?.webkitShowPlaybackTargetPicker) {
      log.warn('Cannot start cast - WebKit AirPlay not supported', {
        hasVideo: !!video,
        hasPickerFunction: !!video?.webkitShowPlaybackTargetPicker,
      })
      return
    }

    if (!isAvailable) {
      log.warn('AirPlay devices not detected - showing picker anyway (may show "No Devices")', {
        troubleshooting: 'If no devices shown, check Apple TV AirPlay settings and network configuration',
      })
    }

    // Show AirPlay picker - will display available devices or "No AirPlay Devices" message
    video.webkitShowPlaybackTargetPicker()
  }, [isAvailable, videoRef, isWebKitSupported])

  const stopCast = useCallback(() => {
    if (!isConnected) return

    // For AirPlay, stopping is done by user through the system picker
    // We can show the picker again for them to disconnect
    const video = videoRef.current as WebKitVideoElement
    if (video?.webkitShowPlaybackTargetPicker) {
      video.webkitShowPlaybackTargetPicker()
    }
  }, [isConnected, videoRef])

  // AirPlay automatically mirrors the video element, so these are no-ops
  const updateMetadata = useCallback(() => {
    // Metadata is automatically handled by video element in AirPlay
  }, [])

  const syncPlaybackState = useCallback(() => {
    // Playback is automatically synchronized in AirPlay
  }, [])

  return {
    isAvailable,
    isConnected,
    deviceName: isConnected ? 'AirPlay' : null,
    startCast,
    stopCast,
    updateMetadata,
    syncPlaybackState,
  }
}
