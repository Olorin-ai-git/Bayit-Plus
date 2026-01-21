-- Database Migration: Experiments Tables
-- Feature: 001-analytics-miroservice-implementation
-- Version: 002
-- Description: Add tables for A/B testing and experiment management
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: experiments
-- Purpose: Store experiment definitions and metadata
-- =============================================================================
CREATE TABLE IF NOT EXISTS experiments (
    -- Primary Key
    experiment_id VARCHAR(255) PRIMARY KEY,

    -- Experiment Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',

    -- Time Period
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,

    -- Traffic Configuration (JSON: {"variant_id": percentage})
    traffic_split TEXT NOT NULL,

    -- Success Metrics (JSON array: ["precision", "recall", ...])
    success_metrics TEXT NOT NULL,

    -- Guardrails (JSON array of guardrail objects)
    guardrails TEXT NOT NULL,

    -- Variants (JSON array of variant configurations)
    variants TEXT NOT NULL,

    -- Ownership
    created_by VARCHAR(255) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    CHECK (start_date <= COALESCE(end_date, '9999-12-31'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_start_date ON experiments(start_date);
CREATE INDEX IF NOT EXISTS idx_experiments_created_by ON experiments(created_by);
CREATE INDEX IF NOT EXISTS idx_experiments_updated ON experiments(updated_at DESC);

-- =============================================================================
-- Table 2: experiment_variants
-- Purpose: Store variant-specific metrics and results
-- =============================================================================
CREATE TABLE IF NOT EXISTS experiment_variants (
    -- Primary Key
    variant_id VARCHAR(255) PRIMARY KEY,

    -- Foreign Key
    experiment_id VARCHAR(255) NOT NULL,

    -- Variant Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration (JSON: modelVersion, ruleVersion, thresholds, rules)
    configuration TEXT NOT NULL,

    -- Metrics (JSON: precision, recall, f1_score, etc.)
    metrics TEXT,

    -- Statistical Significance (JSON: pValue, confidenceInterval, isSignificant)
    statistical_significance TEXT,

    -- Lift (percentage improvement over control)
    lift DECIMAL(10, 4),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Key Constraint
    FOREIGN KEY (experiment_id) REFERENCES experiments(experiment_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_variants_experiment ON experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_variants_lift ON experiment_variants(lift DESC);

-- =============================================================================
-- Table 3: experiment_results
-- Purpose: Store aggregated experiment results and conclusions
-- =============================================================================
CREATE TABLE IF NOT EXISTS experiment_results (
    -- Primary Key
    result_id VARCHAR(255) PRIMARY KEY,

    -- Foreign Key
    experiment_id VARCHAR(255) NOT NULL UNIQUE,

    -- Results
    winner_variant_id VARCHAR(255),
    conclusion TEXT,
    recommendation VARCHAR(50),

    -- Impact Estimate (JSON: precisionChange, recallChange, costSavings)
    impact_estimate TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Key Constraints (SQLite compatible)
    FOREIGN KEY (experiment_id) REFERENCES experiments(experiment_id) ON DELETE CASCADE,
    FOREIGN KEY (winner_variant_id) REFERENCES experiment_variants(variant_id) ON DELETE SET NULL,
    CHECK (recommendation IN ('promote', 'reject', 'extend') OR recommendation IS NULL)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_results_experiment ON experiment_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_results_winner ON experiment_results(winner_variant_id);

-- =============================================================================
-- Migration Verification Queries
-- =============================================================================
-- These queries can be used to verify the migration was successful

-- Verify table creation
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('experiments', 'experiment_variants', 'experiment_results');

-- Verify indexes
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('experiments', 'experiment_variants', 'experiment_results');

-- Count columns
-- PRAGMA table_info(experiments);
-- PRAGMA table_info(experiment_variants);
-- PRAGMA table_info(experiment_results);

