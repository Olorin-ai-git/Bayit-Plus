/**
 * ResponseAnalyzer - Public API
 * Main entry point with backward-compatible exports
 */

// Export types
export type {
  AnalysisResult,
  ResponseMetrics,
  FraudIndicators,
  Entity,
  Sentiment,
  RiskLevel,
  SeverityLevel,
} from './types';

// Export text analysis utilities (optional for advanced usage)
export {
  extractKeywords,
  analyzeSentiment,
  extractEntities,
} from './text-analysis';

// Export text summarization utilities (optional for advanced usage)
export {
  generateSummary,
  extractActionItems,
  identifyRisks,
  estimateTokenCount,
} from './text-summarization';

// Export fraud detection utilities (optional for advanced usage)
export {
  detectFraudPatterns,
  calculateRiskLevel,
  generateRecommendation,
  suggestNextActions,
} from './fraud-detection';

// Default export - ResponseAnalyzer singleton instance
export { default } from './ResponseAnalyzer';

// Named export for flexibility
export { default as ResponseAnalyzer } from './ResponseAnalyzer';
