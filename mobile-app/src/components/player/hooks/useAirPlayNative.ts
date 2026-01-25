/**
 * AirPlay Native Hook (iOS)
 * Manages AirPlay casting via AVRoutePickerView
 */

import { Platform } from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import logger from '@/utils/logger'
import { CastMetadata, PlaybackState } from '../types/cast'

const log = logger.scope('AirPlayNative')

interface UseAirPlayNativeOptions {
  enabled: boolean
  metadata?: CastMetadata
}

interface UseAirPlayNativeReturn {
  isAvailable: boolean
  isConnected: boolean
  deviceName: string | null
  startCast: () => void
  stopCast: () => void
  updateMetadata: (metadata: CastMetadata) => void
  syncPlaybackState: (state: PlaybackState) => void
  renderPicker: () => React.ReactNode | null
}

export function useAirPlayNative({
  enabled,
  metadata,
}: UseAirPlayNativeOptions): UseAirPlayNativeReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // AirPlay is only available on iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && enabled) {
      setIsAvailable(true)
      log.info('AirPlay available on iOS')
    } else {
      setIsAvailable(false)
      if (Platform.OS !== 'ios') {
        log.debug('AirPlay not available - platform is not iOS', { platform: Platform.OS })
      }
    }
  }, [enabled])

  // TODO: Implement AirPlay connection state tracking via AVAudioSession
  // This requires native module to monitor AVAudioSession.routeChangeNotification
  // For now, AirPlay state is managed automatically by react-native-video

  const startCast = useCallback(() => {
    // AirPlay is handled natively by react-native-video's allowsExternalPlayback prop
    // Users can access AirPlay through iOS Control Center or native picker
    log.debug('AirPlay startCast called - using native video player AirPlay support')
  }, [])

  const stopCast = useCallback(() => {
    // Disconnection is handled through iOS Control Center or native picker
    log.debug('AirPlay stopCast called - user should disconnect via iOS Control Center')
  }, [])

  // AirPlay automatically handles metadata via AVPlayer
  const updateMetadata = useCallback(() => {
    // Metadata is automatically handled by AVPlayer in AirPlay
    // No manual sync needed when using react-native-video
  }, [])

  const syncPlaybackState = useCallback(() => {
    // Playback is automatically synchronized by AVPlayer
    // No manual sync needed when using react-native-video
  }, [])

  const renderPicker = useCallback(() => {
    // Note: react-native-video handles AirPlay natively via allowsExternalPlayback
    // For a custom picker, implement AirPlayPicker component using AVRoutePickerView
    // For now, users access AirPlay through iOS Control Center
    return null
  }, [])

  return {
    isAvailable,
    isConnecting,
    isConnected,
    deviceName: isConnected ? 'AirPlay' : null,
    startCast,
    stopCast,
    updateMetadata,
    syncPlaybackState,
    renderPicker,
  }
}
