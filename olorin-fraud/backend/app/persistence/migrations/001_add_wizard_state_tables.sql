-- Database Migration: Investigation State Tables
-- Feature: 005-polling-and-persistence
-- Version: 001
-- Description: Add tables for investigation state persistence with lifecycle tracking
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: investigation_states
-- Purpose: Persist investigation state with lifecycle tracking
-- Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED
-- =============================================================================
CREATE TABLE IF NOT EXISTS investigation_states (
    -- Primary Key
    investigation_id VARCHAR(255) PRIMARY KEY,

    -- Ownership
    user_id VARCHAR(255) NOT NULL,

    -- Investigation Lifecycle
    lifecycle_stage VARCHAR(50) NOT NULL,
    settings_json TEXT,
    progress_json TEXT,
    results_json TEXT,
    status VARCHAR(50) NOT NULL,

    -- Optimistic Locking
    version INTEGER DEFAULT 1 NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP,

    -- Constraints
    CHECK (lifecycle_stage IN ('CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED')),
    CHECK (status IN ('CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELLED')),
    CHECK (version >= 1)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_investigation_states_user ON investigation_states(user_id);
CREATE INDEX IF NOT EXISTS idx_investigation_states_status ON investigation_states(status);
CREATE INDEX IF NOT EXISTS idx_investigation_states_updated ON investigation_states(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigation_states_lifecycle ON investigation_states(lifecycle_stage);

-- =============================================================================
-- Table 2: investigation_templates
-- Purpose: User-created templates for investigation reuse
-- =============================================================================
CREATE TABLE IF NOT EXISTS investigation_templates (
    -- Primary Key
    template_id VARCHAR(255) PRIMARY KEY,

    -- Ownership
    user_id VARCHAR(255) NOT NULL,

    -- Template Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT,

    -- Template Data
    template_json TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Usage Tracking
    usage_count INTEGER DEFAULT 0 NOT NULL,
    last_used TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, name),
    CHECK (usage_count >= 0)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_templates_user ON investigation_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON investigation_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_updated ON investigation_templates(updated_at DESC);

-- =============================================================================
-- Table 3: investigation_audit_log
-- Purpose: Audit trail for investigation lifecycle changes
-- =============================================================================
CREATE TABLE IF NOT EXISTS investigation_audit_log (
    -- Primary Key
    entry_id VARCHAR(255) PRIMARY KEY,

    -- Entity References
    investigation_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,

    -- Action Details
    action_type VARCHAR(100) NOT NULL,
    changes_json TEXT,
    state_snapshot_json TEXT,
    source VARCHAR(50) NOT NULL,

    -- Version Tracking
    from_version INTEGER,
    to_version INTEGER,

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CHECK (source IN ('POLLING', 'USER', 'SYSTEM', 'API'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_audit_log_investigation ON investigation_audit_log(investigation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON investigation_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON investigation_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON investigation_audit_log(action_type);

-- =============================================================================
-- Migration Verification Queries
-- =============================================================================
-- These queries can be used to verify the migration was successful

-- Verify table creation
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('investigation_states', 'investigation_templates', 'investigation_audit_log');

-- Verify indexes
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('investigation_states', 'investigation_templates', 'investigation_audit_log');

-- Count columns
-- PRAGMA table_info(investigation_states);
-- PRAGMA table_info(investigation_templates);
-- PRAGMA table_info(investigation_audit_log);
