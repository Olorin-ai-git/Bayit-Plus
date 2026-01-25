/**
 * Cast Configuration
 * Loads and validates AirPlay and Chromecast configuration from environment variables
 */

import { logger } from '@/utils/logger'

const log = logger.scope('CastConfig')

interface CastConfig {
  featureEnabled: boolean
  enableAirPlay: boolean
  enableChromecast: boolean
  receiverAppId: string | null
  syncIntervalMs: number
  autoSync: boolean
}

/**
 * Validates Chromecast receiver app ID format
 * Must be exactly 8 uppercase alphanumeric characters
 */
function isValidReceiverAppId(id: string | undefined): boolean {
  if (!id) return false
  return /^[A-Z0-9]{8}$/.test(id)
}

/**
 * Loads cast configuration from environment variables
 * Fails fast if Chromecast is enabled but receiver ID is invalid
 */
function loadCastConfig(): CastConfig {
  const enableAirPlay = import.meta.env.VITE_CAST_ENABLE_AIRPLAY === 'true'
  const enableChromecast = import.meta.env.VITE_CAST_ENABLE_CHROMECAST === 'true'
  const receiverAppId = import.meta.env.VITE_CHROMECAST_RECEIVER_APP_ID
  const syncIntervalMs = parseInt(import.meta.env.VITE_CAST_SYNC_INTERVAL_MS || '1000', 10)
  const autoSync = import.meta.env.VITE_CAST_AUTO_SYNC !== 'false'

  // Validate sync interval
  const validSyncInterval = Math.max(500, Math.min(5000, syncIntervalMs))

  // Validate Chromecast configuration
  let validReceiverAppId: string | null = null
  if (enableChromecast) {
    if (isValidReceiverAppId(receiverAppId)) {
      validReceiverAppId = receiverAppId!
    } else {
      log.warn(
        'Chromecast enabled but invalid receiver app ID. Disabling Chromecast. ' +
        'Provide VITE_CHROMECAST_RECEIVER_APP_ID (8 uppercase alphanumeric characters).',
        { receiverAppId }
      )
    }
  }

  // Feature is enabled if either AirPlay or Chromecast is enabled
  const featureEnabled = enableAirPlay || (enableChromecast && validReceiverAppId !== null)

  const config: CastConfig = {
    featureEnabled,
    enableAirPlay,
    enableChromecast: enableChromecast && validReceiverAppId !== null,
    receiverAppId: validReceiverAppId,
    syncIntervalMs: validSyncInterval,
    autoSync,
  }

  if (featureEnabled) {
    log.info('Cast feature enabled', {
      airPlay: config.enableAirPlay,
      chromecast: config.enableChromecast,
      syncIntervalMs: config.syncIntervalMs,
    })
  }

  return config
}

export const castConfig = loadCastConfig()
