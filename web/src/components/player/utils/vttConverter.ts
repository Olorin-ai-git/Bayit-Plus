/**
 * VTT Converter Utility
 * Converts subtitle cues to WebVTT format for native HTML5 <track> elements
 */

import { SubtitleCue } from '@/types/subtitle'

/**
 * Formats time in seconds to VTT timestamp format (HH:MM:SS.mmm)
 */
function formatVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds
    .toString()
    .padStart(3, '0')}`
}

/**
 * Converts an array of SubtitleCue to WebVTT format string
 */
export function convertCuesToVTT(cues: SubtitleCue[], language: string = 'en'): string {
  if (!cues || cues.length === 0) {
    console.warn('[VTTConverter] No cues provided, returning empty VTT')
    return 'WEBVTT\n\n'
  }

  let vtt = 'WEBVTT\n\n'

  cues.forEach((cue, index) => {
    // Add cue identifier (optional but helpful for debugging)
    vtt += `${cue.index || index + 1}\n`

    // Add timestamp line
    const startTime = formatVTTTimestamp(cue.start_time)
    const endTime = formatVTTTimestamp(cue.end_time)
    vtt += `${startTime} --> ${endTime}`

    // Add VTT settings if available (position, alignment, etc.)
    if (cue.settings) {
      vtt += ` ${cue.settings}`
    }
    vtt += '\n'

    // Add subtitle text
    vtt += `${cue.text}\n\n`
  })

  console.log('[VTTConverter] Generated VTT content', {
    language,
    cueCount: cues.length,
    firstCue: cues[0],
    vttPreview: vtt.substring(0, 200) + '...',
  })

  return vtt
}

/**
 * Creates a Blob URL from VTT string for use in <track> src attribute
 */
export function createVTTBlobURL(vttContent: string): string {
  const blob = new Blob([vttContent], { type: 'text/vtt' })
  return URL.createObjectURL(blob)
}

/**
 * Creates a data URI from VTT string for use in <track> src attribute
 * Data URIs work better with AirPlay/Chromecast as they're embedded in the HTML
 */
export function createVTTDataURI(vttContent: string): string {
  const base64 = btoa(unescape(encodeURIComponent(vttContent)))
  return `data:text/vtt;charset=utf-8;base64,${base64}`
}

/**
 * Revokes a Blob URL to free memory
 */
export function revokeVTTBlobURL(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/**
 * Converts subtitle cues to a Blob URL ready for <track> element
 * For local playback (HTML overlays work better anyway)
 */
export function cuesToBlobURL(cues: SubtitleCue[], language: string = 'en'): string {
  const vttContent = convertCuesToVTT(cues, language)
  return createVTTBlobURL(vttContent)
}

/**
 * Converts subtitle cues to a data URI ready for <track> element
 * Better for casting as data URIs are embedded and work across devices
 */
export function cuesToDataURI(cues: SubtitleCue[], language: string = 'en'): string {
  const vttContent = convertCuesToVTT(cues, language)
  return createVTTDataURI(vttContent)
}
