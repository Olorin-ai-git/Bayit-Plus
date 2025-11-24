# Data Model: Composio Tools Integration

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

This document defines the data models for Composio tools integration, including database schemas, entity relationships, and data flow patterns.

## Database Schemas

### PostgreSQL Tables

#### composio_connections

Stores tenant-scoped OAuth connections to external tools via Composio.

```sql
CREATE TABLE composio_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    toolkit_name VARCHAR(100) NOT NULL,  -- e.g., 'stripe', 'shopify', 'okta'
    connection_id VARCHAR(255) NOT NULL,  -- Composio connection ID
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
    encrypted_access_token TEXT NOT NULL,  -- Encrypted at rest
    refresh_token TEXT,  -- Encrypted at rest
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP,
    
    UNIQUE(tenant_id, toolkit_name, connection_id),
    INDEX idx_composio_connections_tenant (tenant_id),
    INDEX idx_composio_connections_status (status),
    INDEX idx_composio_connections_toolkit (toolkit_name)
);
```

**Relationships**:
- `tenant_id` → `tenants.id` (if tenants table exists)
- Used by `soar_playbook_executions` via `connection_id`

#### soar_playbook_executions

Tracks SOAR playbook execution history and outcomes.

```sql
CREATE TABLE soar_playbook_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id VARCHAR(255) NOT NULL,
    investigation_id VARCHAR(255),
    anomaly_id VARCHAR(255),
    tenant_id VARCHAR(255) NOT NULL,
    trigger_reason TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    actions_executed JSONB,  -- Array of action execution results
    error_message TEXT,
    
    INDEX idx_soar_executions_tenant (tenant_id),
    INDEX idx_soar_executions_investigation (investigation_id),
    INDEX idx_soar_executions_status (status),
    INDEX idx_soar_executions_started (started_at)
);
```

**Relationships**:
- `investigation_id` → `investigations.id` (if exists)
- `anomaly_id` → `anomaly_events.id` (if exists)
- `tenant_id` → `tenants.id` (if exists)

#### composio_action_audit

Audit log for all Composio action executions.

```sql
CREATE TABLE composio_action_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255),  -- Links to soar_playbook_executions.id
    toolkit_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL,  -- e.g., 'stripe_void_payment'
    tenant_id VARCHAR(255) NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    parameters JSONB,  -- Action parameters
    result JSONB,  -- Action result
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
    executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    INDEX idx_composio_audit_tenant (tenant_id),
    INDEX idx_composio_audit_execution (execution_id),
    INDEX idx_composio_audit_status (status),
    INDEX idx_composio_audit_executed (executed_at)
);
```

**Relationships**:
- `execution_id` → `soar_playbook_executions.id`
- `connection_id` → `composio_connections.connection_id`

### Snowflake Tables

#### device_signals

Stores device fingerprinting data captured at the edge.

```sql
CREATE TABLE device_signals (
    device_id VARCHAR(255) PRIMARY KEY,
    transaction_id VARCHAR(255),
    user_id VARCHAR(255),
    confidence_score FLOAT,
    browser_fingerprint VARIANT,  -- JSON object
    behavioral_signals VARIANT,  -- JSON object (mouse movements, typing patterns, etc.)
    captured_at TIMESTAMP NOT NULL,
    sdk_provider VARCHAR(50) NOT NULL,  -- 'fingerprint_pro', 'seon', 'ipqs'
    
    INDEX idx_device_signals_transaction (transaction_id),
    INDEX idx_device_signals_user (user_id),
    INDEX idx_device_signals_captured (captured_at)
);
```

**Relationships**:
- `transaction_id` → `transactions_enriched.transaction_id` (if exists)
- `user_id` → `users.user_id` (if exists)

#### ip_risk_scores

Stores MaxMind minFraud risk scores and insights.

```sql
CREATE TABLE ip_risk_scores (
    transaction_id VARCHAR(255) PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,  -- Supports IPv6
    risk_score FLOAT NOT NULL,  -- 0-100
    is_proxy BOOLEAN,
    is_vpn BOOLEAN,
    is_tor BOOLEAN,
    geolocation_data VARIANT,  -- JSON object (country, region, city)
    velocity_signals VARIANT,  -- JSON object (transaction frequency, etc.)
    scored_at TIMESTAMP NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'maxmind',
    
    INDEX idx_ip_risk_scores_ip (ip_address),
    INDEX idx_ip_risk_scores_risk (risk_score),
    INDEX idx_ip_risk_scores_scored (scored_at)
);
```

**Relationships**:
- `transaction_id` → `transactions_enriched.transaction_id` (if exists)

#### graph_features

Stores graph-based fraud detection features computed from Neo4j.

```sql
CREATE TABLE graph_features (
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,  -- 'user', 'device', 'card', 'ip', 'phone', 'email'
    cluster_id VARCHAR(255),
    shared_device_count INTEGER,
    cluster_risk_score FLOAT,
    co_travel_patterns VARIANT,  -- JSON array
    velocity_across_clusters INTEGER,
    computed_at TIMESTAMP NOT NULL,
    graph_provider VARCHAR(50) NOT NULL DEFAULT 'neo4j',
    
    PRIMARY KEY (entity_id, entity_type),
    INDEX idx_graph_features_cluster (cluster_id),
    INDEX idx_graph_features_risk (cluster_risk_score),
    INDEX idx_graph_features_computed (computed_at)
);
```

**Relationships**:
- `entity_id` + `entity_type` → Various entity tables (users, devices, etc.)

#### snowpipe_streaming_ingestion

Tracks real-time event ingestion via Snowpipe Streaming.

```sql
CREATE TABLE snowpipe_streaming_ingestion (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,  -- 'clickstream', 'payment', 'auth'
    source_topic VARCHAR(255) NOT NULL,  -- Kafka topic name
    ingested_at TIMESTAMP NOT NULL,
    snowflake_table VARCHAR(255) NOT NULL,  -- Target table name
    processing_status VARCHAR(50) NOT NULL CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    
    INDEX idx_snowpipe_ingestion_type (event_type),
    INDEX idx_snowpipe_ingestion_status (processing_status),
    INDEX idx_snowpipe_ingestion_ingested (ingested_at)
);
```

#### dynamic_table_pipelines

Tracks Dynamic Table pipeline status and refresh history.

```sql
CREATE TABLE dynamic_table_pipelines (
    table_name VARCHAR(255) PRIMARY KEY,
    source_tables VARIANT,  -- JSON array of source table names
    freshness_target VARCHAR(50) NOT NULL,  -- e.g., '1 minute'
    last_refresh_at TIMESTAMP,
    refresh_status VARCHAR(50) NOT NULL CHECK (refresh_status IN ('idle', 'refreshing', 'error')),
    feature_columns VARIANT,  -- JSON array of feature column definitions
    
    INDEX idx_dynamic_tables_status (refresh_status),
    INDEX idx_dynamic_tables_refresh (last_refresh_at)
);
```

## Entity Relationships

### ER Diagram

```
┌─────────────────────┐
│   composio_         │
│   connections       │
│                     │
│ - tenant_id         │
│ - toolkit_name      │
│ - connection_id     │
│ - status            │
└──────────┬──────────┘
           │
           │ uses
           │
┌──────────▼──────────┐
│ composio_action_    │
│ audit               │
│                     │
│ - connection_id     │
│ - action_name       │
│ - tenant_id         │
└──────────┬──────────┘
           │
           │ triggered_by
           │
┌──────────▼──────────┐
│ soar_playbook_      │
│ executions          │
│                     │
│ - playbook_id       │
│ - investigation_id  │
│ - tenant_id         │
└─────────────────────┘

┌─────────────────────┐
│   device_signals    │
│                     │
│ - device_id         │
│ - transaction_id    │
│ - user_id           │
└──────────┬──────────┘
           │
           │ feeds
           │
┌──────────▼──────────┐
│   graph_features    │
│                     │
│ - entity_id         │
│ - shared_device_    │
│   count             │
└─────────────────────┘

┌─────────────────────┐
│   ip_risk_scores    │
│                     │
│ - transaction_id    │
│ - ip_address        │
│ - risk_score        │
└─────────────────────┘
```

## Data Flow Patterns

### Device Signal Capture Flow

```
Browser (Device SDK)
    ↓
POST /api/device-signals
    ↓
Backend API (FastAPI)
    ↓
┌─────────────────────┐
│   Snowflake         │
│   device_signals    │
└─────────────────────┘
    ↓
┌─────────────────────┐
│   Splunk            │
│   (mirror events)   │
└─────────────────────┘
```

### IP Risk Scoring Flow

```
Transaction Request
    ↓
MaxMind minFraud API
    ↓
┌─────────────────────┐
│   Redis Cache       │
│   (1 hour TTL)      │
└─────────────────────┘
    ↓
┌─────────────────────┐
│   Snowflake         │
│   ip_risk_scores    │
└─────────────────────┘
    ↓
Feature Set (for ML models)
```

### SOAR Playbook Execution Flow

```
Anomaly Detected
    ↓
SOAR Playbook Triggered
    ↓
┌─────────────────────┐
│   SOAR Playbook     │
│   Execution         │
└─────────────────────┘
    ↓
Composio Actions Executed
    ↓
┌─────────────────────┐
│   composio_action_  │
│   audit             │
└─────────────────────┘
    ↓
┌─────────────────────┐
│   Splunk +          │
│   Snowflake Audit   │
└─────────────────────┘
```

### Graph Feature Computation Flow

```
Entity Data Updated
    ↓
Neo4j Graph Algorithms
    ↓
┌─────────────────────┐
│   Graph Features    │
│   Computed          │
└─────────────────────┘
    ↓
┌─────────────────────┐
│   Snowflake         │
│   graph_features    │
└─────────────────────┘
    ↓
ML Model Scoring
```

## Data Validation Rules

### Composio Connections

- `tenant_id`: Required, must exist in tenants table (if exists)
- `toolkit_name`: Required, must be valid Composio toolkit name
- `connection_id`: Required, must be valid Composio connection ID
- `status`: Required, must be one of: 'active', 'expired', 'revoked'
- `expires_at`: Optional, must be future timestamp if provided

### Device Signals

- `device_id`: Required, must be non-empty string
- `transaction_id`: Optional, must exist in transactions table if provided
- `confidence_score`: Required, must be between 0.0 and 1.0
- `sdk_provider`: Required, must be one of: 'fingerprint_pro', 'seon', 'ipqs'

### IP Risk Scores

- `transaction_id`: Required, must be unique
- `ip_address`: Required, must be valid IPv4 or IPv6 address
- `risk_score`: Required, must be between 0.0 and 100.0
- `provider`: Required, defaults to 'maxmind'

### Graph Features

- `entity_id`: Required, must be non-empty string
- `entity_type`: Required, must be one of: 'user', 'device', 'card', 'ip', 'phone', 'email'
- `cluster_risk_score`: Optional, must be between 0.0 and 1.0 if provided

## Indexing Strategy

### PostgreSQL Indexes

**composio_connections**:
- `idx_composio_connections_tenant`: For tenant-scoped queries
- `idx_composio_connections_status`: For filtering by connection status
- `idx_composio_connections_toolkit`: For filtering by toolkit

**soar_playbook_executions**:
- `idx_soar_executions_tenant`: For tenant-scoped queries
- `idx_soar_executions_investigation`: For linking to investigations
- `idx_soar_executions_status`: For filtering by execution status
- `idx_soar_executions_started`: For time-based queries

**composio_action_audit**:
- `idx_composio_audit_tenant`: For tenant-scoped audit queries
- `idx_composio_audit_execution`: For linking to playbook executions
- `idx_composio_audit_status`: For filtering by action status
- `idx_composio_audit_executed`: For time-based audit queries

### Snowflake Indexes

**device_signals**:
- `idx_device_signals_transaction`: For joining with transactions
- `idx_device_signals_user`: For user-based queries
- `idx_device_signals_captured`: For time-based queries

**ip_risk_scores**:
- `idx_ip_risk_scores_ip`: For IP-based lookups
- `idx_ip_risk_scores_risk`: For risk threshold filtering
- `idx_ip_risk_scores_scored`: For time-based queries

**graph_features**:
- `idx_graph_features_cluster`: For cluster-based queries
- `idx_graph_features_risk`: For risk threshold filtering
- `idx_graph_features_computed`: For time-based queries

## Data Retention Policies

### PostgreSQL

- **composio_connections**: Retain indefinitely (required for action execution)
- **soar_playbook_executions**: Retain for 2 years (compliance/audit)
- **composio_action_audit**: Retain for 2 years (compliance/audit)

### Snowflake

- **device_signals**: Retain for 1 year (feature engineering)
- **ip_risk_scores**: Retain for 1 year (feature engineering)
- **graph_features**: Retain for 1 year (feature engineering)
- **snowpipe_streaming_ingestion**: Retain for 90 days (monitoring)
- **dynamic_table_pipelines**: Retain indefinitely (operational metadata)

## Migration Scripts

### PostgreSQL Migration

```sql
-- Migration: 001_create_composio_tables.sql
CREATE TABLE composio_connections (...);
CREATE TABLE soar_playbook_executions (...);
CREATE TABLE composio_action_audit (...);
```

### Snowflake Migration

```sql
-- Migration: 001_create_composio_snowflake_tables.sql
CREATE TABLE device_signals (...);
CREATE TABLE ip_risk_scores (...);
CREATE TABLE graph_features (...);
CREATE TABLE snowpipe_streaming_ingestion (...);
CREATE TABLE dynamic_table_pipelines (...);
```

