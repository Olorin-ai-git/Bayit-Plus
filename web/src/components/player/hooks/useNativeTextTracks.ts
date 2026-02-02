/**
 * useNativeTextTracks Hook
 * Manages native HTML5 <track> elements for AirPlay/Chromecast subtitle support
 */

import { useEffect, useRef, useState } from 'react'
import { SubtitleCue } from '@/types/subtitle'
import { getLanguageInfo } from '@/types/subtitle'
import { logger } from '@/utils/logger'
import api from '@/services/api'

const log = logger.scope('NativeTextTracks')

// Cache the server host to avoid repeated API calls
let cachedServerHost: string | null = null

/**
 * Get the backend server host that's accessible to casting devices.
 * Uses cached value if available, otherwise fetches from /health endpoint.
 */
async function getBackendHost(): Promise<string> {
  if (cachedServerHost) {
    return cachedServerHost
  }

  try {
    // Health endpoint is at root level, not under /api/v1
    const response = await fetch('http://localhost:8000/health')
    const data = await response.json()
    const { server_host, server_port } = data
    cachedServerHost = `${server_host}:${server_port}`
    log.info('Fetched backend host for casting', { host: cachedServerHost })
    return cachedServerHost
  } catch (error) {
    log.error('Failed to fetch backend host, using fallback', { error })
    // Fallback to window location if health check fails
    const host = window.location.hostname
    const port = 8000
    cachedServerHost = `${host}:${port}`
    return cachedServerHost
  }
}

interface UseNativeTextTracksOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  cues: SubtitleCue[]
  language: string | null
  enabled: boolean
  isCasting: boolean
  contentId?: string
  // Split mode support
  splitMode?: boolean
  splitLanguages?: [string, string] | null
  splitCues?: {
    primary: SubtitleCue[]
    secondary: SubtitleCue[]
  }
  // HLS detection - skip native tracks for HLS (has embedded subtitles)
  isHLS?: boolean
}

/**
 * Adds native text tracks to video element for AirPlay/Chromecast
 * Uses HTTP endpoint to serve VTT files for proper casting support
 */
export function useNativeTextTracks({
  videoRef,
  cues,
  language,
  enabled,
  isCasting,
  contentId,
  splitMode = false,
  splitLanguages = null,
  splitCues,
  isHLS = false,
}: UseNativeTextTracksOptions) {
  const trackElementRef = useRef<HTMLTrackElement | null>(null)
  const [backendHost, setBackendHost] = useState<string | null>(null)

  // Fetch backend host on mount
  useEffect(() => {
    getBackendHost().then(setBackendHost)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !backendHost) return

    // CRITICAL: Skip native text tracks for HLS content
    // HLS streams with embedded subtitles (EXT-X-MEDIA) handle subtitles natively
    // Adding <track> elements causes conflicts and playback failures
    if (isHLS) {
      if (trackElementRef.current && trackElementRef.current.parentElement) {
        video.removeChild(trackElementRef.current)
        trackElementRef.current = null
        log.info('Removed native text track (HLS stream uses embedded subtitles)')
      }
      return
    }

    // Determine which track to use: split mode primary or regular track
    const effectiveCues = splitMode && splitCues ? splitCues.primary : cues
    const effectiveLanguage = splitMode && splitLanguages ? splitLanguages[0] : language

    // If subtitles disabled or no cues or no contentId, remove track completely
    if (!enabled || !effectiveLanguage || effectiveCues.length === 0 || !contentId) {
      if (trackElementRef.current && trackElementRef.current.parentElement) {
        video.removeChild(trackElementRef.current)
        trackElementRef.current = null
        log.info('Removed native text track (disabled, no cues, or no contentId)')
      }

      return
    }

    // Create VTT URL from backend API endpoint (must be absolute for AirPlay/Chromecast)
    // Apple TV needs to fetch the VTT from the backend server, so we use the actual network IP
    const protocol = window.location.protocol
    const vttURL = `${protocol}//${backendHost}/api/v1/subtitles/vtt/${contentId}?language=${effectiveLanguage}`

    // Remove existing track if any
    if (trackElementRef.current && trackElementRef.current.parentElement) {
      video.removeChild(trackElementRef.current)
    }

    // Create new track element
    const track = document.createElement('track')
    // Use 'captions' instead of 'subtitles' for better Apple TV compatibility
    track.kind = 'captions'
    track.label = getLanguageInfo(effectiveLanguage)?.name || effectiveLanguage
    track.srclang = effectiveLanguage
    track.src = vttURL
    track.default = true

    // Add track to video (always present when subtitles enabled)
    video.appendChild(track)
    trackElementRef.current = track

    log.info('Added native text track', {
      language: effectiveLanguage,
      cueCount: effectiveCues.length,
      isCasting,
      splitMode,
      vttURL,
    })

    // Enable the text track once it's loaded
    const handleTrackLoad = () => {
      // Find the corresponding TextTrack object
      const textTracks = video.textTracks
      for (let i = 0; i < textTracks.length; i++) {
        const textTrack = textTracks[i]
        if (textTrack.language === effectiveLanguage) {
          // When casting, show native track; when not casting, disable it (HTML overlay handles it)
          textTrack.mode = isCasting ? 'showing' : 'disabled'
          log.info('Native text track loaded and mode set', {
            language: effectiveLanguage,
            mode: textTrack.mode,
            isCasting,
            splitMode,
            cueCount: textTrack.cues?.length || 0,
          })
          break
        }
      }
    }

    const handleTrackError = (error: Event) => {
      log.error('Native text track failed to load', {
        language: effectiveLanguage,
        error,
        src: track.src.substring(0, 50) + '...',
      })
    }

    track.addEventListener('load', handleTrackLoad)
    track.addEventListener('error', handleTrackError)

    // Cleanup function
    return () => {
      track.removeEventListener('load', handleTrackLoad)
      track.removeEventListener('error', handleTrackError)

      if (trackElementRef.current && trackElementRef.current.parentElement) {
        video.removeChild(trackElementRef.current)
        trackElementRef.current = null
      }
    }
  }, [videoRef, cues, language, enabled, isCasting, contentId, splitMode, splitLanguages, splitCues, backendHost, isHLS])

  // Separate effect to update track mode when casting state changes
  useEffect(() => {
    const video = videoRef.current
    const effectiveLanguage = splitMode && splitLanguages ? splitLanguages[0] : language

    if (!video || !effectiveLanguage || !backendHost) return

    // Skip for HLS content (uses embedded subtitles)
    if (isHLS) return

    const textTracks = video.textTracks
    for (let i = 0; i < textTracks.length; i++) {
      const textTrack = textTracks[i]
      if (textTrack.language === effectiveLanguage) {
        const newMode = isCasting ? 'showing' : 'disabled'
        if (textTrack.mode !== newMode) {
          textTrack.mode = newMode
          log.info('Updated native text track mode', {
            language: effectiveLanguage,
            mode: newMode,
            isCasting,
            splitMode,
          })
        }
        break
      }
    }
  }, [isCasting, language, videoRef, splitMode, splitLanguages, backendHost, isHLS])
}
