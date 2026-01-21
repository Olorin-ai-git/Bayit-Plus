-- PostgreSQL Migration: Precision Detection Tables
-- Feature: 001-detection-tools-enhancements
-- Version: 009
-- Description: Create tables for precision-focused fraud detection (pg_transactions, pg_merchants, labels_truth, pg_enrichment_scores, pg_alerts)
-- Note: PostgreSQL-specific: Uses TIMESTAMPTZ, NUMERIC, JSONB, CHECK constraints

-- =============================================================================
-- Table 1: pg_transactions
-- Purpose: Denormalized transaction data extracted from Snowflake TRANSACTIONS_ENRICHED table
-- Contains mature transactions (≥6 months old, ≥14 days matured) with final outcomes
-- =============================================================================
CREATE TABLE IF NOT EXISTS pg_transactions (
    -- Primary Key
    txn_id TEXT PRIMARY KEY,
    
    -- Transaction Details
    txn_ts TIMESTAMPTZ NOT NULL,
    merchant_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL,
    approval_status TEXT,
    txn_type TEXT,
    country TEXT,
    mcc INT,
    region TEXT,
    
    -- Final outcomes (mature truth)
    is_fraud_final BOOLEAN,
    dispute_final_outcome TEXT,
    dispute_reason_code TEXT,
    refund_ts TIMESTAMPTZ,
    chargeback_ts TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pg_transactions
CREATE INDEX IF NOT EXISTS idx_pg_txn_ts ON pg_transactions(txn_ts);
CREATE INDEX IF NOT EXISTS idx_pg_txn_merchant ON pg_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pg_txn_card ON pg_transactions(card_id);
-- Note: Index on date_trunc expression removed - PostgreSQL requires IMMUTABLE functions
-- Consider using a generated column or materialized view for date-based queries
-- CREATE INDEX IF NOT EXISTS idx_pg_txn_date ON pg_transactions(date_trunc('day', txn_ts));

-- =============================================================================
-- Table 2: pg_merchants
-- Purpose: Aggregated merchant metadata for peer-group comparisons and merchant-level features
-- =============================================================================
CREATE TABLE IF NOT EXISTS pg_merchants (
    -- Primary Key
    merchant_id TEXT PRIMARY KEY,
    
    -- Merchant Metadata
    mcc INT,
    region TEXT,
    avg_monthly_txn NUMERIC(12,2),
    signup_date DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pg_merchants
CREATE INDEX IF NOT EXISTS idx_pg_merchants_mcc_region ON pg_merchants(mcc, region);

-- =============================================================================
-- Table 3: labels_truth
-- Purpose: Ground-truth labels built from mature transaction outcomes
-- Only includes transactions with final fraud/chargeback outcomes (≥6 months old, ≥14 days matured)
-- =============================================================================
CREATE TABLE IF NOT EXISTS labels_truth (
    -- Primary Key (Foreign Key to pg_transactions)
    txn_id TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
    
    -- Label Data
    y_true SMALLINT NOT NULL CHECK (y_true IN (0,1)),
    label_maturity_days INTEGER,
    label_source TEXT,  -- 'fraud_flag', 'chargeback', 'dispute'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for labels_truth
CREATE INDEX IF NOT EXISTS idx_labels_y_true ON labels_truth(y_true);

-- =============================================================================
-- Table 4: pg_enrichment_scores
-- Purpose: External enrichment data from graph analytics, BIN lookup, IP risk scoring, email/phone intelligence, address verification
-- =============================================================================
CREATE TABLE IF NOT EXISTS pg_enrichment_scores (
    -- Primary Key (Foreign Key to pg_transactions)
    txn_id TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
    
    -- Graph features (from Neo4j GDS/TigerGraph)
    component_fraud_rate DOUBLE PRECISION,
    shortest_path_to_fraud INTEGER,
    shared_card_pressure DOUBLE PRECISION,
    pagerank_score DOUBLE PRECISION,
    
    -- BIN lookup features
    issuer_country TEXT,
    card_type TEXT,  -- 'prepaid', 'commercial', 'debit', 'credit'
    issuer_name TEXT,
    issuer_geo_mismatch BOOLEAN,  -- issuer_country ≠ merchant_country
    card_type_risk BOOLEAN,  -- prepaid at high-risk merchant
    
    -- IP risk features (if IP available)
    ip_proxy_detected BOOLEAN,
    ip_vpn_detected BOOLEAN,
    ip_tor_detected BOOLEAN,
    ip_datacenter BOOLEAN,
    ip_risk_score DOUBLE PRECISION,
    ip_geo_risk BOOLEAN,
    
    -- Email risk (if email available)
    email_risk_score DOUBLE PRECISION,
    email_domain_age INTEGER,
    email_valid BOOLEAN,
    
    -- Phone intelligence (if phone available)
    phone_carrier TEXT,
    phone_type TEXT,  -- 'mobile', 'landline', 'voip'
    phone_valid BOOLEAN,
    phone_risk_score DOUBLE PRECISION,
    
    -- Address verification (if address available)
    address_standardized TEXT,
    billing_shipping_mismatch BOOLEAN,
    
    -- Timestamps
    enriched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pg_enrichment_scores
CREATE INDEX IF NOT EXISTS idx_enrichment_graph ON pg_enrichment_scores(component_fraud_rate DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_bin ON pg_enrichment_scores(issuer_geo_mismatch, card_type_risk);
CREATE INDEX IF NOT EXISTS idx_enrichment_ip ON pg_enrichment_scores(ip_risk_score DESC);

-- =============================================================================
-- Table 5: pg_alerts
-- Purpose: Model scores and thresholds for fraud detection
-- Contains calibrated probability estimates from XGBoost model
-- =============================================================================
CREATE TABLE IF NOT EXISTS pg_alerts (
    -- Primary Key (Foreign Key to pg_transactions)
    txn_id TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
    
    -- Model Information
    model_version TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL CHECK (score >= 0 AND score <= 1),
    threshold DOUBLE PRECISION NOT NULL CHECK (threshold >= 0 AND threshold <= 1),
    threshold_cohort TEXT,  -- MCC×region×size cohort for threshold tuning
    precision_at_k DOUBLE PRECISION,
    y_pred BOOLEAN GENERATED ALWAYS AS (score >= threshold) STORED,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pg_alerts
CREATE INDEX IF NOT EXISTS idx_pg_alerts_score ON pg_alerts(score DESC);
CREATE INDEX IF NOT EXISTS idx_pg_alerts_model ON pg_alerts(model_version, score DESC);

