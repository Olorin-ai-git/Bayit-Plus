-- PostgreSQL Migration: Device Features Views and Functions
-- Feature: 001-composio-tools-integration
-- Version: 009
-- Description: Create SQL views and functions for device feature computation
-- Note: Analytics tables are persisted in PostgreSQL (Snowflake is only for transaction data source)
-- PostgreSQL-specific: Uses EXTRACT(EPOCH), plpgsql functions, CREATE OR REPLACE VIEW

-- =============================================================================
-- View: device_features_shared_count
-- Purpose: Compute shared_device_count (number of unique users per device)
-- =============================================================================
CREATE OR REPLACE VIEW device_features_shared_count AS
SELECT 
    device_id,
    tenant_id,
    COUNT(DISTINCT user_id) as shared_device_count,
    COUNT(DISTINCT transaction_id) as transaction_count,
    MIN(captured_at) as first_seen,
    MAX(captured_at) as last_seen
FROM device_signals
WHERE user_id IS NOT NULL
GROUP BY device_id, tenant_id;

-- =============================================================================
-- View: device_features_age
-- Purpose: Compute device_age (time since first seen)
-- =============================================================================
CREATE OR REPLACE VIEW device_features_age AS
SELECT 
    device_id,
    tenant_id,
    first_seen,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - first_seen)) / 86400 as device_age_days,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - first_seen)) / 3600 as device_age_hours
FROM (
    SELECT 
        device_id,
        tenant_id,
        MIN(captured_at) as first_seen
    FROM device_signals
    GROUP BY device_id, tenant_id
) device_first_seen;

-- =============================================================================
-- Function: compute_device_risk_score
-- Purpose: Compute device_risk_score based on shared_device_count and device_age
-- =============================================================================
CREATE OR REPLACE FUNCTION compute_device_risk_score(
    device_id_param VARCHAR(255),
    tenant_id_param VARCHAR(255) DEFAULT NULL
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
    shared_count INTEGER;
    age_days FLOAT;
    risk_score FLOAT := 0.2;  -- Default low risk
BEGIN
    -- Get shared device count
    SELECT shared_device_count INTO shared_count
    FROM device_features_shared_count
    WHERE device_id = device_id_param
      AND (tenant_id_param IS NULL OR tenant_id = tenant_id_param)
    LIMIT 1;
    
    -- Get device age
    SELECT device_age_days INTO age_days
    FROM device_features_age
    WHERE device_id = device_id_param
      AND (tenant_id_param IS NULL OR tenant_id = tenant_id_param)
    LIMIT 1;
    
    -- Compute risk score based on features
    IF shared_count IS NULL THEN
        shared_count := 0;
    END IF;
    
    IF age_days IS NULL THEN
        age_days := 0;
    END IF;
    
    -- High risk: device shared across many accounts
    IF shared_count > 10 THEN
        risk_score := 0.9;
    ELSIF shared_count > 5 THEN
        risk_score := 0.7;
    ELSIF shared_count > 2 THEN
        risk_score := 0.5;
    END IF;
    
    -- Medium risk: new device (potential fraud)
    IF age_days < 1 THEN
        risk_score := GREATEST(risk_score, 0.6);
    ELSIF age_days < 7 THEN
        risk_score := GREATEST(risk_score, 0.4);
    END IF;
    
    RETURN risk_score;
END;
$$;

-- Note: Indexes cannot be created on regular views in PostgreSQL
-- If indexes are needed, consider converting these to materialized views
