-- Database Migration: Replay Scenarios Tables
-- Feature: 001-analytics-miroservice-implementation
-- Version: 003
-- Description: Add tables for replay and backtesting scenarios
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: replay_scenarios
-- Purpose: Store replay scenario configurations
-- =============================================================================
CREATE TABLE IF NOT EXISTS replay_scenarios (
    -- Primary Key
    scenario_id VARCHAR(255) PRIMARY KEY,

    -- Scenario Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',

    -- Time Period
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,

    -- Configuration Overrides (JSON: modelVersion, ruleVersion, thresholds, rules)
    configuration TEXT NOT NULL,

    -- Ownership
    created_by VARCHAR(255) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,

    -- Constraints
    CHECK (status IN ('draft', 'running', 'completed', 'failed', 'cancelled')),
    CHECK (start_date <= end_date)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_replay_scenarios_status ON replay_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_replay_scenarios_start_date ON replay_scenarios(start_date);
CREATE INDEX IF NOT EXISTS idx_replay_scenarios_created_by ON replay_scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_replay_scenarios_updated ON replay_scenarios(updated_at DESC);

-- =============================================================================
-- Table 2: replay_results
-- Purpose: Store replay execution results
-- =============================================================================
CREATE TABLE IF NOT EXISTS replay_results (
    -- Primary Key
    result_id VARCHAR(255) PRIMARY KEY,

    -- Foreign Key
    scenario_id VARCHAR(255) NOT NULL,

    -- Results Summary
    total_decisions INTEGER NOT NULL,
    would_decline INTEGER NOT NULL,
    would_approve INTEGER NOT NULL,
    would_catch_fraud INTEGER NOT NULL,
    would_miss_fraud INTEGER NOT NULL,

    -- Metrics (JSON: precision, recall, f1_score, etc.)
    metrics TEXT,

    -- Comparison with Production (JSON: diff metrics)
    production_comparison TEXT,

    -- Impact Metrics (JSON: costSavings, falsePositiveReduction, etc.)
    impact_metrics TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Key Constraint
    FOREIGN KEY (scenario_id) REFERENCES replay_scenarios(scenario_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_replay_results_scenario ON replay_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_replay_results_created ON replay_results(created_at DESC);

-- =============================================================================
-- Migration Verification Queries
-- =============================================================================
-- These queries can be used to verify the migration was successful

-- Verify table creation
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('replay_scenarios', 'replay_results');

-- Verify indexes
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('replay_scenarios', 'replay_results');

-- Count columns
-- PRAGMA table_info(replay_scenarios);
-- PRAGMA table_info(replay_results);

