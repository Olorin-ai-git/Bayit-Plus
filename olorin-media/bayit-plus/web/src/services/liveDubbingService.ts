/**
 * Live Dubbing Service
 * Captures audio from video element, streams to WebSocket for real-time dubbing,
 * and plays back dubbed audio while mixing with original video audio.
 *
 * Uses ScriptProcessorNode for reliable audio capture (matches Live Subtitles approach).
 */

import logger from '@/utils/logger'

// API configuration from environment - no fallback allowed per coding standards
const API_BASE_URL = import.meta.env.VITE_API_URL

// Auth storage key - centralized for DRY principle
const AUTH_STORAGE_KEY = 'bayit-auth'

/**
 * Validates configuration and throws if required values are missing.
 * Called before any operation that requires the API.
 */
function validateConfiguration(): void {
  if (!API_BASE_URL) {
    throw new Error(
      '[LiveDubbing] VITE_API_URL environment variable is required. ' +
      'Live dubbing cannot function without API configuration.'
    )
  }
}

// Log warning at load time for development feedback, but don't crash
// (fail-fast happens when attempting to use the service)
if (!API_BASE_URL) {
  logger.warn('VITE_API_URL not configured - dubbing features will fail', 'liveDubbingService')
}

// Audio configuration - can be overridden via environment variables
const AUDIO_CONFIG = {
  // Audio context sample rate - MUST be 16000Hz for ElevenLabs STT (matches Live Subtitles)
  sampleRate: parseInt(import.meta.env.VITE_DUBBING_SAMPLE_RATE || '16000', 10),
  // Buffer size for ScriptProcessorNode - 2048 samples = ~128ms latency at 16kHz
  bufferSize: parseInt(import.meta.env.VITE_DUBBING_BUFFER_SIZE || '2048', 10),
  // Default sync delay for video synchronization (ms)
  defaultSyncDelayMs: parseInt(import.meta.env.VITE_DUBBING_SYNC_DELAY_MS || '600', 10),
  // Default original audio volume (0 = muted)
  defaultOriginalVolume: parseFloat(import.meta.env.VITE_DUBBING_ORIGINAL_VOLUME || '0'),
  // Default dubbed audio volume (1 = full volume)
  defaultDubbedVolume: parseFloat(import.meta.env.VITE_DUBBING_DUBBED_VOLUME || '1'),
  // Volume transition time (seconds) for smooth fades
  volumeTransitionTime: parseFloat(import.meta.env.VITE_DUBBING_VOLUME_TRANSITION || '0.1'),
  // Log interval for chunk statistics
  chunkLogInterval: parseInt(import.meta.env.VITE_DUBBING_CHUNK_LOG_INTERVAL || '100', 10),
} as const

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
  available_voices?: Array<{
    id: string
    name: string
    language: string
    description?: string
  }>
  error?: string
}

type DubbedAudioCallback = (message: DubbedAudioMessage) => void
type LatencyCallback = (report: LatencyReport) => void
type ConnectionCallback = (info: DubbingConnectionInfo) => void
type ErrorCallback = (error: string, recoverable: boolean) => void

class LiveDubbingService {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private isConnected = false
  private syncDelayMs = AUDIO_CONFIG.defaultSyncDelayMs
  private chunkCount = 0

  // Audio mixing
  private originalGain: GainNode | null = null
  private dubbedGain: GainNode | null = null
  private originalVolume = AUDIO_CONFIG.defaultOriginalVolume
  private dubbedVolume = AUDIO_CONFIG.defaultDubbedVolume

  /**
   * Connect to live dubbing WebSocket and start audio capture.
   */
  async connect(
    channelId: string,
    targetLang: string,
    videoElement: HTMLVideoElement,
    onDubbedAudio: DubbedAudioCallback,
    onLatency: LatencyCallback,
    onConnected: ConnectionCallback,
    onError: ErrorCallback,
    voiceId?: string,
    platform = 'web'
  ): Promise<void> {
    // Fail-fast: validate configuration before attempting to connect
    try {
      validateConfiguration()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Configuration error', false)
      return
    }

    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      if (!token) throw new Error('Not authenticated')

      // SECURITY: Do NOT pass JWT token in URL query parameters (visible in logs, history, referer headers)
      // Token is sent securely via first message after WebSocket connection is established
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '')
      let wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/live/${channelId}/dubbing?target_lang=${targetLang}&platform=${platform}`
      if (voiceId) {
        wsUrl += `&voice_id=${voiceId}`
      }

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = async () => {
        logger.debug('WebSocket connected, authenticating...', 'liveDubbingService')

        // Send authentication message first (secure - not in URL)
        this.ws?.send(JSON.stringify({
          type: 'authenticate',
          token: token,
        }))

        this.isConnected = true
        await this.setupAudioPipeline(videoElement, onError)
      }

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          logger.debug('Message received', 'liveDubbingService', { type: msg.type })

          if (msg.type === 'connected') {
            this.syncDelayMs = msg.sync_delay_ms || AUDIO_CONFIG.defaultSyncDelayMs
            logger.debug(
              `Connected - Session: ${msg.session_id}, Source: ${msg.source_lang}, Target: ${msg.target_lang}, Sync delay: ${this.syncDelayMs}ms`,
              'liveDubbingService'
            )
            onConnected(msg as DubbingConnectionInfo)
          } else if (msg.type === 'dubbed_audio') {
            const audioMsg = msg.data as DubbedAudioMessage
            logger.debug(`Dubbed audio #${audioMsg?.sequence}: "${audioMsg?.translated_text?.substring(0, 30)}..."`, 'liveDubbingService')
            await this.playDubbedAudio(audioMsg?.data)
            onDubbedAudio(audioMsg)
          } else if (msg.type === 'latency_report') {
            logger.debug(`Latency: ${msg.avg_total_ms}ms (STT: ${msg.avg_stt_ms}ms, Trans: ${msg.avg_translation_ms}ms, TTS: ${msg.avg_tts_ms}ms)`, 'liveDubbingService')
            onLatency(msg as LatencyReport)
          } else if (msg.type === 'error') {
            logger.error('Server error', 'liveDubbingService', msg.error || msg.message)
            onError(msg.error || msg.message, msg.recoverable ?? true)
          }
        } catch (error) {
          logger.error('WebSocket parse error', 'liveDubbingService', error)
        }
      }

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', 'liveDubbingService', error)
        onError('Connection error', true)
        this.isConnected = false
      }

      this.ws.onclose = (event) => {
        logger.debug(`WebSocket closed: ${event.code} - ${event.reason}`, 'liveDubbingService')
        this.isConnected = false
        this.stopAudioCapture()
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Connection failed', false)
    }
  }

  /**
   * Set up audio pipeline using ScriptProcessorNode for reliable capture.
   * Uses 16kHz sample rate to match ElevenLabs STT requirements (same as Live Subtitles).
   */
  private async setupAudioPipeline(videoElement: HTMLVideoElement, onError: ErrorCallback): Promise<void> {
    try {
      // Create AudioContext at 16kHz for direct STT compatibility (no downsampling needed)
      this.audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate })
      logger.debug(`AudioContext created at ${AUDIO_CONFIG.sampleRate}Hz`, 'liveDubbingService')

      // Validate AudioContext was created successfully
      if (!this.audioContext) {
        throw new Error('Failed to create AudioContext')
      }

      // Create gain nodes for volume control
      this.originalGain = this.audioContext.createGain()
      this.dubbedGain = this.audioContext.createGain()

      // Set initial volumes
      this.originalGain.gain.value = this.originalVolume
      this.dubbedGain.gain.value = this.dubbedVolume

      // Connect gain nodes to destination
      this.originalGain.connect(this.audioContext.destination)
      this.dubbedGain.connect(this.audioContext.destination)

      // Capture video audio stream
      const captureMethod = (videoElement as any).captureStream || (videoElement as any).mozCaptureStream
      if (!captureMethod) {
        throw new Error('captureStream() not supported')
      }

      const stream = captureMethod.call(videoElement)
      if (!stream) {
        throw new Error('captureStream() returned null - video may have CORS restrictions')
      }

      const audioTracks = stream.getAudioTracks()
      logger.debug(`Video stream captured with ${audioTracks.length} audio track(s)`, 'liveDubbingService')

      if (audioTracks.length === 0) {
        logger.error('No audio tracks in video stream', 'liveDubbingService', {
          message: 'This usually means: 1. The video has no audio, OR 2. CORS is blocking audio capture (cross-origin video) 3. The video element is muted'
        })
        throw new Error('No audio tracks available from video element')
      }

      // Log audio track details for debugging
      audioTracks.forEach((track, i) => {
        logger.debug(`Track ${i}: ${track.label || 'unnamed'}, enabled=${track.enabled}, muted=${track.muted}`, 'liveDubbingService')
      })

      // Create ScriptProcessorNode for audio capture
      // Buffer size 2048 samples at 16kHz = ~128ms latency (matches Live Subtitles)
      this.processor = this.audioContext.createScriptProcessor(AUDIO_CONFIG.bufferSize, 1, 1)
      logger.debug(`Audio processor created (buffer size: ${AUDIO_CONFIG.bufferSize}, ~${(AUDIO_CONFIG.bufferSize / AUDIO_CONFIG.sampleRate * 1000).toFixed(0)}ms latency)`, 'liveDubbingService')

      let silentChunks = 0

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          if (this.chunkCount % 100 === 0) {
            logger.warn('WebSocket not ready, skipping audio chunk', 'liveDubbingService')
          }
          return
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
            logger.warn('100 consecutive silent chunks detected - Audio may be blocked by CORS or video is muted', 'liveDubbingService')
          }
        } else {
          silentChunks = 0
        }

        // Convert float32 to int16 PCM (same as Live Subtitles)
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        this.ws.send(int16Data.buffer)
        this.chunkCount++

        // Log every 100 chunks with audio level info
        if (this.chunkCount % AUDIO_CONFIG.chunkLogInterval === 0) {
          const dbLevel = maxAmplitude > 0 ? 20 * Math.log10(maxAmplitude) : -100
          logger.debug(`Sent ${this.chunkCount} chunks, level: ${dbLevel.toFixed(1)}dB`, 'liveDubbingService')
        }
      }

      // Create ONE MediaStreamSource from video stream (cannot create multiple sources from same stream!)
      // Connect it to BOTH the processor (for capture) AND the original gain (for passthrough audio)
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)
      this.mediaStreamSource.connect(this.processor)
      this.mediaStreamSource.connect(this.originalGain)
      this.processor.connect(this.audioContext.destination)

      logger.debug('Audio capture pipeline ready - capturing DIRECTLY from video (not microphone)', 'liveDubbingService')
    } catch (error) {
      logger.error('Audio pipeline setup error', 'liveDubbingService', error)
      onError(error instanceof Error ? error.message : 'Audio setup failed', false)
      throw error
    }
  }


  /**
   * Play dubbed audio through the dubbed gain node.
   */
  private async playDubbedAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext || !this.dubbedGain) {
      logger.warn('Audio context not ready', 'liveDubbingService')
      return
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer)

      // Create buffer source and play through dubbed gain
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.dubbedGain)
      source.start()

      logger.debug(`Playing dubbed audio (${audioBuffer.duration.toFixed(2)}s)`, 'liveDubbingService')
    } catch (error) {
      logger.error('Error playing dubbed audio', 'liveDubbingService', error)
    }
  }

  /**
   * Set the volume for original video audio (0-1).
   */
  setOriginalVolume(volume: number): void {
    this.originalVolume = Math.max(0, Math.min(1, volume))
    if (this.originalGain && this.audioContext) {
      this.originalGain.gain.setTargetAtTime(
        this.originalVolume,
        this.audioContext.currentTime,
        AUDIO_CONFIG.volumeTransitionTime
      )
    }
    logger.debug(`Original volume: ${(this.originalVolume * 100).toFixed(0)}%`, 'liveDubbingService')
  }

  /**
   * Set the volume for dubbed audio (0-1).
   */
  setDubbedVolume(volume: number): void {
    this.dubbedVolume = Math.max(0, Math.min(1, volume))
    if (this.dubbedGain && this.audioContext) {
      this.dubbedGain.gain.setTargetAtTime(
        this.dubbedVolume,
        this.audioContext.currentTime,
        AUDIO_CONFIG.volumeTransitionTime
      )
    }
    logger.debug(`Dubbed volume: ${(this.dubbedVolume * 100).toFixed(0)}%`, 'liveDubbingService')
  }

  /**
   * Get the sync delay in milliseconds.
   */
  getSyncDelayMs(): number {
    return this.syncDelayMs
  }

  /**
   * Stop audio capture and close connection.
   */
  disconnect(): void {
    this.stopAudioCapture()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.chunkCount = 0
    logger.debug('Disconnected', 'liveDubbingService')
  }

  /**
   * Stop audio processing and cleanup all resources.
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

    if (this.originalGain) {
      this.originalGain.disconnect()
      this.originalGain = null
    }

    if (this.dubbedGain) {
      this.dubbedGain.disconnect()
      this.dubbedGain = null
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
   * Check if live dubbing is available for a channel.
   * @throws Error if API URL is not configured
   */
  static async checkAvailability(channelId: string): Promise<DubbingAvailability> {
    // Fail-fast: validate configuration
    validateConfiguration()

    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      const response = await fetch(
        `${API_BASE_URL}/live/${channelId}/dubbing/availability`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error checking dubbing availability', 'liveDubbingService', error)
      return { available: false, error: 'Check failed' }
    }
  }

  /**
   * Get available voices for dubbing.
   * @throws Error if API URL is not configured
   */
  static async getVoices(): Promise<Array<{ id: string; name: string; language: string; description?: string }>> {
    // Fail-fast: validate configuration
    validateConfiguration()

    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      const response = await fetch(`${API_BASE_URL}/live/dubbing/voices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch voices')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching dubbing voices', 'liveDubbingService', error)
      return []
    }
  }
}

// Export class for static method access
export { LiveDubbingService }

// Export singleton instance for instance method access
export default new LiveDubbingService()
