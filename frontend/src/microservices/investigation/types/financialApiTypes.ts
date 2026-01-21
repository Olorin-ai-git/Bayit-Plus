/**
 * Financial API Types
 * Feature: 025-financial-analysis-frontend
 *
 * TypeScript interfaces for financial API request/response contracts.
 */

import type {
  RevenueMetrics,
  ConfusionMetrics,
  FinancialSummary,
  InvestigationFinancialAnalysis,
} from './financialMetrics';

/**
 * Response from GET /api/v1/financial/{investigation_id}/metrics
 */
export interface FinancialMetricsResponse {
  investigation_id: string;
  revenue_metrics: ApiRevenueMetrics | null;
  confusion_metrics: ApiConfusionMetrics | null;
  calculated_at: string;
}

/**
 * API response format for revenue metrics (snake_case from backend).
 */
export interface ApiRevenueMetrics {
  saved_fraud_gmv: number;
  lost_revenues: number;
  net_value: number;
  confidence_level: 'high' | 'medium' | 'low';
  approved_fraud_tx_count: number;
  blocked_legit_tx_count: number;
  total_tx_count: number;
  calculation_successful: boolean;
  error_message?: string;
  skipped_due_to_prediction: boolean;
}

/**
 * API response format for confusion metrics (snake_case from backend).
 */
export interface ApiConfusionMetrics {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
}

/**
 * Status of a single investigation in summary response.
 */
export interface InvestigationStatusResult {
  investigation_id: string;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
}

/**
 * API response format for aggregate confusion matrix.
 */
export interface ApiAggregateConfusionMatrix {
  total_tp: number;
  total_fp: number;
  total_tn: number;
  total_fn: number;
  avg_precision: number;
  avg_recall: number;
}

/**
 * API response format for financial summary.
 */
export interface ApiFinancialSummary {
  total_saved_fraud_gmv: number;
  total_lost_revenues: number;
  total_net_value: number;
  aggregate_confusion_matrix: ApiAggregateConfusionMatrix | null;
  investigation_count: number;
  successful_calculations: number;
  failed_calculations: number;
  aggregated_at: string;
}

/**
 * Response from GET /api/v1/financial/summary
 */
export interface FinancialSummaryResponse {
  summary: ApiFinancialSummary;
  investigations: InvestigationStatusResult[];
}

/**
 * Transform API revenue metrics to frontend format.
 */
export function transformRevenueMetrics(api: ApiRevenueMetrics): RevenueMetrics {
  return {
    savedFraudGmv: api.saved_fraud_gmv,
    lostRevenues: api.lost_revenues,
    netValue: api.net_value,
    confidenceLevel: api.confidence_level,
    approvedFraudTxCount: api.approved_fraud_tx_count,
    blockedLegitTxCount: api.blocked_legit_tx_count,
    totalTxCount: api.total_tx_count,
    calculationSuccessful: api.calculation_successful,
    errorMessage: api.error_message,
    skippedDueToPrediction: api.skipped_due_to_prediction,
  };
}

/**
 * Transform API confusion metrics to frontend format.
 */
export function transformConfusionMetrics(api: ApiConfusionMetrics): ConfusionMetrics {
  return {
    truePositives: api.true_positives,
    falsePositives: api.false_positives,
    trueNegatives: api.true_negatives,
    falseNegatives: api.false_negatives,
    precision: api.precision,
    recall: api.recall,
    f1Score: api.f1_score,
    accuracy: api.accuracy,
  };
}

/**
 * Transform API financial summary to frontend format.
 */
export function transformFinancialSummary(api: ApiFinancialSummary): FinancialSummary {
  return {
    totalSavedFraudGmv: api.total_saved_fraud_gmv,
    totalLostRevenues: api.total_lost_revenues,
    totalNetValue: api.total_net_value,
    aggregateConfusionMatrix: api.aggregate_confusion_matrix
      ? {
          totalTP: api.aggregate_confusion_matrix.total_tp,
          totalFP: api.aggregate_confusion_matrix.total_fp,
          totalTN: api.aggregate_confusion_matrix.total_tn,
          totalFN: api.aggregate_confusion_matrix.total_fn,
          avgPrecision: api.aggregate_confusion_matrix.avg_precision,
          avgRecall: api.aggregate_confusion_matrix.avg_recall,
        }
      : null,
    investigationCount: api.investigation_count,
    successfulCalculations: api.successful_calculations,
    failedCalculations: api.failed_calculations,
    aggregatedAt: api.aggregated_at,
  };
}

/**
 * Transform API financial metrics response to frontend format.
 */
export function transformFinancialMetrics(
  api: FinancialMetricsResponse
): InvestigationFinancialAnalysis {
  return {
    investigationId: api.investigation_id,
    entityType: '',
    entityValue: '',
    revenueMetrics: api.revenue_metrics
      ? transformRevenueMetrics(api.revenue_metrics)
      : null,
    confusionMetrics: api.confusion_metrics
      ? transformConfusionMetrics(api.confusion_metrics)
      : null,
    calculatedAt: api.calculated_at,
  };
}
