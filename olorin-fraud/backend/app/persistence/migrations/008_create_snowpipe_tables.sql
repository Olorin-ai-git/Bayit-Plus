-- PostgreSQL Migration: Event Ingestion Tracking Tables
-- Feature: 001-composio-tools-integration
-- Version: 008
-- Description: Create tables for tracking real-time event ingestion (PostgreSQL-based analytics)
-- Note: Analytics tables are persisted in PostgreSQL (Snowflake is only for transaction data source)
--       This replaces Snowpipe Streaming with PostgreSQL-based event tracking
-- PostgreSQL-specific: Uses JSONB, gen_random_uuid(), CHECK constraints, TEXT arrays

-- =============================================================================
-- Table: event_ingestion_tracking
-- Purpose: Track real-time event ingestion for analytics pipeline
-- =============================================================================
CREATE TABLE IF NOT EXISTS event_ingestion_tracking (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Event Identification
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,  -- 'clickstream', 'payment', 'auth', 'device_signal', 'ip_risk'
    source_topic VARCHAR(255),  -- Kafka topic name (if applicable)
    
    -- Ingestion Status
    ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Target Table (for reference)
    target_table VARCHAR(255),  -- 'device_signals', 'ip_risk_scores', etc.
    
    -- Error Tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for event_ingestion_tracking
CREATE INDEX IF NOT EXISTS idx_event_ingestion_event_id ON event_ingestion_tracking(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ingestion_event_type ON event_ingestion_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_event_ingestion_status ON event_ingestion_tracking(processing_status);
CREATE INDEX IF NOT EXISTS idx_event_ingestion_ingested_at ON event_ingestion_tracking(ingested_at);
CREATE INDEX IF NOT EXISTS idx_event_ingestion_target_table ON event_ingestion_tracking(target_table);

-- =============================================================================
-- Table: analytics_pipeline_status
-- Purpose: Track analytics pipeline status and refresh history
-- =============================================================================
CREATE TABLE IF NOT EXISTS analytics_pipeline_status (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Pipeline Identification
    pipeline_name VARCHAR(255) NOT NULL UNIQUE,  -- e.g., 'features_curated'
    source_tables TEXT[],  -- Array of source table names
    
    -- Pipeline Configuration
    refresh_interval_seconds INTEGER DEFAULT 60,  -- Target refresh interval
    feature_columns JSONB,  -- JSON array of feature column definitions
    
    -- Status Tracking
    last_refresh_at TIMESTAMP,
    refresh_status VARCHAR(50) NOT NULL DEFAULT 'idle' CHECK (refresh_status IN ('idle', 'refreshing', 'error')),
    
    -- Error Tracking
    last_error_message TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics_pipeline_status
CREATE INDEX IF NOT EXISTS idx_analytics_pipeline_name ON analytics_pipeline_status(pipeline_name);
CREATE INDEX IF NOT EXISTS idx_analytics_pipeline_status ON analytics_pipeline_status(refresh_status);
CREATE INDEX IF NOT EXISTS idx_analytics_pipeline_refresh ON analytics_pipeline_status(last_refresh_at);
