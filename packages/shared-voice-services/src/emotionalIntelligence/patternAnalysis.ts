/**
 * Pattern Analysis Module
 * Analyzes command history for patterns indicating frustration or success
 */

import type { VoicePatterns } from './types';

const FRUSTRATION_KEYWORDS = [
  'where', 'can\'t find', 'not working', 'nothing', 'no results',
  'help', 'again', 'still', 'why', 'error'
];

const ESCALATION_KEYWORDS = [
  'still not', 'nothing works', 'terrible', 'stupid', 'hate',
  'useless', 'broken', 'fix this'
];

/**
 * Analyze command history for patterns
 */
export function analyzePatterns(
  commandHistory: string[],
  successHistory: boolean[] = []
): VoicePatterns {
  if (commandHistory.length === 0) {
    return {
      repeatedKeywords: [],
      failureCount: 0,
      successCount: 0,
      successRate: 0,
      avgResponseTime: 0,
      escalatingLanguage: false
    };
  }

  // Extract keywords from commands
  const allKeywords = commandHistory.flatMap(cmd =>
    cmd.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  );

  // Find repeated keywords (appear 2+ times)
  const keywordCounts = new Map<string, number>();
  allKeywords.forEach(keyword => {
    keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
  });

  const repeatedKeywords = Array.from(keywordCounts.entries())
    .filter(([_, count]) => count >= 2)
    .map(([keyword]) => keyword)
    .slice(0, 5); // Top 5

  // Count failures (based on frustration keywords or success history)
  let failureCount = 0;
  let successCount = 0;

  commandHistory.forEach((cmd, index) => {
    const hasSuccessInfo = successHistory && successHistory[index] !== undefined;

    if (hasSuccessInfo) {
      if (successHistory[index]) {
        successCount++;
      } else {
        failureCount++;
      }
    } else {
      // Heuristic: commands with frustration keywords = failures
      const hasFrustrationKeyword = FRUSTRATION_KEYWORDS.some(keyword =>
        cmd.toLowerCase().includes(keyword)
      );
      if (hasFrustrationKeyword) {
        failureCount++;
      } else {
        successCount++;
      }
    }
  });

  const totalCommands = commandHistory.length;
  const successRate = totalCommands > 0 ? successCount / totalCommands : 0;

  // Check for escalating language: explicit escalation keywords OR repeated
  // failures (3+ consecutive failures signals escalating frustration).
  const recentCommands = commandHistory.slice(-3); // Last 3 commands (most recent)
  const keywordEscalation = recentCommands.some(cmd =>
    ESCALATION_KEYWORDS.some(keyword => cmd.toLowerCase().includes(keyword))
  );

  const recentSuccesses = successHistory.slice(-3);
  const repeatedFailures =
    recentSuccesses.length >= 3 &&
    recentSuccesses.every(s => s === false);

  const escalatingLanguage = keywordEscalation || repeatedFailures;

  return {
    repeatedKeywords,
    failureCount,
    successCount,
    successRate,
    avgResponseTime: 0, // Calculated elsewhere if timing data available
    escalatingLanguage
  };
}

/**
 * Extract keywords from a transcript
 */
export function extractKeywords(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'from', 'have'].includes(word));
}
