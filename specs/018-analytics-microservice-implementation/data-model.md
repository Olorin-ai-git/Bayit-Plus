# Data Model: Analytics Microservice

**Feature**: Analytics Microservice  
**Date**: 2025-11-08  
**Status**: Complete

## Overview

This document defines the data models for the analytics microservice, including entities, relationships, and data structures for fraud metrics, cohorts, experiments, drift detection, replay scenarios, and observability.

## Core Entities

### FraudDecision

Represents a single fraud detection decision made by the system.

```typescript
interface FraudDecision {
  id: string;
  transactionId: string;
  investigationId?: string;
  timestamp: string; // ISO 8601
  
  // Decision
  decision: 'approved' | 'declined' | 'review';
  modelScore: number; // 0-1
  ruleScore?: number; // 0-1
  finalScore: number; // 0-1
  
  // Model/Rule Info
  modelVersion: string;
  ruleVersion?: string;
  modelProvider: 'openai' | 'anthropic' | 'local' | 'rule_based';
  
  // Transaction Context
  merchantId?: string;
  channel: 'web' | 'mobile' | 'api' | 'other';
  deviceId?: string;
  ipCountry?: string;
  ipRegion?: string;
  
  // Timing
  modelLatencyMs?: number;
  ruleLatencyMs?: number;
  totalLatencyMs: number;
  
  // Outcomes (may be delayed)
  isFraudTx?: boolean; // Ground truth label
  fraudType?: string;
  chargebackOccurred?: boolean;
  chargebackDate?: string;
  
  // Experiment
  experimentId?: string;
  variantId?: string;
  
  // Features (for explainability)
  features?: Record<string, number | string>;
  featureAttributions?: Record<string, number>; // SHAP values or rule contributions
}
```

### FraudMetrics

Aggregated fraud detection performance metrics.

```typescript
interface FraudMetrics {
  // Time Period
  startTime: string;
  endTime: string;
  timeWindow: string; // '1h' | '24h' | '7d' | '30d' | 'custom'
  
  // Classification Metrics
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1Score: number; // 2 * (precision * recall) / (precision + recall)
  
  // Counts
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  totalDecisions: number;
  
  // Rates
  captureRate: number; // TP / (TP + FN) - same as recall for fraud
  approvalRate: number; // Approved / Total
  chargebackRate: number; // Chargebacks / Approved
  
  // Costs
  falsePositiveCost: number; // Total cost of false positives
  falsePositiveCount: number;
  averageFalsePositiveCost: number;
  
  // Performance
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
  decisionThroughput: number; // Decisions per minute
  
  // Data Quality
  labeledDataCount: number; // Decisions with isFraudTx label
  unlabeledDataCount: number;
  labelDelayHours?: number; // Average delay for labels
}
```

### Cohort

A segment of fraud decisions grouped by dimension.

```typescript
interface Cohort {
  id: string;
  name: string;
  dimension: 'merchant' | 'channel' | 'geography' | 'device' | 'risk_band' | 'model_version' | 'rule_version';
  value: string; // e.g., 'merchant-123', 'web', 'US', 'device-456', 'high', 'v3.2'
  
  // Metrics
  metrics: FraudMetrics;
  
  // Privacy
  transactionCount: number;
  meetsMinimumThreshold: boolean; // >= 100 transactions
  
  // Comparison
  comparisonToOverall?: {
    precisionDelta: number;
    recallDelta: number;
    f1Delta: number;
    isSignificant: boolean;
  };
}
```

### Experiment

An A/B test or multivariate experiment.

```typescript
interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  
  // Configuration
  startDate: string;
  endDate?: string;
  trafficSplit: Record<string, number>; // e.g., { 'control': 50, 'variant-a': 50 }
  
  // Variants
  variants: ExperimentVariant[];
  
  // Success Metrics
  successMetrics: string[]; // e.g., ['precision', 'recall', 'f1']
  
  // Guardrails
  guardrails: Guardrail[];
  
  // Results
  results?: ExperimentResults;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

interface ExperimentVariant {
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
  lift?: number; // Percentage improvement over baseline
  statisticalSignificance?: {
    pValue: number;
    confidenceInterval: [number, number];
    isSignificant: boolean;
  };
}

interface Guardrail {
  metric: 'conversion_rate' | 'auth_success_rate' | 'latency_p95' | 'manual_review_rate';
  threshold: number;
  direction: 'above' | 'below';
  action: 'alert' | 'pause_variant' | 'stop_experiment';
  currentValue?: number;
  status: 'ok' | 'warning' | 'violated';
}

interface ExperimentResults {
  winner?: string; // Variant ID
  conclusion?: string;
  recommendation?: 'promote' | 'reject' | 'extend';
  impactEstimate?: {
    precisionChange: number;
    recallChange: number;
    costSavings?: number;
  };
}
```

### DriftMetrics

Data drift and data quality metrics.

```typescript
interface DriftMetrics {
  id: string;
  featureName: string;
  timestamp: string;
  
  // Drift Detection
  psi?: number; // Population Stability Index
  klDivergence?: number; // Kullback-Leibler divergence
  driftDetected: boolean;
  driftSeverity: 'none' | 'low' | 'medium' | 'high';
  
  // Data Quality
  nullRate: number; // Percentage of null values
  nullRateSpike: boolean; // True if null rate exceeds threshold
  
  rareValues?: string[]; // Unexpected categorical values
  rangeViolations?: {
    min?: number;
    max?: number;
    violations: number;
  };
  
  // Schema
  schemaConformant: boolean;
  schemaViolations?: string[];
  
  // Label Delay
  labelDelayHours?: number;
  averageLabelDelayHours?: number;
  maxLabelDelayHours?: number;
}
```

### ReplayScenario

A backtest configuration and results.

```typescript
interface ReplayScenario {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  
  // Configuration
  timeWindow: {
    start: string;
    end: string;
  };
  
  overrides: {
    modelVersion?: string;
    ruleVersion?: string;
    thresholds?: Record<string, number>;
    rules?: Record<string, any>;
  };
  
  // Results
  results?: ReplayResults;
  
  createdAt: string;
  createdBy: string;
  completedAt?: string;
}

interface ReplayResults {
  scenarioId: string;
  
  // Comparison
  originalMetrics: FraudMetrics;
  replayMetrics: FraudMetrics;
  
  // Differences
  differences: {
    precisionDelta: number;
    recallDelta: number;
    f1Delta: number;
    decisionsChanged: number;
    decisionsChangedPercent: number;
  };
  
  // Impact
  impact: {
    falsePositiveChange: number;
    falseNegativeChange: number;
    costSavings?: number;
    revenueImpact?: number;
  };
  
  // Detailed Comparison
  decisionDiffs?: {
    transactionId: string;
    originalDecision: string;
    replayDecision: string;
    scoreDelta: number;
  }[];
}
```

### FeatureAttribution

Explanation of a fraud decision.

```typescript
interface FeatureAttribution {
  decisionId: string;
  investigationId?: string;
  
  // Attribution Method
  method: 'shap' | 'rule_trace' | 'lime' | 'other';
  
  // Feature Contributions
  contributions: Array<{
    feature: string;
    value: number | string;
    contribution: number; // Positive = increases fraud risk, Negative = decreases
    importance: number; // Absolute contribution
  }>;
  
  // Top Drivers
  topDrivers: Array<{
    feature: string;
    contribution: number;
  }>;
  
  // Rule Trace (if applicable)
  ruleTrace?: Array<{
    ruleId: string;
    ruleName: string;
    fired: boolean;
    score: number;
    conditions: Array<{
      feature: string;
      operator: string;
      value: number | string;
      matched: boolean;
    }>;
  }>;
}
```

### PipelineHealth

Analytics pipeline observability metrics.

```typescript
interface PipelineHealth {
  pipelineId: string;
  pipelineName: string;
  stage: 'ingestion' | 'processing' | 'aggregation' | 'storage';
  
  // Health Metrics
  status: 'healthy' | 'degraded' | 'down';
  successRate: number; // 0-1
  failureRate: number; // 0-1
  lagSeconds: number; // Processing lag
  
  // Freshness
  lastUpdateTime: string;
  freshnessSeconds: number;
  freshnessSLO: number; // SLO in seconds
  
  // Completeness
  expectedCount: number;
  actualCount: number;
  completeness: number; // actualCount / expectedCount
  completenessSLO: number; // e.g., 0.99
  
  // Alerts
  alerts: Array<{
    type: 'freshness' | 'completeness' | 'failure_rate' | 'lag';
    severity: 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
  
  timestamp: string;
}
```

### AuditLog

Immutable audit log entry.

```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: 'query' | 'export' | 'config_change' | 'experiment_create' | 'replay_run';
  
  // Query/Export Details
  queryParams?: Record<string, any>;
  exportFormat?: 'csv' | 'json' | 'pdf';
  exportSize?: number; // Number of records
  
  // Configuration Changes
  configChange?: {
    field: string;
    oldValue: any;
    newValue: any;
  };
  
  // Experiment/Replay
  experimentId?: string;
  replayScenarioId?: string;
  
  // Results Summary
  resultSummary?: {
    recordCount: number;
    durationMs: number;
  };
  
  // Lineage
  lineage?: {
    dataSource: string;
    transformations: string[];
    output: string;
  };
}
```

## Database Schema Extensions

### New Tables

```sql
-- Experiment tracking
CREATE TABLE experiments (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    traffic_split JSONB,
    success_metrics JSONB,
    guardrails JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Replay scenarios
CREATE TABLE replay_scenarios (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    time_window_start TIMESTAMP NOT NULL,
    time_window_end TIMESTAMP NOT NULL,
    overrides JSONB,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    completed_at TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    query_params JSONB,
    result_summary JSONB,
    lineage JSONB
);

-- Pipeline health metrics
CREATE TABLE pipeline_health (
    id VARCHAR(255) PRIMARY KEY,
    pipeline_id VARCHAR(255) NOT NULL,
    pipeline_name VARCHAR(255) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    success_rate FLOAT,
    failure_rate FLOAT,
    lag_seconds INTEGER,
    last_update_time TIMESTAMP,
    freshness_seconds INTEGER,
    expected_count BIGINT,
    actual_count BIGINT,
    completeness FLOAT,
    alerts JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Extensions to Existing Tables

Add columns to existing transaction/fraud decision table:

```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS experiment_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS variant_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS model_latency_ms INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rule_latency_ms INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS feature_attributions JSONB;
```

## API Response Models

### Analytics Dashboard Response

```typescript
interface AnalyticsDashboardResponse {
  kpis: {
    precision: number;
    recall: number;
    f1Score: number;
    captureRate: number;
    approvalRate: number;
    falsePositiveCost: number;
    chargebackRate: number;
    decisionThroughput: number;
  };
  
  trends: {
    metric: string;
    dataPoints: Array<{
      timestamp: string;
      value: number;
    }>;
  }[];
  
  recentDecisions: FraudDecision[];
  
  pipelineHealth: PipelineHealth[];
}
```

### Cohort Analysis Response

```typescript
interface CohortAnalysisResponse {
  dimension: string;
  cohorts: Cohort[];
  overallMetrics: FraudMetrics;
  comparison: {
    bestPerformer: Cohort;
    worstPerformer: Cohort;
    significantDifferences: Cohort[];
  };
}
```

## Data Flow

1. **Fraud Decision** → Stored in transaction table with metadata
2. **Metrics Calculation** → Aggregated from decisions, cached for performance
3. **Cohort Analysis** → Filtered and grouped by dimension, privacy checks applied
4. **Experiment Tracking** → Variant assignment stored, metrics calculated per variant
5. **Drift Detection** → Feature distributions compared, alerts generated
6. **Replay** → Historical data re-processed, results stored separately
7. **Explainability** → Feature attributions calculated on-demand or pre-computed
8. **Observability** → Pipeline metrics tracked, audit logs written

## Privacy & Security

- **Minimum Count Thresholds**: Enforce 100+ transactions per cohort
- **Data Aggregation**: Small cohorts aggregated into "Other"
- **Audit Logging**: All queries and exports logged
- **Access Control**: User permissions checked for sensitive operations
- **Data Retention**: Configurable retention policies for audit logs

