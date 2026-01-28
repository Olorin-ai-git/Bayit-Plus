/**
 * Volume Mixer
 *
 * Controls volume levels for original and dubbed audio
 * Uses GainNode for independent volume control
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('VolumeMixer');

export interface VolumePreset {
  name: 'dubbed-only' | 'both' | 'original-only' | 'custom';
  originalVolume: number;
  dubbedVolume: number;
}

export const VOLUME_PRESETS: Record<string, VolumePreset> = {
  'dubbed-only': {
    name: 'dubbed-only',
    originalVolume: 0.0,
    dubbedVolume: 1.0,
  },
  both: {
    name: 'both',
    originalVolume: 0.3,
    dubbedVolume: 1.0,
  },
  'original-only': {
    name: 'original-only',
    originalVolume: 1.0,
    dubbedVolume: 0.0,
  },
  custom: {
    name: 'custom',
    originalVolume: 0.5,
    dubbedVolume: 0.5,
  },
};

export class VolumeMixer {
  private originalVolume = 0.3; // Default: low original volume
  private dubbedVolume = 1.0; // Default: full dubbed volume
  private currentPreset: VolumePreset = VOLUME_PRESETS.both;

  // Callbacks to update actual audio volumes
  private onOriginalVolumeChange: ((volume: number) => void) | null = null;
  private onDubbedVolumeChange: ((volume: number) => void) | null = null;

  /**
   * Initialize volume mixer
   */
  initialize(
    onOriginalVolumeChange: (volume: number) => void,
    onDubbedVolumeChange: (volume: number) => void
  ): void {
    logger.info('Initializing volume mixer');

    this.onOriginalVolumeChange = onOriginalVolumeChange;
    this.onDubbedVolumeChange = onDubbedVolumeChange;

    // Apply default preset
    this.applyPreset(VOLUME_PRESETS.both);
  }

  /**
   * Set original audio volume (0.0 to 1.0)
   */
  setOriginalVolume(volume: number): void {
    this.originalVolume = Math.max(0, Math.min(1, volume));

    if (this.onOriginalVolumeChange) {
      this.onOriginalVolumeChange(this.originalVolume);
    }

    // Switch to custom preset if manually adjusted
    if (this.currentPreset.name !== 'custom') {
      this.currentPreset = {
        ...VOLUME_PRESETS.custom,
        originalVolume: this.originalVolume,
        dubbedVolume: this.dubbedVolume,
      };
    }

    logger.debug('Original volume changed', { volume: this.originalVolume });
  }

  /**
   * Set dubbed audio volume (0.0 to 1.0)
   */
  setDubbedVolume(volume: number): void {
    this.dubbedVolume = Math.max(0, Math.min(1, volume));

    if (this.onDubbedVolumeChange) {
      this.onDubbedVolumeChange(this.dubbedVolume);
    }

    // Switch to custom preset if manually adjusted
    if (this.currentPreset.name !== 'custom') {
      this.currentPreset = {
        ...VOLUME_PRESETS.custom,
        originalVolume: this.originalVolume,
        dubbedVolume: this.dubbedVolume,
      };
    }

    logger.debug('Dubbed volume changed', { volume: this.dubbedVolume });
  }

  /**
   * Apply volume preset
   */
  applyPreset(preset: VolumePreset): void {
    this.currentPreset = preset;
    this.originalVolume = preset.originalVolume;
    this.dubbedVolume = preset.dubbedVolume;

    if (this.onOriginalVolumeChange) {
      this.onOriginalVolumeChange(this.originalVolume);
    }

    if (this.onDubbedVolumeChange) {
      this.onDubbedVolumeChange(this.dubbedVolume);
    }

    logger.info('Volume preset applied', {
      preset: preset.name,
      originalVolume: this.originalVolume,
      dubbedVolume: this.dubbedVolume,
    });
  }

  /**
   * Get original volume
   */
  getOriginalVolume(): number {
    return this.originalVolume;
  }

  /**
   * Get dubbed volume
   */
  getDubbedVolume(): number {
    return this.dubbedVolume;
  }

  /**
   * Get current preset
   */
  getCurrentPreset(): VolumePreset {
    return this.currentPreset;
  }

  /**
   * Get all available presets
   */
  getAvailablePresets(): VolumePreset[] {
    return Object.values(VOLUME_PRESETS).filter((p) => p.name !== 'custom');
  }

  /**
   * Mute original audio
   */
  muteOriginal(): void {
    this.setOriginalVolume(0.0);
  }

  /**
   * Unmute original audio
   */
  unmuteOriginal(): void {
    this.setOriginalVolume(this.currentPreset.originalVolume || 0.3);
  }

  /**
   * Mute dubbed audio
   */
  muteDubbed(): void {
    this.setDubbedVolume(0.0);
  }

  /**
   * Unmute dubbed audio
   */
  unmuteDubbed(): void {
    this.setDubbedVolume(this.currentPreset.dubbedVolume || 1.0);
  }

  /**
   * Save current settings to storage
   */
  async saveSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        volume_settings: {
          originalVolume: this.originalVolume,
          dubbedVolume: this.dubbedVolume,
          preset: this.currentPreset.name,
        },
      });

      logger.info('Volume settings saved');
    } catch (error) {
      logger.error('Failed to save volume settings', { error: String(error) });
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get('volume_settings');

      if (result.volume_settings) {
        const settings = result.volume_settings;
        this.originalVolume = settings.originalVolume || 0.3;
        this.dubbedVolume = settings.dubbedVolume || 1.0;

        if (settings.preset && VOLUME_PRESETS[settings.preset]) {
          this.currentPreset = VOLUME_PRESETS[settings.preset];
        }

        logger.info('Volume settings loaded', {
          originalVolume: this.originalVolume,
          dubbedVolume: this.dubbedVolume,
          preset: this.currentPreset.name,
        });
      }
    } catch (error) {
      logger.error('Failed to load volume settings', { error: String(error) });
    }
  }
}
