/**
 * Unified Cast Session Hook (Mobile)
 * Combines AirPlay and Chromecast into a single interface
 */

import { Platform } from 'react-native'
import { CastMetadata, CastSession } from '../types/cast'
import { useAirPlayNative } from './useAirPlayNative'
import { useChromecastNative } from './useChromecastNative'

interface UseCastSessionOptions {
  metadata?: CastMetadata
  enabled?: boolean
  receiverAppId?: string | null
}

export function useCastSession({
  metadata,
  enabled = true,
  receiverAppId = null,
}: UseCastSessionOptions): CastSession {
  const airplay = useAirPlayNative({
    enabled: enabled && Platform.OS === 'ios',
    metadata,
  })

  const chromecast = useChromecastNative({
    enabled: enabled && receiverAppId !== null,
    receiverAppId,
    metadata,
  })

  // Priority: Active connection first (direct spread if connected)
  if (chromecast.isConnected) {
    return { ...chromecast, castType: 'chromecast' as const }
  }

  if (airplay.isConnected) {
    return { ...airplay, castType: 'airplay' as const }
  }

  if (chromecast.isConnecting) {
    return { ...chromecast, castType: 'chromecast' as const }
  }

  // Platform detection for default behavior
  const primaryCast = Platform.OS === 'ios' ? airplay : chromecast

  return {
    isAvailable: airplay.isAvailable || chromecast.isAvailable,
    isConnecting: airplay.isConnecting || chromecast.isConnecting,
    isConnected: airplay.isConnected || chromecast.isConnected,
    deviceName: airplay.deviceName || chromecast.deviceName,
    castType: null,
    startCast: primaryCast.startCast,
    stopCast: () => {
      airplay.stopCast()
      chromecast.stopCast()
    },
    updateMetadata: (meta: CastMetadata) => {
      if (airplay.isConnected) airplay.updateMetadata(meta)
      if (chromecast.isConnected) chromecast.updateMetadata(meta)
    },
    syncPlaybackState: (state) => {
      if (airplay.isConnected) airplay.syncPlaybackState(state)
      if (chromecast.isConnected) chromecast.syncPlaybackState(state)
    },
  }
}
