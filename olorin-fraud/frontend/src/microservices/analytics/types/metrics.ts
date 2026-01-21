/**
 * Fraud metrics types for analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export interface FraudMetrics {
  startTime: string;
  endTime: string;
  timeWindow: '1h' | '24h' | '7d' | '30d' | 'custom';

  precision: number;
  recall: number;
  f1Score: number;

  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  totalDecisions: number;

  captureRate: number;
  approvalRate: number;
  chargebackRate: number;

  falsePositiveCost: number;
  falsePositiveCount: number;
  averageFalsePositiveCost: number;

  modelLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  ruleLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  decisionThroughput: number;

  labeledDataCount: number;
  unlabeledDataCount: number;
  labelDelayHours?: number;
}

export interface PrecisionRecallResponse {
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
}

export interface ThroughputMetrics {
  decisionsPerMinute: number;
  decisionsPerHour: number;
  decisionsPerDay: number;
  peakThroughput: number;
  averageThroughput: number;
}

