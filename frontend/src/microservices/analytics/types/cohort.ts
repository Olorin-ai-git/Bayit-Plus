/**
 * Cohort analysis types for analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { FraudMetrics } from './metrics';

export type CohortDimension =
  | 'merchant'
  | 'channel'
  | 'geography'
  | 'device'
  | 'risk_band'
  | 'model_version'
  | 'rule_version';

export interface Cohort {
  id: string;
  name: string;
  dimension: CohortDimension;
  value: string;

  metrics: FraudMetrics;

  transactionCount: number;
  meetsMinimumThreshold: boolean;

  comparisonToOverall?: {
    precisionDelta: number;
    recallDelta: number;
    f1Delta: number;
    isSignificant: boolean;
  };
}

export interface CohortAnalysisResponse {
  dimension: string;
  cohorts: Cohort[];
  overallMetrics: FraudMetrics;
  comparison: {
    bestPerformer: Cohort;
    worstPerformer: Cohort;
    significantDifferences: Cohort[];
  };
}

export interface CohortComparisonRequest {
  cohortIds: string[];
  metrics?: string[];
}

