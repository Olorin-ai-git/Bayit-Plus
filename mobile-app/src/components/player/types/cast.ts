/**
 * Cast Type Definitions (Mobile)
 * TypeScript interfaces for AirPlay and Chromecast functionality
 */

export type CastType = 'airplay' | 'chromecast'
export type CastState = 'not_available' | 'available' | 'connecting' | 'connected'

export interface CastMetadata {
  title: string
  posterUrl?: string
  contentId: string
  streamUrl: string
  duration?: number
  subtitleTracks?: Array<{ language: string; url: string }>
}

export interface PlaybackState {
  currentTime: number
  isPlaying: boolean
  volume: number
}

export interface CastSession {
  isAvailable: boolean
  isConnecting: boolean
  isConnected: boolean
  deviceName: string | null
  castType: CastType | null
  startCast: () => void
  stopCast: () => void
  updateMetadata: (metadata: CastMetadata) => void
  syncPlaybackState: (state: PlaybackState) => void
}
