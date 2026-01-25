/**
 * Live Dubbing Service - Cross-Platform
 * Handles WebSocket communication and state management for live dubbing.
 * Audio playback is delegated to platform-specific implementations.
 */

import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from './api'
import { logger } from '../utils/logger'

// Scoped logger for live dubbing with voice-specific context
const dubbingLogger = logger.scope('LiveDubbing')

// API configuration from environment - no fallback allowed per coding standards
const getApiBaseUrl = (): string => {
  // Platform-specific API URL resolution
  if (Platform.OS === 'web') {
    const webUrl = (window as any).__BAYIT_API_URL__
    if (!webUrl) {
      dubbingLogger.error('__BAYIT_API_URL__ global variable is required', {
        platform: 'web',
        severity: 'critical',
      })
    }
    return webUrl || ''
  }
  // For native platforms, use the configured API URL
  const nativeUrl = (global as any).__BAYIT_API_URL__
  if (!nativeUrl) {
    dubbingLogger.error('__BAYIT_API_URL__ global variable is required', {
      platform: Platform.OS,
      severity: 'critical',
    })
  }
  return nativeUrl || ''
}

export interface DubbedAudioMessage {
  type: 'dubbed_audio'
  data: string // Base64-encoded audio
  original_text: string
  translated_text: string
  sequence: number
  timestamp_ms: number
  latency_ms: number
}

export interface LatencyReport {
  type: 'latency_report'
  avg_stt_ms: number
  avg_translation_ms: number
  avg_tts_ms: number
  avg_total_ms: number
  segments_processed: number
}

export interface DubbingConnectionInfo {
  type: 'connected'
  session_id: string
  source_lang: string
  target_lang: string
  voice_id: string
  sync_delay_ms: number
}

export interface DubbingAvailability {
  available: boolean
  source_language?: string
  supported_target_languages?: string[]
  default_voice_id?: string
  default_sync_delay_ms?: number
  available_voices?: DubbingVoice[]
  error?: string
}

export interface DubbingVoice {
  id: string
  name: string
  language: string
  description?: string
}

export type DubbedAudioCallback = (message: DubbedAudioMessage) => void
export type LatencyCallback = (report: LatencyReport) => void
export type ConnectionCallback = (info: DubbingConnectionInfo) => void
export type ErrorCallback = (error: string, recoverable: boolean) => void

// Abstract audio player interface for platform-specific implementations
export interface IAudioPlayer {
  playAudio(base64Audio: string): Promise<void>
  setOriginalVolume(volume: number): void
  setDubbedVolume(volume: number): void
  cleanup(): void
}

const AUTH_STORAGE_KEY = 'bayit-auth'

class LiveDubbingService {
  private ws: WebSocket | null = null
  private isConnected = false
  private syncDelayMs = 600
  private audioPlayer: IAudioPlayer | null = null

  // Callbacks
  private onDubbedAudio: DubbedAudioCallback | null = null
  private onLatency: LatencyCallback | null = null
  private onConnected: ConnectionCallback | null = null
  private onError: ErrorCallback | null = null

  /**
   * Set the platform-specific audio player implementation.
   */
  setAudioPlayer(player: IAudioPlayer): void {
    this.audioPlayer = player
  }

  /**
   * Connect to live dubbing WebSocket.
   */
  async connect(
    channelId: string,
    targetLang: string,
    onDubbedAudio: DubbedAudioCallback,
    onLatency: LatencyCallback,
    onConnected: ConnectionCallback,
    onError: ErrorCallback,
    voiceId?: string,
    platform?: string
  ): Promise<void> {
    try {
      const authDataStr = await AsyncStorage.getItem(AUTH_STORAGE_KEY)
      const authData = authDataStr ? JSON.parse(authDataStr) : {}
      const token = authData?.state?.token
      if (!token) throw new Error('Not authenticated')

      this.onDubbedAudio = onDubbedAudio
      this.onLatency = onLatency
      this.onConnected = onConnected
      this.onError = onError

      const apiBase = getApiBaseUrl()
      const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:'
      const wsHost = apiBase.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '')
      const platformParam = platform || Platform.OS

      let wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/live/${channelId}/dubbing?token=${token}&target_lang=${targetLang}&platform=${platformParam}`
      if (voiceId) {
        wsUrl += `&voice_id=${voiceId}`
      }

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        dubbingLogger.info('WebSocket connected', {
          channelId,
          targetLang,
          voiceId,
          platform: platformParam,
          wsProtocol,
        })
        this.isConnected = true
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          // VOICE-SPECIFIC: Async logging in real-time message path
          // Prevents blocking audio processing
          queueMicrotask(() => {
            dubbingLogger.debug('Message received', {
              type: msg.type,
              timestamp: Date.now(),
              sequence: msg.sequence,
            })
          })

          if (msg.type === 'connected') {
            this.syncDelayMs = msg.sync_delay_ms || 600
            this.onConnected?.(msg as DubbingConnectionInfo)
          } else if (msg.type === 'dubbed_audio') {
            this.handleDubbedAudio(msg.data as DubbedAudioMessage)
          } else if (msg.type === 'latency_report') {
            this.onLatency?.(msg as LatencyReport)
          } else if (msg.type === 'error') {
            this.onError?.(msg.error || msg.message, msg.recoverable ?? true)
          }
        } catch (error) {
          // Sync error logging (non-real-time path)
          dubbingLogger.error('WebSocket parse error', error)
        }
      }

      this.ws.onerror = (error) => {
        dubbingLogger.error('WebSocket error', {
          error,
          channelId,
          isConnected: this.isConnected,
        })
        this.onError?.('Connection error', true)
        this.isConnected = false
      }

      this.ws.onclose = (event) => {
        dubbingLogger.info('WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          channelId,
        })
        this.isConnected = false
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Connection failed', false)
    }
  }

  /**
   * Handle incoming dubbed audio message.
   * CRITICAL: Real-time audio path - latency must be <200ms
   */
  private async handleDubbedAudio(message: DubbedAudioMessage): Promise<void> {
    const startTime = Date.now()

    // Play through platform-specific audio player (IMMEDIATE)
    if (this.audioPlayer && message.data) {
      try {
        await this.audioPlayer.playAudio(message.data)

        // VOICE-SPECIFIC: Async logging for real-time audio path
        // Prevents blocking audio playback
        queueMicrotask(() => {
          const processingTime = Date.now() - startTime
          dubbingLogger.debug('Dubbed audio played', {
            sequence: message.sequence,
            latency_ms: message.latency_ms,
            processing_time_ms: processingTime,
            original_text: message.original_text.substring(0, 50),
            translated_text: message.translated_text.substring(0, 50),
            timestamp: message.timestamp_ms,
            audioSize: message.data.length,
          })
        })
      } catch (error) {
        // Error logging can be sync (non-critical path)
        dubbingLogger.error('Error playing audio', {
          error,
          sequence: message.sequence,
          latency_ms: message.latency_ms,
        })
      }
    }

    // Notify callback (IMMEDIATE)
    this.onDubbedAudio?.(message)
  }

  /**
   * Send audio chunk to server for processing.
   */
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData)
    }
  }

  /**
   * Set original audio volume (0-1).
   */
  setOriginalVolume(volume: number): void {
    this.audioPlayer?.setOriginalVolume(Math.max(0, Math.min(1, volume)))
  }

  /**
   * Set dubbed audio volume (0-1).
   */
  setDubbedVolume(volume: number): void {
    this.audioPlayer?.setDubbedVolume(Math.max(0, Math.min(1, volume)))
  }

  /**
   * Get the sync delay in milliseconds.
   */
  getSyncDelayMs(): number {
    return this.syncDelayMs
  }

  /**
   * Disconnect and cleanup.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.audioPlayer?.cleanup()
    this.isConnected = false
    this.onDubbedAudio = null
    this.onLatency = null
    this.onConnected = null
    this.onError = null

    dubbingLogger.info('Disconnected', {
      timestamp: Date.now(),
    })
  }

  /**
   * Check if service is connected.
   */
  isServiceConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Check dubbing availability for a channel.
   */
  static async checkAvailability(channelId: string): Promise<DubbingAvailability> {
    try {
      const response = await api.get<DubbingAvailability>(
        `/live/${channelId}/dubbing/availability`
      )
      return response.data
    } catch (error) {
      dubbingLogger.error('Error checking dubbing availability', {
        error,
        channelId,
      })
      return { available: false, error: 'Check failed' }
    }
  }

  /**
   * Get available dubbing voices.
   */
  static async getVoices(): Promise<DubbingVoice[]> {
    try {
      const response = await api.get<DubbingVoice[]>('/live/dubbing/voices')
      return response.data
    } catch (error) {
      dubbingLogger.error('Error fetching dubbing voices', error)
      return []
    }
  }
}

export const liveDubbingService = new LiveDubbingService()
export { LiveDubbingService }
export default liveDubbingService
