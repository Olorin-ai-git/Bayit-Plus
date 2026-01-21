/**
 * Base analytics types for fraud detection analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export interface FraudDecision {
  id: string;
  transactionId: string;
  investigationId?: string;
  timestamp: string;

  decision: 'approved' | 'declined' | 'review';
  modelScore: number;
  ruleScore?: number;
  finalScore: number;

  modelVersion: string;
  ruleVersion?: string;
  modelProvider: 'openai' | 'anthropic' | 'local' | 'rule_based';

  merchantId?: string;
  channel: 'web' | 'mobile' | 'api' | 'other';
  deviceId?: string;
  ipCountry?: string;
  ipRegion?: string;

  modelLatencyMs?: number;
  ruleLatencyMs?: number;
  totalLatencyMs: number;

  isFraudTx?: boolean;
  fraudType?: string;
  chargebackOccurred?: boolean;
  chargebackDate?: string;

  experimentId?: string;
  variantId?: string;

  features?: Record<string, number | string>;
  featureAttributions?: Record<string, number>;
}

export interface DashboardKPIs {
  precision: number;
  recall: number;
  f1Score: number;
  captureRate: number;
  approvalRate: number;
  falsePositiveCost: number;
  chargebackRate: number;
  decisionThroughput: number;
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
}

export interface TrendSeries {
  metric: string;
  dataPoints: TrendDataPoint[];
}

export interface AnalyticsDashboardResponse {
  kpis: DashboardKPIs;
  trends: TrendSeries[];
  recentDecisions: FraudDecision[];
  pipelineHealth: PipelineHealth[];
}

export interface PipelineHealth {
  pipelineId: string;
  pipelineName: string;
  stage: 'ingestion' | 'processing' | 'aggregation' | 'storage';
  status: 'healthy' | 'degraded' | 'down';
  successRate: number;
  failureRate: number;
  lagSeconds: number;
  lastUpdateTime: string;
  freshnessSeconds: number;
  freshnessSLO: number;
  expectedCount: number;
  actualCount: number;
  completeness: number;
  completenessSLO: number;
  alerts: Array<{
    type: 'freshness' | 'completeness' | 'failure_rate' | 'lag';
    severity: 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
  timestamp: string;
}

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  timeWindow?: '1h' | '24h' | '7d' | '30d' | '90d' | 'all';
  investigationId?: string;
  merchantId?: string;
  channel?: string;
  deviceId?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  startDate: string;
  endDate: string;
  filters?: AnalyticsFilter;
}

