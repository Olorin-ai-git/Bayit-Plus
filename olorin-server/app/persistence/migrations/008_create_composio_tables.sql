-- Database Migration: Composio Tools Integration Tables
-- Feature: 001-composio-tools-integration
-- Version: 008
-- Description: Add tables for Composio OAuth connections, SOAR playbook executions, and action audit logs
--
-- SYSTEM MANDATE Compliance:
-- - Schema-locked approach (manual SQL migration)
-- - NO auto-migration logic
-- - Explicit table, column, index, and constraint definitions
-- - Fail-fast on conflicts or errors

-- =============================================================================
-- Table 1: composio_connections
-- Purpose: Store tenant-scoped OAuth connections to external tools via Composio
-- =============================================================================
CREATE TABLE IF NOT EXISTS composio_connections (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    
    -- Tenant and Connection Info
    tenant_id VARCHAR(255) NOT NULL,
    toolkit_name VARCHAR(100) NOT NULL,  -- e.g., 'stripe', 'shopify', 'okta'
    connection_id VARCHAR(255) NOT NULL,  -- Composio connection ID
    
    -- Connection Status
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
    
    -- Encrypted Credentials (AES-256-GCM encrypted at rest)
    encrypted_access_token TEXT NOT NULL,
    refresh_token TEXT,  -- Encrypted at rest
    
    -- Timestamps
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(tenant_id, toolkit_name, connection_id)
);

-- Indexes for composio_connections
CREATE INDEX IF NOT EXISTS idx_composio_connections_tenant ON composio_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_composio_connections_status ON composio_connections(status);
CREATE INDEX IF NOT EXISTS idx_composio_connections_toolkit ON composio_connections(toolkit_name);

-- =============================================================================
-- Table 2: soar_playbook_executions
-- Purpose: Track SOAR playbook execution history and outcomes
-- =============================================================================
CREATE TABLE IF NOT EXISTS soar_playbook_executions (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    
    -- Playbook and Context
    playbook_id VARCHAR(255) NOT NULL,
    investigation_id VARCHAR(255),
    anomaly_id VARCHAR(255),
    tenant_id VARCHAR(255) NOT NULL,
    trigger_reason TEXT,
    
    -- Execution Status
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    
    -- Timestamps
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Execution Results
    actions_executed TEXT,  -- JSON array of action execution results
    error_message TEXT
);

-- Indexes for soar_playbook_executions
CREATE INDEX IF NOT EXISTS idx_soar_executions_tenant ON soar_playbook_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_soar_executions_investigation ON soar_playbook_executions(investigation_id);
CREATE INDEX IF NOT EXISTS idx_soar_executions_status ON soar_playbook_executions(status);
CREATE INDEX IF NOT EXISTS idx_soar_executions_started ON soar_playbook_executions(started_at);

-- =============================================================================
-- Table 3: composio_action_audit
-- Purpose: Audit log for all Composio action executions
-- =============================================================================
CREATE TABLE IF NOT EXISTS composio_action_audit (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    
    -- Action Identification
    action_id VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255),  -- Links to soar_playbook_executions.id
    toolkit_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL,  -- e.g., 'stripe_void_payment'
    
    -- Tenant and Connection
    tenant_id VARCHAR(255) NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    
    -- Action Parameters and Results
    parameters TEXT,  -- JSON object
    result TEXT,  -- JSON object
    
    -- Execution Status
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Indexes for composio_action_audit
CREATE INDEX IF NOT EXISTS idx_composio_audit_tenant ON composio_action_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_composio_audit_execution ON composio_action_audit(execution_id);
CREATE INDEX IF NOT EXISTS idx_composio_audit_status ON composio_action_audit(status);
CREATE INDEX IF NOT EXISTS idx_composio_audit_executed ON composio_action_audit(executed_at);

