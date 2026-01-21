/**
 * Experiment and A/B test types for analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { FraudMetrics } from './metrics';

export type ExperimentStatus =
  | 'draft'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;

  startDate: string;
  endDate?: string;
  trafficSplit: Record<string, number>;

  variants: ExperimentVariant[];

  successMetrics: string[];

  guardrails: Guardrail[];

  results?: ExperimentResults;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  configuration: {
    modelVersion?: string;
    ruleVersion?: string;
    thresholds?: Record<string, number>;
    rules?: Record<string, any>;
  };
  metrics: FraudMetrics;
  lift?: number;
  statisticalSignificance?: {
    pValue: number;
    confidenceInterval: [number, number];
    isSignificant: boolean;
  };
}

export interface Guardrail {
  metric:
    | 'conversion_rate'
    | 'auth_success_rate'
    | 'latency_p95'
    | 'manual_review_rate';
  threshold: number;
  direction: 'above' | 'below';
  action: 'alert' | 'pause_variant' | 'stop_experiment';
  currentValue?: number;
  status: 'ok' | 'warning' | 'violated';
}

export interface ExperimentResults {
  winner?: string;
  conclusion?: string;
  recommendation?: 'promote' | 'reject' | 'extend';
  impactEstimate?: {
    precisionChange: number;
    recallChange: number;
    costSavings?: number;
  };
}

