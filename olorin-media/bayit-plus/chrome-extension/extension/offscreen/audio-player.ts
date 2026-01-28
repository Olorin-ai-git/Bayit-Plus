/**
 * Audio Player
 *
 * Plays dubbed audio received from backend
 * Handles base64 decoding, AudioBuffer creation, and playback
 * Uses jitter buffer for network variability
 */

import { createLogger } from '@/lib/logger';
import { AudioBufferManager } from './audio-buffer-manager';
import { PerformanceMonitor } from '@/lib/performance-monitor';

const logger = createLogger('AudioPlayer');

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private bufferManager: AudioBufferManager;
  private performanceMonitor: PerformanceMonitor;
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private volume = 1.0;
  private bufferCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.bufferManager = new AudioBufferManager();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize audio player
   */
  async initialize(sampleRate: number = 16000): Promise<void> {
    try {
      logger.info('Initializing audio player', { sampleRate });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate });

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      // Start buffer check interval
      this.startBufferMonitoring();

      logger.info('Audio player initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize audio player', { error: String(error) });
      throw error;
    }
  }

  /**
   * Start monitoring buffer and trigger playback when ready
   */
  private startBufferMonitoring(): void {
    this.bufferCheckInterval = setInterval(() => {
      // Measure memory periodically
      this.performanceMonitor.measureMemory();
      this.performanceMonitor.trackMainThreadCall();

      // Check if buffer is ready to play
      if (!this.isPlaying && this.bufferManager.isReadyToPlay()) {
        this.playNext();
      }

      // Log buffer stats
      if (this.bufferManager.isCurrentlyBuffering()) {
        const stats = this.bufferManager.getStats();
        logger.debug('Buffering audio', {
          queueSize: stats.queueSize,
          bufferedDuration: stats.bufferedDuration.toFixed(2),
        });
      }
    }, 100); // Check every 100ms
  }

  /**
   * Play audio from base64 encoded string
   */
  async playBase64Audio(base64Audio: string): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      logger.error('Audio player not initialized');
      return;
    }

    try {
      // Mark start of receive-to-play latency
      this.performanceMonitor.markStart('receiveToPlay');

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Add to buffer manager (handles jitter buffer)
      this.bufferManager.addBuffer(audioBuffer);

      // Buffer monitoring will trigger playback when ready
    } catch (error) {
      logger.error('Failed to play base64 audio', { error: String(error) });
    }
  }

  /**
   * Play audio from AudioBuffer
   */
  async playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      logger.error('Audio player not initialized');
      return;
    }

    try {
      // Mark start of receive-to-play latency
      this.performanceMonitor.markStart('receiveToPlay');

      // Add to buffer manager (handles jitter buffer)
      this.bufferManager.addBuffer(audioBuffer);

      // Buffer monitoring will trigger playback when ready
    } catch (error) {
      logger.error('Failed to play audio buffer', { error: String(error) });
    }
  }

  /**
   * Play next audio in queue
   */
  private playNext(): void {
    if (!this.audioContext || !this.gainNode) {
      return;
    }

    // Check if buffer is ready
    if (!this.bufferManager.isReadyToPlay()) {
      this.isPlaying = false;
      return;
    }

    // Get next audio buffer from buffer manager
    const audioBuffer = this.bufferManager.getNextBuffer();
    if (!audioBuffer) {
      this.isPlaying = false;
      logger.debug('Audio buffer empty, stopping playback');
      return;
    }

    this.isPlaying = true;

    // Record receive-to-play latency
    const receiveToPlay = this.performanceMonitor.markEnd('receiveToPlay');

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    // Play next audio when this one ends
    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    // Start playback
    source.start(0);
    this.currentSource = source;

    // Record latency metrics (simplified - full pipeline would include capture/encode times)
    this.performanceMonitor.recordLatency({
      captureToEncode: 0, // Would be measured in AudioWorklet
      encodeToSend: 0, // Would be measured in WebSocket send
      receiveToPlay,
      endToEnd: receiveToPlay, // Simplified for now
    });

    logger.debug('Playing audio', {
      duration: audioBuffer.duration,
      queueSize: this.bufferManager.getQueueSize(),
      receiveToPlayLatency: receiveToPlay.toFixed(2),
    });
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }

    logger.debug('Volume changed', { volume: this.volume });
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore errors (source may have already stopped)
      }
      this.currentSource = null;
    }

    this.bufferManager.clear();
    this.isPlaying = false;

    // Log performance summary before stopping
    this.performanceMonitor.logSummary();

    logger.info('Audio playback stopped');
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
      logger.info('Audio playback paused');
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      logger.info('Audio playback resumed');
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.bufferManager.getQueueSize();
  }

  /**
   * Get buffered duration
   */
  getBufferedDuration(): number {
    return this.bufferManager.getBufferedDuration();
  }

  /**
   * Check if playing
   */
  isPlayingAudio(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if buffering
   */
  isBuffering(): boolean {
    return this.bufferManager.isCurrentlyBuffering();
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return this.performanceMonitor.getReport();
  }

  /**
   * Cleanup and dispose
   */
  async dispose(): Promise<void> {
    try {
      this.stop();

      // Stop buffer monitoring
      if (this.bufferCheckInterval) {
        clearInterval(this.bufferCheckInterval);
        this.bufferCheckInterval = null;
      }

      // Disconnect gain node
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Clear buffers
      this.bufferManager.clear();

      // Reset performance metrics
      this.performanceMonitor.reset();

      logger.info('Audio player disposed');
    } catch (error) {
      logger.error('Failed to dispose audio player', { error: String(error) });
    }
  }
}
