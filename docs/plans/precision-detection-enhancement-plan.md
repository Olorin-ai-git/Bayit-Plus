# Precision-Focused Detection Enhancement Plan

**Date**: 2025-01-XX  
**Status**: Planning  
**Goal**: Enhance domain agent detection capabilities using retro-only, precision-focused features from historical transaction data

---

## Executive Summary

This plan integrates a **retro-only, precision-first detection toolkit** that uses mature ground-truth labels (fraud/chargeback outcomes) to engineer high-signal features and train calibrated models. The system reads from Snowflake and writes all detection artifacts to PostgreSQL, enabling domain agents to leverage precision-focused signals beyond generic anomaly detection.

### Key Objectives

1. **Build leak-free ground-truth labels** from mature transaction outcomes (≥6 months old, ≥14 days matured)
2. **Engineer high-precision features** that don't require front-end data:
   - Merchant burst & card-testing detection
   - Peer-group outliers (MCC×region×size)
   - Transaction-level deviations (card/merchant history)
   - Graph features (card↔merchant relationships)
   - Refund/chargeback precursors
3. **Enrich with external data sources** (batch-friendly, retro-oriented):
   - Graph analytics (Neo4j GDS/TigerGraph) for ring/proximity features
   - BIN/IIN lookup (Mastercard/Neutrino) for issuer-country/type mismatches
   - IP risk scoring (MaxMind/IPQualityScore) for proxy/VPN/hosting detection
   - Email risk (LexisNexis Emailage) for identity signals
   - Phone intelligence (Veriphone/TeleSign) for carrier/type validation
   - Address verification (Lob/Melissa) for mismatch detection
4. **Train calibrated supervised model** (XGBoost/LightGBM) with temporal splits
5. **Integrate with domain agents** to enhance their detection capabilities
6. **Evaluate with precision@K** metrics aligned with investigation capacity

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Snowflake (Source of Truth)                 │
│  TRANSACTIONS_ENRICHED: Historical transactions ≥6 months old   │
│  - TX_ID_KEY, TX_DATETIME, MERCHANT_ID, CARD_ID, AMOUNT       │
│  - IS_FRAUD_TX, DISPUTE_FINAL_OUTCOME, CHARGEBACK_DATE         │
│  - MERCHANT_CATEGORY_CODE, IP_COUNTRY, etc.                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │ ETL (Batch)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL (Detection Artifacts)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Core Tables                                                │  │
│  │ - pg_transactions (denormalized from Snowflake)           │  │
│  │ - pg_merchants (aggregated merchant metadata)              │  │
│  │ - labels_truth (mature ground-truth labels)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Feature Engineering Views (Materialized)                  │  │
│  │ - mv_merchant_day (burst detection)                       │  │
│  │ - mv_peer_stats (peer-group comparisons)                  │  │
│  │ - mv_card_amount_stats (transaction deviations)            │  │
│  │ - mv_degrees (graph features)                              │  │
│  │ - mv_trailing_merchant (refund/chargeback precursors)     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Detection Outputs                                         │  │
│  │ - pg_alerts (model scores + thresholds)                    │  │
│  │ - mv_features_txn (assembled feature vectors)              │  │
│  │ - eval_confusion (backtest metrics)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ Feature Lookup
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Agents (Enhanced)                    │
│  - Network Agent: + graph features, peer outliers             │
│  - Device Agent: + card-testing patterns                       │
│  - Location Agent: + merchant burst signals                    │
│  - Merchant Agent: + peer-group comparisons                   │
│  - Risk Agent: + calibrated model scores                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: External Enrichment Integration (Priority Order)

### Priority 1: Graph Analytics Engine (Biggest Precision Lift)

**Tool**: Neo4j Graph Data Science (GDS) or TigerGraph  
**Integration**: Batch export from Snowflake → Graph DB → Feature export → PostgreSQL

**Features Generated**:
- Component fraud rate (fraud ratio in connected component)
- Shortest path distance to tainted nodes (cards/merchants with fraud)
- Shared-card pressure (common neighbors between merchants)
- PageRank scores (influence in transaction graph)

**Implementation**:
```python
# Export transaction graph from Snowflake
# Run Neo4j GDS algorithms (components, PageRank, shortest path)
# Export features back to PostgreSQL
```

### Priority 2: BIN/IIN Lookup (Issuer Mismatch Rules)

**Tool**: Mastercard BIN Lookup API or Neutrino BIN Lookup  
**Integration**: Composio Custom Tool (batch enrichment)

**Features Generated**:
- Issuer country (from BIN)
- Card type (prepaid/commercial/debit/credit)
- Issuer name
- Geo mismatch flags (issuer country ≠ merchant country)
- Type mismatch flags (prepaid at high-risk merchants)

### Priority 3: IP Risk Scoring (If IPs Available)

**Tool**: MaxMind minFraud or IPQualityScore  
**Integration**: Composio Custom Tool (batch enrichment)

**Features Generated**:
- Proxy/VPN/TOR detection
- Datacenter/hosting flags
- IP risk score
- Geo risk (high-risk country)

### Priority 4: Email/Phone Intelligence (If Available)

**Email**: LexisNexis Emailage (Composio Custom Tool)  
**Phone**: Veriphone (already in Composio) or TeleSign (Custom Tool)

**Features Generated**:
- Email risk score (Emailage)
- Email domain age/validity
- Phone carrier/type (Veriphone/TeleSign)
- Phone risk score

### Priority 5: Address Verification (If Available)

**Tool**: Lob AV or Melissa Global Address (Composio Custom Tool)

**Features Generated**:
- Address standardization
- Mismatch flags (billing ≠ shipping)
- Fraud ring detection (shared addresses)

---

## Phase 1: PostgreSQL Schema Setup

### 1.1 Core Tables

**Location**: `olorin-server/app/persistence/migrations/009_precision_detection_tables.sql`

```sql
-- Core transaction table (denormalized from Snowflake)
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
  chargeback_ts       TIMESTAMPTZ,
  
  -- Indexes
  INDEX idx_pg_txn_ts (txn_ts),
  INDEX idx_pg_txn_merchant (merchant_id),
  INDEX idx_pg_txn_card (card_id),
  INDEX idx_pg_txn_date (date_trunc('day', txn_ts))
);

-- Merchant metadata table
CREATE TABLE IF NOT EXISTS pg_merchants (
  merchant_id          TEXT PRIMARY KEY,
  mcc                  INT,
  region               TEXT,
  avg_monthly_txn      NUMERIC(12,2),
  signup_date          DATE,
  
  INDEX idx_pg_merchants_mcc_region (mcc, region)
);

-- Ground-truth labels (mature transactions only)
CREATE TABLE IF NOT EXISTS labels_truth (
  txn_id TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
  y_true SMALLINT NOT NULL CHECK (y_true IN (0,1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_labels_y_true (y_true)
);

-- Model predictions/alerts
CREATE TABLE IF NOT EXISTS pg_alerts (
  txn_id         TEXT PRIMARY KEY REFERENCES pg_transactions(txn_id) ON DELETE CASCADE,
  model_version  TEXT NOT NULL,
  score          DOUBLE PRECISION NOT NULL,
  threshold      DOUBLE PRECISION NOT NULL,
  y_pred         BOOLEAN GENERATED ALWAYS AS (score >= threshold) STORED,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_pg_alerts_score (score DESC),
  INDEX idx_pg_alerts_model (model_version, score DESC)
);

-- External enrichment scores (batch-loaded)
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

### 1.2 Feature Engineering Views

**Location**: `olorin-server/app/persistence/migrations/010_precision_detection_features.sql`

```sql
-- 1. Merchant burst & card-testing detection
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_merchant_day AS
SELECT
  merchant_id,
  date_trunc('day', txn_ts) AS d,
  COUNT(*)                               AS txn_ct,
  COUNT(DISTINCT card_id)                AS uniq_cards,
  AVG(amount)                            AS avg_amt,
  PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY amount) AS p50_amt,
  SUM( (amount <= 2.00)::int )           AS sub2_ct
FROM pg_transactions
GROUP BY 1,2;

CREATE UNIQUE INDEX ON mv_merchant_day (merchant_id, d);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_burst_z AS
WITH base AS (
  SELECT a.merchant_id, a.d, a.uniq_cards,
         AVG(b.uniq_cards) AS m,
         STDDEV_SAMP(b.uniq_cards) AS s
  FROM mv_merchant_day a
  JOIN mv_merchant_day b
    ON a.merchant_id=b.merchant_id
   AND b.d BETWEEN a.d - INTERVAL '30 days' AND a.d - INTERVAL '1 day'
  GROUP BY 1,2,3
)
SELECT merchant_id, d,
       CASE WHEN s>0 THEN (uniq_cards - m)/s ELSE 0 END AS z_uniq_cards
FROM base;

CREATE UNIQUE INDEX ON mv_burst_z (merchant_id, d);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_burst_flags AS
SELECT m.merchant_id, m.d,
       z.z_uniq_cards,
       (m.sub2_ct::float / NULLIF(m.txn_ct,0)) AS tiny_amt_rate,
       (z.z_uniq_cards >= 3 AND (m.sub2_ct::float/NULLIF(m.txn_ct,0)) >= 0.05) AS is_burst_cardtest
FROM mv_merchant_day m
JOIN mv_burst_z z USING (merchant_id, d);

CREATE UNIQUE INDEX ON mv_burst_flags (merchant_id, d);

-- 2. Peer-group outliers
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_merchant_size AS
SELECT m.*,
       NTILE(5) OVER (PARTITION BY m.mcc ORDER BY m.avg_monthly_txn) AS size_bucket
FROM pg_merchants m;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_merchant_month AS
SELECT
  t.merchant_id,
  date_trunc('month', t.txn_ts) AS mon,
  COUNT(*)::float                                    AS txn_ct,
  SUM((EXTRACT(hour FROM t.txn_ts) BETWEEN 0 AND 5)::int)::float AS night_ct,
  SUM((t.txn_type='REFUND')::int)::float             AS refund_ct
FROM pg_transactions t
GROUP BY 1,2;

CREATE UNIQUE INDEX ON mv_merchant_month (merchant_id, mon);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_peer_stats AS
SELECT s.mcc, s.region, s.size_bucket, mm.mon,
       AVG(mm.night_ct/NULLIF(mm.txn_ct,0))                        AS night_rate_avg,
       STDDEV_SAMP(mm.night_ct/NULLIF(mm.txn_ct,0))                AS night_rate_std,
       AVG(mm.refund_ct/NULLIF(mm.txn_ct,0))                       AS refund_rate_avg,
       STDDEV_SAMP(mm.refund_ct/NULLIF(mm.txn_ct,0))               AS refund_rate_std
FROM mv_merchant_month mm
JOIN mv_merchant_size s ON s.merchant_id = mm.merchant_id
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX ON mv_peer_stats (mcc, region, size_bucket, mon);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_peer_flags AS
WITH rates AS (
  SELECT mm.*, (night_ct/NULLIF(txn_ct,0)) AS night_rate,
               (refund_ct/NULLIF(txn_ct,0)) AS refund_rate,
               s.mcc, s.region, s.size_bucket
  FROM mv_merchant_month mm
  JOIN mv_merchant_size s USING (merchant_id)
)
SELECT r.merchant_id, r.mon,
       CASE WHEN ps.night_rate_std  > 0 THEN (r.night_rate  - ps.night_rate_avg )/ps.night_rate_std  ELSE 0 END AS z_night,
       CASE WHEN ps.refund_rate_std > 0 THEN (r.refund_rate - ps.refund_rate_avg)/ps.refund_rate_std ELSE 0 END AS z_refund,
       ( (CASE WHEN ps.night_rate_std  > 0 THEN (r.night_rate  - ps.night_rate_avg )/ps.night_rate_std  ELSE 0 END) >= 3
         OR
         (CASE WHEN ps.refund_rate_std > 0 THEN (r.refund_rate - ps.refund_rate_avg)/ps.refund_rate_std ELSE 0 END) >= 3
       ) AS is_peer_outlier
FROM rates r
JOIN mv_peer_stats ps USING (mcc, region, size_bucket, mon);

CREATE UNIQUE INDEX ON mv_peer_flags (merchant_id, mon);

-- 3. Transaction-level deviations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_card_amount_stats AS
SELECT card_id, date_trunc('month', txn_ts) AS mon,
       AVG(amount) AS card_amt_avg, STDDEV_SAMP(amount) AS card_amt_std
FROM pg_transactions
GROUP BY 1,2;

CREATE UNIQUE INDEX ON mv_card_amount_stats (card_id, mon);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_txn_feats_basic AS
WITH prev_mon AS (
  SELECT t.txn_id, t.card_id, t.amount, t.merchant_id, t.txn_ts,
         (date_trunc('month', t.txn_ts) - INTERVAL '1 month') AS mon_prior
  FROM pg_transactions t
),
card_stats AS (
  SELECT p.txn_id, c.card_amt_avg, c.card_amt_std
  FROM prev_mon p
  LEFT JOIN mv_card_amount_stats c
    ON c.card_id=p.card_id AND c.mon=p.mon_prior
),
first_time AS (
  SELECT t.txn_id,
         NOT EXISTS (
           SELECT 1
           FROM pg_transactions h
           WHERE h.card_id = t.card_id
             AND h.merchant_id = t.merchant_id
             AND h.txn_ts < t.txn_ts
         ) AS is_first_time_card_merchant
  FROM pg_transactions t
),
interarrival AS (
  SELECT t.txn_id,
         (t.txn_ts - LAG(t.txn_ts) OVER (PARTITION BY t.card_id ORDER BY t.txn_ts)) AS card_interarrival
  FROM pg_transactions t
)
SELECT
  t.txn_id, t.merchant_id, t.card_id, t.txn_ts, t.amount,
  cs.card_amt_avg,
  cs.card_amt_std,
  CASE WHEN cs.card_amt_std IS NULL OR cs.card_amt_std=0
       THEN NULL ELSE (t.amount - cs.card_amt_avg)/cs.card_amt_std END AS z_amt_card,
  ft.is_first_time_card_merchant,
  EXTRACT(EPOCH FROM ia.card_interarrival)::bigint AS sec_since_prev_for_card
FROM pg_transactions t
LEFT JOIN card_stats  cs USING (txn_id)
LEFT JOIN first_time  ft USING (txn_id)
LEFT JOIN interarrival ia USING (txn_id);

CREATE UNIQUE INDEX ON mv_txn_feats_basic (txn_id);

-- 4. Graph features
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_degrees AS
SELECT merchant_id, COUNT(DISTINCT card_id) AS deg_merchant
FROM pg_transactions GROUP BY 1;

CREATE UNIQUE INDEX ON mv_degrees (merchant_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_card_deg AS
SELECT card_id, COUNT(DISTINCT merchant_id) AS deg_card
FROM pg_transactions GROUP BY 1;

CREATE UNIQUE INDEX ON mv_card_deg (card_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_txn_graph_feats AS
SELECT t.txn_id, t.merchant_id, t.card_id,
       (SELECT COUNT(DISTINCT merchant_id)
        FROM pg_transactions h
        WHERE h.card_id=t.card_id AND h.txn_ts < t.txn_ts) AS prior_merchants_for_card
FROM pg_transactions t;

CREATE UNIQUE INDEX ON mv_txn_graph_feats (txn_id);

-- 5. Refund/chargeback precursors
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trailing_merchant AS
WITH w AS (
  SELECT t.merchant_id, t.txn_ts::date AS d,
         COUNT(*)::float AS txn_ct,
         SUM( (t.txn_type='REFUND')::int )::float AS refund_ct,
         SUM( (t.dispute_final_outcome ILIKE 'CHARGEBACK_LOST')::int )::float AS cb_ct
  FROM pg_transactions t
  GROUP BY 1,2
),
roll AS (
  SELECT merchant_id, d,
         SUM(txn_ct)   OVER (PARTITION BY merchant_id ORDER BY d ROWS BETWEEN 29 PRECEDING AND 1 PRECEDING) AS txn_ct_30d,
         SUM(refund_ct)OVER (PARTITION BY merchant_id ORDER BY d ROWS BETWEEN 29 PRECEDING AND 1 PRECEDING) AS refund_ct_30d,
         SUM(cb_ct)    OVER (PARTITION BY merchant_id ORDER BY d ROWS BETWEEN 89 PRECEDING AND 1 PRECEDING) AS cb_ct_90d
  FROM w
)
SELECT merchant_id, d,
       (refund_ct_30d/NULLIF(txn_ct_30d,0)) AS refund_rate_30d_prior,
       (cb_ct_90d/NULLIF(SUM(txn_ct_30d) OVER (PARTITION BY merchant_id ORDER BY d
         ROWS BETWEEN 89 PRECEDING AND 1 PRECEDING),0)) AS cb_rate_90d_prior
FROM roll;

CREATE UNIQUE INDEX ON mv_trailing_merchant (merchant_id, d);

-- 6. Assembled feature view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_features_txn AS
SELECT
  t.txn_id, t.txn_ts, t.merchant_id, t.card_id, t.amount, t.currency,
  -- from 2.1 (merchant day burst)
  bf.is_burst_cardtest,
  COALESCE(bf.tiny_amt_rate,0) AS tiny_amt_rate,
  COALESCE(bf.z_uniq_cards,0)  AS z_unique_cards_30d,
  -- from 2.2 (peer)
  pf.z_night, pf.z_refund,
  -- from 2.3 (txn deviations)
  f.z_amt_card,
  f.is_first_time_card_merchant,
  f.sec_since_prev_for_card,
  -- from 2.4 (graph lite)
  g.prior_merchants_for_card,
  -- from 2.5 (merchant trailing)
  tm.refund_rate_30d_prior,
  tm.cb_rate_90d_prior
FROM pg_transactions t
LEFT JOIN mv_burst_flags         bf ON bf.merchant_id=t.merchant_id AND bf.d = date_trunc('day', t.txn_ts)
LEFT JOIN mv_peer_flags          pf ON pf.merchant_id=t.merchant_id AND pf.mon= date_trunc('month', t.txn_ts)
LEFT JOIN mv_txn_feats_basic     f  USING (txn_id)
LEFT JOIN mv_txn_graph_feats     g  USING (txn_id)
LEFT JOIN mv_trailing_merchant   tm ON tm.merchant_id=t.merchant_id AND tm.d  = t.txn_ts::date;

CREATE UNIQUE INDEX ON mv_features_txn (txn_id);
```

---

## Phase 1.5: External Enrichment Pipeline

### 1.5.1 Graph Analytics Export & Processing

**Location**: `olorin-server/scripts/enrichment/graph_analytics_export.py`

```python
"""
Export transaction graph from Snowflake and process with Neo4j GDS.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from neo4j import GraphDatabase
from app.service.snowflake_service import SnowflakeQueryService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

def export_transaction_graph(snowflake_service: SnowflakeQueryService):
    """Export card↔merchant bipartite graph from Snowflake."""
    query = f"""
    SELECT DISTINCT
      CARD_BIN || CARD_LAST4 as card_id,
      MERCHANT_ID as merchant_id,
      TX_ID_KEY as txn_id,
      TX_DATETIME as txn_ts,
      IS_FRAUD_TX as is_fraud
    FROM {snowflake_service.table_name}
    WHERE TX_DATETIME <= CURRENT_DATE - INTERVAL '6 months'
      AND CARD_BIN IS NOT NULL
      AND CARD_LAST4 IS NOT NULL
    """
    return snowflake_service.execute_query(query)

def load_to_neo4j(transactions: list, neo4j_uri: str, neo4j_user: str, neo4j_password: str):
    """Load transactions into Neo4j and run GDS algorithms."""
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    
    with driver.session() as session:
        # Create nodes and relationships
        session.run("""
            UNWIND $txns AS txn
            MERGE (c:Card {id: txn.card_id})
            MERGE (m:Merchant {id: txn.merchant_id})
            CREATE (t:Transaction {{
                id: txn.txn_id,
                ts: datetime(txn.txn_ts),
                is_fraud: txn.is_fraud
            }})
            CREATE (c)-[:TRANSACTED_WITH]->(m)
            CREATE (t)-[:BELONGS_TO]->(c)
            CREATE (t)-[:AT]->(m)
        """, txns=transactions)
        
        # Run GDS algorithms (components, PageRank, shortest path)
        # Export features back to PostgreSQL
        features = session.run("""
            MATCH (c:Card)
            OPTIONAL MATCH (c)-[:BELONGS_TO]->(t:Transaction)
            WITH c, 
                 COUNT(DISTINCT t) as txn_count,
                 SUM(CASE WHEN t.is_fraud THEN 1 ELSE 0 END) as fraud_count,
                 c.component as component_id,
                 c.pagerank as pagerank_score,
                 c.shortest_path_to_fraud as path_to_fraud
            MATCH (c)-[:TRANSACTED_WITH]->(m:Merchant)
            WITH c, txn_count, fraud_count, component_id, pagerank_score, path_to_fraud,
                 COUNT(DISTINCT m) as merchant_count
            MATCH (component:Card {{component: component_id}})
            OPTIONAL MATCH (component)-[:BELONGS_TO]->(ct:Transaction)
            WITH c, txn_count, fraud_count, merchant_count, pagerank_score, path_to_fraud,
                 SUM(CASE WHEN ct.is_fraud THEN 1 ELSE 0 END)::float / COUNT(ct) as component_fraud_rate
            RETURN c.id as card_id,
                   component_fraud_rate,
                   COALESCE(path_to_fraud, 999) as shortest_path_to_fraud,
                   merchant_count as shared_card_pressure,
                   pagerank_score
        """).data()
        
    driver.close()
    return features

def load_graph_features_to_postgres(features: list, pg_engine):
    """Load graph features into PostgreSQL."""
    with pg_engine.begin() as conn:
        for feat in features:
            conn.execute(text("""
                UPDATE pg_enrichment_scores
                SET component_fraud_rate = :component_fraud_rate,
                    shortest_path_to_fraud = :shortest_path_to_fraud,
                    shared_card_pressure = :shared_card_pressure,
                    pagerank_score = :pagerank_score
                FROM pg_transactions t
                WHERE pg_enrichment_scores.txn_id = t.txn_id
                  AND t.card_id = :card_id
            """), feat)
```

### 1.5.2 BIN Lookup Enrichment (Composio Custom Tool)

**Location**: `olorin-server/app/service/composio/custom_tools/bin_lookup_tool.py`

```python
"""
Composio Custom Tool for BIN/IIN lookup (Mastercard or Neutrino).
"""

import os
import requests
from typing import Dict, Any
from sqlalchemy import create_engine, text
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class BINLookupTool:
    """Custom tool for BIN lookup via Mastercard or Neutrino API."""
    
    def __init__(self, provider: str = "neutrino"):
        self.provider = provider
        self.api_key = os.getenv(f"{provider.upper()}_API_KEY")
    
    def lookup_bin(self, bin_code: str) -> Dict[str, Any]:
        """Lookup BIN/IIN information."""
        if self.provider == "mastercard":
            return self._mastercard_lookup(bin_code)
        else:
            return self._neutrino_lookup(bin_code)
    
    def _mastercard_lookup(self, bin_code: str) -> Dict[str, Any]:
        """Mastercard BIN Lookup API."""
        url = f"https://api.mastercard.com/binlookup/v1/{bin_code}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
        response = requests.get(url, headers=headers)
        data = response.json()
        
        return {
            "issuer_country": data.get("country", {}).get("alpha2"),
            "card_type": data.get("product", {}).get("type"),
            "issuer_name": data.get("issuer", {}).get("name"),
            "card_brand": data.get("scheme")
        }
    
    def _neutrino_lookup(self, bin_code: str) -> Dict[str, Any]:
        """Neutrino BIN Lookup API."""
        url = "https://neutrinoapi.net/bin-lookup"
        params = {
            "bin-code": bin_code,
            "user-id": self.api_key.split(":")[0],
            "api-key": self.api_key.split(":")[1]
        }
        response = requests.post(url, params=params)
        data = response.json()
        
        return {
            "issuer_country": data.get("country-code"),
            "card_type": data.get("card-type"),
            "issuer_name": data.get("issuer"),
            "card_brand": data.get("scheme")
        }

def enrich_transactions_bin(transactions: list, pg_engine):
    """Batch enrich transactions with BIN lookup."""
    tool = BINLookupTool()
    
    # Get unique BINs
    bins = set()
    for txn in transactions:
        if txn.get("card_bin"):
            bins.add(txn["card_bin"])
    
    # Lookup each BIN
    bin_data = {}
    for bin_code in bins:
        try:
            bin_data[bin_code] = tool.lookup_bin(bin_code)
        except Exception as e:
            logger.warning(f"BIN lookup failed for {bin_code}: {e}")
    
    # Update PostgreSQL
    with pg_engine.begin() as conn:
        for txn in transactions:
            bin_code = txn.get("card_bin")
            if bin_code and bin_code in bin_data:
                data = bin_data[bin_code]
                merchant_country = txn.get("country") or txn.get("merchant_country")
                
                conn.execute(text("""
                    INSERT INTO pg_enrichment_scores (
                      txn_id, issuer_country, card_type, issuer_name,
                      issuer_geo_mismatch, card_type_risk
                    ) VALUES (
                      :txn_id, :issuer_country, :card_type, :issuer_name,
                      :issuer_geo_mismatch, :card_type_risk
                    )
                    ON CONFLICT (txn_id) DO UPDATE SET
                      issuer_country = EXCLUDED.issuer_country,
                      card_type = EXCLUDED.card_type,
                      issuer_name = EXCLUDED.issuer_name,
                      issuer_geo_mismatch = EXCLUDED.issuer_geo_mismatch,
                      card_type_risk = EXCLUDED.card_type_risk
                """), {
                    "txn_id": txn["txn_id"],
                    "issuer_country": data.get("issuer_country"),
                    "card_type": data.get("card_type"),
                    "issuer_name": data.get("issuer_name"),
                    "issuer_geo_mismatch": data.get("issuer_country") != merchant_country,
                    "card_type_risk": data.get("card_type") == "prepaid" and txn.get("merchant_risk_level") == "high"
                })
```

### 1.5.3 IP Risk Enrichment (Composio Custom Tool)

**Location**: `olorin-server/app/service/composio/custom_tools/ip_risk_tool.py`

```python
"""
Composio Custom Tool for IP risk scoring (MaxMind or IPQualityScore).
"""

import os
import requests
from typing import Dict, Any
from sqlalchemy import create_engine, text
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class IPRiskTool:
    """Custom tool for IP risk scoring."""
    
    def __init__(self, provider: str = "maxmind"):
        self.provider = provider
        self.api_key = os.getenv(f"{provider.upper()}_API_KEY")
    
    def score_ip(self, ip_address: str) -> Dict[str, Any]:
        """Score IP address for risk."""
        if self.provider == "maxmind":
            return self._maxmind_score(ip_address)
        else:
            return self._ipqs_score(ip_address)
    
    def _maxmind_score(self, ip_address: str) -> Dict[str, Any]:
        """MaxMind minFraud API."""
        url = "https://minfraud.maxmind.com/minfraud/v2.0/score"
        data = {"device": {"ip_address": ip_address}}
        headers = {
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        return {
            "ip_risk_score": result.get("risk_score", 0) / 100.0,
            "ip_proxy_detected": result.get("ip_address", {}).get("traits", {}).get("is_anonymous_proxy", False),
            "ip_vpn_detected": result.get("ip_address", {}).get("traits", {}).get("is_vpn", False),
            "ip_tor_detected": result.get("ip_address", {}).get("traits", {}).get("is_tor_exit_node", False),
            "ip_datacenter": result.get("ip_address", {}).get("traits", {}).get("is_datacenter", False)
        }
    
    def _ipqs_score(self, ip_address: str) -> Dict[str, Any]:
        """IPQualityScore API."""
        url = f"https://ipqualityscore.com/api/json/ip/{self.api_key}/{ip_address}"
        response = requests.get(url)
        result = response.json()
        
        return {
            "ip_risk_score": result.get("fraud_score", 0) / 100.0,
            "ip_proxy_detected": result.get("proxy", False),
            "ip_vpn_detected": result.get("vpn", False),
            "ip_tor_detected": result.get("tor", False),
            "ip_datacenter": result.get("hosting", False)
        }

def enrich_transactions_ip(transactions: list, pg_engine):
    """Batch enrich transactions with IP risk scores."""
    tool = IPRiskTool()
    
    # Get unique IPs
    ips = set()
    for txn in transactions:
        if txn.get("ip") or txn.get("ip_address"):
            ips.add(txn.get("ip") or txn.get("ip_address"))
    
    # Score each IP
    ip_scores = {}
    for ip in ips:
        try:
            ip_scores[ip] = tool.score_ip(ip)
        except Exception as e:
            logger.warning(f"IP scoring failed for {ip}: {e}")
    
    # Update PostgreSQL
    with pg_engine.begin() as conn:
        for txn in transactions:
            ip = txn.get("ip") or txn.get("ip_address")
            if ip and ip in ip_scores:
                data = ip_scores[ip]
                conn.execute(text("""
                    INSERT INTO pg_enrichment_scores (
                      txn_id, ip_risk_score, ip_proxy_detected, ip_vpn_detected,
                      ip_tor_detected, ip_datacenter
                    ) VALUES (
                      :txn_id, :ip_risk_score, :ip_proxy_detected, :ip_vpn_detected,
                      :ip_tor_detected, :ip_datacenter
                    )
                    ON CONFLICT (txn_id) DO UPDATE SET
                      ip_risk_score = EXCLUDED.ip_risk_score,
                      ip_proxy_detected = EXCLUDED.ip_proxy_detected,
                      ip_vpn_detected = EXCLUDED.ip_vpn_detected,
                      ip_tor_detected = EXCLUDED.ip_tor_detected,
                      ip_datacenter = EXCLUDED.ip_datacenter
                """), {
                    "txn_id": txn["txn_id"],
                    **data
                })
```

### 1.5.4 Email/Phone Enrichment (Composio Integration)

**Location**: `olorin-server/scripts/enrichment/email_phone_enrichment.py`

```python
"""
Email and phone enrichment using Composio (Veriphone already integrated) and Custom Tools.
"""

from sqlalchemy import create_engine, text
from app.service.composio.client import ComposioClient
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

def enrich_transactions_email_phone(transactions: list, pg_engine, composio_client: ComposioClient):
    """Batch enrich transactions with email and phone intelligence."""
    
    # Email enrichment (Emailage via Custom Tool - implement separately)
    # Phone enrichment (Veriphone via Composio)
    phones = set(txn.get("phone_number") for txn in transactions if txn.get("phone_number"))
    
    phone_scores = {}
    for phone in phones:
        try:
            # Use Composio Veriphone action
            result = composio_client.execute_action(
                toolkit="veriphone",
                action="verify_phone",
                parameters={"phone": phone}
            )
            phone_scores[phone] = {
                "phone_valid": result.get("valid", False),
                "phone_carrier": result.get("carrier"),
                "phone_type": result.get("type")
            }
        except Exception as e:
            logger.warning(f"Phone verification failed for {phone}: {e}")
    
    # Update PostgreSQL
    with pg_engine.begin() as conn:
        for txn in transactions:
            phone = txn.get("phone_number")
            
            if phone and phone in phone_scores:
                data = phone_scores[phone]
                conn.execute(text("""
                    UPDATE pg_enrichment_scores
                    SET phone_valid = :phone_valid,
                        phone_carrier = :phone_carrier,
                        phone_type = :phone_type
                    WHERE txn_id = :txn_id
                """), {
                    "txn_id": txn["txn_id"],
                    **data
                })
```

### 1.5.5 Update Feature View with Enrichment

**Location**: Update `010_precision_detection_features.sql`

```sql
-- Update mv_features_txn to include enrichment scores
DROP MATERIALIZED VIEW IF EXISTS mv_features_txn;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_features_txn AS
SELECT
  t.txn_id, t.txn_ts, t.merchant_id, t.card_id, t.amount, t.currency,
  
  -- Original features
  bf.is_burst_cardtest,
  COALESCE(bf.tiny_amt_rate,0) AS tiny_amt_rate,
  COALESCE(bf.z_uniq_cards,0)  AS z_unique_cards_30d,
  pf.z_night, pf.z_refund,
  f.z_amt_card,
  f.is_first_time_card_merchant,
  f.sec_since_prev_for_card,
  g.prior_merchants_for_card,
  tm.refund_rate_30d_prior,
  tm.cb_rate_90d_prior,
  
  -- NEW: Enrichment features
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

---

## Phase 2: ETL Pipeline (Snowflake → PostgreSQL)

### 2.1 ETL Script

**Location**: `olorin-server/scripts/etl_snowflake_to_postgres.py`

```python
"""
ETL pipeline to extract mature transactions from Snowflake and load into PostgreSQL.
Runs as a scheduled job (daily/weekly) to keep pg_transactions updated.
"""

import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from app.service.snowflake_service import SnowflakeConnectionFactory, SnowflakeQueryService
from app.config.snowflake_config import SnowflakeConfig

def extract_mature_transactions(snowflake_service: SnowflakeQueryService, cutoff_date: datetime):
    """Extract transactions ≥6 months old from Snowflake."""
    query = f"""
    SELECT
      TX_ID_KEY as txn_id,
      TX_DATETIME as txn_ts,
      MERCHANT_ID as merchant_id,
      CARD_BIN || CARD_LAST4 as card_id,  -- Construct card_id from BIN+LAST4
      PAID_AMOUNT_VALUE_IN_CURRENCY as amount,
      PAID_CURRENCY_CODE as currency,
      TX_STATUS as approval_status,
      TX_TYPE as txn_type,
      IP_COUNTRY as country,
      MERCHANT_CATEGORY_CODE as mcc,
      CASE 
        WHEN IP_COUNTRY IN ('US', 'CA') THEN 'US-CA'
        WHEN IP_COUNTRY IN ('GB', 'IE') THEN 'EU-UK'
        ELSE 'OTHER'
      END as region,
      IS_FRAUD_TX as is_fraud_final,
      DISPUTE_OUTCOME as dispute_final_outcome,
      CHARGEBACK_REASON as dispute_reason_code,
      NULL as refund_ts,  -- Map from REFUND_DATE if available
      CHARGEBACK_DATE as chargeback_ts
    FROM {snowflake_service.table_name}
    WHERE TX_DATETIME <= '{cutoff_date.isoformat()}'
      AND TX_DATETIME >= '{cutoff_date - timedelta(days=365)}'  -- Last year only
    """
    return snowflake_service.execute_query(query)

def load_to_postgres(transactions: list, pg_engine):
    """Load transactions into PostgreSQL with upsert logic."""
    with pg_engine.begin() as conn:
        # Upsert transactions
        for txn in transactions:
            conn.execute(text("""
                INSERT INTO pg_transactions (
                  txn_id, txn_ts, merchant_id, card_id, amount, currency,
                  approval_status, txn_type, country, mcc, region,
                  is_fraud_final, dispute_final_outcome, dispute_reason_code,
                  refund_ts, chargeback_ts
                ) VALUES (
                  :txn_id, :txn_ts, :merchant_id, :card_id, :amount, :currency,
                  :approval_status, :txn_type, :country, :mcc, :region,
                  :is_fraud_final, :dispute_final_outcome, :dispute_reason_code,
                  :refund_ts, :chargeback_ts
                )
                ON CONFLICT (txn_id) DO UPDATE SET
                  is_fraud_final = EXCLUDED.is_fraud_final,
                  dispute_final_outcome = EXCLUDED.dispute_final_outcome,
                  chargeback_ts = EXCLUDED.chargeback_ts
            """), txn)

def build_merchants_table(pg_engine):
    """Build pg_merchants from pg_transactions aggregates."""
    with pg_engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO pg_merchants (merchant_id, mcc, region, avg_monthly_txn, signup_date)
            SELECT
              merchant_id,
              MODE() WITHIN GROUP (ORDER BY mcc) as mcc,
              MODE() WITHIN GROUP (ORDER BY region) as region,
              COUNT(*)::float / GREATEST(EXTRACT(EPOCH FROM (MAX(txn_ts) - MIN(txn_ts))) / 2592000, 1) as avg_monthly_txn,
              MIN(txn_ts)::date as signup_date
            FROM pg_transactions
            GROUP BY merchant_id
            ON CONFLICT (merchant_id) DO UPDATE SET
              avg_monthly_txn = EXCLUDED.avg_monthly_txn
        """))

def build_labels_truth(pg_engine, maturity_days: int = 14):
    """Build ground-truth labels from mature transactions."""
    cutoff_date = datetime.now() - timedelta(days=180)  # 6 months
    maturity_date = datetime.now() - timedelta(days=maturity_days)
    
    with pg_engine.begin() as conn:
        conn.execute(text(f"""
            WITH params AS (
              SELECT '{cutoff_date.isoformat()}'::timestamptz AS E, {maturity_days}::int AS L_days
            ),
            eligible AS (
              SELECT t.*
              FROM pg_transactions t, params p
              WHERE t.txn_ts <= p.E
                AND t.txn_ts <= p.E - (p.L_days || ' days')::interval
            ),
            positives AS (
              SELECT txn_id
              FROM eligible
              WHERE is_fraud_final = true
                 OR dispute_final_outcome ILIKE 'CHARGEBACK_LOST'
                 OR (dispute_reason_code ~ '^10\\..*')
            )
            INSERT INTO labels_truth (txn_id, y_true)
            SELECT e.txn_id, CASE WHEN p.txn_id IS NOT NULL THEN 1 ELSE 0 END
            FROM eligible e
            LEFT JOIN positives p USING (txn_id)
            ON CONFLICT (txn_id) DO UPDATE SET y_true = EXCLUDED.y_true
        """))

def refresh_materialized_views(pg_engine):
    """Refresh all materialized views."""
    views = [
        'mv_merchant_day', 'mv_burst_z', 'mv_burst_flags',
        'mv_merchant_size', 'mv_merchant_month', 'mv_peer_stats', 'mv_peer_flags',
        'mv_card_amount_stats', 'mv_txn_feats_basic',
        'mv_degrees', 'mv_card_deg', 'mv_txn_graph_feats',
        'mv_trailing_merchant', 'mv_features_txn'
    ]
    with pg_engine.begin() as conn:
        for view in views:
            conn.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}"))

def run_enrichment_pipeline(transactions: list, pg_engine, composio_client=None):
    """Run all enrichment pipelines in priority order."""
    logger.info("Starting enrichment pipeline...")
    
    # Priority 1: Graph analytics (if Neo4j configured)
    if os.getenv('NEO4J_URI'):
        logger.info("Running graph analytics enrichment...")
        graph_features = load_to_neo4j(transactions, 
                                      os.getenv('NEO4J_URI'),
                                      os.getenv('NEO4J_USER'),
                                      os.getenv('NEO4J_PASSWORD'))
        load_graph_features_to_postgres(graph_features, pg_engine)
    
    # Priority 2: BIN lookup
    logger.info("Running BIN lookup enrichment...")
    enrich_transactions_bin(transactions, pg_engine)
    
    # Priority 3: IP risk (if IPs available)
    if any(txn.get('ip') or txn.get('ip_address') for txn in transactions):
        logger.info("Running IP risk enrichment...")
        enrich_transactions_ip(transactions, pg_engine)
    
    # Priority 4: Email/Phone (if available)
    if any(txn.get('email') or txn.get('phone_number') for txn in transactions):
        logger.info("Running email/phone enrichment...")
        if composio_client:
            enrich_transactions_email_phone(transactions, pg_engine, composio_client)
    
    logger.info("Enrichment pipeline complete")

if __name__ == "__main__":
    # Initialize connections
    sf_config = SnowflakeConfig.from_env()
    sf_factory = SnowflakeConnectionFactory(sf_config)
    sf_service = SnowflakeQueryService(sf_factory)
    
    pg_url = os.getenv('DATABASE_URL')  # PostgreSQL connection string
    pg_engine = create_engine(pg_url)
    
    # Run ETL
    cutoff = datetime.now() - timedelta(days=180)
    transactions = extract_mature_transactions(sf_service, cutoff)
    print(f"Extracted {len(transactions)} mature transactions")
    
    load_to_postgres(transactions, pg_engine)
    build_merchants_table(pg_engine)
    build_labels_truth(pg_engine)
    
    # Run enrichment pipeline
    from app.service.composio.client import ComposioClient
    composio_client = ComposioClient() if os.getenv('COMPOSIO_API_KEY') else None
    run_enrichment_pipeline(transactions, pg_engine, composio_client)
    
    refresh_materialized_views(pg_engine)
    
    print("ETL complete")
```

---

## Phase 3: Model Training Pipeline

### 3.1 Training Script

**Location**: `olorin-server/scripts/train_precision_model.py`

```python
"""
Train precision-focused fraud detection model using retro labels.
"""

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sklearn.model_selection import train_test_split
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import precision_recall_curve, confusion_matrix
from xgboost import XGBClassifier
import os

def load_training_data(pg_engine, maturity_days=14):
    """Load mature transactions with features and labels."""
    query = text("""
        WITH params AS (
          SELECT CURRENT_DATE::date AS E, :maturity_days::int AS L_days
        )
        SELECT f.*, l.y_true
        FROM mv_features_txn f
        JOIN labels_truth l USING (txn_id)
        JOIN pg_transactions t USING (txn_id), params p
        WHERE t.txn_ts::date <= p.E - INTERVAL '6 months'
          AND t.txn_ts::date <= p.E - (p.L_days || ' days')::interval
        ORDER BY t.txn_ts
    """)
    
    df = pd.read_sql(query, pg_engine, params={"maturity_days": maturity_days})
    return df

def train_model(df: pd.DataFrame, model_version: str = "gbm_v1"):
    """Train XGBoost model with temporal split and calibration."""
    # Temporal split: oldest 70% train, newest 30% test
    df = df.sort_values("txn_ts")
    cut = int(len(df) * 0.7)
    train, test = df.iloc[:cut], df.iloc[cut:]
    
    features = [
        # Original features
        "is_burst_cardtest", "tiny_amt_rate", "z_unique_cards_30d",
        "z_night", "z_refund", "z_amt_card", "is_first_time_card_merchant",
        "sec_since_prev_for_card", "prior_merchants_for_card",
        "refund_rate_30d_prior", "cb_rate_90d_prior",
        # NEW: Enrichment features (if available)
        "component_fraud_rate", "shortest_path_to_fraud", "shared_card_pressure",
        "pagerank_score", "issuer_geo_mismatch_flag", "card_type_risk_flag",
        "ip_risk_score", "ip_proxy_flag", "ip_vpn_flag", "ip_tor_flag",
        "email_risk_score", "phone_valid_flag", "address_mismatch_flag"
    ]
    
    # Filter to only features that exist in dataframe
    features = [f for f in features if f in df.columns]
    
    X_tr, y_tr = train[features].fillna(0), train["y_true"].astype(int)
    X_te, y_te = test[features].fillna(0), test["y_true"].astype(int)
    
    # Train XGBoost
    clf = XGBClassifier(
        n_estimators=300, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, reg_lambda=2.0,
        objective="binary:logistic", n_jobs=8, eval_metric="logloss"
    )
    clf.fit(X_tr, y_tr)
    
    # Calibrate with isotonic regression
    proba_te = clf.predict_proba(X_te)[:, 1]
    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(proba_te, y_te)
    
    # Choose threshold for precision@K (target precision >= 0.9)
    prec, rec, thr = precision_recall_curve(y_te, iso.transform(proba_te))
    target = 0.9
    thr90 = float(thr[np.where(prec[:-1] >= target)[0][0]]) if np.any(prec[:-1] >= target) else 0.99
    
    return clf, iso, thr90, (X_te, y_te, proba_te)

def score_all_transactions(clf, iso, pg_engine):
    """Score all eligible transactions and write to pg_alerts."""
    query = text("SELECT txn_id, " + ",".join(features) + " FROM mv_features_txn")
    all_df = pd.read_sql(query, pg_engine).fillna(0)
    
    all_proba = iso.transform(clf.predict_proba(all_df[features])[:, 1])
    
    to_write = pd.DataFrame({
        "txn_id": all_df["txn_id"],
        "model_version": "gbm_v1",
        "score": all_proba,
        "threshold": thr90
    })
    
    with pg_engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE pg_alerts"))
        to_write.to_sql("pg_alerts", conn, if_exists="append", index=False)

if __name__ == "__main__":
    pg_url = os.getenv('DATABASE_URL')
    pg_engine = create_engine(pg_url)
    
    df = load_training_data(pg_engine)
    print(f"Loaded {len(df)} training samples")
    
    clf, iso, thr90, (X_te, y_te, proba_te) = train_model(df)
    print(f"Model trained. Threshold for 90% precision: {thr90:.4f}")
    
    score_all_transactions(clf, iso, pg_engine)
    print("Scoring complete")
```

---

## Phase 4: Domain Agent Integration

### 4.1 Feature Lookup Service

**Location**: `olorin-server/app/service/precision_detection/feature_service.py`

```python
"""
Service for domain agents to lookup precision-focused features.
"""

from typing import Dict, Any, Optional
from sqlalchemy import create_engine, text
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class PrecisionFeatureService:
    """Service to provide precision-focused features to domain agents."""
    
    def __init__(self, pg_engine):
        self.pg_engine = pg_engine
    
    def get_transaction_features(self, txn_id: str) -> Optional[Dict[str, Any]]:
        """Get precision features for a transaction."""
        query = text("""
            SELECT * FROM mv_features_txn WHERE txn_id = :txn_id
        """)
        with self.pg_engine.begin() as conn:
            result = conn.execute(query, {"txn_id": txn_id}).fetchone()
            if result:
                return dict(result)
        return None
    
    def get_merchant_burst_signals(self, merchant_id: str, date: str) -> Optional[Dict[str, Any]]:
        """Get merchant burst/card-testing signals for a merchant-day."""
        query = text("""
            SELECT * FROM mv_burst_flags 
            WHERE merchant_id = :merchant_id AND d = :date
        """)
        with self.pg_engine.begin() as conn:
            result = conn.execute(query, {"merchant_id": merchant_id, "date": date}).fetchone()
            if result:
                return dict(result)
        return None
    
    def get_peer_outlier_signals(self, merchant_id: str, month: str) -> Optional[Dict[str, Any]]:
        """Get peer-group outlier signals for a merchant-month."""
        query = text("""
            SELECT * FROM mv_peer_flags 
            WHERE merchant_id = :merchant_id AND mon = :month
        """)
        with self.pg_engine.begin() as conn:
            result = conn.execute(query, {"merchant_id": merchant_id, "month": month}).fetchone()
            if result:
                return dict(result)
        return None
    
    def get_model_score(self, txn_id: str) -> Optional[float]:
        """Get calibrated model score for a transaction."""
        query = text("""
            SELECT score FROM pg_alerts WHERE txn_id = :txn_id
        """)
        with self.pg_engine.begin() as conn:
            result = conn.execute(query, {"txn_id": txn_id}).fetchone()
            if result:
                return float(result[0])
        return None
```

### 4.2 Enhanced Merchant Agent

**Location**: `olorin-server/app/service/agent/orchestration/domain_agents/merchant_agent.py` (modify existing)

Add precision feature integration:

```python
from app.service.precision_detection.feature_service import PrecisionFeatureService

async def merchant_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    # ... existing code ...
    
    # NEW: Get precision features
    precision_service = PrecisionFeatureService(get_pg_engine())
    snowflake_data = state.get("snowflake_data", {})
    
    if snowflake_data and isinstance(snowflake_data, dict) and "results" in snowflake_data:
        results = snowflake_data["results"]
        for record in results[:10]:  # Check first 10 transactions
            txn_id = record.get("TX_ID_KEY") or record.get("tx_id_key")
            if txn_id:
                # Get precision features
                precision_feats = precision_service.get_transaction_features(txn_id)
                if precision_feats:
                    # Add burst signals to evidence
                    if precision_feats.get("is_burst_cardtest"):
                        findings["evidence"].append(
                            f"Merchant burst/card-testing detected: "
                            f"z_unique_cards={precision_feats.get('z_unique_cards_30d', 0):.2f}, "
                            f"tiny_amt_rate={precision_feats.get('tiny_amt_rate', 0):.2%}"
                        )
                    
                    # Add peer outlier signals
                    if precision_feats.get("z_refund", 0) >= 3:
                        findings["evidence"].append(
                            f"Peer-group refund outlier: z_refund={precision_feats.get('z_refund', 0):.2f}"
                        )
                    
                    # Add model score as additional signal
                    model_score = precision_service.get_model_score(txn_id)
                    if model_score and model_score > 0.7:
                        findings["evidence"].append(
                            f"High precision model score: {model_score:.3f}"
                        )
    
    # ... rest of existing code ...
```

### 4.3 Enhanced Risk Agent

**Location**: `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` (modify existing)

Add calibrated model score stacking:

```python
from app.service.precision_detection.feature_service import PrecisionFeatureService

async def risk_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    # ... existing code ...
    
    # NEW: Stack precision model score
    precision_service = PrecisionFeatureService(get_pg_engine())
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    
    # Get model score for this entity's transactions
    if entity_type == "transaction":
        model_score = precision_service.get_model_score(entity_id)
        if model_score:
            # Stack model score as additional signal
            facts["precision_model_score"] = model_score
            if model_score > 0.8:
                risk_indicators.append(f"High precision model score: {model_score:.3f}")
    
    # ... rest of existing code ...
```

---

## Phase 5: Evaluation & Monitoring

### 5.1 Evaluation Queries

**Location**: `olorin-server/scripts/evaluate_precision_model.py`

```python
"""
Evaluate precision model performance with confusion matrices and precision@K.
"""

from sqlalchemy import create_engine, text
import pandas as pd

def evaluate_confusion_matrix(pg_engine):
    """Compute confusion matrix by month and model version."""
    query = text("""
        SELECT
          date_trunc('month', t.txn_ts) AS eval_month,
          a.model_version, a.threshold,
          COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=1) AS tp,
          COUNT(*) FILTER (WHERE l.y_true=0 AND a.y_pred=1) AS fp,
          COUNT(*) FILTER (WHERE l.y_true=0 AND a.y_pred=0) AS tn,
          COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=0) AS fn,
          (COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=1))::float
            / NULLIF(COUNT(*) FILTER (WHERE a.y_pred=1),0) AS precision,
          (COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=1))::float
            / NULLIF(COUNT(*) FILTER (WHERE l.y_true=1),0) AS recall
        FROM pg_alerts a
        JOIN labels_truth l USING (txn_id)
        JOIN pg_transactions t USING (txn_id)
        GROUP BY 1,2,3
        ORDER BY 1,2
    """)
    return pd.read_sql(query, pg_engine)

def evaluate_precision_at_k(pg_engine, k: int = 100):
    """Compute precision@K per day (investigation capacity)."""
    query = text(f"""
        WITH ranked AS (
          SELECT
            date_trunc('day', t.txn_ts) AS d,
            a.model_version, a.score, l.y_true, t.txn_id,
            ROW_NUMBER() OVER (PARTITION BY date_trunc('day', t.txn_ts), a.model_version
                               ORDER BY a.score DESC, t.txn_id) AS rn
          FROM pg_alerts a
          JOIN labels_truth l USING (txn_id)
          JOIN pg_transactions t USING (txn_id)
        ),
        topk AS (SELECT * FROM ranked WHERE rn <= {k})
        SELECT d, model_version,
               COUNT(*) FILTER (WHERE y_true=1) AS tp,
               COUNT(*) FILTER (WHERE y_true=0) AS fp,
               (COUNT(*) FILTER (WHERE y_true=1))::float / NULLIF(COUNT(*),0) AS precision_at_k
        FROM topk
        GROUP BY 1,2
        ORDER BY 1,2
    """)
    return pd.read_sql(query, pg_engine)

if __name__ == "__main__":
    pg_url = os.getenv('DATABASE_URL')
    pg_engine = create_engine(pg_url)
    
    confusion = evaluate_confusion_matrix(pg_engine)
    print("Confusion Matrix:")
    print(confusion)
    
    prec_at_k = evaluate_precision_at_k(pg_engine, k=100)
    print("\nPrecision@100:")
    print(prec_at_k)
```

---

## Phase 6: Deployment & Scheduling

### 6.1 Scheduled Jobs

**Location**: `olorin-server/app/service/precision_detection/scheduler.py`

```python
"""
Scheduled jobs for precision detection pipeline.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

def schedule_precision_detection_jobs():
    """Schedule ETL, training, and evaluation jobs."""
    scheduler = BackgroundScheduler()
    
    # Daily ETL: Extract new mature transactions
    scheduler.add_job(
        func=run_etl_pipeline,
        trigger="cron",
        hour=2,  # 2 AM daily
        minute=0,
        id="precision_etl_daily"
    )
    
    # Weekly model retraining
    scheduler.add_job(
        func=run_training_pipeline,
        trigger="cron",
        day_of_week="sunday",
        hour=3,  # 3 AM Sunday
        minute=0,
        id="precision_training_weekly"
    )
    
    # Daily evaluation report
    scheduler.add_job(
        func=run_evaluation_report,
        trigger="cron",
        hour=4,  # 4 AM daily
        minute=0,
        id="precision_evaluation_daily"
    )
    
    scheduler.start()
    logger.info("Precision detection jobs scheduled")
```

---

## Implementation Checklist

### Phase 0: External Enrichment (Priority Order)
- [ ] Set up Neo4j GDS or TigerGraph for graph analytics
- [ ] Create Composio Custom Tool for BIN lookup (Mastercard/Neutrino)
- [ ] Create Composio Custom Tool for IP risk (MaxMind/IPQualityScore)
- [ ] Create Composio Custom Tool for Emailage (if emails available)
- [ ] Verify Veriphone integration in Composio (already available)
- [ ] Create Composio Custom Tool for TeleSign (if phones available)
- [ ] Test enrichment pipelines with sample data

### Phase 1: Schema Setup
- [ ] Create migration `009_precision_detection_tables.sql` (includes `pg_enrichment_scores`)
- [ ] Create migration `010_precision_detection_features.sql` (includes enrichment features)
- [ ] Run migrations on PostgreSQL
- [ ] Verify indexes and materialized views

### Phase 1.5: Enrichment Pipeline
- [ ] Implement graph analytics export (`graph_analytics_export.py`)
- [ ] Implement BIN lookup enrichment (`bin_lookup_tool.py`)
- [ ] Implement IP risk enrichment (`ip_risk_tool.py`)
- [ ] Implement email/phone enrichment (`email_phone_enrichment.py`)
- [ ] Integrate enrichment into ETL pipeline
- [ ] Test enrichment with sample data

### Phase 2: ETL Pipeline
- [ ] Implement `etl_snowflake_to_postgres.py` (includes enrichment)
- [ ] Test ETL with sample data
- [ ] Schedule daily ETL job
- [ ] Monitor ETL performance

### Phase 3: Model Training
- [ ] Implement `train_precision_model.py`
- [ ] Test training pipeline
- [ ] Validate model calibration
- [ ] Schedule weekly retraining

### Phase 4: Domain Agent Integration
- [ ] Create `PrecisionFeatureService`
- [ ] Enhance `merchant_agent.py` with precision features
- [ ] Enhance `risk_agent.py` with model scores
- [ ] Test integration in investigations

### Phase 5: Evaluation
- [ ] Implement evaluation queries
- [ ] Create monitoring dashboard
- [ ] Set up alerts for precision@K drops

### Phase 6: Documentation
- [ ] Document feature engineering logic
- [ ] Create user guide for domain agents
- [ ] Document model retraining process

---

## Success Metrics

1. **Precision@K**: ≥90% precision at K=100 transactions/day
2. **Feature Coverage**: All 5 feature modules operational
3. **Domain Agent Enhancement**: 20%+ improvement in detection precision
4. **Model Performance**: AUC-ROC ≥0.85 on test set
5. **ETL Latency**: <30 minutes for daily ETL job

---

## Next Steps

1. **Review & Approve**: Get stakeholder approval for schema changes
2. **Phase 1 Implementation**: Start with PostgreSQL schema setup
3. **ETL Testing**: Test ETL pipeline with sample data
4. **Model Baseline**: Establish baseline performance metrics
5. **Iterative Enhancement**: Add features incrementally and measure impact

---

## Notes

- **Maturity Window**: Default 14 days, configurable via environment variable
- **Historical Window**: Default 6 months, configurable
- **Model Versioning**: Track model versions in `pg_alerts.model_version`
- **Feature Refresh**: Materialized views refresh daily after ETL
- **Cohort Thresholds**: Future enhancement: per-cohort thresholds (MCC×region×size)

