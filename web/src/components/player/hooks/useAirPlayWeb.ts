/**
 * AirPlay Web Hook
 * Manages AirPlay casting via WebKit API (Safari)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/utils/logger'
import { WebKitVideoElement, CastMetadata, PlaybackState } from '../types/cast'

const log = logger.scope('AirPlayWeb')

interface UseAirPlayWebOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled: boolean
  metadata?: CastMetadata
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
      setIsAvailable(false)
      return
    }

    const video = videoRef.current as WebKitVideoElement

    const handleAvailabilityChange = (event: Event) => {
      const target = event.target as WebKitVideoElement
      // AirPlay is available when event fires with available targets
      const available = target.webkitPlaybackTargetAvailabilityChanged === true
      setIsAvailable(available)
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

    // Add event listeners
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
    if (!isAvailable || !isWebKitSupported()) {
      log.warn('Cannot start cast - not available', { isAvailable })
      return
    }

    const video = videoRef.current as WebKitVideoElement
    video.webkitShowPlaybackTargetPicker?.()
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
