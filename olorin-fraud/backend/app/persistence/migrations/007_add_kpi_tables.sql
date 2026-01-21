-- Database Migration: KPI Dashboard Tables
-- Feature: KPI Dashboard Microservice
-- Version: 007
-- Description: Add tables for KPI metrics (daily metrics, threshold sweep, breakdowns)
-- Note: SQLite-compatible syntax (matches SQLAlchemy models which are database-agnostic)
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: kpi_daily_metrics
-- Purpose: Store daily aggregated KPI metrics for fraud detection
-- =============================================================================
CREATE TABLE IF NOT EXISTS kpi_daily_metrics (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY,
    
    -- Tenant and Pilot Scoping
    pilot_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    metric_date TIMESTAMP NOT NULL,
    
    -- Quality Metrics
    precision REAL,
    recall REAL,
    fpr REAL,
    pr_auc REAL,
    
    -- Confusion Matrix Counts
    true_positives INTEGER NOT NULL DEFAULT 0,
    false_positives INTEGER NOT NULL DEFAULT 0,
    true_negatives INTEGER NOT NULL DEFAULT 0,
    false_negatives INTEGER NOT NULL DEFAULT 0,
    
    -- Business Impact Metrics
    fraud_amount_avoided REAL,
    false_positive_cost REAL,
    net_savings REAL,
    roi_percentage REAL,
    
    -- Operational Metrics
    approval_rate REAL,
    review_rate REAL,
    decline_rate REAL,
    latency_p95 REAL,
    error_rate REAL,
    drift_psi REAL,
    
    -- Model Version
    model_version VARCHAR(50),
    
    -- Label Maturity Window
    label_maturity_days INTEGER NOT NULL DEFAULT 45,
    
    -- Metadata
    total_events INTEGER NOT NULL DEFAULT 0,
    labeled_events INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for kpi_daily_metrics table
CREATE INDEX IF NOT EXISTS idx_kpi_daily_pilot_id ON kpi_daily_metrics(pilot_id);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_tenant_id ON kpi_daily_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_metric_date ON kpi_daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_model_version ON kpi_daily_metrics(model_version);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_pilot_date ON kpi_daily_metrics(pilot_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_tenant_date ON kpi_daily_metrics(tenant_id, metric_date);

-- =============================================================================
-- Table 2: kpi_threshold_sweep
-- Purpose: Store threshold sweep analysis for profit curve and PR curve
-- =============================================================================
CREATE TABLE IF NOT EXISTS kpi_threshold_sweep (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY,
    
    -- Tenant and Pilot Scoping
    pilot_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    sweep_date TIMESTAMP NOT NULL,
    model_version VARCHAR(50),
    
    -- Threshold Value
    threshold REAL NOT NULL,
    
    -- Metrics at this threshold
    precision REAL,
    recall REAL,
    fpr REAL,
    
    -- Business Metrics
    profit REAL,
    fraud_amount_avoided REAL,
    false_positive_cost REAL,
    
    -- Counts
    true_positives INTEGER NOT NULL DEFAULT 0,
    false_positives INTEGER NOT NULL DEFAULT 0,
    true_negatives INTEGER NOT NULL DEFAULT 0,
    false_negatives INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for kpi_threshold_sweep table
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_pilot_id ON kpi_threshold_sweep(pilot_id);
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_tenant_id ON kpi_threshold_sweep(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_sweep_date ON kpi_threshold_sweep(sweep_date);
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_model_version ON kpi_threshold_sweep(model_version);
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_threshold ON kpi_threshold_sweep(threshold);
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_pilot_threshold ON kpi_threshold_sweep(pilot_id, threshold);
CREATE INDEX IF NOT EXISTS idx_kpi_sweep_tenant_date ON kpi_threshold_sweep(tenant_id, sweep_date);

-- =============================================================================
-- Table 3: kpi_breakdown
-- Purpose: Store KPI breakdowns by merchant, segment, method, or model version
-- =============================================================================
CREATE TABLE IF NOT EXISTS kpi_breakdown (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY,
    
    -- Tenant and Pilot Scoping
    pilot_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    breakdown_date TIMESTAMP NOT NULL,
    
    -- Breakdown Dimensions
    breakdown_type VARCHAR(50) NOT NULL,
    breakdown_value VARCHAR(200) NOT NULL,
    
    -- Aggregated Metrics
    precision REAL,
    recall REAL,
    fpr REAL,
    total_events INTEGER NOT NULL DEFAULT 0,
    fraud_count INTEGER NOT NULL DEFAULT 0,
    fraud_amount REAL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for kpi_breakdown table
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_pilot_id ON kpi_breakdown(pilot_id);
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_tenant_id ON kpi_breakdown(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_breakdown_date ON kpi_breakdown(breakdown_date);
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_type ON kpi_breakdown(breakdown_type);
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_value ON kpi_breakdown(breakdown_value);
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_pilot_type ON kpi_breakdown(pilot_id, breakdown_type, breakdown_value);
CREATE INDEX IF NOT EXISTS idx_kpi_breakdown_tenant_date ON kpi_breakdown(tenant_id, breakdown_date);

-- =============================================================================
-- Migration Complete
-- =============================================================================





