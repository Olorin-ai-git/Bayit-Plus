/**
 * Unified Cast Session Hook
 * Combines AirPlay and Chromecast capabilities with a unified interface
 */

import { useMemo } from 'react'
import { castConfig } from '@/config/castConfig'
import { useAirPlayWeb } from './useAirPlayWeb'
import { useChromecastWeb } from './useChromecastWeb'
import { CastSession, CastMetadata, CastType } from '../types/cast'

interface UseCastSessionOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  metadata?: CastMetadata
  enabled?: boolean
}

export function useCastSession({
  videoRef,
  metadata,
  enabled = true,
}: UseCastSessionOptions): CastSession {
  // Initialize AirPlay (Safari/WebKit)
  const airplay = useAirPlayWeb({
    videoRef,
    enabled: enabled && castConfig.featureEnabled && castConfig.enableAirPlay,
    metadata,
  })

  // Initialize Chromecast (Chrome/Edge)
  const chromecast = useChromecastWeb({
    videoRef,
    enabled: enabled && castConfig.featureEnabled && castConfig.enableChromecast,
    receiverAppId: castConfig.receiverAppId,
    metadata,
  })

  // Unified interface - prioritize active connection
  const session: CastSession = useMemo(() => {
    // If Chromecast is connected, use it
    if (chromecast.isConnected) {
      return {
        isAvailable: true,
        isConnecting: false,
        isConnected: true,
        deviceName: chromecast.deviceName,
        castType: 'chromecast' as CastType,
        startCast: chromecast.startCast,
        stopCast: chromecast.stopCast,
        updateMetadata: chromecast.updateMetadata,
        syncPlaybackState: chromecast.syncPlaybackState,
      }
    }

    // If AirPlay is connected, use it
    if (airplay.isConnected) {
      return {
        isAvailable: true,
        isConnecting: false,
        isConnected: true,
        deviceName: airplay.deviceName,
        castType: 'airplay' as CastType,
        startCast: airplay.startCast,
        stopCast: airplay.stopCast,
        updateMetadata: airplay.updateMetadata,
        syncPlaybackState: airplay.syncPlaybackState,
      }
    }

    // If Chromecast is connecting
    if (chromecast.isConnecting) {
      return {
        isAvailable: true,
        isConnecting: true,
        isConnected: false,
        deviceName: null,
        castType: 'chromecast' as CastType,
        startCast: chromecast.startCast,
        stopCast: () => {},
        updateMetadata: () => {},
        syncPlaybackState: () => {},
      }
    }

    // If either is available, provide unified start function
    const isAvailable = airplay.isAvailable || chromecast.isAvailable

    // Prioritize AirPlay on Safari, Chromecast on Chrome/Edge
    const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const primaryCast = isWebKit ? airplay : chromecast
    const secondaryCast = isWebKit ? chromecast : airplay

    return {
      isAvailable,
      isConnecting: false,
      isConnected: false,
      deviceName: null,
      castType: null,
      startCast: () => {
        if (primaryCast.isAvailable) {
          primaryCast.startCast()
        } else if (secondaryCast.isAvailable) {
          secondaryCast.startCast()
        }
      },
      stopCast: () => {},
      updateMetadata: () => {},
      syncPlaybackState: () => {},
    }
  }, [
    airplay.isAvailable,
    airplay.isConnected,
    airplay.deviceName,
    airplay.startCast,
    airplay.stopCast,
    airplay.updateMetadata,
    airplay.syncPlaybackState,
    chromecast.isAvailable,
    chromecast.isConnecting,
    chromecast.isConnected,
    chromecast.deviceName,
    chromecast.startCast,
    chromecast.stopCast,
    chromecast.updateMetadata,
    chromecast.syncPlaybackState,
  ])

  return session
}
