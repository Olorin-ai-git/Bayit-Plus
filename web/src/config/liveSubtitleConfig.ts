/**
 * Live Subtitle Translation Configuration
 * Centralized configuration for live subtitle feature
 * All timing values in milliseconds unless otherwise specified
 */

export interface LiveSubtitleConfig {
  // WebSocket connection configuration
  connectionTimeoutMs: number
  heartbeatCheckIntervalMs: number
  staleConnectionTimeoutMs: number

  // Audio configuration
  sampleRate: number

  // UI polling configuration
  externalConnectionPollIntervalMs: number
}

/**
 * Get live subtitle configuration from environment variables with fallback defaults
 */
export const getLiveSubtitleConfig = (): LiveSubtitleConfig => {
  return {
    // WebSocket connection timeout (default: 10 seconds)
    connectionTimeoutMs: Number(
      import.meta.env.VITE_LIVE_SUBTITLE_CONNECTION_TIMEOUT_MS || 10000
    ),

    // Heartbeat check interval (default: 10 seconds)
    heartbeatCheckIntervalMs: Number(
      import.meta.env.VITE_LIVE_SUBTITLE_HEARTBEAT_CHECK_INTERVAL_MS || 10000
    ),

    // Stale connection timeout - no messages received (default: 60 seconds)
    staleConnectionTimeoutMs: Number(
      import.meta.env.VITE_LIVE_SUBTITLE_STALE_CONNECTION_TIMEOUT_MS || 60000
    ),

    // Audio sample rate in Hz (default: 16000 for ElevenLabs Scribe)
    sampleRate: Number(import.meta.env.VITE_LIVE_SUBTITLE_SAMPLE_RATE || 16000),

    // External connection polling interval (default: 1 second)
    externalConnectionPollIntervalMs: Number(
      import.meta.env.VITE_LIVE_SUBTITLE_EXTERNAL_POLL_INTERVAL_MS || 1000
    ),
  }
}

/**
 * Live subtitle configuration instance
 * Import this to access configuration values
 */
export const liveSubtitleConfig = getLiveSubtitleConfig()
