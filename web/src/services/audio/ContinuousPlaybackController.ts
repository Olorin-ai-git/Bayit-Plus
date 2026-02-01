/**
 * Continuous Playback Controller
 *
 * Manages dubbed audio queue for zero-interruption playback.
 * Implements the continuous flow architecture:
 * - 10-second initial buffer before playback starts
 * - Bounded queue to prevent memory leaks
 * - Playback lock to prevent race conditions
 * - Sync status reporting to server
 */

import logger from '@/utils/logger'

// Configuration from environment or defaults
const CONTINUOUS_FLOW_CONFIG = {
  // Initial buffer before playback starts (seconds)
  initialBufferSeconds: parseInt(import.meta.env.VITE_DUBBING_INITIAL_BUFFER_SEC || '10', 10),
  // Maximum queue size to prevent memory leaks
  maxQueueSize: parseInt(import.meta.env.VITE_DUBBING_MAX_QUEUE_SIZE || '100', 10),
  // Sync status reporting interval (milliseconds)
  syncStatusIntervalMs: parseInt(import.meta.env.VITE_DUBBING_SYNC_STATUS_INTERVAL_MS || '500', 10),
} as const

export interface DubbedAudioSegment {
  audioData: string // Base64-encoded audio
  videoTimestampMs: number
  durationMs: number
  sequence: number
  originalText: string
  translatedText: string
}

export interface BufferStatus {
  bufferAheadSeconds: number
  bufferHealth: 'healthy' | 'warning' | 'critical' | 'emergency'
  playbackStarted: boolean
  playbackTimeMs: number
  processedTimeMs: number
}

type BufferStatusCallback = (status: BufferStatus) => void
type PlaybackStartedCallback = () => void

export class ContinuousPlaybackController {
  private audioQueue: DubbedAudioSegment[] = []
  private isPlaying = false
  private playbackStarted = false
  private playbackLock = false // Prevents race conditions
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private currentPlaybackTimeMs = 0
  private syncStatusInterval: number | null = null
  private ws: WebSocket | null = null

  private onBufferStatus: BufferStatusCallback | null = null
  private onPlaybackStarted: PlaybackStartedCallback | null = null

  /**
   * Initialize the continuous playback controller.
   */
  constructor(
    ws: WebSocket,
    onBufferStatus?: BufferStatusCallback,
    onPlaybackStarted?: PlaybackStartedCallback
  ) {
    this.ws = ws
    this.onBufferStatus = onBufferStatus || null
    this.onPlaybackStarted = onPlaybackStarted || null

    // Create audio context for playback (48kHz for high quality)
    this.audioContext = new AudioContext()
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)

    logger.info(
      `ContinuousPlaybackController initialized: ` +
      `initialBuffer=${CONTINUOUS_FLOW_CONFIG.initialBufferSeconds}s, ` +
      `maxQueue=${CONTINUOUS_FLOW_CONFIG.maxQueueSize}`,
      'continuousPlayback'
    )
  }

  /**
   * Add dubbed audio segment to queue.
   * Implements bounded queue to prevent memory leaks.
   */
  onDubbedAudioReceived(segment: DubbedAudioSegment): void {
    // Bounded queue: drop oldest if at max size
    if (this.audioQueue.length >= CONTINUOUS_FLOW_CONFIG.maxQueueSize) {
      const dropped = this.audioQueue.shift()
      logger.warn(
        `Queue at max size, dropped segment #${dropped?.sequence}`,
        'continuousPlayback'
      )
    }

    // Add to queue and sort by video timestamp
    this.audioQueue.push(segment)
    this.audioQueue.sort((a, b) => a.videoTimestampMs - b.videoTimestampMs)

    // Check if we should start playback
    if (!this.playbackStarted && this.getBufferSeconds() >= CONTINUOUS_FLOW_CONFIG.initialBufferSeconds) {
      this.startContinuousPlayback()
    }
  }

  /**
   * Get total buffered audio in seconds.
   */
  getBufferSeconds(): number {
    if (this.audioQueue.length === 0) return 0
    const totalDuration = this.audioQueue.reduce((sum, s) => sum + s.durationMs, 0)
    return totalDuration / 1000
  }

  /**
   * Start continuous playback loop.
   * Uses playback lock to prevent race conditions.
   */
  private async startContinuousPlayback(): Promise<void> {
    if (this.playbackStarted) return

    this.playbackStarted = true
    this.isPlaying = true

    logger.info(
      `Starting continuous playback with ${this.getBufferSeconds().toFixed(1)}s buffer`,
      'continuousPlayback'
    )

    // Notify callback
    this.onPlaybackStarted?.()

    // Start sync status reporting
    this.startSyncStatusReporting()

    // Main playback loop
    while (this.isPlaying) {
      // Acquire playback lock
      if (this.playbackLock) {
        await this.sleep(10)
        continue
      }
      this.playbackLock = true

      try {
        const segment = this.audioQueue.shift()
        if (segment) {
          // Play this segment and AWAIT completion
          await this.playAudioSegment(segment)
          this.currentPlaybackTimeMs = segment.videoTimestampMs + segment.durationMs
        } else {
          // No audio available - buffer underrun (should not happen)
          logger.error('Buffer underrun - no dubbed audio available', 'continuousPlayback')
          await this.sleep(100)
        }
      } finally {
        // Release playback lock
        this.playbackLock = false
      }
    }
  }

  /**
   * Play a single audio segment and await its completion.
   */
  private async playAudioSegment(segment: DubbedAudioSegment): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      logger.warn('Audio context not ready', 'continuousPlayback')
      return
    }

    return new Promise<void>((resolve) => {
      try {
        // Decode base64 to ArrayBuffer
        const binaryString = atob(segment.audioData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Decode and play audio
        this.audioContext!.decodeAudioData(bytes.buffer.slice(0))
          .then((audioBuffer) => {
            const source = this.audioContext!.createBufferSource()
            source.buffer = audioBuffer

            // Resolve when playback ends
            source.onended = () => {
              resolve()
            }

            source.connect(this.gainNode!)
            source.start()

            logger.debug(
              `Playing segment #${segment.sequence} (${audioBuffer.duration.toFixed(2)}s)`,
              'continuousPlayback'
            )
          })
          .catch((err) => {
            logger.error('Error decoding audio', 'continuousPlayback', err)
            resolve() // Continue even on error
          })
      } catch (error) {
        logger.error('Error playing segment', 'continuousPlayback', error)
        resolve() // Continue even on error
      }
    })
  }

  /**
   * Start sending sync status to server.
   */
  private startSyncStatusReporting(): void {
    if (this.syncStatusInterval) return

    this.syncStatusInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'sync_status',
          current_video_time_ms: this.currentPlaybackTimeMs,
          buffer_seconds: this.getBufferSeconds(),
        }))
      }
    }, CONTINUOUS_FLOW_CONFIG.syncStatusIntervalMs)
  }

  /**
   * Handle buffer status message from server.
   */
  onBufferStatusReceived(serverStatus: BufferStatus): void {
    this.onBufferStatus?.(serverStatus)

    logger.debug(
      `Buffer status: health=${serverStatus.bufferHealth}, ahead=${serverStatus.bufferAheadSeconds}s`,
      'continuousPlayback'
    )
  }

  /**
   * Set playback volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.gainNode && this.audioContext) {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      this.gainNode.gain.setTargetAtTime(
        clampedVolume,
        this.audioContext.currentTime,
        0.1
      )
    }
  }

  /**
   * Stop continuous playback and cleanup.
   */
  stop(): void {
    this.isPlaying = false
    this.playbackStarted = false
    this.audioQueue = []

    if (this.syncStatusInterval) {
      clearInterval(this.syncStatusInterval)
      this.syncStatusInterval = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.gainNode = null
    this.ws = null

    logger.info('Continuous playback stopped', 'continuousPlayback')
  }

  /**
   * Check if playback has started.
   */
  isPlaybackStarted(): boolean {
    return this.playbackStarted
  }

  /**
   * Get current playback position in milliseconds.
   */
  getCurrentPlaybackTimeMs(): number {
    return this.currentPlaybackTimeMs
  }

  /**
   * Sleep utility for async loops.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
