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
  // Check if SDK already loaded
  if (window.chrome?.cast) {
    onLoaded()
    return
  }

  // Check if script already exists
  const existingScript = document.querySelector(`script[src="${CAST_SDK_URL}"]`)
  if (existingScript) {
    return
  }

  // Load SDK with integrity verification
  const script = document.createElement('script')
  script.src = CAST_SDK_URL
  script.async = true
  script.integrity = CAST_SDK_INTEGRITY
  script.crossOrigin = 'anonymous'

  // Handle SDK load success/failure
  window.__onGCastApiAvailable = (isAvailable) => {
    if (isAvailable) {
      onLoaded()
      log.info('SDK loaded successfully')
    } else {
      onError()
      log.error('SDK failed to load')
    }
  }

  // Handle integrity check failure
  script.onerror = () => {
    log.error('Cast SDK failed integrity check - possible CDN compromise')
    onError()
  }

  document.body.appendChild(script)

  return () => {
    // Cleanup handled by browser
  }
}
