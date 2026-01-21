/**
 * Text Summarization Utilities for ResponseAnalyzer
 * Functions for summary generation, action item extraction, and risk identification
 */

/**
 * Generate extractive summary from text
 * Returns first and last sentences or truncated text
 */
export function generateSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  if (sentences.length <= 2) {
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  const firstSentence = sentences[0].trim();
  const lastSentence = sentences[sentences.length - 1].trim();

  return `${firstSentence}. ... ${lastSentence}.`;
}

/**
 * Extract action items from text
 * Identifies sentences containing action verbs
 */
export function extractActionItems(text: string): string[] {
  const actionWords = [
    'investigate',
    'review',
    'verify',
    'check',
    'analyze',
    'confirm',
    'validate',
  ];
  const sentences = text.split(/[.!?]+/);

  return sentences
    .filter((sentence) =>
      actionWords.some((word) => sentence.toLowerCase().includes(word))
    )
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, 5); // Max 5 action items
}

/**
 * Identify risk indicators in text
 * Searches for predefined risk patterns
 */
export function identifyRisks(text: string): string[] {
  const riskIndicators = [
    'suspicious activity',
    'fraud detected',
    'security breach',
    'unauthorized access',
    'anomalous behavior',
    'high risk',
    'potential threat',
  ];

  const risks: string[] = [];
  const lowerText = text.toLowerCase();

  riskIndicators.forEach((indicator) => {
    if (lowerText.includes(indicator)) {
      risks.push(`Detected: ${indicator}`);
    }
  });

  return risks;
}

/**
 * Estimate token count for text
 * Rough estimation: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
