-- PostgreSQL Migration: Device Signals Table
-- Feature: 001-composio-tools-integration
-- Version: 008
-- Description: Create device_signals table for device fingerprinting data
-- Note: Analytics tables are persisted in PostgreSQL (Snowflake is only for transaction data source)
-- PostgreSQL-specific: Uses JSONB, gen_random_uuid(), CHECK constraints

-- =============================================================================
-- Table: device_signals
-- Purpose: Store device fingerprinting signals from client-side SDKs
-- =============================================================================
CREATE TABLE IF NOT EXISTS device_signals (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Device Identification
    device_id VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255),
    user_id VARCHAR(255),
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Device Fingerprint Data
    confidence_score FLOAT,
    browser_fingerprint JSONB,  -- Browser characteristics (user_agent, screen_resolution, etc.)
    behavioral_signals JSONB,  -- Mouse movements, keystroke timing, scroll patterns
    
    -- SDK Information
    sdk_provider VARCHAR(50) NOT NULL CHECK (sdk_provider IN ('fingerprint_pro', 'seon', 'ipqs')),
    
    -- Timestamps
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for device_signals
CREATE INDEX IF NOT EXISTS idx_device_signals_device_id ON device_signals(device_id);
CREATE INDEX IF NOT EXISTS idx_device_signals_transaction_id ON device_signals(transaction_id);
CREATE INDEX IF NOT EXISTS idx_device_signals_user_id ON device_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_device_signals_tenant_id ON device_signals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_signals_sdk_provider ON device_signals(sdk_provider);
CREATE INDEX IF NOT EXISTS idx_device_signals_captured_at ON device_signals(captured_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_device_signals_tenant_device ON device_signals(tenant_id, device_id);
CREATE INDEX IF NOT EXISTS idx_device_signals_tenant_user ON device_signals(tenant_id, user_id);
