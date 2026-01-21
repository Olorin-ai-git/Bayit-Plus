-- Database Migration: Pipeline Observability Tables
-- Feature: 001-analytics-miroservice-implementation
-- Version: 004
-- Description: Add tables for pipeline health monitoring and audit logging
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: pipeline_health
-- Purpose: Store pipeline health metrics and SLO status
-- =============================================================================
CREATE TABLE IF NOT EXISTS pipeline_health (
    -- Primary Key
    health_id VARCHAR(255) PRIMARY KEY,

    -- Health Metrics
    freshness_minutes DECIMAL(10, 2) NOT NULL,
    completeness DECIMAL(5, 4) NOT NULL,
    success_rate DECIMAL(5, 4) NOT NULL,

    -- SLO Status
    freshness_slo_met BOOLEAN NOT NULL,
    completeness_slo_met BOOLEAN NOT NULL,
    success_rate_slo_met BOOLEAN NOT NULL,

    -- Overall Status
    overall_status VARCHAR(50) NOT NULL,

    -- Timestamp
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy')),
    CHECK (completeness >= 0 AND completeness <= 1),
    CHECK (success_rate >= 0 AND success_rate <= 1)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_pipeline_health_recorded ON pipeline_health(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_health_status ON pipeline_health(overall_status);

-- =============================================================================
-- Table 2: audit_logs
-- Purpose: Store audit trail for all system actions
-- Note: Schema matches AuditLog model in app/persistence/models.py
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    -- Primary Key
    id VARCHAR(255) PRIMARY KEY,

    -- User Information
    user_id VARCHAR(255),

    -- Action Details
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255),

    -- Action details (stored as JSON)
    details TEXT,

    -- Request metadata
    ip VARCHAR(255),
    user_agent VARCHAR(255),

    -- Status
    success BOOLEAN NOT NULL,
    error_message TEXT,

    -- Timestamps (matching TimestampMixin in model)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance optimization
-- Note: Schema matches AuditLog model - using 'action' not 'action_type', 'id' not 'log_id'
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

-- =============================================================================
-- Migration Verification Queries
-- =============================================================================
-- These queries can be used to verify the migration was successful

-- Verify table creation
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('pipeline_health', 'audit_logs');

-- Verify indexes
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('pipeline_health', 'audit_logs');

-- Count columns
-- PRAGMA table_info(pipeline_health);
-- PRAGMA table_info(audit_logs);

