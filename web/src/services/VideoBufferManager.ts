/**
 * Video Buffer Manager - Client-Side Buffering for Perfect Sync
 *
 * Delays video playback to match dubbing/subtitle processing latency.
 * Fallback when server-side buffering unavailable.
 *
 * Architecture:
 * 1. Measure actual latency on first audio chunk
 * 2. Calculate required video delay
 * 3. Delay video.currentTime by measured latency
 * 4. Report measurements back to server
 */

import axios from 'axios'

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
      console.log('[VideoBuffer] Started latency measurement')
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

    console.log(`[VideoBuffer] Measured ${type} latency: ${latency}ms`)

    // Apply delay if not already applied
    if (!this.isDelayApplied) {
      this.applyVideoDelay()
    }

    // Report measurement to backend
    this.reportLatencyToBackend()
  }

  /**
   * Apply video delay based on measured latency
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

    console.log(`[VideoBuffer] Applying ${this.appliedDelay}ms video delay`)

    // Delay video by seeking backward
    try {
      const currentTime = this.videoElement.currentTime
      const delaySeconds = this.appliedDelay / 1000

      // Seek backward to create delay
      if (currentTime > delaySeconds) {
        this.videoElement.currentTime = currentTime - delaySeconds
        this.isDelayApplied = true

        console.log(
          `[VideoBuffer] Video delayed: ${currentTime.toFixed(2)}s → ${this.videoElement.currentTime.toFixed(2)}s`
        )
      } else {
        // If video just started, pause briefly to build buffer
        this.videoElement.pause()
        setTimeout(() => {
          this.videoElement.play()
          this.isDelayApplied = true
        }, this.appliedDelay)
      }
    } catch (error) {
      console.error('[VideoBuffer] Failed to apply video delay:', error)
    }
  }

  /**
   * Report measured latency to backend for future optimization
   */
  private async reportLatencyToBackend(): Promise<void> {
    if (!this.measuredLatency) return

    try {
      await axios.post('/api/v1/synced-streams/update-latency', null, {
        params: {
          channel_id: this.channelId,
          target_lang: this.targetLang,
          measured_dubbing_ms: this.measuredLatency.dubbing_ms || undefined,
          measured_subtitle_ms: this.measuredLatency.subtitle_ms || undefined,
        },
      })

      console.log('[VideoBuffer] Reported latency to backend')
    } catch (error) {
      console.warn('[VideoBuffer] Failed to report latency:', error)
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
    this.measuredLatency = null
    this.appliedDelay = 0
    this.isDelayApplied = false
    this.measurementStartTime = 0
    this.measurementInProgress = false
    console.log('[VideoBuffer] Reset')
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
    const response = await axios.post<SyncedStreamResponse>(
      '/api/v1/synced-streams/create',
      {
        channel_id: request.channelId,
        target_lang: request.targetLang,
        enable_dubbing: request.enableDubbing,
        enable_subtitles: request.enableSubtitles,
      }
    )

    console.log('[SyncedStream] Created:', response.data)
    return response.data
  } catch (error) {
    console.error('[SyncedStream] Failed to create synced stream:', error)
    throw error
  }
}
