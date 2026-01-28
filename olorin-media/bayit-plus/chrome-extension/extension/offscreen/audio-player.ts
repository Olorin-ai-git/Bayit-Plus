/**
 * Audio Player
 *
 * Plays dubbed audio received from backend
 * Handles base64 decoding, AudioBuffer creation, and playback
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('AudioPlayer');

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private volume = 1.0;

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

      logger.info('Audio player initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize audio player', { error: String(error) });
      throw error;
    }
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
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
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
      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
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

    // Check if queue has audio
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      logger.debug('Audio queue empty, stopping playback');
      return;
    }

    this.isPlaying = true;

    // Get next audio buffer
    const audioBuffer = this.audioQueue.shift()!;

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

    logger.debug('Playing audio', {
      duration: audioBuffer.duration,
      queueSize: this.audioQueue.length,
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

    this.audioQueue = [];
    this.isPlaying = false;

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
    return this.audioQueue.length;
  }

  /**
   * Check if playing
   */
  isPlayingAudio(): boolean {
    return this.isPlaying;
  }

  /**
   * Cleanup and dispose
   */
  async dispose(): Promise<void> {
    try {
      this.stop();

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      logger.info('Audio player disposed');
    } catch (error) {
      logger.error('Failed to dispose audio player', { error: String(error) });
    }
  }
}
