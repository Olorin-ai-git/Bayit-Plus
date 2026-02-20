/**
 * voiceInteractionWSUrl
 *
 * Utility to construct the voice interaction WebSocket URL from env config.
 * Mirrors the pattern used in watchPartyStore.js.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const buildVoiceWsUrl = (sessionId: string): string => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  let base: string
  if (API_BASE_URL.startsWith('/')) {
    base = `${wsProtocol}//${window.location.host}${API_BASE_URL}`
  } else {
    base = API_BASE_URL.replace(/^https?/, wsProtocol.replace(':', ''))
  }
  return `${base}/ws/vod-interaction/${sessionId}`
}
