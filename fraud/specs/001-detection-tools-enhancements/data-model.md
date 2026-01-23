# Data Model: Detection Tools Enhancements

**Feature**: Detection Tools Enhancements  
**Date**: 2025-01-XX  
**Status**: Complete

## Overview

This document defines the data model for precision-focused detection tools, including PostgreSQL tables, materialized views, and data relationships. The model supports retro-only, precision-focused fraud detection using mature ground-truth labels and external enrichment data.

## Core Tables

### pg_transactions

Denormalized transaction data extracted from Snowflake `TRANSACTIONS_ENRICHED` table. Contains mature transactions (≥6 months old, ≥14 days matured) with final outcomes.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS pg_transactions (
  txn_id               TEXT PRIMARY KEY,
  txn_ts               TIMESTAMPTZ NOT NULL,
  merchant_id          TEXT NOT NULL,
  card_id              TEXT NOT NULL,
  amount               NUMERIC(12,2) NOT NULL,
  currency             TEXT NOT NULL,
  approval_status      TEXT,
  txn_type             TEXT,
  country              TEXT,
  mcc                  INT,
  region               TEXT,
  
  -- Final outcomes (mature truth)
  is_fraud_final       BOOLEAN,
  dispute_final_outcome TEXT,
  dispute_reason_code  TEXT,
  refund_ts            TIMESTAMPTZ,
  chargeback_ts        TIMESTAMPTZ,
  
  -- Indexes
  INDEX idx_pg_txn_ts (txn_ts),
  INDEX idx_pg_txn_merchant (merchant_id),
  INDEX idx_pg_txn_card (card_id),
  INDEX idx_pg_txn_date (date_trunc('day', txn_ts))
);
```

**Key Attributes**:
- `txn_id`: Primary key, transaction identifier from Snowflake
- `txn_ts`: Transaction timestamp (used for temporal splits)
- `merchant_id`, `card_id`: Foreign keys for relationships
- `is_fraud_final`: Final fraud outcome (mature truth)
- `chargeback_ts`: Chargeback date (for label maturity)

**Relationships**:
- One-to-many with `labels_truth` (one label per transaction)
- One-to-many with `pg_enrichment_scores` (one enrichment record per transaction)
- One-to-many with `pg_alerts` (one model score per transaction)

### pg_merchants

Aggregated merchant metadata for peer-group comparisons and merchant-level features.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS pg_merchants (
  merchant_id          TEXT PRIMARY KEY,
  mcc                  INT,
  region               TEXT,
  avg_monthly_txn      NUMERIC(12,2),
  signup_date          DATE,
  
  INDEX idx_pg_merchants_mcc_region (mcc, region)
);
```

**Key Attributes**:
- `merchant_id`: Primary key, merchant identifier
- `mcc`: Merchant Category Code (for peer-group comparisons)
- `region`: Merchant region (for peer-group comparisons)
- `avg_monthly_txn`: Average monthly transaction volume (for size-based cohorts)

**Relationships**:
- One-to-many with `pg_transactions` (many transactions per merchant)

### labels_truth

Ground-truth labels built from mature transaction outcomes. Only includes transactions with final fraud/chargeback outcomes (≥6 months old, ≥14 days matured).

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS labels_truth (
  txn_id TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
  y_true SMALLINT NOT NULL CHECK (y_true IN (0,1)),
  label_maturity_days INTEGER,
  label_source TEXT,  -- 'fraud_flag', 'chargeback', 'dispute'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_labels_y_true (y_true)
);
```

**Key Attributes**:
- `txn_id`: Foreign key to `pg_transactions`
- `y_true`: Binary label (0=legitimate, 1=fraud)
- `label_maturity_days`: Days since transaction for label maturity
- `label_source`: Source of label (fraud flag, chargeback, dispute)

**Label Building Logic**:
- `y_true = 1` if `is_fraud_final = TRUE` OR `chargeback_ts IS NOT NULL`
- `y_true = 0` if `is_fraud_final = FALSE` AND `chargeback_ts IS NULL` AND transaction is ≥6 months old
- Only include transactions ≥6 months old and ≥14 days matured

### pg_enrichment_scores

External enrichment data from graph analytics, BIN lookup, IP risk scoring, email/phone intelligence, and address verification.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS pg_enrichment_scores (
  txn_id              TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
  
  -- Graph features (from Neo4j GDS/TigerGraph)
  component_fraud_rate DOUBLE PRECISION,
  shortest_path_to_fraud INTEGER,
  shared_card_pressure DOUBLE PRECISION,
  pagerank_score      DOUBLE PRECISION,
  
  -- BIN lookup features
  issuer_country      TEXT,
  card_type           TEXT,  -- 'prepaid', 'commercial', 'debit', 'credit'
  issuer_name         TEXT,
  issuer_geo_mismatch BOOLEAN,  -- issuer_country ≠ merchant_country
  card_type_risk      BOOLEAN,  -- prepaid at high-risk merchant
  
  -- IP risk features (if IP available)
  ip_proxy_detected   BOOLEAN,
  ip_vpn_detected     BOOLEAN,
  ip_tor_detected     BOOLEAN,
  ip_datacenter       BOOLEAN,
  ip_risk_score       DOUBLE PRECISION,
  ip_geo_risk         BOOLEAN,
  
  -- Email risk (if email available)
  email_risk_score    DOUBLE PRECISION,
  email_domain_age    INTEGER,
  email_valid         BOOLEAN,
  
  -- Phone intelligence (if phone available)
  phone_carrier       TEXT,
  phone_type          TEXT,  -- 'mobile', 'landline', 'voip'
  phone_valid         BOOLEAN,
  phone_risk_score    DOUBLE PRECISION,
  
  -- Address verification (if address available)
  address_standardized TEXT,
  billing_shipping_mismatch BOOLEAN,
  
  enriched_at        TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_enrichment_graph (component_fraud_rate DESC),
  INDEX idx_enrichment_bin (issuer_geo_mismatch, card_type_risk),
  INDEX idx_enrichment_ip (ip_risk_score DESC)
);
```

**Key Attributes**:
- `txn_id`: Foreign key to `pg_transactions`
- Graph features: Component fraud rate, shortest path to fraud, shared-card pressure, PageRank
- BIN features: Issuer country, card type, issuer name, mismatch flags
- IP features: Proxy/VPN/TOR detection, datacenter flags, risk score
- Email/Phone features: Risk scores, validity flags, carrier/type
- Address features: Standardized address, mismatch flags

**Enrichment Logic**:
- Fields are NULL if enrichment data is not available (no fallback values)
- Enrichment runs in batch after ETL pipeline
- Failed enrichments are logged but don't block other enrichments

### pg_alerts

Model scores and thresholds for fraud detection. Contains calibrated probability estimates from XGBoost/LightGBM model.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS pg_alerts (
  txn_id         TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
  model_version  TEXT NOT NULL,
  score          DOUBLE PRECISION NOT NULL CHECK (score >= 0 AND score <= 1),
  threshold      DOUBLE PRECISION NOT NULL CHECK (threshold >= 0 AND threshold <= 1),
  threshold_cohort TEXT,  -- MCC×region×size cohort for threshold tuning
  precision_at_k DOUBLE PRECISION,
  y_pred         BOOLEAN GENERATED ALWAYS AS (score >= threshold) STORED,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_pg_alerts_score (score DESC),
  INDEX idx_pg_alerts_model (model_version, score DESC)
);
```

**Key Attributes**:
- `txn_id`: Foreign key to `pg_transactions`
- `model_version`: Model version identifier
- `score`: Calibrated fraud probability (0-1)
- `threshold`: Precision@K threshold for this transaction's cohort
- `threshold_cohort`: Cohort identifier (MCC×region×size) for threshold tuning
- `precision_at_k`: Precision@K metric for this threshold

**Model Scoring Logic**:
- Scores are calibrated probabilities (isotonic/Platt calibration)
- Thresholds are tuned per cohort (MCC×region×size) for precision@K
- `y_pred` is computed column based on score >= threshold

## Materialized Views

### mv_features_txn

Assembles all features (original + enrichment) for model training and domain agent queries.

**Schema**:
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_features_txn AS
SELECT
  t.txn_id, t.txn_ts, t.merchant_id, t.card_id, t.amount, t.currency,
  
  -- Merchant burst features
  bf.is_burst_cardtest,
  COALESCE(bf.tiny_amt_rate,0) AS tiny_amt_rate,
  COALESCE(bf.z_uniq_cards,0)  AS z_unique_cards_30d,
  
  -- Peer-group features
  pf.z_night, pf.z_refund,
  
  -- Transaction-level features
  f.z_amt_card,
  f.is_first_time_card_merchant,
  f.sec_since_prev_for_card,
  
  -- Graph features
  g.prior_merchants_for_card,
  
  -- Trailing merchant features
  tm.refund_rate_30d_prior,
  tm.cb_rate_90d_prior,
  
  -- Enrichment features
  e.component_fraud_rate,
  e.shortest_path_to_fraud,
  e.shared_card_pressure,
  e.pagerank_score,
  e.issuer_geo_mismatch::int AS issuer_geo_mismatch_flag,
  e.card_type_risk::int AS card_type_risk_flag,
  e.ip_risk_score,
  e.ip_proxy_detected::int AS ip_proxy_flag,
  e.ip_vpn_detected::int AS ip_vpn_flag,
  e.ip_tor_detected::int AS ip_tor_flag,
  e.email_risk_score,
  e.phone_valid::int AS phone_valid_flag,
  e.billing_shipping_mismatch::int AS address_mismatch_flag
  
FROM pg_transactions t
LEFT JOIN mv_burst_flags         bf ON bf.merchant_id=t.merchant_id AND bf.d = date_trunc('day', t.txn_ts)
LEFT JOIN mv_peer_flags          pf ON pf.merchant_id=t.merchant_id AND pf.mon= date_trunc('month', t.txn_ts)
LEFT JOIN mv_txn_feats_basic     f  USING (txn_id)
LEFT JOIN mv_txn_graph_feats     g  USING (txn_id)
LEFT JOIN mv_trailing_merchant   tm ON tm.merchant_id=t.merchant_id AND tm.d  = t.txn_ts::date
LEFT JOIN pg_enrichment_scores   e  USING (txn_id);

CREATE UNIQUE INDEX ON mv_features_txn (txn_id);
```

**Key Features**:
- Merchant burst: `is_burst_cardtest`, `z_unique_cards_30d`, `tiny_amt_rate`
- Peer-group: `z_night`, `z_refund`
- Transaction-level: `z_amt_card`, `is_first_time_card_merchant`, `sec_since_prev_for_card`
- Graph: `prior_merchants_for_card`
- Trailing merchant: `refund_rate_30d_prior`, `cb_rate_90d_prior`
- Enrichment: Graph, BIN, IP, email, phone, address features

**Refresh Strategy**:
- Refresh after ETL pipeline completes
- Refresh after enrichment pipeline completes
- Incremental refresh supported via `REFRESH MATERIALIZED VIEW CONCURRENTLY`

### Supporting Materialized Views

**mv_merchant_day**: Daily merchant statistics for burst detection
**mv_burst_flags**: Merchant burst flags (`is_burst_cardtest`, `z_unique_cards_30d`)
**mv_peer_stats**: Peer-group statistics (MCC×region×size cohorts)
**mv_peer_flags**: Peer-group outlier flags (`z_night`, `z_refund`)
**mv_txn_feats_basic**: Transaction-level deviation features
**mv_txn_graph_feats**: Graph features (prior merchants for card)
**mv_trailing_merchant**: Trailing merchant refund/chargeback rates

## Data Relationships

```
pg_transactions (1) ──< (1) labels_truth
pg_transactions (1) ──< (1) pg_enrichment_scores
pg_transactions (1) ──< (1) pg_alerts
pg_merchants (1) ──< (N) pg_transactions

mv_features_txn assembles:
  - pg_transactions
  - mv_burst_flags
  - mv_peer_flags
  - mv_txn_feats_basic
  - mv_txn_graph_feats
  - mv_trailing_merchant
  - pg_enrichment_scores
```

## Data Flow

1. **ETL Pipeline**: Extract mature transactions from Snowflake → Load into `pg_transactions`
2. **Label Building**: Build `labels_truth` from mature transaction outcomes
3. **Feature Engineering**: Refresh materialized views (merchant burst, peer-group, transaction-level, graph, trailing merchant)
4. **Enrichment Pipeline**: Batch enrich transactions → Store in `pg_enrichment_scores`
5. **Feature Assembly**: Refresh `mv_features_txn` to assemble all features
6. **Model Training**: Train XGBoost using `mv_features_txn` and `labels_truth`
7. **Model Scoring**: Score all transactions → Store in `pg_alerts`
8. **Domain Agent Queries**: Query `mv_features_txn` and `pg_alerts` via PrecisionFeatureService

## Constraints and Validation

**Data Quality**:
- `labels_truth.y_true` must be 0 or 1 (CHECK constraint)
- `pg_alerts.score` must be between 0 and 1 (CHECK constraint)
- `pg_alerts.threshold` must be between 0 and 1 (CHECK constraint)

**Referential Integrity**:
- Foreign keys enforce referential integrity (ON DELETE CASCADE)
- Transactions must exist in `pg_transactions` before enrichment/labels/alerts

**Missing Data Handling**:
- Enrichment fields are NULL if data is not available (no fallback values)
- Materialized views use LEFT JOINs to handle missing features
- COALESCE used for numeric features (defaults to 0, not NULL)

## Indexes

**Performance Indexes**:
- Transaction lookups: `idx_pg_txn_ts`, `idx_pg_txn_merchant`, `idx_pg_txn_card`
- Enrichment queries: `idx_enrichment_graph`, `idx_enrichment_bin`, `idx_enrichment_ip`
- Model scoring: `idx_pg_alerts_score`, `idx_pg_alerts_model`
- Feature view: Unique index on `txn_id` for fast lookups

## Migration Strategy

**Migration Files**:
- `009_precision_detection_tables.sql`: Creates core tables
- `010_precision_detection_features.sql`: Creates materialized views

**Migration Order**:
1. Create `pg_transactions` table
2. Create `pg_merchants` table
3. Create `labels_truth` table
4. Create `pg_enrichment_scores` table
5. Create `pg_alerts` table
6. Create supporting materialized views
7. Create `mv_features_txn` materialized view

**Backward Compatibility**:
- New tables don't affect existing schema
- Existing domain agents continue to work (enhanced with new features)
- Gradual migration: ETL pipeline populates new tables incrementally

