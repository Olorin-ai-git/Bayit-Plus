# Data Model: Fraud Anomaly Detection Service

**Feature**: Fraud Anomaly Detection  
**Date**: 2025-11-09  
**Status**: Complete

## Overview

This document defines the data models for the fraud anomaly detection service, including entities, relationships, validation rules, and state transitions.

## Core Entities

### Detector

Represents a detection algorithm configuration that can be executed on transaction window data.

**Attributes**:
- `id` (UUID, Primary Key): Unique identifier for the detector
- `name` (TEXT, NOT NULL): Human-readable detector name
- `type` (TEXT, NOT NULL): Detector algorithm type - one of: 'stl_mad', 'cusum', 'isoforest', 'rcf', 'matrix_profile'
- `cohort_by` (JSONB, NOT NULL): Array of cohort dimensions, e.g., ["merchant_id", "channel", "geo"]
- `metrics` (JSONB, NOT NULL): Array of metrics to detect anomalies on, e.g., ["tx_count", "decline_rate", "amount_mean"]
- `params` (JSONB, NOT NULL): Detector-specific configuration parameters
  - For STL+MAD: `period` (int, default: 672), `robust` (bool, default: true), `k` (float, default: 3.5), `persistence` (int, default: 2), `min_support` (int, default: 50)
  - For CUSUM: `delta` (float, default: 0.75*std), `threshold` (float, default: 5*std), `k` (float, default: 3.5), `persistence` (int, default: 2), `min_support` (int, default: 50)
  - For Isolation Forest: `n_estimators` (int, default: 200), `contamination` (float, default: 0.005), `k` (float, default: 3.5), `persistence` (int, default: 2), `min_support` (int, default: 50)
  - Optional `severity_thresholds`: `{info_max: 3.0, warn_max: 4.5, critical_min: 4.5}` (if not specified, use global defaults)
- `enabled` (BOOLEAN, DEFAULT TRUE): Whether detector is active and should run on schedule
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()): Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()): Last update timestamp

**Validation Rules**:
- `type` must be one of the allowed detector types
- `cohort_by` must be a non-empty array
- `metrics` must be a non-empty array
- `params.k` must be > 0
- `params.persistence` must be >= 1
- `params.min_support` must be >= 1
- If `severity_thresholds` specified: `info_max < warn_max < critical_min`

**State Transitions**: None (detector is either enabled or disabled)

**Relationships**:
- One-to-many with `DetectionRun` (detector_id)
- One-to-many with `AnomalyEvent` (detector_id)

### DetectionRun

Represents a single execution of a detector on a time window.

**Attributes**:
- `id` (UUID, Primary Key): Unique identifier for the run
- `detector_id` (UUID, Foreign Key → detectors.id): Detector that was executed
- `status` (TEXT, NOT NULL): Run status - one of: 'queued', 'running', 'success', 'failed'
- `started_at` (TIMESTAMPTZ, DEFAULT NOW()): When run started execution
- `finished_at` (TIMESTAMPTZ, NULLABLE): When run completed (NULL if still running)
- `window_from` (TIMESTAMPTZ, NOT NULL): Start of time window analyzed
- `window_to` (TIMESTAMPTZ, NOT NULL): End of time window analyzed
- `info` (JSONB, NULLABLE): Additional run metadata
  - `cohorts_processed` (int): Number of cohorts analyzed
  - `anomalies_detected` (int): Number of anomalies found
  - `execution_time_ms` (int): Total execution time
  - `error_message` (string, if failed): Error details

**Validation Rules**:
- `window_to` must be > `window_from`
- `status` must be one of the allowed statuses
- `finished_at` must be NULL if status is 'queued' or 'running'
- `finished_at` must be NOT NULL if status is 'success' or 'failed'

**State Transitions**:
- `queued` → `running` (when execution starts)
- `running` → `success` (when execution completes successfully)
- `running` → `failed` (when execution fails)
- No transitions from terminal states (`success`, `failed`)

**Relationships**:
- Many-to-one with `Detector` (detector_id)
- One-to-many with `AnomalyEvent` (run_id)

### AnomalyEvent

Represents a detected anomaly for a specific metric, cohort, and time window.

**Attributes**:
- `id` (UUID, Primary Key): Unique identifier for the anomaly
- `run_id` (UUID, Foreign Key → detection_runs.id): Detection run that found this anomaly
- `detector_id` (UUID, Foreign Key → detectors.id): Detector that detected this anomaly
- `cohort` (JSONB, NOT NULL): Cohort dimensions, e.g., {"merchant_id": "m_01", "channel": "web", "geo": "US-CA"}
- `window_start` (TIMESTAMPTZ, NOT NULL): Start of anomalous time window
- `window_end` (TIMESTAMPTZ, NOT NULL): End of anomalous time window
- `metric` (TEXT, NOT NULL): Metric name that was anomalous, e.g., "decline_rate", "tx_count"
- `observed` (DOUBLE PRECISION, NOT NULL): Observed value for this metric/window
- `expected` (DOUBLE PRECISION, NOT NULL): Expected value (from model/trend)
- `score` (DOUBLE PRECISION, NOT NULL): Anomaly score (normalized, typically 0-10+)
- `severity` (TEXT, NULLABLE): Severity level - one of: 'info', 'warn', 'critical' (determined by score thresholds)
- `persisted_n` (INT, DEFAULT 1): Number of consecutive windows this anomaly has persisted
- `evidence` (JSONB, NULLABLE): Detector-specific evidence
  - For STL+MAD: `{residuals: [float], mad: float, trend: [float], seasonal: [float]}`
  - For CUSUM: `{s_pos: [float], s_neg: [float], changepoint_index: int}`
  - For Isolation Forest: `{feature_vector: [float], neighbors: [int], isolation_path_length: float}`
- `status` (TEXT, DEFAULT 'new'): Anomaly status - one of: 'new', 'triaged', 'closed'
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()): When anomaly was detected

**Validation Rules**:
- `window_end` must be > `window_start`
- `score` must be >= 0
- `persisted_n` must be >= 1
- `severity` must be one of the allowed values if not NULL
- `status` must be one of the allowed values
- `cohort` must contain at least one dimension

**State Transitions**:
- `new` → `triaged` (when analyst reviews)
- `triaged` → `closed` (when resolved or false positive)
- `new` → `closed` (direct closure without triage)
- No transitions from `closed`

**Relationships**:
- Many-to-one with `DetectionRun` (run_id)
- Many-to-one with `Detector` (detector_id)
- Optional one-to-one with `Investigation` (via investigation_id in metadata, not FK)

### TransactionWindow (Snowflake)

Represents aggregated transaction metrics for a 15-minute window per cohort. Stored in Snowflake `marts_txn_window` table.

**Attributes**:
- `window_start` (TIMESTAMP_NTZ, Primary Key): Start of 15-minute window
- `window_end` (TIMESTAMP_NTZ): End of 15-minute window
- `merchant_id` (VARCHAR, Primary Key): Merchant identifier
- `channel` (VARCHAR, Primary Key): Channel (web, mobile, api, other)
- `geo` (VARCHAR, Primary Key): Geographic region (e.g., US-CA, US-NY)
- `tx_count` (NUMBER): Total transaction count
- `unique_users` (NUMBER): Count of distinct users
- `unique_cards` (NUMBER): Count of distinct cards
- `unique_devices` (NUMBER): Count of distinct devices
- `amount_mean` (FLOAT): Mean transaction amount
- `amount_p90` (FLOAT): 90th percentile transaction amount
- `amount_std` (FLOAT): Standard deviation of transaction amounts
- `decline_rate` (FLOAT): Proportion of declined transactions
- `refund_rate` (FLOAT): Proportion of refunded transactions
- `cnp_share` (FLOAT): Proportion of card-not-present transactions
- `tx_per_user` (FLOAT): Average transactions per user
- `new_user_share` (FLOAT): Proportion of new users
- `method_share_card` (FLOAT): Proportion of card payment method
- `method_share_ach` (FLOAT): Proportion of ACH payment method
- `method_share_alt` (FLOAT): Proportion of alternative payment methods

**Primary Key**: (window_start, merchant_id, channel, geo)

**Validation Rules**:
- `window_end` = `window_start` + 15 minutes
- All rate/share fields must be between 0 and 1
- All count fields must be >= 0
- All amount fields must be >= 0

## Relationships Summary

```
Detector (1) ──< (many) DetectionRun
DetectionRun (1) ──< (many) AnomalyEvent
Detector (1) ──< (many) AnomalyEvent
TransactionWindow (Snowflake) ──> (read by) DetectionRun
```

## Indexes

**PostgreSQL Indexes** (to be created via Alembic migration):

```sql
-- Detectors
CREATE INDEX idx_detectors_enabled ON detectors(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_detectors_type ON detectors(type);

-- Detection Runs
CREATE INDEX idx_detection_runs_detector_id ON detection_runs(detector_id);
CREATE INDEX idx_detection_runs_status ON detection_runs(status);
CREATE INDEX idx_detection_runs_window ON detection_runs(window_from, window_to);
CREATE INDEX idx_detection_runs_started_at ON detection_runs(started_at DESC);

-- Anomaly Events
CREATE INDEX idx_anomaly_events_run_id ON anomaly_events(run_id);
CREATE INDEX idx_anomaly_events_detector_id ON anomaly_events(detector_id);
CREATE INDEX idx_anomaly_events_severity ON anomaly_events(severity) WHERE severity IS NOT NULL;
CREATE INDEX idx_anomaly_events_status ON anomaly_events(status);
CREATE INDEX idx_anomaly_events_window ON anomaly_events(window_start, window_end);
CREATE INDEX idx_anomaly_events_created_at ON anomaly_events(created_at DESC);
CREATE INDEX idx_anomaly_events_cohort ON anomaly_events USING GIN(cohort);
CREATE INDEX idx_anomaly_events_metric ON anomaly_events(metric);
```

**Snowflake Indexes** (if supported, otherwise use clustering):

```sql
-- Clustering key for efficient window queries
ALTER TABLE marts_txn_window CLUSTER BY (window_start, merchant_id, channel, geo);
```

## Data Volume Estimates

- **Detectors**: ~10-50 detectors (low volume, mostly reads)
- **Detection Runs**: ~96 runs/day per detector (every 15 minutes) = ~1,000-5,000 runs/day total
- **Anomaly Events**: ~1-5% of windows flagged = ~10-50 anomalies/day per detector = ~100-2,500 anomalies/day total
- **Transaction Windows**: ~96 windows/day per cohort × ~1,000 cohorts = ~96,000 windows/day

## Retention Policy

- **Detectors**: Keep indefinitely (configuration data)
- **Detection Runs**: Keep 90 days (for audit and replay)
- **Anomaly Events**: Keep 180 days (for investigation and analysis)
- **Transaction Windows**: Managed by Snowflake (outside this service scope)

## Constraints

- Foreign key constraints enforce referential integrity
- Check constraints enforce valid enum values
- NOT NULL constraints ensure required fields
- Unique constraints on primary keys
- JSONB validation via application layer (Pydantic models)

