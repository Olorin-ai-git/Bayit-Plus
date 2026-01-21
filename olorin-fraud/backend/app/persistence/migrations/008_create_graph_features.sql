-- PostgreSQL Migration: Graph Features Table
-- Feature: 001-composio-tools-integration
-- Version: 008
-- Description: Create graph_features table for graph-based fraud detection features
-- Note: Analytics tables are persisted in PostgreSQL (Snowflake is only for transaction data source)
-- PostgreSQL-specific: Uses JSONB, gen_random_uuid(), CHECK constraints

-- =============================================================================
-- Table: graph_features
-- Purpose: Store graph-based fraud detection features (cluster risk, shared devices, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS graph_features (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Entity Identification
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('User', 'Device', 'Card', 'IP')),
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Graph Feature Data
    cluster_risk_score FLOAT CHECK (cluster_risk_score >= 0.0 AND cluster_risk_score <= 1.0),
    shared_device_count INTEGER DEFAULT 0,
    co_travel_patterns JSONB,  -- Co-travel detection results
    velocity_across_clusters JSONB,  -- Velocity analysis across clusters
    
    -- Graph Provider
    graph_provider VARCHAR(50) NOT NULL CHECK (graph_provider IN ('neo4j', 'tigergraph')),
    
    -- Timestamps
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for graph_features
CREATE INDEX IF NOT EXISTS idx_graph_features_entity_id ON graph_features(entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_features_entity_type ON graph_features(entity_type);
CREATE INDEX IF NOT EXISTS idx_graph_features_tenant_id ON graph_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_graph_features_cluster_risk ON graph_features(cluster_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_graph_features_graph_provider ON graph_features(graph_provider);
CREATE INDEX IF NOT EXISTS idx_graph_features_computed_at ON graph_features(computed_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_graph_features_tenant_entity ON graph_features(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_features_high_risk ON graph_features(cluster_risk_score DESC) WHERE cluster_risk_score > 0.7;
