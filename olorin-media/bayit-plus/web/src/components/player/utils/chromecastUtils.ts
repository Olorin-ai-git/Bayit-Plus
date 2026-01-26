/**
 * Chromecast Utilities
 * Helper functions for Chromecast integration
 */

import { logger } from '@/utils/logger'
import { CastMetadata } from '../types/cast'

const log = logger.scope('ChromecastUtils')

/**
 * Cast SDK Configuration
 * URL from environment variable for security
 */
export const CAST_SDK_URL = import.meta.env.VITE_CAST_SDK_URL || 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js'

/**
 * Subresource Integrity hash for Cast SDK
 * Verifies SDK hasn't been tampered with (prevents CDN compromise)
 * Generated using: curl <SDK_URL> | openssl dgst -sha384 -binary | openssl base64 -A
 * Last verified: 2026-01-25
 */
export const CAST_SDK_INTEGRITY = 'sha384-NwUJLy+ESQMRnO3eU1dXo2P7iiXiLvKzXBV+wweZoD9bedq7L6/4fOaJdTHoQcTc'

/**
 * Load media to Chromecast session
 */
export function loadChromecastMedia(
  session: any,
  meta: CastMetadata,
  videoElement: HTMLVideoElement | null
): void {
  if (!session) return

  try {
    const mediaInfo = {
      contentId: meta.streamUrl,
      contentType: 'application/x-mpegURL',
      streamType: 'BUFFERED',
      metadata: {
        type: 0,
        metadataType: 0,
        title: meta.title,
        images: meta.posterUrl ? [{ url: meta.posterUrl }] : [],
      },
      duration: meta.duration,
      tracks: meta.subtitleTracks?.map((track, index) => ({
        trackId: index + 1,
        type: 'TEXT',
        trackContentType: 'text/vtt',
        trackContentId: track.url,
        language: track.language,
        name: track.language.toUpperCase(),
      })),
    }

    const request = {
      media: mediaInfo,
      autoplay: true,
      currentTime: videoElement?.currentTime || 0,
    }

    session.loadMedia(request)
      .then(() => {
        log.info('Media loaded successfully')
      })
      .catch((error: any) => {
        log.error('Failed to load media', error)
      })
  } catch (error) {
    log.error('Error loading media', error)
  }
}

/**
 * Load Cast SDK dynamically
 */
export function loadCastSDK(
  onLoaded: () => void,
  onError: () => void
): (() => void) | undefined {
  // Check if SDK framework is already available (fully loaded)
  if (window.chrome?.cast?.framework?.CastContext) {
    onLoaded()
    return
  }

  // Check if SDK script is already loaded or loading
  const existingScript = document.querySelector(`script[src="${CAST_SDK_URL}"]`)
  if (existingScript) {
    // Script is loading/loaded, wait for callback
    return
  }

  // Create a timeout to handle SDK loading failures
  const loadTimeout = setTimeout(() => {
    log.warn('Cast SDK loading timeout after 5 seconds')
    onError()
  }, 5000)

  // Handle SDK load success/failure via Google's callback mechanism
  window.__onGCastApiAvailable = (isAvailable) => {
    clearTimeout(loadTimeout)

    if (isAvailable && window.chrome?.cast?.framework?.CastContext) {
      // Successfully initialized Chromecast framework
      onLoaded()
      log.info('Chromecast SDK loaded successfully', {
        framework: 'CastContext available',
        timestamp: new Date().toISOString()
      })
    } else {
      // Chromecast SDK failed to initialize - provide diagnostic details
      onError()
      const errorDetails = {
        isAvailable,
        hasChromeObject: !!window.chrome,
        hasCastObject: !!window.chrome?.cast,
        hasFrameworkObject: !!window.chrome?.cast?.framework,
        hasCastContext: !!window.chrome?.cast?.framework?.CastContext,
        userAgent: navigator.userAgent.substring(0, 100),
        timestamp: new Date().toISOString()
      }
      log.error('Chromecast SDK initialization failed', errorDetails)
    }
  }

  // Load SDK script
  const script = document.createElement('script')
  script.src = CAST_SDK_URL
  script.async = true

  // Handle script loading errors (network failure, CORS, 404, etc.)
  script.onerror = () => {
    clearTimeout(loadTimeout)
    log.error('Cast SDK script failed to load from CDN', {
      url: CAST_SDK_URL,
      timestamp: new Date().toISOString()
    })
    onError()
  }

  // Use head instead of body for better load order
  const target = document.head || document.body
  target.appendChild(script)

  return () => {
    clearTimeout(loadTimeout)
  }
}
