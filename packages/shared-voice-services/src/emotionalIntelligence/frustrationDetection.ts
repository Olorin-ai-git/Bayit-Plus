/**
 * Frustration Detection Module
 * Calculates frustration level based on patterns and context
 */

import type { VoicePatterns } from './types';
import { extractKeywords } from './patternAnalysis';

/**
 * Detect frustration level (0.0 - 1.0)
 */
export function detectFrustration(
  currentTranscript: string,
  commandHistory: string[],
  patterns: VoicePatterns
): number {
  let frustrationScore = 0.0;

  // Base score from success rate (inverse relationship)
  if (patterns.successRate < 0.3) {
    frustrationScore += 0.4;
  } else if (patterns.successRate < 0.5) {
    frustrationScore += 0.2;
  }

  // Add score for repeated keywords (user trying same thing multiple times)
  if (patterns.repeatedKeywords.length >= 3) {
    frustrationScore += 0.3;
  } else if (patterns.repeatedKeywords.length >= 2) {
    frustrationScore += 0.2;
  }

  // Add score for escalating language
  if (patterns.escalatingLanguage) {
    frustrationScore += 0.3;
  }

  // Add score for consecutive failures
  if (patterns.failureCount >= 5) {
    frustrationScore += 0.3;
  } else if (patterns.failureCount >= 3) {
    frustrationScore += 0.2;
  }

  // Check current transcript for frustration keywords
  const currentKeywords = extractKeywords(currentTranscript);
  const frustrationKeywords = ['where', 'find', 'help', 'not', 'no'];
  const hasFrustrationWords = currentKeywords.some(keyword =>
    frustrationKeywords.includes(keyword)
  );

  if (hasFrustrationWords) {
    frustrationScore += 0.1;
  }

  // Check for question marks (repeated questions = confusion/frustration)
  const questionCount = (currentTranscript.match(/\?/g) || []).length;
  if (questionCount > 0) {
    frustrationScore += 0.1 * questionCount;
  }

  // Clamp to 0.0 - 1.0
  return Math.max(0.0, Math.min(1.0, frustrationScore));
}

/**
 * Determine mood from frustration level
 */
export function determineMood(
  frustrationLevel: number,
  successRate: number
): 'satisfied' | 'neutral' | 'frustrated' | 'confused' {
  if (frustrationLevel > 0.7) return 'frustrated';
  if (frustrationLevel > 0.4) return 'confused';
  if (successRate > 0.8) return 'satisfied';
  return 'neutral';
}
