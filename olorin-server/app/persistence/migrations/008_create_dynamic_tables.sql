-- PostgreSQL Migration: Features Curated View
-- Feature: 001-composio-tools-integration
-- Version: 008
-- Description: Create features_curated view that aggregates device_signals and ip_risk_scores
-- Note: Analytics tables are persisted in PostgreSQL (Snowflake is only for transaction data source)
--       This replaces Snowflake Dynamic Tables with a PostgreSQL materialized view
-- PostgreSQL-specific: Uses JSONB, MATERIALIZED VIEW, COALESCE

-- =============================================================================
-- View: features_curated
-- Purpose: Aggregated view of device signals and IP risk scores for fraud detection
-- Note: This is a regular view. For better performance, consider creating a materialized view
--       and refreshing it periodically (e.g., every minute via a scheduled job)
-- =============================================================================

-- First, create a staging table for events if it doesn't exist
CREATE TABLE IF NOT EXISTS events_staging (
    event_id VARCHAR(255) PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_staging_transaction_id ON events_staging(transaction_id);
CREATE INDEX IF NOT EXISTS idx_events_staging_timestamp ON events_staging(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_staging_tenant_id ON events_staging(tenant_id);

-- Create the features_curated view
CREATE OR REPLACE VIEW features_curated AS
SELECT 
    e.event_id,
    e.timestamp,
    e.transaction_id,
    e.tenant_id,
    e.event_type,
    
    -- Device Signal Features
    ds.device_id,
    ds.confidence_score as device_confidence_score,
    ds.browser_fingerprint,
    ds.behavioral_signals,
    ds.sdk_provider,
    
    -- IP Risk Features
    ip.risk_score as ip_risk_score,
    ip.is_proxy,
    ip.is_vpn,
    ip.is_tor,
    ip.geolocation_data as ip_geolocation_data,
    ip.velocity_signals as ip_velocity_signals,
    ip.provider as ip_provider,
    
    -- Graph Features (if available)
    gf.cluster_risk_score,
    gf.shared_device_count,
    gf.co_travel_patterns,
    gf.velocity_across_clusters,
    
    -- Metadata
    e.created_at as event_created_at,
    COALESCE(ds.captured_at, ip.scored_at) as feature_timestamp
FROM events_staging e
LEFT JOIN device_signals ds ON e.transaction_id = ds.transaction_id AND e.tenant_id = ds.tenant_id
LEFT JOIN ip_risk_scores ip ON e.transaction_id = ip.transaction_id AND e.tenant_id = ip.tenant_id
LEFT JOIN graph_features gf ON e.transaction_id = gf.entity_id AND e.tenant_id = gf.tenant_id AND gf.entity_type = 'User';

-- Create a materialized view for better performance (refreshed periodically)
-- This can be refreshed via a scheduled job (e.g., every minute)
CREATE MATERIALIZED VIEW IF NOT EXISTS features_curated_materialized AS
SELECT * FROM features_curated;

-- Indexes on materialized view for performance
CREATE INDEX IF NOT EXISTS idx_features_curated_mv_event_id ON features_curated_materialized(event_id);
CREATE INDEX IF NOT EXISTS idx_features_curated_mv_transaction_id ON features_curated_materialized(transaction_id);
CREATE INDEX IF NOT EXISTS idx_features_curated_mv_tenant_id ON features_curated_materialized(tenant_id);
CREATE INDEX IF NOT EXISTS idx_features_curated_mv_timestamp ON features_curated_materialized(timestamp);
CREATE INDEX IF NOT EXISTS idx_features_curated_mv_risk ON features_curated_materialized(ip_risk_score DESC, cluster_risk_score DESC);

-- Note: To refresh the materialized view, run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY features_curated_materialized;
-- This should be done periodically (e.g., every minute) via a scheduled job
