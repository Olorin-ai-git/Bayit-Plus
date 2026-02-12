/**
 * Help Suggestion Module
 * Generates contextual help based on emotional state
 */

import type { VoiceAnalysis, VoicePatterns } from './types';

interface HelpSuggestionContext {
  frustrationLevel: number;
  patterns: VoicePatterns;
  currentTranscript: string;
}

/**
 * Generate contextual help suggestion
 */
export function generateHelpSuggestion(context: HelpSuggestionContext): string {
  const { frustrationLevel, patterns, currentTranscript } = context;

  // Very high frustration: offer general assistance
  if (frustrationLevel > 0.8) {
    return "I'm here to help! Try saying 'show me what's popular' or 'browse by category'.";
  }

  // Check for repeated search/find attempts
  const searchRelated = patterns.repeatedKeywords.some(keyword =>
    ['search', 'find', 'show', 'where'].includes(keyword)
  );

  if (searchRelated) {
    return "Would you like me to help you browse categories instead?";
  }

  // Check for specific content type issues
  if (currentTranscript.toLowerCase().includes('movie')) {
    return "Would you like to see popular movies or browse by genre?";
  }

  if (currentTranscript.toLowerCase().includes('series')) {
    return "Would you like to see trending series or browse by category?";
  }

  // Default: offer recommendations
  if (frustrationLevel > 0.5) {
    return "Let me help you find something. Would you like some suggestions on what to watch?";
  }

  return "Need help finding something? Just ask!";
}

/**
 * Determine if help should be offered
 */
export function shouldOfferHelp(
  analysis: VoiceAnalysis,
  commandHistory: string[]
): boolean {
  // Offer help after 3+ consecutive failures
  if (analysis.patterns.failureCount >= 3) {
    return true;
  }

  // Offer help for high frustration
  if (analysis.frustrationLevel > 0.7) {
    return true;
  }

  // Offer help if last 5 commands all failed
  const recentCommands = commandHistory.slice(0, 5);
  if (recentCommands.length >= 5) {
    // Heuristic: if all recent commands have frustration indicators
    const allFailed = recentCommands.every(cmd =>
      cmd.toLowerCase().includes('where') ||
      cmd.toLowerCase().includes('find') ||
      cmd.toLowerCase().includes('search')
    );
    if (allFailed) return true;
  }

  return false;
}
