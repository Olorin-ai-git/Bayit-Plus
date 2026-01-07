/**
 * Voice Activity Detection (VAD) Utility
 *
 * Provides energy-based voice activity detection to identify
 * when a user is speaking vs silent. Used for constant listening
 * mode to determine when to send audio to the transcription API.
 */

import { VADSensitivity } from '../services/api';

export type VADState = 'silence' | 'speech' | 'silence_after_speech';

export interface AudioLevel {
  average: number;  // 0-1 normalized RMS
  peak: number;     // 0-1 normalized peak
}

export interface VADConfig {
  sensitivity: VADSensitivity;
  silenceThresholdMs: number;
}

// Energy thresholds by sensitivity level
const ENERGY_THRESHOLDS: Record<VADSensitivity, number> = {
  low: 0.025,     // Less sensitive - requires louder speech (fewer false positives)
  medium: 0.015,  // Balanced - good for normal speaking volume
  high: 0.008,    // More sensitive - detects quieter speech (more false positives possible)
};

// Minimum speech duration to consider valid (prevents noise triggers)
const MIN_SPEECH_DURATION_MS = 200;

export class VADDetector {
  private config: VADConfig;
  private energyThreshold: number;
  private speechStartTime: number | null = null;
  private lastSpeechTime: number | null = null;
  private isSpeaking: boolean = false;
  private hadSpeech: boolean = false;

  constructor(config: VADConfig) {
    this.config = config;
    this.energyThreshold = ENERGY_THRESHOLDS[config.sensitivity];
  }

  /**
   * Update sensitivity dynamically
   */
  setSensitivity(sensitivity: VADSensitivity): void {
    this.config.sensitivity = sensitivity;
    this.energyThreshold = ENERGY_THRESHOLDS[sensitivity];
  }

  /**
   * Update silence threshold dynamically
   */
  setSilenceThreshold(ms: number): void {
    this.config.silenceThresholdMs = Math.max(500, Math.min(5000, ms));
  }

  /**
   * Process audio level and determine VAD state
   * @param audioLevel - Current audio level (average and peak)
   * @returns Current VAD state
   */
  process(audioLevel: AudioLevel): VADState {
    const now = Date.now();
    const isSpeech = audioLevel.average > this.energyThreshold;

    if (isSpeech) {
      // Speech detected
      if (!this.isSpeaking) {
        // Speech just started
        this.speechStartTime = now;
        this.isSpeaking = true;
      }
      this.lastSpeechTime = now;

      // Only count as "had speech" if speech duration exceeds minimum
      if (this.speechStartTime && (now - this.speechStartTime) >= MIN_SPEECH_DURATION_MS) {
        this.hadSpeech = true;
      }

      return 'speech';
    } else {
      // Silence
      this.isSpeaking = false;

      if (this.hadSpeech && this.lastSpeechTime) {
        // We had speech before, now in silence - check if threshold met
        const silenceDuration = now - this.lastSpeechTime;

        if (silenceDuration >= this.config.silenceThresholdMs) {
          return 'silence_after_speech';
        }
        // Still waiting for full silence threshold
        return 'silence';
      }

      return 'silence';
    }
  }

  /**
   * Check if VAD has detected speech followed by sufficient silence
   * indicating the user has finished speaking
   */
  shouldSendToAPI(): boolean {
    if (!this.hadSpeech || !this.lastSpeechTime) {
      return false;
    }

    const silenceDuration = Date.now() - this.lastSpeechTime;
    return !this.isSpeaking && silenceDuration >= this.config.silenceThresholdMs;
  }

  /**
   * Get duration of current speech segment
   */
  getSpeechDuration(): number {
    if (!this.speechStartTime) return 0;
    if (!this.lastSpeechTime) return 0;
    return this.lastSpeechTime - this.speechStartTime;
  }

  /**
   * Get time since last speech ended (silence duration)
   */
  getSilenceDuration(): number {
    if (!this.lastSpeechTime || this.isSpeaking) return 0;
    return Date.now() - this.lastSpeechTime;
  }

  /**
   * Check if currently detecting speech
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if any speech has been detected since last reset
   */
  hasDetectedSpeech(): boolean {
    return this.hadSpeech;
  }

  /**
   * Reset VAD state for next utterance
   */
  reset(): void {
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.isSpeaking = false;
    this.hadSpeech = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): VADConfig {
    return { ...this.config };
  }

  /**
   * Get current energy threshold
   */
  getEnergyThreshold(): number {
    return this.energyThreshold;
  }
}

/**
 * Calculate audio level from raw audio samples
 * @param samples - Float32Array of audio samples (-1 to 1)
 * @returns AudioLevel with average (RMS) and peak values
 */
export function calculateAudioLevel(samples: Float32Array): AudioLevel {
  if (samples.length === 0) {
    return { average: 0, peak: 0 };
  }

  let sum = 0;
  let peak = 0;

  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    sum += samples[i] * samples[i];  // Square for RMS
    if (abs > peak) {
      peak = abs;
    }
  }

  // RMS (Root Mean Square) for average energy
  const rms = Math.sqrt(sum / samples.length);

  return {
    average: Math.min(1, rms),  // Clamp to 0-1
    peak: Math.min(1, peak),    // Clamp to 0-1
  };
}

/**
 * Create a default VAD detector with standard settings
 */
export function createVADDetector(
  sensitivity: VADSensitivity = 'medium',
  silenceThresholdMs: number = 2000
): VADDetector {
  return new VADDetector({
    sensitivity,
    silenceThresholdMs,
  });
}

export default VADDetector;
