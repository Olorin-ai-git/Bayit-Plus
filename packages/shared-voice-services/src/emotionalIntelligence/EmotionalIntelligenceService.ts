/**
 * Emotional Intelligence Service
 * Main service for analyzing user emotional state from voice patterns
 */

import { analyzePatterns } from './patternAnalysis';
import { detectFrustration, determineMood } from './frustrationDetection';
import { getToneAdjustment, adjustTTSRate } from './toneAdjustment';
import { generateHelpSuggestion, shouldOfferHelp } from './helpSuggestion';
import type {
  VoiceAnalysis,
  ToneAdjustment
} from './types';

export class EmotionalIntelligenceService {
  /**
   * Analyze user's voice pattern for emotional state
   */
  analyzeVoicePattern(
    currentTranscript: string,
    commandHistory: string[],
    successHistory?: boolean[]
  ): VoiceAnalysis {
    // Extract patterns from history
    const patterns = analyzePatterns(commandHistory, successHistory);

    // Detect frustration level
    const frustrationLevel = detectFrustration(
      currentTranscript,
      commandHistory,
      patterns
    );

    // Determine mood
    const mood = determineMood(frustrationLevel, patterns.successRate);

    // Calculate confidence (inverse of frustration for simplicity)
    const confidence = 1.0 - (frustrationLevel * 0.5);

    // Generate suggestion if needed
    const suggestion = frustrationLevel > 0.6
      ? generateHelpSuggestion({ frustrationLevel, patterns, currentTranscript })
      : undefined;

    return {
      frustrationLevel,
      mood,
      confidence,
      suggestion,
      patterns
    };
  }

  /**
   * Generate adaptive response based on frustration level
   */
  generateAdaptiveResponse(
    originalResponse: string,
    frustrationLevel: number
  ): string {
    if (frustrationLevel < 0.4) {
      return originalResponse;
    }

    // Soften tone for frustrated users
    if (frustrationLevel > 0.7) {
      return `I understand this is frustrating. ${originalResponse} Let me help you find what you're looking for.`;
    }

    if (frustrationLevel > 0.5) {
      return `Let me try to help. ${originalResponse}`;
    }

    return originalResponse;
  }

  /**
   * Determine if help should be offered
   */
  shouldOfferHelp(
    analysis: VoiceAnalysis,
    commandHistory: string[]
  ): boolean {
    return shouldOfferHelp(analysis, commandHistory);
  }

  /**
   * Generate contextual help suggestion
   */
  generateHelpSuggestion(analysis: VoiceAnalysis): string {
    return generateHelpSuggestion({
      frustrationLevel: analysis.frustrationLevel,
      patterns: analysis.patterns,
      currentTranscript: '' // Not needed for this call
    });
  }

  /**
   * Get TTS tone adjustment based on frustration
   */
  getToneAdjustment(frustrationLevel: number): ToneAdjustment {
    return getToneAdjustment(frustrationLevel);
  }

  /**
   * Adjust TTS rate based on emotional state
   */
  adjustTTSRate(baseRate: number, frustrationLevel: number): number {
    return adjustTTSRate(baseRate, frustrationLevel);
  }
}

// Singleton instance
export const emotionalIntelligenceService = new EmotionalIntelligenceService();
