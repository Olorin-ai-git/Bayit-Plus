/**
 * Live Subtitle Service
 * Captures audio from video element and streams to WebSocket for real-time translation
 */

import logger from '@/utils/logger'
import i18n from 'i18next'
import { liveSubtitleConfig } from '@/config/liveSubtitleConfig'
import {
  VideoBufferManager,
  createSyncedStream,
  type VideoBufferConfig,
  type SyncedStreamResponse,
} from './VideoBufferManager'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export interface LiveSubtitleCue {
  text: string
  original_text: string
  timestamp: number
  source_lang: string
  target_lang: string
  confidence: number
}

type SubtitleCallback = (cue: LiveSubtitleCue) => void
type ErrorCallback = (error: string) => void

class LiveSubtitleService {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private isConnected: boolean = false
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private lastMessageTime: number = Date.now()

  // Video buffering for perfect sync
  private videoBufferManager: VideoBufferManager | null = null
  private syncedStreamInfo: SyncedStreamResponse | null = null
  private firstAudioChunkSent = false
  private firstSubtitleReceived = false

  /**
   * Connect to live subtitle WebSocket and start audio capture.
   */
  async connect(
    channelId: string,
    targetLang: string,
    videoElement: HTMLVideoElement,
    onSubtitle: SubtitleCallback,
    onError: ErrorCallback,
    sourceLang: string = 'he',
    hebrewMode: 'regular' | 'nikud' | 'shoresh' = 'regular'
  ): Promise<void> {
    // Clean up any existing connection first
    if (this.ws) {
      logger.debug('Cleaning up existing WebSocket before new connection', 'liveSubtitleService')
      this.disconnect()
    }

    this.firstAudioChunkSent = false
    this.firstSubtitleReceived = false

    // Request synced stream from backend (server-side or client-side buffering)
    try {
      logger.info(
        `Requesting synced stream for channel ${channelId} (${sourceLang} → ${targetLang})`,
        'liveSubtitleService'
      )
      this.syncedStreamInfo = await createSyncedStream({
        channelId,
        sourceLang,
        targetLang,
        enableDubbing: false, // Subtitles only
        enableSubtitles: true,
      })

      logger.info(
        `Synced stream created: mode=${this.syncedStreamInfo.mode}, delay=${this.syncedStreamInfo.video_delay_ms}ms`,
        'liveSubtitleService'
      )

      // If client-side buffering is needed, initialize VideoBufferManager
      if (this.syncedStreamInfo.mode === 'client-side') {
        const bufferConfig: VideoBufferConfig = {
          channelId,
          sourceLang,
          targetLang,
          enableDubbing: false,
          enableSubtitles: true,
          videoElement,
        }
        this.videoBufferManager = new VideoBufferManager(bufferConfig)
        logger.info('Client-side video buffering initialized', 'liveSubtitleService')
      } else {
        logger.info('Server-side video buffering active', 'liveSubtitleService')
      }
    } catch (error) {
      logger.warn(
        `Failed to create synced stream: ${error instanceof Error ? error.message : 'Unknown error'}. Continuing without video sync.`,
        'liveSubtitleService'
      )
      // Continue without video buffering - not critical for subtitles to work
    }

    return new Promise((resolve, reject) => {
      try {
        const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
        const token = authData?.state?.token
        if (!token) {
          reject(new Error('Not authenticated'))
          return
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        // Handle both absolute URLs (https://api.example.com/api/v1) and relative paths (/api/v1)
        const isRelativePath = API_BASE_URL.startsWith('/')
        const wsHost = isRelativePath
          ? window.location.host
          : API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '')
        const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/live/${channelId}/subtitles?source_lang=${sourceLang}&target_lang=${targetLang}&hebrew_mode=${hebrewMode}`

        this.ws = new WebSocket(wsUrl)

        // Timeout if connection takes too long
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.error('Connection timeout', 'liveSubtitleService')
            this.disconnect()
            reject(new Error('Connection timeout'))
          }
        }, liveSubtitleConfig.connectionTimeoutMs)

        this.ws.onopen = () => {
          logger.debug('WebSocket connected, sending authentication', 'liveSubtitleService')
          // Send authentication message (SECURITY: token via message, not URL)
          // Defensive check - ensure WebSocket is truly open before sending
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'authenticate', token }))
          } else {
            logger.error('WebSocket not in OPEN state during onopen', 'liveSubtitleService', {
              readyState: this.ws?.readyState
            })
          }
        }

        this.ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data)
            this.lastMessageTime = Date.now()
            logger.debug('Message received', 'liveSubtitleService', { type: msg.type, msg })

            // Handle heartbeat ping - respond with pong
            if (msg.type === 'ping') {
              try {
                this.ws?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
                logger.debug('Responded to heartbeat ping', 'liveSubtitleService')
              } catch (err) {
                logger.warn('Failed to send pong response', 'liveSubtitleService', err)
              }
              return
            }

            if (msg.type === 'connected') {
              logger.info(
                `Live subtitles connected - ${msg.source_lang} → ${msg.target_lang} ` +
                `(STT: ${msg.stt_provider}, Translation: ${msg.translation_provider})`,
                'liveSubtitleService'
              )
              this.isConnected = true
              this.lastMessageTime = Date.now()
              clearTimeout(connectionTimeout)

              // Start connection health monitoring
              this.heartbeatInterval = setInterval(() => {
                const timeSinceLastMessage = Date.now() - this.lastMessageTime
                // Check if connection is stale (no messages received)
                if (timeSinceLastMessage > liveSubtitleConfig.staleConnectionTimeoutMs) {
                  logger.warn(
                    `No messages received for ${Math.floor(timeSinceLastMessage / 1000)}s - connection may be stale`,
                    'liveSubtitleService'
                  )
                  // Close and trigger reconnection
                  this.disconnect()
                  onError('Connection timeout - no activity detected')
                }
              }, liveSubtitleConfig.heartbeatCheckIntervalMs)

              try {
                await this.startAudioCapture(videoElement)
                resolve()
              } catch (audioCaptureError) {
                const errorMsg = audioCaptureError instanceof Error
                  ? audioCaptureError.message
                  : 'Audio capture failed'
                logger.error('Audio capture failed after authentication', 'liveSubtitleService', { error: errorMsg })
                onError(errorMsg)
                this.disconnect()
                reject(audioCaptureError)
              }
            } else if (msg.type === 'subtitle' || msg.type === 'final_subtitle' || msg.type === 'partial_subtitle') {
              logger.debug('Subtitle received', 'liveSubtitleService', { type: msg.type, text: msg.data.text, data: msg.data })

              // Complete latency measurement on first subtitle (for client-side buffering)
              if (!this.firstSubtitleReceived && this.videoBufferManager) {
                this.videoBufferManager.completeMeasurement('subtitle')
                this.firstSubtitleReceived = true
                logger.debug('Completed latency measurement (first subtitle)', 'liveSubtitleService')
              }

              // Skip partial subtitles (untranslated) - only show final translated subtitles
              // Partial subtitles show original Hebrew before translation completes
              if (msg.type === 'partial_subtitle' || msg.data?.is_partial === true) {
                logger.debug('Skipping partial subtitle (awaiting translation)', 'liveSubtitleService')
                return
              }

              logger.debug('Calling onSubtitle callback', 'liveSubtitleService', msg.data)
              onSubtitle(msg.data)
              logger.debug('onSubtitle callback completed', 'liveSubtitleService')
            } else if (msg.type === 'quota_exceeded') {
              logger.error('Quota exceeded', 'liveSubtitleService', msg.message)
              clearTimeout(connectionTimeout)
              onError(`Usage limit reached: ${msg.message}`)
              this.disconnect()
              reject(new Error(msg.message))
            } else if (msg.type === 'error') {
              const errorType = msg.error_type || 'UnknownError'
              const isRecoverable = msg.recoverable !== false // Default to true if not specified
              logger.error(
                `Server error [${errorType}${isRecoverable ? ', recoverable' : ''}]: ${msg.message}`,
                'liveSubtitleService'
              )
              clearTimeout(connectionTimeout)

              // For recoverable errors, notify but don't reject immediately
              if (isRecoverable) {
                onError(`${msg.message} (attempting to recover...)`)
                // Don't disconnect or reject - let the connection try to recover
              } else {
                onError(msg.message)
                this.disconnect()
                reject(new Error(msg.message))
              }
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unexpected error'
            logger.error('WebSocket message handling error', 'liveSubtitleService', error)
            onError(errorMsg)
          }
        }

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', 'liveSubtitleService', error)
          clearTimeout(connectionTimeout)
          onError(i18n.t('errors.connection.error'))
          this.isConnected = false
          reject(new Error(i18n.t('errors.connection.error')))
        }

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout)
          this.isConnected = false
          this.stopAudioCapture()
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Connection failed'
        onError(errorMsg)
        reject(error)
      }
    })
  }

  /**
   * Capture audio DIRECTLY from video element (not microphone).
   * Uses captureStream() to get the video's internal audio track.
   */
  private async startAudioCapture(videoElement: HTMLVideoElement): Promise<void> {
    try {
      // Use configured sample rate (default: 16kHz for ElevenLabs Scribe)
      this.audioContext = new AudioContext({ sampleRate: liveSubtitleConfig.sampleRate })
      logger.debug(`AudioContext created with sampleRate: ${liveSubtitleConfig.sampleRate}Hz`, 'liveSubtitleService')

      // IMPORTANT: captureStream() gets audio DIRECTLY from video element
      // This does NOT use the microphone - it captures the video's audio track
      const captureMethod = (videoElement as any).captureStream || (videoElement as any).mozCaptureStream
      if (!captureMethod) {
        throw new Error('captureStream() not supported - cannot capture video audio directly')
      }

      const stream = captureMethod.call(videoElement)
      if (!stream) {
        throw new Error('captureStream() returned null - video may have CORS restrictions')
      }

      // Verify we have audio tracks from the video
      const audioTracks = stream.getAudioTracks()
      logger.debug(`Video stream captured with ${audioTracks.length} audio track(s)`, 'liveSubtitleService')

      if (audioTracks.length === 0) {
        logger.error('No audio tracks in video stream', 'liveSubtitleService', {
          message: 'This usually means: 1. The video has no audio, OR 2. CORS is blocking audio capture (cross-origin video) 3. The video element is muted'
        })
        throw new Error('No audio tracks available from video element')
      }

      // Log audio track details for debugging
      audioTracks.forEach((track, i) => {
        logger.debug(`Track ${i}: ${track.label || 'unnamed'}, enabled=${track.enabled}, muted=${track.muted}`, 'liveSubtitleService')
      })

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)

      // Use smaller buffer (2048) for lower latency (~128ms vs ~256ms)
      // 2048 samples at 16kHz = 128ms per chunk
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1)
      logger.debug('Audio processor created (buffer size: 2048, ~128ms latency)', 'liveSubtitleService')

      let chunkCount = 0
      let silentChunks = 0

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          if (chunkCount % 100 === 0) {
            logger.warn('WebSocket not ready, skipping audio chunk', 'liveSubtitleService')
          }
          return
        }

        // Start latency measurement on first audio chunk (for client-side buffering)
        if (!this.firstAudioChunkSent && this.videoBufferManager) {
          this.videoBufferManager.startMeasurement()
          this.firstAudioChunkSent = true
          logger.debug('Started latency measurement (first audio chunk)', 'liveSubtitleService')
        }

        const inputData = e.inputBuffer.getChannelData(0)

        // Check if audio is silent (all zeros = likely CORS blocked or muted)
        let maxAmplitude = 0
        for (let i = 0; i < inputData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(inputData[i]))
        }

        if (maxAmplitude < 0.001) {
          silentChunks++
          // Warn if we're getting only silence
          if (silentChunks === 100) {
            logger.warn('100 consecutive silent chunks detected - Audio may be blocked by CORS or video is muted', 'liveSubtitleService')
          }
        } else {
          silentChunks = 0
        }

        // Convert float32 to int16 PCM
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        this.ws.send(int16Data.buffer)
        chunkCount++

        // Log every 100 chunks with audio level info
        if (chunkCount % 100 === 0) {
          const dbLevel = maxAmplitude > 0 ? 20 * Math.log10(maxAmplitude) : -100
          logger.debug(`Sent ${chunkCount} chunks, level: ${dbLevel.toFixed(1)}dB`, 'liveSubtitleService')
        }
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      logger.debug('Audio capture started - capturing DIRECTLY from video (not microphone)', 'liveSubtitleService')
    } catch (error) {
      logger.error('Audio capture error', 'liveSubtitleService', error)
      throw error
    }
  }

  /**
   * Stop audio capture and close connection.
   */
  disconnect(): void {
    this.stopAudioCapture()

    // Clear heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Clean up video buffer manager
    if (this.videoBufferManager) {
      this.videoBufferManager.reset()
      this.videoBufferManager = null
    }

    this.syncedStreamInfo = null
    this.firstAudioChunkSent = false
    this.firstSubtitleReceived = false
    this.isConnected = false
  }

  /**
   * Stop audio processing.
   */
  private stopAudioCapture(): void {
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect()
      this.mediaStreamSource = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }

  /**
   * Check if service is currently connected.
   */
  isServiceConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Get synced stream information (video buffering mode and delay).
   */
  getSyncedStreamInfo(): SyncedStreamResponse | null {
    return this.syncedStreamInfo
  }

  /**
   * Get video buffer manager (for client-side buffering).
   */
  getVideoBufferManager(): VideoBufferManager | null {
    return this.videoBufferManager
  }

  /**
   * Check if video delay is active.
   */
  isVideoDelayActive(): boolean {
    return this.videoBufferManager?.isDelayActive() ?? false
  }

  /**
   * Get applied video delay in milliseconds.
   */
  getAppliedVideoDelay(): number {
    return this.videoBufferManager?.getAppliedDelay() ?? this.syncedStreamInfo?.video_delay_ms ?? 0
  }

  /**
   * Check if live subtitles are available for a channel.
   */
  static async checkAvailability(channelId: string): Promise<{
    available: boolean
    source_language?: string
    supported_target_languages?: string[]
    error?: string
  }> {
    try {
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token
      const response = await fetch(
        `${API_BASE_URL}/live/${channelId}/subtitles/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error checking subtitle availability', 'liveSubtitleService', error)
      return { available: false, error: 'Check failed' }
    }
  }
}

export default new LiveSubtitleService()
