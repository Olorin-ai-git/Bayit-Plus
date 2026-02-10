/**
 * AirPlay Web Hook
 * Manages AirPlay casting via WebKit API (Safari)
 *
 * Safari handles AirPlay natively - even when HLS.js is active with blob URLs,
 * Safari's AirPlay system internally resolves the stream for the target device.
 * No manual blob URL switching is needed.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/utils/logger'
import { WebKitVideoElement, CastMetadata, PlaybackState } from '../types/cast'

const log = logger.scope('AirPlayWeb')

interface UseAirPlayWebOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled: boolean
  metadata?: CastMetadata
  // Kept for interface compatibility with useCastSession
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
}: UseAirPlayWebOptions): UseAirPlayWebReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const metadataRef = useRef<CastMetadata | undefined>(metadata)

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
    // Safari's webkitplaybacktargetavailabilitychanged event can be unreliable
    // Better UX: Show clickable button, let picker display "No AirPlay Devices" if none found
    log.info('AirPlay WebKit support detected - enabling button', {
      hasVideo: !!video,
      hasPickerFunction: typeof video?.webkitShowPlaybackTargetPicker === 'function',
      currentPlaybackTargetIsWireless: video?.webkitCurrentPlaybackTargetIsWireless,
    })
    setIsAvailable(true)

    const handleAvailabilityChange = () => {
      log.info('AirPlay availability changed - devices detected on network')
      setIsAvailable(true)
    }

    const handleWirelessChange = (event: Event) => {
      const target = event.target as WebKitVideoElement
      const connected = target.webkitCurrentPlaybackTargetIsWireless === true
      setIsConnected(connected)

      if (connected) {
        log.info('Connected to AirPlay device')
      } else {
        log.info('Disconnected from AirPlay device')
      }
    }

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
  }, [enabled, videoRef, isWebKitSupported])

  const startCast = useCallback(() => {
    const video = videoRef.current as WebKitVideoElement

    if (!isWebKitSupported() || !video?.webkitShowPlaybackTargetPicker) {
      log.warn('Cannot start cast - WebKit AirPlay not supported', {
        hasVideo: !!video,
        hasPickerFunction: !!video?.webkitShowPlaybackTargetPicker,
      })
      return
    }

    // Safari handles AirPlay natively - just show the picker
    // Safari internally resolves HLS.js blob URLs for the AirPlay target device
    video.webkitShowPlaybackTargetPicker()
  }, [videoRef, isWebKitSupported])

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
