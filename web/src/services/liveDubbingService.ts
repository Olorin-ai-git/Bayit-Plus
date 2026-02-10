/**
 * Live Dubbing Service
 * Captures audio from video element, streams to WebSocket for real-time dubbing,
 * and plays back dubbed audio while mixing with original video audio.
 *
 * Uses SharedAudioCapture service (shared with Live Subtitles for reliability).
 */

import logger from '@/utils/logger'
import { SharedAudioCapture } from './audio/sharedAudioCapture'
import {
  ContinuousPlaybackController,
  type DubbedAudioSegment,
  type BufferStatus,
} from './audio/ContinuousPlaybackController'
import {
  useDubbingSettingsStore,
  useLatencyHistoryStore,
  type LatencyDataPoint,
} from '@/stores/dubbingSettingsStore'
import {
  VideoBufferManager,
  createSyncedStream,
  type VideoBufferConfig,
  type SyncedStreamResponse,
} from './VideoBufferManager'
import api from './api'

// Auth storage key - centralized for DRY principle
const AUTH_STORAGE_KEY = 'bayit-auth'

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
  // Continuous flow fields
  video_timestamp_ms?: number
  duration_ms?: number
  processing_time_ms?: number
}

export interface LatencyReport {
  type: 'latency_report'
  avg_stt_ms: number
  avg_translation_ms: number
  avg_tts_ms: number
  avg_total_ms: number
  segments_processed: number
  // Enhanced metrics (optional - backward compatible)
  p50_stt_ms?: number
  p95_stt_ms?: number
  p99_stt_ms?: number
  p50_translation_ms?: number
  p95_translation_ms?: number
  p99_translation_ms?: number
  p50_tts_ms?: number
  p95_tts_ms?: number
  p99_tts_ms?: number
  p50_total_ms?: number
  p95_total_ms?: number
  p99_total_ms?: number
  avg_network_upload_ms?: number
  avg_network_download_ms?: number
  avg_network_roundtrip_ms?: number
  translation_provider?: string
  translation_cache_hit_rate?: number
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
type BufferStatusCallback = (status: BufferStatus) => void
type PlaybackStartedCallback = () => void

class LiveDubbingService {
  private ws: WebSocket | null = null
  private audioCapture: SharedAudioCapture | null = null

  // Separate AudioContexts for optimal audio quality
  private captureContext: AudioContext | null = null  // 16kHz for STT (capture from video)
  private playbackContext: AudioContext | null = null // 48kHz for TTS (playback dubbed audio)

  // Continuous flow playback controller
  private continuousPlaybackController: ContinuousPlaybackController | null = null
  private enableContinuousFlow = false

  private isConnected = false
  private syncDelayMs = AUDIO_CONFIG.defaultSyncDelayMs
  private bufferedMode = false // Disable immediate playback for buffered mode
  private chunkCount = 0
  private channelId: string | null = null // Track current channel for settings

  // Audio mixing
  private originalGain: GainNode | null = null
  private dubbedGain: GainNode | null = null
  private originalVolume = AUDIO_CONFIG.defaultOriginalVolume
  private dubbedVolume = AUDIO_CONFIG.defaultDubbedVolume

  // Video buffering for perfect sync
  private videoBufferManager: VideoBufferManager | null = null
  private syncedStreamInfo: SyncedStreamResponse | null = null
  private firstAudioChunkSent = false
  private firstDubbedAudioReceived = false
  private originalVideoSrc: string | null = null // Store original video source for restoration
  private videoElementRef: HTMLVideoElement | null = null // Reference to video element

  /**
   * Validate buffer size (must be power of 2).
   * Returns valid buffer size or default if invalid.
   */
  private validateBufferSize(size: number): number {
    const validSizes = [256, 512, 1024, 2048, 4096, 8192, 16384]

    if (validSizes.includes(size)) {
      return size
    }

    logger.warn(
      `Invalid buffer size ${size}, must be power of 2. Using default: ${AUDIO_CONFIG.bufferSize}`,
      'liveDubbingService'
    )
    return AUDIO_CONFIG.bufferSize
  }

  /**
   * Calculate buffer latency in milliseconds.
   */
  private calculateBufferLatency(bufferSize: number): number {
    return (bufferSize / AUDIO_CONFIG.sampleRate) * 1000
  }

  /**
   * Calculate optimal sync delay based on latency history.
   * Uses p95 latency to account for variability.
   */
  private calculateAdaptiveSyncDelay(channelId: string): number {
    const settings = useDubbingSettingsStore.getState().getChannelSettings(channelId)

    // If auto-adaptive is disabled, use manual setting
    if (!settings.autoAdaptiveSync) {
      return settings.syncDelayMs
    }

    // Get latency history
    const avgLatency = useLatencyHistoryStore.getState().getAverageLatency(channelId)

    if (!avgLatency) {
      // No history yet, use default
      return settings.syncDelayMs
    }

    // Use p95 total latency if available, otherwise use average
    // Add 200-300ms buffer for network variability and processing
    const baseLatency = avgLatency.totalMs
    const adaptiveDelay = Math.round(baseLatency * 1.2) // 20% buffer

    // Clamp to reasonable range (100ms - 1000ms)
    const clampedDelay = Math.max(100, Math.min(1000, adaptiveDelay))

    // Apply manual adjustment from settings
    const finalDelay = clampedDelay + settings.syncDelayMs

    logger.debug(
      `Adaptive sync: ${baseLatency}ms → ${clampedDelay}ms (+ ${settings.syncDelayMs}ms manual) = ${finalDelay}ms`,
      'liveDubbingService'
    )

    return finalDelay
  }

  /**
   * Process latency report and update history.
   */
  private processLatencyReport(report: LatencyReport, channelId: string): void {
    // Extract buffer latency from audio config
    const bufferMs = (AUDIO_CONFIG.bufferSize / AUDIO_CONFIG.sampleRate) * 1000

    // Create latency data point
    const dataPoint: LatencyDataPoint = {
      timestamp: Date.now(),
      totalMs: report.avg_total_ms,
      sttMs: report.avg_stt_ms,
      translationMs: report.avg_translation_ms,
      ttsMs: report.avg_tts_ms,
      networkMs: report.avg_network_roundtrip_ms || 40, // Estimate if not available
      bufferMs: bufferMs,
      syncMs: this.syncDelayMs,
    }

    // Add to latency history
    useLatencyHistoryStore.getState().addDataPoint(channelId, dataPoint)

    // Update adaptive sync delay if enabled
    const settings = useDubbingSettingsStore.getState().getChannelSettings(channelId)
    if (settings.autoAdaptiveSync) {
      const newSyncDelay = this.calculateAdaptiveSyncDelay(channelId)
      if (Math.abs(newSyncDelay - this.syncDelayMs) > 50) {
        // Only update if change is significant (>50ms)
        this.syncDelayMs = newSyncDelay
        logger.info(`Adaptive sync updated: ${newSyncDelay}ms`, 'liveDubbingService')
      }
    }
  }

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
    platform = 'web',
    bufferedMode = false, // Disable immediate playback for buffered video sync
    enableContinuousFlow = true, // Enable continuous flow architecture
    onBufferStatus?: BufferStatusCallback,
    onPlaybackStarted?: PlaybackStartedCallback
  ): Promise<void> {
    this.bufferedMode = bufferedMode
    this.enableContinuousFlow = enableContinuousFlow
    this.channelId = channelId
    this.firstAudioChunkSent = false
    this.firstDubbedAudioReceived = false
    this.videoElementRef = videoElement
    this.originalVideoSrc = null // Will be set when switching to delayed stream

    // Load settings from store
    const settings = useDubbingSettingsStore.getState().getChannelSettings(channelId)
    this.originalVolume = settings.originalVolume
    this.dubbedVolume = settings.dubbedVolume

    // Calculate initial sync delay (adaptive or manual)
    this.syncDelayMs = this.calculateAdaptiveSyncDelay(channelId)

    // Request synced stream from backend (server-side or client-side buffering)
    try {
      logger.info(`Requesting synced stream for channel ${channelId}`, 'liveDubbingService')
      this.syncedStreamInfo = await createSyncedStream({
        channelId,
        targetLang,
        enableDubbing: true,
        enableSubtitles: false, // Dubbing only
      })

      logger.info(
        `Synced stream created: mode=${this.syncedStreamInfo.mode}, delay=${this.syncedStreamInfo.video_delay_ms}ms`,
        'liveDubbingService'
      )

      // Apply video delay based on mode
      if (this.syncedStreamInfo.mode === 'server-side' && this.syncedStreamInfo.video_url) {
        // Server-side: Switch video to delayed stream URL
        const delayedUrl = this.syncedStreamInfo.video_url
        logger.info(
          `Switching to delayed stream: ${this.syncedStreamInfo.video_delay_ms}ms delay`,
          'liveDubbingService'
        )

        // Store original source for restoration on disconnect
        this.originalVideoSrc = videoElement.src

        // Switch to delayed stream - HLS.js or native HLS will handle the new URL
        if ((window as any).Hls && (window as any).Hls.isSupported()) {
          // If using HLS.js, we need to reload with new source
          // The VideoPlayer component manages HLS.js, so we emit an event
          const event = new CustomEvent('dubbing-stream-switch', {
            detail: { url: delayedUrl, delay_ms: this.syncedStreamInfo.video_delay_ms }
          })
          window.dispatchEvent(event)
        } else {
          // Native HLS (Safari) - direct source change
          videoElement.src = delayedUrl
          videoElement.load()
          videoElement.play().catch((err) => {
            logger.warn('Failed to play delayed stream', 'liveDubbingService', err)
          })
        }
      } else if (this.syncedStreamInfo.mode === 'client-side') {
        // Client-side: Use VideoBufferManager to pause-delay video
        const bufferConfig: VideoBufferConfig = {
          channelId,
          targetLang,
          enableDubbing: true,
          enableSubtitles: false,
          videoElement,
        }
        this.videoBufferManager = new VideoBufferManager(bufferConfig)
        logger.info('Client-side video buffering initialized', 'liveDubbingService')
      }
    } catch (error) {
      logger.warn(
        `Failed to create synced stream: ${error instanceof Error ? error.message : 'Unknown error'}. Continuing without video sync.`,
        'liveDubbingService'
      )
      // Continue without video buffering - not critical for dubbing to work
    }

    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      if (!token) throw new Error('Not authenticated')

      // SECURITY: Do NOT pass JWT token in URL query parameters (visible in logs, history, referer headers)
      // Token is sent securely via first message after WebSocket connection is established
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // Use window.location.host for WebSocket connections (Vite proxy handles it in dev)
      let wsUrl = `${wsProtocol}//${window.location.host}/api/v1/ws/live/${channelId}/dubbing?target_lang=${targetLang}&platform=${platform}&continuous_flow=${enableContinuousFlow}`
      if (voiceId) {
        wsUrl += `&voice_id=${voiceId}`
      }

      this.ws = new WebSocket(wsUrl)

      // Create continuous playback controller if enabled
      if (enableContinuousFlow && this.ws) {
        this.continuousPlaybackController = new ContinuousPlaybackController(
          this.ws,
          onBufferStatus,
          onPlaybackStarted
        )
      }

      this.ws.onopen = async () => {
        logger.debug('WebSocket connected, authenticating', 'liveDubbingService')

        // Send authentication message first (secure - not in URL)
        this.ws?.send(JSON.stringify({
          type: 'authenticate',
          token: token,
        }))

        this.isConnected = true

        const pipelineReady = await this.setupAudioPipeline(videoElement, onError)
        if (!pipelineReady) {
          this.disconnect()
        }
      }

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          logger.debug(`Message received: ${msg.type}`, 'liveDubbingService')

          if (msg.type === 'connected') {
            this.syncDelayMs = msg.sync_delay_ms || AUDIO_CONFIG.defaultSyncDelayMs
            logger.info(`Connected - Session: ${msg.session_id}, Source: ${msg.source_lang}, Target: ${msg.target_lang}, Sync delay: ${this.syncDelayMs}ms`, 'liveDubbingService')
            onConnected(msg as DubbingConnectionInfo)
          } else if (msg.type === 'dubbed_audio') {
            const audioMsg = msg.data as DubbedAudioMessage
            logger.debug(`Dubbed audio #${audioMsg?.sequence}: "${audioMsg?.translated_text?.substring(0, 30)}..."`, 'liveDubbingService')

            // Complete latency measurement on first dubbed audio (for client-side buffering)
            if (!this.firstDubbedAudioReceived && this.videoBufferManager) {
              this.videoBufferManager.completeMeasurement('dubbing')
              this.firstDubbedAudioReceived = true
              logger.debug('Completed latency measurement (first dubbed audio)', 'liveDubbingService')
            }

            // Use continuous playback controller if enabled
            if (this.enableContinuousFlow && this.continuousPlaybackController) {
              const segment: DubbedAudioSegment = {
                audioData: audioMsg?.data || '',
                videoTimestampMs: audioMsg?.video_timestamp_ms || 0,
                durationMs: audioMsg?.duration_ms || 0,
                sequence: audioMsg?.sequence || 0,
                originalText: audioMsg?.original_text || '',
                translatedText: audioMsg?.translated_text || '',
              }
              this.continuousPlaybackController.onDubbedAudioReceived(segment)
            } else if (!this.bufferedMode) {
              // Legacy mode: play audio immediately
              await this.playDubbedAudio(audioMsg?.data)
            }

            onDubbedAudio(audioMsg)
          } else if (msg.type === 'buffer_status') {
            // Handle buffer status from server
            if (this.continuousPlaybackController) {
              this.continuousPlaybackController.onBufferStatusReceived(msg as BufferStatus)
            }
          } else if (msg.type === 'latency_report') {
            const report = msg as LatencyReport
            logger.debug(
              `Latency: ${report.avg_total_ms}ms (STT: ${report.avg_stt_ms}ms, Trans: ${report.avg_translation_ms}ms, TTS: ${report.avg_tts_ms}ms)`,
              'liveDubbingService'
            )

            // Process latency report and update adaptive sync
            if (this.channelId) {
              this.processLatencyReport(report, this.channelId)
            }

            onLatency(report)
          } else if (msg.type === 'error') {
            logger.error(`Server error: ${msg.error || msg.message}`, 'liveDubbingService')
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
   * Set up audio pipeline using separate AudioContexts for optimal quality.
   * - Capture context at 16kHz for STT (ElevenLabs Scribe requirement)
   * - Playback context at 48kHz for TTS (high-quality dubbed audio playback)
   */
  private async setupAudioPipeline(videoElement: HTMLVideoElement, onError: ErrorCallback): Promise<boolean> {
    try {
      logger.debug('Setting up audio pipeline', 'liveDubbingService')

      // Create CAPTURE context at 16kHz for STT
      this.captureContext = new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate })
      logger.debug(`Capture AudioContext created at ${AUDIO_CONFIG.sampleRate}Hz (for STT)`, 'liveDubbingService')

      // Create PLAYBACK context at 48kHz for high-quality TTS playback
      // Use browser default (typically 48kHz) for optimal audio quality
      this.playbackContext = new AudioContext()
      logger.debug(`Playback AudioContext created at ${this.playbackContext.sampleRate}Hz (for TTS)`, 'liveDubbingService')

      // Create gain nodes for volume mixing (use playback context for output)
      this.originalGain = this.playbackContext.createGain()
      this.dubbedGain = this.playbackContext.createGain()

      // Set initial volumes
      this.originalGain.gain.value = this.originalVolume
      this.dubbedGain.gain.value = this.dubbedVolume

      // Connect gain nodes to playback context output
      this.originalGain.connect(this.playbackContext.destination)
      this.dubbedGain.connect(this.playbackContext.destination)

      logger.debug('Gain nodes created and connected to playback context', 'liveDubbingService')

      // Get buffer size from settings (with validation)
      const settings = this.channelId
        ? useDubbingSettingsStore.getState().getChannelSettings(this.channelId)
        : null
      const bufferSize = this.validateBufferSize(
        settings?.bufferSize || AUDIO_CONFIG.bufferSize
      )

      // Calculate buffer latency
      const bufferLatencyMs = (bufferSize / AUDIO_CONFIG.sampleRate) * 1000
      logger.info(
        `Audio buffer: ${bufferSize} samples = ${bufferLatencyMs.toFixed(1)}ms latency`,
        'liveDubbingService'
      )

      // Create shared audio capture service (use capture context for 16kHz capture)
      this.audioCapture = new SharedAudioCapture(
        this.captureContext,
        bufferSize,
        AUDIO_CONFIG.chunkLogInterval,
        {
          onAudioData: (audioBuffer: ArrayBuffer) => {
            // Send captured audio to WebSocket for STT -> Translation
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              // Start latency measurement on first audio chunk (for client-side buffering)
              if (!this.firstAudioChunkSent && this.videoBufferManager) {
                this.videoBufferManager.startMeasurement()
                this.firstAudioChunkSent = true
                logger.debug('Started latency measurement (first audio chunk)', 'liveDubbingService')
              }

              this.ws.send(audioBuffer)
            } else {
              logger.warn('WebSocket not ready, skipping audio chunk', 'liveDubbingService')
            }
          },
          onError: (message: string) => {
            logger.error(`Audio capture error: ${message}`, 'liveDubbingService')
            onError(message, false)
          },
        }
      )

      // Wait for video to have audio tracks ready (important after HLS stream switch)
      await this.waitForVideoReady(videoElement)

      // Start capturing audio from video (uses proven Live Subtitles approach)
      await this.audioCapture.start(videoElement)

      // Verify audio capture actually started (start() no longer throws on failure)
      if (!this.audioCapture.isActive()) {
        logger.warn('Audio capture did not start - pipeline incomplete', 'liveDubbingService')
        return false
      }

      logger.debug('Audio pipeline ready (using SharedAudioCapture)', 'liveDubbingService')
      return true
    } catch (error) {
      logger.error('Audio pipeline setup error', 'liveDubbingService', error)
      onError(error instanceof Error ? error.message : 'Audio setup failed', false)
      return false
    }
  }

  /**
   * Wait for video element to be ready for audio capture.
   * This is important after HLS stream switch, as the video needs time to load.
   */
  private waitForVideoReady(videoElement: HTMLVideoElement, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      // If video is already ready (has audio), resolve immediately
      if (videoElement.readyState >= 2) {
        logger.debug('Video already ready for audio capture', 'liveDubbingService')
        resolve()
        return
      }

      logger.debug('Waiting for video to be ready for audio capture', 'liveDubbingService')

      const timeout = setTimeout(() => {
        videoElement.removeEventListener('loadeddata', onReady)
        videoElement.removeEventListener('canplay', onReady)
        logger.warn('Video ready timeout - proceeding anyway', 'liveDubbingService')
        resolve() // Don't reject, try anyway
      }, timeoutMs)

      const onReady = () => {
        clearTimeout(timeout)
        videoElement.removeEventListener('loadeddata', onReady)
        videoElement.removeEventListener('canplay', onReady)
        logger.debug('Video ready for audio capture', 'liveDubbingService')
        resolve()
      }

      videoElement.addEventListener('loadeddata', onReady)
      videoElement.addEventListener('canplay', onReady)
    })
  }

  /**
   * Play dubbed audio through the dubbed gain node using playback context.
   */
  private async playDubbedAudio(base64Audio: string): Promise<void> {
    if (!this.playbackContext || !this.dubbedGain) {
      logger.warn('Playback context not ready', 'liveDubbingService')
      return
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Decode audio data using playback context (48kHz for high quality)
      const audioBuffer = await this.playbackContext.decodeAudioData(bytes.buffer)

      // Create buffer source and play through dubbed gain
      const source = this.playbackContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.dubbedGain)
      source.start()

      logger.debug(`Playing dubbed audio (${audioBuffer.duration.toFixed(2)}s at ${this.playbackContext.sampleRate}Hz)`, 'liveDubbingService')
    } catch (error) {
      logger.error('Error playing dubbed audio', 'liveDubbingService', error)
    }
  }

  /**
   * Set the volume for original video audio (0-1).
   */
  setOriginalVolume(volume: number): void {
    this.originalVolume = Math.max(0, Math.min(1, volume))
    if (this.originalGain && this.playbackContext) {
      this.originalGain.gain.setTargetAtTime(
        this.originalVolume,
        this.playbackContext.currentTime,
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
    if (this.dubbedGain && this.playbackContext) {
      this.dubbedGain.gain.setTargetAtTime(
        this.dubbedVolume,
        this.playbackContext.currentTime,
        AUDIO_CONFIG.volumeTransitionTime
      )
    }
    logger.debug(`Dubbed volume: ${(this.dubbedVolume * 100).toFixed(0)}%`, 'liveDubbingService')
  }

  /**
   * Set the sync delay for video synchronization (ms).
   * Can be used for manual adjustment (-500 to +500ms).
   */
  setSyncDelay(delayMs: number): void {
    this.syncDelayMs = Math.max(-500, Math.min(500, delayMs))
    logger.debug(`Sync delay: ${this.syncDelayMs}ms`, 'liveDubbingService')

    // Update settings store if channel is known
    if (this.channelId) {
      useDubbingSettingsStore.getState().updateChannelSettings(this.channelId, {
        syncDelayMs: this.syncDelayMs,
      })
    }
  }

  /**
   * Toggle auto-adaptive sync delay.
   */
  setAutoAdaptiveSync(enabled: boolean): void {
    if (this.channelId) {
      useDubbingSettingsStore.getState().updateChannelSettings(this.channelId, {
        autoAdaptiveSync: enabled,
      })

      // Recalculate sync delay if enabled
      if (enabled) {
        this.syncDelayMs = this.calculateAdaptiveSyncDelay(this.channelId)
        logger.info(`Auto-adaptive sync enabled: ${this.syncDelayMs}ms`, 'liveDubbingService')
      } else {
        logger.info('Auto-adaptive sync disabled', 'liveDubbingService')
      }
    }
  }

  /**
   * Get current sync delay.
   */
  getSyncDelay(): number {
    return this.syncDelayMs
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

    // Stop continuous playback controller
    if (this.continuousPlaybackController) {
      this.continuousPlaybackController.stop()
      this.continuousPlaybackController = null
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

    // Restore original video source if we switched to delayed stream
    if (this.originalVideoSrc && this.videoElementRef) {
      logger.info('Restoring original video stream', 'liveDubbingService')
      if ((window as any).Hls && (window as any).Hls.isSupported()) {
        // Emit event for HLS.js managed video
        const event = new CustomEvent('dubbing-stream-restore', {
          detail: { url: this.originalVideoSrc }
        })
        window.dispatchEvent(event)
      } else {
        // Native HLS - direct source restore
        this.videoElementRef.src = this.originalVideoSrc
        this.videoElementRef.load()
        this.videoElementRef.play().catch((err) => {
          logger.warn('Failed to play restored stream', 'liveDubbingService', err)
        })
      }
    }

    this.syncedStreamInfo = null
    this.firstAudioChunkSent = false
    this.firstDubbedAudioReceived = false
    this.originalVideoSrc = null
    this.videoElementRef = null
    this.isConnected = false
    this.enableContinuousFlow = false
    this.chunkCount = 0
    logger.debug('Disconnected', 'liveDubbingService')
  }

  /**
   * Stop audio processing and cleanup all resources.
   */
  private stopAudioCapture(): void {
    // Stop shared audio capture
    if (this.audioCapture) {
      this.audioCapture.stop()
      this.audioCapture = null
    }

    // Disconnect gain nodes
    if (this.originalGain) {
      this.originalGain.disconnect()
      this.originalGain = null
    }

    if (this.dubbedGain) {
      this.dubbedGain.disconnect()
      this.dubbedGain = null
    }

    // Close both audio contexts
    if (this.captureContext) {
      this.captureContext.close()
      this.captureContext = null
    }

    if (this.playbackContext) {
      this.playbackContext.close()
      this.playbackContext = null
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
   * Check if live dubbing is available for a channel.
   * Uses centralized api for auth token injection.
   */
  static async checkAvailability(channelId: string): Promise<DubbingAvailability> {
    try {
      // Use centralized api - auth token is automatically injected
      const data = await api.get(`/live/${channelId}/dubbing/availability`)
      return data as unknown as DubbingAvailability
    } catch (error) {
      logger.error('Error checking dubbing availability', 'liveDubbingService', error)
      return { available: false, error: 'Check failed' }
    }
  }

  /**
   * Get available voices for dubbing.
   * Uses centralized api for auth token injection.
   */
  static async getVoices(): Promise<Array<{ id: string; name: string; language: string; description?: string }>> {
    try {
      // Use centralized api - auth token is automatically injected
      const data = await api.get('/live/dubbing/voices')
      return data as unknown as Array<{ id: string; name: string; language: string; description?: string }>
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
