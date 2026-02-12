/**
 * Tone Adjustment Module
 * Adjusts TTS parameters based on emotional state
 */

import type { ToneAdjustment } from './types';

/**
 * Get TTS tone adjustment based on frustration level
 */
export function getToneAdjustment(frustrationLevel: number): ToneAdjustment {
  // High frustration: slow, detailed responses
  if (frustrationLevel > 0.7) {
    return {
      responseSpeed: 'slow',
      ttsRate: 0.8,
      verbosity: 'detailed'
    };
  }

  // Low frustration: fast, concise responses
  if (frustrationLevel < 0.3) {
    return {
      responseSpeed: 'fast',
      ttsRate: 1.2,
      verbosity: 'concise'
    };
  }

  // Medium frustration: normal pace
  return {
    responseSpeed: 'normal',
    ttsRate: 1.0,
    verbosity: 'normal'
  };
}

/**
 * Adjust TTS rate within safe bounds
 */
export function adjustTTSRate(
  baseRate: number,
  frustrationLevel: number
): number {
  const adjustment = getToneAdjustment(frustrationLevel);
  const adjustedRate = baseRate * adjustment.ttsRate;

  // Clamp to safe range (0.5 - 2.0)
  return Math.max(0.5, Math.min(2.0, adjustedRate));
}
