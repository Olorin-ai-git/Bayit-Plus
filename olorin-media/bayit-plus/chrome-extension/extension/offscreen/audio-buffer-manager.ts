/**
 * Audio Buffer Manager
 *
 * Manages audio buffering with jitter buffer for network variability
 * Prevents audio stuttering caused by network delays
 */

import { createLogger } from '@/lib/logger';
import { CONFIG } from '@/config/constants';

const logger = createLogger('AudioBufferManager');

export interface BufferConfig {
  jitterBufferMs: number;
  maxBufferSize: number;
  minBufferThreshold: number;
}

export class AudioBufferManager {
  private audioQueue: AudioBuffer[] = [];
  private config: BufferConfig;
  private bufferStartTime: number | null = null;
  private totalBufferedDuration = 0;
  private isBuffering = false;

  constructor(config?: Partial<BufferConfig>) {
    this.config = {
      jitterBufferMs: config?.jitterBufferMs ?? 500, // 500ms default jitter buffer
      maxBufferSize: config?.maxBufferSize ?? 50, // Max 50 audio chunks
      minBufferThreshold: config?.minBufferThreshold ?? 3, // Min 3 chunks before playback
    };

    logger.info('Audio buffer manager initialized', { config: this.config });
  }

  /**
   * Add audio buffer to queue
   */
  addBuffer(audioBuffer: AudioBuffer): void {
    // Check if buffer is full
    if (this.audioQueue.length >= this.config.maxBufferSize) {
      logger.warn('Audio buffer full, dropping oldest chunk', {
        queueSize: this.audioQueue.length,
      });
      this.audioQueue.shift(); // Drop oldest
      this.totalBufferedDuration -= this.audioQueue[0]?.duration ?? 0;
    }

    // Add to queue
    this.audioQueue.push(audioBuffer);
    this.totalBufferedDuration += audioBuffer.duration;

    // Track buffer start time
    if (!this.bufferStartTime) {
      this.bufferStartTime = Date.now();
    }

    logger.debug('Audio buffer added', {
      duration: audioBuffer.duration,
      queueSize: this.audioQueue.length,
      totalBuffered: this.totalBufferedDuration.toFixed(2),
    });
  }

  /**
   * Check if ready to play (jitter buffer filled)
   */
  isReadyToPlay(): boolean {
    // Check minimum buffer threshold
    if (this.audioQueue.length < this.config.minBufferThreshold) {
      return false;
    }

    // Check jitter buffer time
    if (this.bufferStartTime) {
      const elapsedMs = Date.now() - this.bufferStartTime;
      if (elapsedMs < this.config.jitterBufferMs) {
        this.isBuffering = true;
        logger.debug('Buffering', {
          elapsed: elapsedMs,
          target: this.config.jitterBufferMs,
          queueSize: this.audioQueue.length,
        });
        return false;
      }
    }

    this.isBuffering = false;
    return true;
  }

  /**
   * Get next audio buffer from queue
   */
  getNextBuffer(): AudioBuffer | null {
    if (this.audioQueue.length === 0) {
      logger.debug('Audio queue empty');
      return null;
    }

    const audioBuffer = this.audioQueue.shift()!;
    this.totalBufferedDuration -= audioBuffer.duration;

    logger.debug('Audio buffer retrieved', {
      duration: audioBuffer.duration,
      remaining: this.audioQueue.length,
      totalBuffered: this.totalBufferedDuration.toFixed(2),
    });

    return audioBuffer;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.audioQueue.length;
  }

  /**
   * Get total buffered duration in seconds
   */
  getBufferedDuration(): number {
    return this.totalBufferedDuration;
  }

  /**
   * Check if currently buffering
   */
  isCurrentlyBuffering(): boolean {
    return this.isBuffering;
  }

  /**
   * Check if buffer is low (below threshold)
   */
  isBufferLow(): boolean {
    return this.audioQueue.length < this.config.minBufferThreshold;
  }

  /**
   * Clear all buffers
   */
  clear(): void {
    this.audioQueue = [];
    this.totalBufferedDuration = 0;
    this.bufferStartTime = null;
    this.isBuffering = false;

    logger.info('Audio buffers cleared');
  }

  /**
   * Get buffer statistics
   */
  getStats(): {
    queueSize: number;
    bufferedDuration: number;
    isBuffering: boolean;
    isLow: boolean;
    config: BufferConfig;
  } {
    return {
      queueSize: this.audioQueue.length,
      bufferedDuration: this.totalBufferedDuration,
      isBuffering: this.isBuffering,
      isLow: this.isBufferLow(),
      config: this.config,
    };
  }
}
