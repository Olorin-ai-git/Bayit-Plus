-- PostgreSQL Migration: IP Risk Scores Table
-- Feature: 001-composio-tools-integration
-- Version: 008
-- Description: Create ip_risk_scores table for MaxMind minFraud risk scores
-- Note: Analytics tables are persisted in PostgreSQL (Snowflake is only for transaction data source)
-- PostgreSQL-specific: Uses JSONB, gen_random_uuid(), CHECK constraints

-- =============================================================================
-- Table: ip_risk_scores
-- Purpose: Store IP risk scores from MaxMind minFraud API
-- =============================================================================
CREATE TABLE IF NOT EXISTS ip_risk_scores (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Transaction and IP Identification
    transaction_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,  -- IPv6 max length is 45 chars
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Risk Score Data
    risk_score FLOAT NOT NULL CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    
    -- Proxy/VPN Detection
    is_proxy BOOLEAN DEFAULT FALSE,
    is_vpn BOOLEAN DEFAULT FALSE,
    is_tor BOOLEAN DEFAULT FALSE,
    
    -- Geolocation Data (stored as JSONB for flexibility)
    geolocation_data JSONB,  -- Country, region, city, coordinates
    
    -- Velocity Signals (stored as JSONB)
    velocity_signals JSONB,  -- Transaction counts, time windows
    
    -- Provider Information
    provider VARCHAR(50) NOT NULL DEFAULT 'maxmind' CHECK (provider IN ('maxmind', 'abuseipdb')),
    
    -- Timestamps
    scored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ip_risk_scores
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_transaction_id ON ip_risk_scores(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_ip_address ON ip_risk_scores(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_tenant_id ON ip_risk_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_risk_score ON ip_risk_scores(risk_score);
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_scored_at ON ip_risk_scores(scored_at);
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_provider ON ip_risk_scores(provider);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_tenant_ip ON ip_risk_scores(tenant_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_tenant_transaction ON ip_risk_scores(tenant_id, transaction_id);

-- Index for high-risk IPs
CREATE INDEX IF NOT EXISTS idx_ip_risk_scores_high_risk ON ip_risk_scores(risk_score DESC) WHERE risk_score > 0.7;
