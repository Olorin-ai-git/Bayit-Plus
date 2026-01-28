/**
 * Audio Controller
 *
 * Controls original video audio (mute/unmute)
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('AudioController');

export class AudioController {
  private videoElement: HTMLVideoElement | null = null;
  private originalVolume = 1.0;
  private originalMuted = false;

  /**
   * Attach to video element
   */
  attach(video: HTMLVideoElement): void {
    this.videoElement = video;

    // Store original state
    this.originalVolume = video.volume;
    this.originalMuted = video.muted;

    logger.info('Audio controller attached', {
      originalVolume: this.originalVolume,
      originalMuted: this.originalMuted,
    });
  }

  /**
   * Detach from video element
   */
  detach(): void {
    // Restore original state
    if (this.videoElement) {
      this.videoElement.volume = this.originalVolume;
      this.videoElement.muted = this.originalMuted;
    }

    this.videoElement = null;

    logger.info('Audio controller detached');
  }

  /**
   * Set video volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    if (!this.videoElement) {
      logger.warn('Cannot set volume: no video element attached');
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.videoElement.volume = clampedVolume;

    logger.debug('Video volume changed', { volume: clampedVolume });
  }

  /**
   * Mute video
   */
  mute(): void {
    if (!this.videoElement) {
      logger.warn('Cannot mute: no video element attached');
      return;
    }

    this.videoElement.muted = true;

    logger.debug('Video muted');
  }

  /**
   * Unmute video
   */
  unmute(): void {
    if (!this.videoElement) {
      logger.warn('Cannot unmute: no video element attached');
      return;
    }

    this.videoElement.muted = false;

    logger.debug('Video unmuted');
  }

  /**
   * Check if video is muted
   */
  isMuted(): boolean {
    return this.videoElement?.muted || false;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.videoElement?.volume || 0;
  }

  /**
   * Fade out video audio (for smooth dubbing start)
   */
  async fadeOut(durationMs = 500): Promise<void> {
    if (!this.videoElement) {
      return;
    }

    const startVolume = this.videoElement.volume;
    const steps = 20;
    const stepDuration = durationMs / steps;
    const volumeStep = startVolume / steps;

    for (let i = 0; i < steps; i++) {
      if (!this.videoElement) break;

      this.videoElement.volume = Math.max(0, startVolume - volumeStep * (i + 1));
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }

    if (this.videoElement) {
      this.videoElement.volume = 0;
    }

    logger.debug('Video audio faded out');
  }

  /**
   * Fade in video audio (for smooth dubbing stop)
   */
  async fadeIn(targetVolume = 1.0, durationMs = 500): Promise<void> {
    if (!this.videoElement) {
      return;
    }

    const steps = 20;
    const stepDuration = durationMs / steps;
    const volumeStep = targetVolume / steps;

    this.videoElement.volume = 0;

    for (let i = 0; i < steps; i++) {
      if (!this.videoElement) break;

      this.videoElement.volume = Math.min(targetVolume, volumeStep * (i + 1));
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }

    if (this.videoElement) {
      this.videoElement.volume = targetVolume;
    }

    logger.debug('Video audio faded in', { targetVolume });
  }
}
