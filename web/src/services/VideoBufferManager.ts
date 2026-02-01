/**
 * Video Buffer Manager - Client-Side Buffering for Perfect Sync
 *
 * Delays video playback to match dubbing/subtitle processing latency.
 * Fallback when server-side buffering unavailable.
 *
 * Architecture:
 * 1. Measure actual latency on first audio chunk
 * 2. Calculate required video delay
 * 3. Delay video playback via pause-based buffering
 * 4. Report measurements back to server
 */

import api from './api'
import logger from '@/utils/logger'

export interface LatencyMeasurement {
  dubbing_ms: number
  subtitle_ms: number
  measured_at: number
}

export interface VideoBufferConfig {
  channelId: string
  targetLang: string
  enableDubbing: boolean
  enableSubtitles: boolean
  videoElement: HTMLVideoElement
}

export class VideoBufferManager {
  private channelId: string
  private targetLang: string
  private videoElement: HTMLVideoElement
  private enableDubbing: boolean
  private enableSubtitles: boolean

  private measuredLatency: LatencyMeasurement | null = null
  private appliedDelay: number = 0
  private isDelayApplied: boolean = false

  private measurementStartTime: number = 0
  private measurementInProgress: boolean = false
  private delayTimeoutId: number | null = null // Track setTimeout for cleanup

  constructor(config: VideoBufferConfig) {
    this.channelId = config.channelId
    this.targetLang = config.targetLang
    this.videoElement = config.videoElement
    this.enableDubbing = config.enableDubbing
    this.enableSubtitles = config.enableSubtitles
  }

  /**
   * Start measuring latency when first audio chunk is sent
   */
  startMeasurement(): void {
    if (!this.measurementInProgress) {
      this.measurementStartTime = Date.now()
      this.measurementInProgress = true
      logger.debug('Started latency measurement', 'VideoBufferManager')
    }
  }

  /**
   * Complete measurement when first dubbed/translated content arrives
   */
  completeMeasurement(type: 'dubbing' | 'subtitle'): void {
    if (!this.measurementInProgress) return

    const latency = Date.now() - this.measurementStartTime

    if (!this.measuredLatency) {
      this.measuredLatency = {
        dubbing_ms: type === 'dubbing' ? latency : 0,
        subtitle_ms: type === 'subtitle' ? latency : 0,
        measured_at: Date.now(),
      }
    } else {
      if (type === 'dubbing') {
        this.measuredLatency.dubbing_ms = latency
      } else {
        this.measuredLatency.subtitle_ms = latency
      }
    }

    logger.debug(`Measured ${type} latency: ${latency}ms`, 'VideoBufferManager')

    // Apply delay if not already applied
    if (!this.isDelayApplied) {
      this.applyVideoDelay()
    }

    // Report measurement to backend
    this.reportLatencyToBackend()
  }

  /**
   * Apply video delay based on measured latency.
   * Uses pause-based buffering (more reliable for live streams than seeking).
   */
  private applyVideoDelay(): void {
    if (!this.measuredLatency || this.isDelayApplied) return

    // Calculate required delay (use the higher of dubbing/subtitle)
    const baseLatency = Math.max(
      this.measuredLatency.dubbing_ms,
      this.measuredLatency.subtitle_ms
    )

    // Add 100ms safety buffer
    this.appliedDelay = baseLatency + 100

    logger.info(`Applying ${this.appliedDelay}ms video delay`, 'VideoBufferManager')

    // Use pause-based buffering (primary approach for live streams)
    // More reliable than seeking backward on live HLS streams
    try {
      this.videoElement.pause()

      // Clear any existing timeout
      if (this.delayTimeoutId !== null) {
        clearTimeout(this.delayTimeoutId)
      }

      // Resume playback after delay
      this.delayTimeoutId = setTimeout(() => {
        // Handle play() promise to avoid unhandled rejection
        this.videoElement.play()
          .then(() => {
            this.isDelayApplied = true
            this.delayTimeoutId = null
            logger.debug(
              `Video delay applied successfully (${this.appliedDelay}ms)`,
              'VideoBufferManager'
            )
          })
          .catch((error) => {
            logger.warn('Failed to resume video after delay', 'VideoBufferManager', error)
          })
      }, this.appliedDelay) as unknown as number
    } catch (error) {
      logger.error('Failed to apply video delay', 'VideoBufferManager', error)
    }
  }

  /**
   * Report measured latency to backend for future optimization
   */
  private async reportLatencyToBackend(): Promise<void> {
    if (!this.measuredLatency) return

    try {
      await api.post('/synced-streams/update-latency', {
        channel_id: this.channelId,
        target_lang: this.targetLang,
        measured_dubbing_ms: this.measuredLatency.dubbing_ms || undefined,
        measured_subtitle_ms: this.measuredLatency.subtitle_ms || undefined,
      })

      logger.debug('Reported latency to backend', 'VideoBufferManager')
    } catch (error) {
      logger.warn('Failed to report latency to backend', 'VideoBufferManager', error)
      // Non-critical error, continue
    }
  }

  /**
   * Get current applied delay
   */
  getAppliedDelay(): number {
    return this.appliedDelay
  }

  /**
   * Get measured latency
   */
  getMeasuredLatency(): LatencyMeasurement | null {
    return this.measuredLatency
  }

  /**
   * Check if delay has been applied
   */
  isDelayActive(): boolean {
    return this.isDelayApplied
  }

  /**
   * Reset buffer manager (e.g., when changing channels)
   */
  reset(): void {
    // Clear any pending timeout to prevent memory leaks
    if (this.delayTimeoutId !== null) {
      clearTimeout(this.delayTimeoutId)
      this.delayTimeoutId = null
    }

    this.measuredLatency = null
    this.appliedDelay = 0
    this.isDelayApplied = false
    this.measurementStartTime = 0
    this.measurementInProgress = false
    logger.debug('Video buffer manager reset', 'VideoBufferManager')
  }
}

/**
 * Create synced stream using backend API
 */
export interface SyncedStreamRequest {
  channelId: string
  targetLang: string
  enableDubbing: boolean
  enableSubtitles: boolean
}

export interface SyncedStreamResponse {
  channel_id: string
  video_url: string
  video_delay_ms: number
  dubbing_websocket_url?: string
  subtitle_websocket_url?: string
  sync_guaranteed: boolean
  mode: 'server-side' | 'client-side'
  message: string
}

/**
 * Request a synced stream from backend
 */
export async function createSyncedStream(
  request: SyncedStreamRequest
): Promise<SyncedStreamResponse> {
  try {
    const data = await api.post<SyncedStreamResponse>(
      '/synced-streams/create',
      {
        channel_id: request.channelId,
        target_lang: request.targetLang,
        enable_dubbing: request.enableDubbing,
        enable_subtitles: request.enableSubtitles,
      }
    ) as SyncedStreamResponse

    logger.info('Synced stream created successfully', 'createSyncedStream', {
      channel_id: data.channel_id,
      mode: data.mode,
      video_delay_ms: data.video_delay_ms,
    })
    return data
  } catch (error) {
    logger.error('Failed to create synced stream', 'createSyncedStream', error)
    throw error
  }
}
