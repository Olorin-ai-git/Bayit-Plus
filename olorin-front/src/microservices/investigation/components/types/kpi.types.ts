/**
 * KPI Dashboard Types
 * Feature: KPI Dashboard Microservice
 */

export interface KPIDailyMetricsResponse {
  id: string;
  pilot_id: string;
  tenant_id: string;
  metric_date: string;
  precision: number | null;
  recall: number | null;
  fpr: number | null;
  pr_auc: number | null;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  fraud_amount_avoided: number | null;
  false_positive_cost: number | null;
  net_savings: number | null;
  roi_percentage: number | null;
  approval_rate: number | null;
  review_rate: number | null;
  decline_rate: number | null;
  latency_p95: number | null;
  error_rate: number | null;
  drift_psi: number | null;
  model_version: string | null;
  total_events: number;
  labeled_events: number;
}

export interface KPIThresholdSweepResponse {
  id: string;
  pilot_id: string;
  tenant_id: string;
  sweep_date: string;
  model_version: string | null;
  threshold: number;
  precision: number | null;
  recall: number | null;
  fpr: number | null;
  profit: number | null;
  fraud_amount_avoided: number | null;
  false_positive_cost: number | null;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
}

export interface KPIBreakdownResponse {
  id: string;
  pilot_id: string;
  tenant_id: string;
  breakdown_date: string;
  breakdown_type: string;
  breakdown_value: string;
  precision: number | null;
  recall: number | null;
  fpr: number | null;
  total_events: number;
  fraud_count: number;
  fraud_amount: number | null;
}

export interface KPIDashboardResponse {
  recall: number | null;
  fpr: number | null;
  precision: number | null;
  net_savings: number | null;
  latency_p95: number | null;
  error_rate: number | null;
  daily_metrics: KPIDailyMetricsResponse[];
  threshold_sweep: KPIThresholdSweepResponse[];
  breakdowns: KPIBreakdownResponse[];
  pilot_id: string;
  tenant_id: string;
  date_range_start: string;
  date_range_end: string;
  last_updated: string;
}





