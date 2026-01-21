/**
 * Anomaly Detection Types
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export type DetectorType = 'stl_mad' | 'cusum' | 'isoforest' | 'rcf' | 'matrix_profile';

export type AnomalySeverity = 'info' | 'warn' | 'critical';

export type AnomalyStatus = 'new' | 'triaged' | 'closed';

export type DetectionRunStatus = 'queued' | 'running' | 'success' | 'failed';

export interface Cohort {
  merchant_id?: string;
  channel?: string;
  geo?: string;
  [key: string]: string | undefined;
}

export interface DetectorParams {
  period?: number;
  robust?: boolean;
  k?: number;
  persistence?: number;
  min_support?: number;
  delta?: number;
  threshold?: number;
  n_estimators?: number;
  contamination?: number;
  severity_thresholds?: {
    info_max?: number;
    warn_max?: number;
    critical_min?: number;
  };
  derived_from_investigation_id?: string; // Track which investigation this detector was created from
  cohort_values?: Record<string, string>; // Store cohort values for form auto-population
  investigation_window_from?: string; // Investigation's time window start (ISO format)
  investigation_window_to?: string; // Investigation's time window end (ISO format)
}

export interface Detector {
  id: string;
  name: string;
  type: DetectorType;
  cohort_by: string[];
  metrics: string[];
  params: DetectorParams;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DetectionRun {
  id: string;
  detector_id: string;
  status: DetectionRunStatus;
  started_at: string;
  finished_at?: string;
  window_from: string;
  window_to: string;
  info?: {
    cohorts_processed?: number;
    anomalies_detected?: number;
    execution_time_ms?: number;
    error_message?: string;
  };
}

export interface AnomalyEvidence {
  residuals?: number[];
  mad?: number;
  trend?: number[];
  seasonal?: number[];
  s_pos?: number[];
  s_neg?: number[];
  changepoint_index?: number;
  feature_vector?: number[];
  neighbors?: number[];
  time_series?: Array<{ timestamp: string; value: number }>;
  trend_data?: number[];
}

export interface AnomalyEvent {
  id: string;
  run_id: string;
  detector_id: string;
  cohort: Cohort;
  window_start: string;
  window_end: string;
  metric: string;
  observed: number;
  expected: number;
  score: number;
  severity?: AnomalySeverity;
  persisted_n: number;
  evidence?: AnomalyEvidence;
  status: AnomalyStatus;
  created_at: string;
  investigation_id?: string;
}

export interface AnomalyFilter {
  severity?: AnomalySeverity[];
  metric?: string[];
  detector_id?: string;
  status?: AnomalyStatus[];
  cohort?: Partial<Cohort>;
  window_start?: string;
  window_end?: string;
  min_score?: number;
  max_score?: number;
  limit?: number;
  offset?: number;
}

export interface AnomalyListResponse {
  anomalies: AnomalyEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface DetectRequest {
  detector_id: string;
  window_from: string;
  window_to: string;
}

export interface DetectResponse {
  run_id: string;
  status: DetectionRunStatus;
}

export interface SeriesRequest {
  cohort: Cohort;
  metric: string;
  window_from: string;
  window_to: string;
  granularity?: string;
}

export interface SeriesPoint {
  timestamp: string;
  value: number;
}

export interface SeriesResponse {
  series: SeriesPoint[];
  cohort: Cohort;
  metric: string;
}

export interface ReplayRequest {
  detector_config: Omit<Detector, 'id' | 'created_at' | 'updated_at'>;
  window_from: string;
  window_to: string;
}

export interface ReplayComparison {
  replay_anomalies: AnomalyEvent[];
  production_anomalies: AnomalyEvent[];
  new_anomalies: AnomalyEvent[];
  missed_anomalies: AnomalyEvent[];
  score_differences: Array<{
    anomaly_id: string;
    replay_score: number;
    production_score: number;
    diff: number;
  }>;
}

export interface ReplayResponse {
  run_id: string;
  comparison: ReplayComparison;
}

export interface PreviewRequest {
  detector_id: string;
  window_from: string;
  window_to: string;
}

export interface PreviewResponse {
  detector_id: string;
  anomalies: AnomalyEvent[];
}

export interface InvestigateRequest {
  anomaly_id: string;
}

export interface InvestigateResponse {
  investigation_id: string;
  anomaly_id: string;
  entity_type: string;
  entity_id: string;
}

