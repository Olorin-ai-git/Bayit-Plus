/**
 * Financial Metrics Types
 * Feature: 025-financial-analysis-frontend
 *
 * Core TypeScript interfaces for financial analysis data.
 */

/**
 * Confidence level for revenue calculations based on transaction volume.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Revenue metrics for a single investigation.
 */
export interface RevenueMetrics {
  /** GMV saved by detecting fraud (APPROVED + IS_FRAUD_TX=1) */
  savedFraudGmv: number;

  /** Revenue lost from false positive blocks (BLOCKED + IS_FRAUD_TX=0) */
  lostRevenues: number;

  /** Net value = savedFraudGmv - lostRevenues */
  netValue: number;

  /** Confidence based on transaction volume */
  confidenceLevel: ConfidenceLevel;

  /** Number of approved fraud transactions */
  approvedFraudTxCount: number;

  /** Number of blocked legitimate transactions */
  blockedLegitTxCount: number;

  /** Total transactions analyzed */
  totalTxCount: number;

  /** Whether calculation completed successfully */
  calculationSuccessful: boolean;

  /** Error message if calculation failed */
  errorMessage?: string;

  /** True if skipped because entity not predicted as fraud */
  skippedDueToPrediction: boolean;
}

/**
 * Confusion matrix metrics from investigation comparison.
 */
export interface ConfusionMetrics {
  /** True positives: predicted fraud, actually fraud */
  truePositives: number;

  /** False positives: predicted fraud, actually legitimate */
  falsePositives: number;

  /** True negatives: predicted legitimate, actually legitimate */
  trueNegatives: number;

  /** False negatives: predicted legitimate, actually fraud */
  falseNegatives: number;

  /** Precision = TP / (TP + FP) */
  precision: number;

  /** Recall = TP / (TP + FN) */
  recall: number;

  /** F1 Score = 2 * (precision * recall) / (precision + recall) */
  f1Score: number;

  /** Accuracy = (TP + TN) / Total */
  accuracy: number;
}

/**
 * Combined financial analysis for an investigation.
 */
export interface InvestigationFinancialAnalysis {
  investigationId: string;
  entityType: string;
  entityValue: string;
  merchantName?: string;
  revenueMetrics: RevenueMetrics | null;
  confusionMetrics: ConfusionMetrics | null;
  calculatedAt: string;
}

/**
 * Aggregated confusion matrix totals across multiple investigations.
 */
export interface AggregateConfusionMatrix {
  totalTP: number;
  totalFP: number;
  totalTN: number;
  totalFN: number;
  avgPrecision: number;
  avgRecall: number;
}

/**
 * Aggregated financial summary across multiple investigations.
 */
export interface FinancialSummary {
  /** Total GMV saved across all investigations */
  totalSavedFraudGmv: number;

  /** Total lost revenues across all investigations */
  totalLostRevenues: number;

  /** Total net value across all investigations */
  totalNetValue: number;

  /** Aggregated confusion matrix totals */
  aggregateConfusionMatrix: AggregateConfusionMatrix | null;

  /** Number of investigations included */
  investigationCount: number;

  /** Number of successful calculations */
  successfulCalculations: number;

  /** Number of failed/skipped calculations */
  failedCalculations: number;

  /** Timestamp of aggregation */
  aggregatedAt: string;
}

/**
 * Inline financial metrics for ParallelInvestigation table display.
 */
export interface InlineFinancialMetrics {
  savedFraudGmv: number;
  lostRevenues: number;
  netValue: number;
  confidenceLevel: ConfidenceLevel;
  skippedDueToPrediction: boolean;
}

/**
 * Inline confusion metrics for ParallelInvestigation table display.
 */
export interface InlineConfusionMetrics {
  truePositives: number;
  falsePositives: number;
  precision: number;
  recall: number;
}
