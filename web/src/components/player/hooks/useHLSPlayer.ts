import { useRef, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import logger from '@/utils/logger'
import { clearPersistedSession } from '@/services/liveSessionPersistence'

// Track all active HLS instances for cleanup
const activeHlsInstances = new Set<Hls>()

// Track failed stream URLs with timestamps to prevent retry loops
// Entries expire after TTL to allow retrying previously failed streams
// Map<streamUrl, timestamp>
const failedStreamUrls = new Map<string, number>()

// TTL for failed streams: 5 minutes (300000ms)
// After this time, a failed stream can be retried
const FAILED_STREAM_TTL = 5 * 60 * 1000

/**
 * Check if a failed stream entry has expired.
 */
function isStreamFailureExpired(timestamp: number): boolean {
  return Date.now() - timestamp > FAILED_STREAM_TTL
}

/**
 * Clean up expired entries from the failed streams map.
 */
function cleanupExpiredStreams(): void {
  const now = Date.now()
  let removedCount = 0

  failedStreamUrls.forEach((timestamp, url) => {
    if (isStreamFailureExpired(timestamp)) {
      failedStreamUrls.delete(url)
      removedCount++
    }
  })

  if (removedCount > 0) {
    logger.info(`Cleaned up ${removedCount} expired failed streams`, 'cleanupExpiredStreams')
  }
}

/**
 * Check if a stream URL is in the failed list and not expired.
 */
function isStreamBlocked(url: string): boolean {
  const timestamp = failedStreamUrls.get(url)
  if (!timestamp) return false

  // If expired, remove it and allow retry
  if (isStreamFailureExpired(timestamp)) {
    failedStreamUrls.delete(url)
    logger.info('Failed stream TTL expired, allowing retry', 'isStreamBlocked', { url })
    return false
  }

  return true
}

/**
 * Kill all stale HLS instances and clear persisted sessions.
 * Call this on app startup or when detecting stale streams.
 */
export function killStaleHLS(): void {
  logger.info(`Killing ${activeHlsInstances.size} stale HLS instances`, 'killStaleHLS')

  activeHlsInstances.forEach((hls) => {
    try {
      hls.stopLoad()
      hls.detachMedia()
      hls.destroy()
    } catch (e) {
      logger.warn('Error destroying HLS instance', 'killStaleHLS', e)
    }
  })
  activeHlsInstances.clear()

  // Clear failed streams cache to allow retrying
  failedStreamUrls.clear()

  // Clear persisted live session to prevent auto-restore of stale streams
  clearPersistedSession()

  // Also clear any dubbing/translation/trivia settings that might cause auto-connect
  try {
    // Clear all live session related storage
    const keysToRemove = [
      'bayit-live-session',
      'bayit-dubbing-settings',
      'bayit-translation-settings',
      'bayit-trivia-settings',
      'bayit-live-trivia',
    ]
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
      localStorage.removeItem(key) // Also check localStorage
    })
  } catch (e) {
    logger.warn('Error clearing storage', 'killStaleHLS', e)
  }

  logger.info('Cleared all live session data', 'killStaleHLS')
}

/**
 * Clear the failed streams list to allow retrying previously failed streams.
 */
export function clearFailedStreams(): void {
  const count = failedStreamUrls.size
  failedStreamUrls.clear()
  logger.info(`Cleared ${count} failed streams from blocklist`, 'clearFailedStreams')
}

/**
 * Get statistics about failed streams including TTL expiration info.
 */
export function getFailedStreamsStats(): {
  total: number
  expired: number
  active: number
  streams: Array<{ url: string; timestamp: number; expiresIn: number; isExpired: boolean }>
} {
  const now = Date.now()
  let expiredCount = 0
  const streams: Array<{ url: string; timestamp: number; expiresIn: number; isExpired: boolean }> = []

  failedStreamUrls.forEach((timestamp, url) => {
    const isExpired = isStreamFailureExpired(timestamp)
    const expiresIn = Math.max(0, FAILED_STREAM_TTL - (now - timestamp))

    if (isExpired) expiredCount++

    streams.push({
      url,
      timestamp,
      expiresIn,
      isExpired,
    })
  })

  return {
    total: failedStreamUrls.size,
    expired: expiredCount,
    active: failedStreamUrls.size - expiredCount,
    streams,
  }
}

// Periodic cleanup of expired failed streams (runs every minute)
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredStreams()
  }, 60 * 1000) // 1 minute
}

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).killStaleHLS = killStaleHLS
  ;(window as any).clearFailedStreams = clearFailedStreams
  ;(window as any).cleanupExpiredStreams = cleanupExpiredStreams
  ;(window as any).getFailedStreams = () => Array.from(failedStreamUrls.keys())
  ;(window as any).getFailedStreamsStats = getFailedStreamsStats
}

interface UseHLSPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  streamUrl: string
  isLive: boolean
  autoPlay: boolean
  onReady: () => void
  onAutoplayMuted?: () => void
  onFatalError?: (error: { type: string; details: string; fatal: boolean }) => void
  /** Target latency in seconds for live streams (for dubbing sync). Default: 3s */
  targetLatencySeconds?: number
}

/**
 * Add cache-busting parameter to HLS stream URL to prevent stale manifest issues.
 * For live streams, the master.m3u8 and chunklist references can become stale
 * after session ends. Adding a timestamp ensures fresh manifests on page load.
 */
function addCacheBuster(url: string): string {
  if (!url.includes('.m3u8')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_cb=${Date.now()}`
}

export function useHLSPlayer({
  videoRef,
  streamUrl,
  isLive,
  autoPlay,
  onReady,
  onAutoplayMuted,
  onFatalError,
  targetLatencySeconds = 3,
}: UseHLSPlayerOptions) {
  const hlsRef = useRef<Hls | null>(null)
  const networkErrorCountRef = useRef(0)
  const maxNetworkErrors = 3 // Clear session after 3 consecutive 404s

  /**
   * Handle fatal HLS errors - clear session if stream is stale
   */
  const handleFatalError = useCallback((data: { type: string; details: string; fatal: boolean }) => {
    // Track network errors (likely 404s on chunklists)
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      networkErrorCountRef.current++
      logger.warn('HLS network error', 'useHLSPlayer', {
        details: data.details,
        errorCount: networkErrorCountRef.current,
      })

      // After multiple network errors, clear the session to prevent auto-restore of stale streams
      if (networkErrorCountRef.current >= maxNetworkErrors && isLive) {
        logger.error('Multiple network errors detected, clearing live session', 'useHLSPlayer')
        clearPersistedSession()
        networkErrorCountRef.current = 0
      }
    }

    // Notify parent component of fatal error
    if (onFatalError) {
      onFatalError(data)
    }
  }, [isLive, onFatalError])

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return

    // Clean up expired entries on each new stream attempt
    cleanupExpiredStreams()

    // Check if this stream URL is blocked (failed recently and not expired)
    if (isStreamBlocked(streamUrl)) {
      const timestamp = failedStreamUrls.get(streamUrl)!
      const timeUntilExpiry = Math.ceil((FAILED_STREAM_TTL - (Date.now() - timestamp)) / 1000)

      logger.warn('Stream URL previously failed, not retrying', 'useHLSPlayer', {
        streamUrl,
        timeUntilExpiry: `${timeUntilExpiry}s`,
      })

      // Notify parent component immediately
      if (onFatalError) {
        onFatalError({
          type: 'STREAM_BLOCKED',
          details: 'PREVIOUSLY_FAILED_STREAM',
          fatal: true,
        })
      }
      return
    }

    // Reset error count on new stream
    networkErrorCountRef.current = 0

    const video = videoRef.current
    // Add cache-buster for live streams to prevent stale manifest issues
    const effectiveStreamUrl = isLive ? addCacheBuster(streamUrl) : streamUrl

    // For VOD on Safari, prefer native HLS over HLS.js for AirPlay compatibility.
    // HLS.js creates blob: URLs that Apple TV cannot access via AirPlay (audio-only symptom).
    // Safari's native HLS player uses the real .m3u8 URL, which AirPlay sends to Apple TV directly.
    // Live streams still use HLS.js for low-latency, dubbing delay, and buffer control features.
    const preferNativeHLS = !isLive && !!video.canPlayType('application/vnd.apple.mpegurl')
    if (!preferNativeHLS && Hls.isSupported() && streamUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive && targetLatencySeconds <= 3, // Only low latency if not delayed for dubbing
        // Aggressive settings to fail fast on stale streams
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 5000,
        levelLoadingMaxRetry: 1,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 1,
        fragLoadingRetryDelay: 500,
        // Disable automatic level switching on error
        startLevel: -1,
        // Buffer settings - increase for dubbing delay
        maxBufferLength: Math.max(10, targetLatencySeconds + 5),
        maxMaxBufferLength: Math.max(30, targetLatencySeconds + 20),
        // Live sync settings - control how far behind live edge we play
        // For dubbing, we want to be ~10s behind to match dubbed audio buffer
        liveSyncDuration: isLive ? targetLatencySeconds : undefined,
        liveMaxLatencyDuration: isLive ? targetLatencySeconds + 5 : undefined,
        liveDurationInfinity: isLive,
        // DISABLE HLS.js subtitle handling - embedded subtitles handled by native video element
        // When using native playback (AirPlay), subtitles come from master.m3u8 EXT-X-MEDIA tags
        subtitleDisplay: false,
      })
      hlsRef.current = hls
      activeHlsInstances.add(hls) // Track for cleanup

      // Disable subtitle track - HLS.js blob URLs don't preserve embedded subtitle references
      // For AirPlay, we switch to native .m3u8 playback which reads subtitles from master manifest
      hls.subtitleTrack = -1

      hls.loadSource(effectiveStreamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // CRITICAL: Disable subtitle tracks IMMEDIATELY before HLS.js tries to load them
        // This prevents levelParsingError when HLS.js tries to parse VTT files as HLS manifests
        if (hls.subtitleTrack !== -1) {
          hls.subtitleTrack = -1
        }
        // Manifest parsed - embedded subtitles are now available via hls.subtitleTracks
        onReady()
        // Check audio tracks in the stream
        const hasAudioTracks = (data.audioTracks?.length || 0) > 0
        const audioTrackDetails = data.audioTracks?.map((t: any) => ({
          id: t.id,
          name: t.name,
          lang: t.lang,
          default: t.default,
        })) || []
        logger.info('HLS manifest parsed', 'useHLSPlayer', {
          autoPlay,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          audioTracksCount: data.audioTracks?.length || 0,
          hasAudioTracks,
          audioTrackDetails,
          levels: data.levels?.length || 0,
          // Check if video element has audio tracks API support
          videoAudioTracksCount: (video as any).audioTracks?.length ?? 'not supported',
        })
        if (autoPlay) {
          // Ensure video starts unmuted
          video.muted = false
          video.volume = 1
          logger.info('Starting autoplay attempt', 'useHLSPlayer', {
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
            hasAudioTracks,
          })
          // Try to play with sound first, if blocked by autoplay policy, play muted
          video.play().then(() => {
            // Verify audio state after successful play
            logger.info('Autoplay succeeded', 'useHLSPlayer', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
              paused: video.paused,
              currentTime: video.currentTime,
              hasAudioTracks,
            })
            // If video is unexpectedly muted after play, something is wrong
            if (video.muted) {
              logger.warn('Video unexpectedly muted after autoplay success', 'useHLSPlayer')
            }
          }).catch((err) => {
            logger.info('Autoplay blocked by browser, trying muted', 'useHLSPlayer', {
              error: err.message,
              errorName: err.name,
            })
            video.muted = true
            onAutoplayMuted?.()
            video.play().then(() => {
              logger.info('Muted autoplay succeeded', 'useHLSPlayer', {
                videoDOMMuted: video.muted,
                videoDOMVolume: video.volume,
              })
            }).catch((e) => {
              logger.warn('Autoplay blocked even when muted', 'useHLSPlayer', {
                error: e.message,
                errorName: e.name,
              })
            })
          })
        }
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        // Track ALL network errors (fatal or not)
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          networkErrorCountRef.current++
          logger.warn('HLS network error', 'useHLSPlayer', {
            details: data.details,
            url: data.url,
            fatal: data.fatal,
            errorCount: networkErrorCountRef.current,
          })

          // Stop HLS immediately on network errors for live streams (likely stale)
          if (isLive && networkErrorCountRef.current >= maxNetworkErrors) {
            logger.error('Stale stream detected - stopping HLS player', 'useHLSPlayer', { streamUrl })
            hls.stopLoad()
            hls.detachMedia()
            clearPersistedSession()
            networkErrorCountRef.current = 0

            // Add to failed streams to prevent retry loops (with TTL)
            const timestamp = Date.now()
            failedStreamUrls.set(streamUrl, timestamp)
            logger.info('Added stream to failed list, will not retry', 'useHLSPlayer', {
              streamUrl,
              ttlMinutes: FAILED_STREAM_TTL / 60000,
            })

            handleFatalError({
              type: data.type,
              details: 'STALE_STREAM_DETECTED',
              fatal: true,
            })
            return
          }
        }

        if (data.fatal) {
          logger.error('HLS fatal error', 'useHLSPlayer', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: data.url,
          })

          // Stop HLS completely on fatal errors
          hls.stopLoad()
          hls.detachMedia()

          if (isLive) {
            clearPersistedSession()
          }

          handleFatalError({
            type: data.type,
            details: data.details,
            fatal: data.fatal,
          })
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support - use cache-busted URL for live streams
      video.src = effectiveStreamUrl
      video.addEventListener('loadedmetadata', () => {
        onReady()
        const audioTracksCount = (video as any).audioTracks?.length ?? 'not supported'
        logger.info('Safari HLS loadedmetadata', 'useHLSPlayer', {
          autoPlay,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          audioTracksCount,
          duration: video.duration,
        })
        if (autoPlay) {
          // Ensure video starts unmuted
          video.muted = false
          video.volume = 1
          logger.info('Starting autoplay attempt (Safari)', 'useHLSPlayer', {
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
          })
          video.play().then(() => {
            logger.info('Autoplay succeeded (Safari)', 'useHLSPlayer', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
              paused: video.paused,
            })
          }).catch((err) => {
            logger.info('Autoplay blocked (Safari), trying muted', 'useHLSPlayer', {
              error: err.message,
              errorName: err.name,
            })
            video.muted = true
            onAutoplayMuted?.()
            video.play().then(() => {
              logger.info('Muted autoplay succeeded (Safari)', 'useHLSPlayer')
            }).catch((e) => {
              logger.warn('Autoplay blocked even when muted (Safari)', 'useHLSPlayer', {
                error: e.message,
              })
            })
          })
        }
      })
    } else {
      // Fallback for non-HLS streams
      video.src = streamUrl
      video.addEventListener('loadeddata', () => {
        onReady()
        const audioTracksCount = (video as any).audioTracks?.length ?? 'not supported'
        logger.info('Video loadeddata (fallback)', 'useHLSPlayer', {
          autoPlay,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          audioTracksCount,
          duration: video.duration,
        })
        if (autoPlay) {
          // Ensure video starts unmuted
          video.muted = false
          video.volume = 1
          logger.info('Starting autoplay attempt (fallback)', 'useHLSPlayer', {
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
          })
          video.play().then(() => {
            logger.info('Autoplay succeeded (fallback)', 'useHLSPlayer', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
              paused: video.paused,
            })
          }).catch((err) => {
            logger.info('Autoplay blocked (fallback), trying muted', 'useHLSPlayer', {
              error: err.message,
              errorName: err.name,
            })
            video.muted = true
            onAutoplayMuted?.()
            video.play().then(() => {
              logger.info('Muted autoplay succeeded (fallback)', 'useHLSPlayer')
            }).catch((e) => {
              logger.warn('Autoplay blocked even when muted (fallback)', 'useHLSPlayer', {
                error: e.message,
              })
            })
          })
        }
      })
    }

    return () => {
      if (hlsRef.current) {
        activeHlsInstances.delete(hlsRef.current)
        hlsRef.current.stopLoad()
        hlsRef.current.detachMedia()
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamUrl, isLive, autoPlay, videoRef, onReady, onAutoplayMuted, handleFatalError, targetLatencySeconds])

  // Listen for dubbing stream switch events to reconfigure HLS.js with delayed latency
  useEffect(() => {
    if (!isLive) return

    const handleDubbingSwitch = (event: CustomEvent<{ url: string; delay_ms: number }>) => {
      const video = videoRef.current
      if (!video || !hlsRef.current) return

      const delaySeconds = Math.ceil(event.detail.delay_ms / 1000)
      logger.info(`Reconfiguring HLS for dubbing: ${delaySeconds}s latency`, 'useHLSPlayer')

      // Store current playback position
      const currentTime = video.currentTime
      const wasPlaying = !video.paused

      // Destroy current instance
      activeHlsInstances.delete(hlsRef.current)
      hlsRef.current.stopLoad()
      hlsRef.current.detachMedia()
      hlsRef.current.destroy()

      // Create new instance with dubbing latency
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Disable for dubbing
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 5000,
        levelLoadingMaxRetry: 1,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 1,
        fragLoadingRetryDelay: 500,
        startLevel: -1,
        maxBufferLength: delaySeconds + 10,
        maxMaxBufferLength: delaySeconds + 30,
        liveSyncDuration: delaySeconds,
        liveMaxLatencyDuration: delaySeconds + 5,
        liveDurationInfinity: true,
        // DISABLE HLS.js subtitle handling
        subtitleDisplay: false,
      })

      hlsRef.current = hls
      hls.subtitleTrack = -1  // Disable subtitle tracks
      activeHlsInstances.add(hls)

      hls.loadSource(event.detail.url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // CRITICAL: Disable subtitle tracks IMMEDIATELY before HLS.js tries to load them
        if (hls.subtitleTrack !== -1) {
          hls.subtitleTrack = -1
        }
        // Manifest parsed - embedded subtitles available
        logger.info('HLS reconfigured for dubbing, manifest parsed', 'useHLSPlayer')
        if (wasPlaying) {
          video.play().catch((err) => {
            logger.warn('Failed to resume after dubbing switch', 'useHLSPlayer', err)
          })
        }
      })
    }

    const handleDubbingRestore = (event: CustomEvent<{ url: string }>) => {
      const video = videoRef.current
      if (!video || !hlsRef.current) return

      logger.info('Restoring HLS to normal latency', 'useHLSPlayer')

      // Store current state
      const wasPlaying = !video.paused

      // Destroy current instance
      activeHlsInstances.delete(hlsRef.current)
      hlsRef.current.stopLoad()
      hlsRef.current.detachMedia()
      hlsRef.current.destroy()

      // Create new instance with normal latency
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 5000,
        levelLoadingMaxRetry: 1,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 1,
        fragLoadingRetryDelay: 500,
        startLevel: -1,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 8,
        liveDurationInfinity: true,
        // DISABLE HLS.js subtitle handling
        subtitleDisplay: false,
      })

      hlsRef.current = hls
      hls.subtitleTrack = -1  // Disable subtitle tracks
      activeHlsInstances.add(hls)

      hls.loadSource(event.detail.url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // CRITICAL: Disable subtitle tracks IMMEDIATELY before HLS.js tries to load them
        if (hls.subtitleTrack !== -1) {
          hls.subtitleTrack = -1
        }
        // Manifest parsed - embedded subtitles available
        logger.info('HLS restored to normal latency', 'useHLSPlayer')
        if (wasPlaying) {
          video.play().catch((err) => {
            logger.warn('Failed to resume after dubbing restore', 'useHLSPlayer', err)
          })
        }
      })
    }

    window.addEventListener('dubbing-stream-switch', handleDubbingSwitch as EventListener)
    window.addEventListener('dubbing-stream-restore', handleDubbingRestore as EventListener)

    return () => {
      window.removeEventListener('dubbing-stream-switch', handleDubbingSwitch as EventListener)
      window.removeEventListener('dubbing-stream-restore', handleDubbingRestore as EventListener)
    }
  }, [isLive, videoRef])

  // Expose destroy callback for external cleanup (e.g., before AirPlay switches to native HLS)
  const destroyHLS = useCallback(() => {
    if (hlsRef.current) {
      logger.info('Destroying HLS.js instance (external request)', 'useHLSPlayer')
      activeHlsInstances.delete(hlsRef.current)
      hlsRef.current.stopLoad()
      hlsRef.current.detachMedia()
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  return { hlsRef, destroyHLS }
}
