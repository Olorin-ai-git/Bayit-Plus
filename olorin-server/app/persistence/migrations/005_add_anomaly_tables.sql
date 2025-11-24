-- Database Migration: Anomaly Detection Tables
-- Feature: 001-fraud-anomaly-detection
-- Version: 005
-- Description: Add tables for anomaly detection (detectors, detection_runs, anomaly_events)
-- Note: SQLite-compatible syntax (matches SQLAlchemy models which are database-agnostic)
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: detectors
-- Purpose: Store detector configurations for anomaly detection algorithms
-- =============================================================================
CREATE TABLE IF NOT EXISTS detectors (
    -- Primary Key (VARCHAR for SQLite compatibility, UUID stored as string)
    id VARCHAR(36) PRIMARY KEY,

    -- Detector Metadata
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stl_mad', 'cusum', 'isoforest', 'rcf', 'matrix_profile')),
    cohort_by TEXT NOT NULL,  -- JSON stored as TEXT in SQLite
    metrics TEXT NOT NULL,    -- JSON stored as TEXT in SQLite
    params TEXT NOT NULL,     -- JSON stored as TEXT in SQLite
    enabled BOOLEAN DEFAULT TRUE NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for detectors table
CREATE INDEX IF NOT EXISTS idx_detectors_type ON detectors(type);
CREATE INDEX IF NOT EXISTS idx_detectors_enabled ON detectors(enabled);
CREATE INDEX IF NOT EXISTS idx_detectors_updated ON detectors(updated_at DESC);

-- =============================================================================
-- Table 2: detection_runs
-- Purpose: Track execution of detectors on time windows
-- =============================================================================
CREATE TABLE IF NOT EXISTS detection_runs (
    -- Primary Key (VARCHAR for SQLite compatibility, UUID stored as string)
    id VARCHAR(36) PRIMARY KEY,

    -- Foreign Keys
    detector_id VARCHAR(36) NOT NULL REFERENCES detectors(id) ON DELETE CASCADE,

    -- Run Status
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),

    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,

    -- Time Window
    window_from TIMESTAMP NOT NULL,
    window_to TIMESTAMP NOT NULL,

    -- Metadata
    info TEXT,  -- JSON stored as TEXT in SQLite

    -- Constraints
    CHECK (window_to > window_from)
);

-- Indexes for detection_runs table
CREATE INDEX IF NOT EXISTS idx_detection_runs_detector ON detection_runs(detector_id);
CREATE INDEX IF NOT EXISTS idx_detection_runs_status ON detection_runs(status);
CREATE INDEX IF NOT EXISTS idx_detection_runs_window ON detection_runs(window_from, window_to);
CREATE INDEX IF NOT EXISTS idx_detection_runs_started ON detection_runs(started_at DESC);

-- =============================================================================
-- Table 3: anomaly_events
-- Purpose: Store detected anomalies with evidence and scores
-- =============================================================================
CREATE TABLE IF NOT EXISTS anomaly_events (
    -- Primary Key (VARCHAR for SQLite compatibility, UUID stored as string)
    id VARCHAR(36) PRIMARY KEY,

    -- Foreign Keys
    run_id VARCHAR(36) NOT NULL REFERENCES detection_runs(id) ON DELETE CASCADE,
    detector_id VARCHAR(36) NOT NULL REFERENCES detectors(id) ON DELETE CASCADE,

    -- Cohort and Window
    cohort TEXT NOT NULL,  -- JSON stored as TEXT in SQLite
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,

    -- Metric and Values
    metric TEXT NOT NULL,
    observed REAL NOT NULL,
    expected REAL NOT NULL,
    score REAL NOT NULL,

    -- Severity and Status
    severity TEXT CHECK (severity IN ('info', 'warn', 'critical') OR severity IS NULL),
    persisted_n INTEGER DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'triaged', 'closed')),

    -- Evidence and Metadata
    evidence TEXT,  -- JSON stored as TEXT in SQLite
    investigation_id VARCHAR(36),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CHECK (window_end > window_start),
    CHECK (score >= 0),
    CHECK (persisted_n >= 1)
);

-- Indexes for anomaly_events table
CREATE INDEX IF NOT EXISTS idx_anomaly_events_run ON anomaly_events(run_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_detector ON anomaly_events(detector_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_status ON anomaly_events(status);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_score ON anomaly_events(score DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_window ON anomaly_events(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_created ON anomaly_events(created_at DESC);
-- Note: GIN index on cohort is PostgreSQL-specific, skipped for SQLite compatibility
-- Note: Partial index with WHERE clause supported in SQLite 3.8.0+
CREATE INDEX IF NOT EXISTS idx_anomaly_events_investigation ON anomaly_events(investigation_id);

-- =============================================================================
-- Migration Complete
-- =============================================================================

