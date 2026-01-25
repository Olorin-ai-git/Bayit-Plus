/**
 * Type definitions for AirPlay and Chromecast casting
 */

export type CastType = 'airplay' | 'chromecast'

export type CastState = 'not_available' | 'available' | 'connecting' | 'connected'

export interface CastMetadata {
  title: string
  posterUrl?: string
  contentId: string
  streamUrl: string
  duration?: number
  subtitleTracks?: Array<{
    language: string
    url: string
  }>
}

export interface PlaybackState {
  currentTime: number
  isPlaying: boolean
  volume: number
}

export interface CastSession {
  // State
  isAvailable: boolean
  isConnecting: boolean
  isConnected: boolean
  deviceName: string | null
  castType: CastType | null

  // Controls
  startCast: () => void
  stopCast: () => void
  updateMetadata: (metadata: CastMetadata) => void
  syncPlaybackState: (state: PlaybackState) => void
}

/**
 * WebKit AirPlay API types
 * Extends HTMLVideoElement with WebKit-specific AirPlay properties
 */
export interface WebKitVideoElement extends HTMLVideoElement {
  webkitPlaybackTargetAvailabilityChanged?: boolean
  webkitCurrentPlaybackTargetIsWireless?: boolean
  webkitShowPlaybackTargetPicker?: () => void
  addEventListener(
    type: 'webkitplaybacktargetavailabilitychanged',
    listener: (event: Event) => void
  ): void
  addEventListener(
    type: 'webkitcurrentplaybacktargetiswirelesschanged',
    listener: (event: Event) => void
  ): void
}

/**
 * Google Cast SDK types
 */
export interface ChromecastGlobal {
  cast: {
    framework: {
      CastContext: {
        getInstance(): CastContext
      }
      SessionState: {
        SESSION_STARTING: string
        SESSION_STARTED: string
        SESSION_ENDING: string
        SESSION_ENDED: string
        NO_SESSION: string
      }
    }
  }
}

export interface CastContext {
  setOptions(options: { receiverApplicationId: string; autoJoinPolicy: string }): void
  requestSession(): Promise<void>
  getCurrentSession(): CastSession | null
  addEventListener(eventType: string, listener: (event: any) => void): void
  removeEventListener(eventType: string, listener: (event: any) => void): void
}

export interface ChromecastSession {
  getSessionId(): string
  loadMedia(mediaInfo: any): Promise<void>
  sendMessage(namespace: string, message: any): void
  endSession(stopCasting: boolean): void
  getMediaSession(): any
}

declare global {
  interface Window {
    chrome?: ChromecastGlobal
    __onGCastApiAvailable?: (isAvailable: boolean) => void
  }
}
