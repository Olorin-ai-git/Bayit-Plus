/**
 * Investigation Comparison Types
 *
 * TypeScript types matching backend Pydantic models for investigation comparison API.
 * Used for type-safe API communication and component props.
 *
 * Constitutional Compliance:
 * - All types match backend models exactly
 * - No hardcoded values or business logic
 * - Proper null/optional handling
 */

export type EntityType =
  | 'email'
  | 'phone'
  | 'device_id'
  | 'ip'
  | 'account_id'
  | 'card_fingerprint'
  | 'merchant_id';

export type WindowPreset = 'recent_14d' | 'retro_14d_6mo_back' | 'custom';

export interface Entity {
  type: EntityType;
  value: string;
}

export interface WindowSpec {
  preset: WindowPreset;
  start?: string; // ISO 8601 datetime
  end?: string; // ISO 8601 datetime
  label?: string;
}

export interface ComparisonOptions {
  include_per_merchant?: boolean;
  max_merchants?: number;
  include_histograms?: boolean;
  include_timeseries?: boolean;
}

export interface ComparisonRequest {
  entity?: Entity;
  windowA: WindowSpec;
  windowB: WindowSpec;
  risk_threshold?: number;
  merchant_ids?: string[];
  options?: ComparisonOptions;
}

export interface HistogramBin {
  bin: string; // e.g., "0-0.1"
  n: number;
}

export interface TimeseriesDaily {
  date: string; // YYYY-MM-DD
  count: number;
  TP?: number;
  FP?: number;
  TN?: number;
  FN?: number;
}

export type ConfidenceInterval = [number, number] | null;

export interface SupportMetrics {
  known_transactions: number;
  predicted_positives: number;
  actual_frauds: number;
}

export interface PowerAssessment {
  status: 'stable' | 'low_power';
  reasons: string[];
}

export interface WindowMetrics {
  total_transactions: number;
  over_threshold: number;
  TP: number;
  FP: number;
  TN: number;
  FN: number;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  fraud_rate: number;
  pending_label_count?: number;
  brier?: number;
  log_loss?: number;
  source?: string; // Investigation ID or 'fallback'
  ci?: {
    precision: ConfidenceInterval;
    recall: ConfidenceInterval;
    accuracy: ConfidenceInterval;
  };
  support?: SupportMetrics;
  power?: PowerAssessment;
  risk_histogram?: HistogramBin[];
  timeseries_daily?: TimeseriesDaily[];
}

export interface AutoExpandMetadata {
  expanded: boolean;
  attempts: [number, number]; // [original_days, effective_days]
  reasons: string[];
  effective_support?: {
    known_transactions: number;
    actual_frauds: number;
    predicted_positives: number;
  };
}

export interface WindowInfo {
  label: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  auto_expand_meta?: AutoExpandMetadata;
}

export interface DeltaMetrics {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  fraud_rate: number;
  psi_predicted_risk?: number;
  ks_stat_predicted_risk?: number;
}

export interface PerMerchantMetrics {
  merchant_id: string;
  A: Partial<WindowMetrics>;
  B: Partial<WindowMetrics>;
  delta: Partial<DeltaMetrics>;
}

export interface ComparisonResponse {
  entity?: Entity;
  threshold: number;
  windowA: WindowInfo;
  windowB: WindowInfo;
  A: WindowMetrics;
  B: WindowMetrics;
  delta: DeltaMetrics;
  per_merchant?: PerMerchantMetrics[];
  excluded_missing_predicted_risk?: number;
  investigation_summary: string;
}

