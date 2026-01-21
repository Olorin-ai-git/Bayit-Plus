-- PostgreSQL Migration: Precision Detection Materialized Views
-- Feature: 001-detection-tools-enhancements
-- Version: 010
-- Description: Create materialized views for feature engineering (merchant burst, peer-group, transaction-level, graph, trailing merchant, features assembly)
-- Note: PostgreSQL-specific: Uses MATERIALIZED VIEW, date_trunc, window functions

-- =============================================================================
-- Supporting Materialized View 1: mv_merchant_day
-- Purpose: Daily merchant statistics for burst detection
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_merchant_day AS
SELECT
    merchant_id,
    date_trunc('day', txn_ts) AS d,
    COUNT(DISTINCT card_id) AS uniq_cards,
    COUNT(*) AS txn_count,
    SUM(CASE WHEN amount < 1.00 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS tiny_amt_rate,
    AVG(amount) AS avg_amount
FROM pg_transactions
GROUP BY merchant_id, date_trunc('day', txn_ts);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_merchant_day_unique ON mv_merchant_day(merchant_id, d);

-- =============================================================================
-- Supporting Materialized View 2: mv_burst_flags
-- Purpose: Merchant burst flags (is_burst_cardtest, z_unique_cards_30d)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_burst_flags AS
WITH merchant_30d_stats AS (
    SELECT
        merchant_id,
        date_trunc('day', txn_ts) AS d,
        COUNT(DISTINCT card_id) AS uniq_cards_30d,
        COUNT(*) AS txn_count_30d,
        SUM(CASE WHEN amount < 1.00 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS tiny_amt_rate
    FROM pg_transactions
    WHERE txn_ts >= (SELECT MAX(date_trunc('day', txn_ts)) - INTERVAL '30 days' FROM pg_transactions)
    GROUP BY merchant_id, date_trunc('day', txn_ts)
),
merchant_avg_stats AS (
    SELECT
        merchant_id,
        AVG(uniq_cards_30d) AS avg_uniq_cards_30d,
        STDDEV(uniq_cards_30d) AS stddev_uniq_cards_30d
    FROM merchant_30d_stats
    GROUP BY merchant_id
)
SELECT
    m.merchant_id,
    m.d,
    CASE 
        WHEN m.uniq_cards_30d >= 10 AND m.tiny_amt_rate > 0.5 THEN TRUE
        ELSE FALSE
    END AS is_burst_cardtest,
    m.tiny_amt_rate,
    CASE
        WHEN a.stddev_uniq_cards_30d > 0 THEN (m.uniq_cards_30d - a.avg_uniq_cards_30d) / a.stddev_uniq_cards_30d
        ELSE 0
    END AS z_uniq_cards
FROM merchant_30d_stats m
LEFT JOIN merchant_avg_stats a ON m.merchant_id = a.merchant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_burst_flags_unique ON mv_burst_flags(merchant_id, d);

-- =============================================================================
-- Supporting Materialized View 3: mv_peer_stats
-- Purpose: Peer-group statistics (MCC×region×size cohorts)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_peer_stats AS
WITH merchant_size AS (
    SELECT
        merchant_id,
        CASE
            WHEN avg_monthly_txn < 100 THEN 'small'
            WHEN avg_monthly_txn < 1000 THEN 'medium'
            ELSE 'large'
        END AS size_category
    FROM pg_merchants
)
SELECT
    t.mcc,
    t.region,
    ms.size_category,
    date_trunc('month', t.txn_ts) AS mon,
    COUNT(*) AS txn_count,
    SUM(CASE WHEN EXTRACT(HOUR FROM t.txn_ts) BETWEEN 22 AND 6 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS night_rate,
    SUM(CASE WHEN t.refund_ts IS NOT NULL THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS refund_rate
FROM pg_transactions t
JOIN merchant_size ms ON t.merchant_id = ms.merchant_id
WHERE t.mcc IS NOT NULL AND t.region IS NOT NULL
GROUP BY t.mcc, t.region, ms.size_category, date_trunc('month', t.txn_ts);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_peer_stats_unique ON mv_peer_stats(mcc, region, size_category, mon);

-- =============================================================================
-- Supporting Materialized View 4: mv_peer_flags
-- Purpose: Peer-group outlier flags (z_night, z_refund)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_peer_flags AS
WITH peer_avg AS (
    SELECT
        mcc,
        region,
        size_category,
        mon,
        AVG(night_rate) AS avg_night_rate,
        STDDEV(night_rate) AS stddev_night_rate,
        AVG(refund_rate) AS avg_refund_rate,
        STDDEV(refund_rate) AS stddev_refund_rate
    FROM mv_peer_stats
    GROUP BY mcc, region, size_category, mon
)
SELECT
    p.merchant_id,
    p.mon,
    CASE
        WHEN a.stddev_night_rate > 0 THEN (p.night_rate - a.avg_night_rate) / a.stddev_night_rate
        ELSE 0
    END AS z_night,
    CASE
        WHEN a.stddev_refund_rate > 0 THEN (p.refund_rate - a.avg_refund_rate) / a.stddev_refund_rate
        ELSE 0
    END AS z_refund
FROM (
    SELECT
        t.merchant_id,
        t.mcc,
        t.region,
        ms.size_category,
        date_trunc('month', t.txn_ts) AS mon,
        SUM(CASE WHEN EXTRACT(HOUR FROM t.txn_ts) BETWEEN 22 AND 6 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS night_rate,
        SUM(CASE WHEN t.refund_ts IS NOT NULL THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS refund_rate
    FROM pg_transactions t
    JOIN pg_merchants m ON t.merchant_id = m.merchant_id
    JOIN (
        SELECT
            merchant_id,
            CASE
                WHEN avg_monthly_txn < 100 THEN 'small'
                WHEN avg_monthly_txn < 1000 THEN 'medium'
                ELSE 'large'
            END AS size_category
        FROM pg_merchants
    ) ms ON t.merchant_id = ms.merchant_id
    WHERE t.mcc IS NOT NULL AND t.region IS NOT NULL
    GROUP BY t.merchant_id, t.mcc, t.region, ms.size_category, date_trunc('month', t.txn_ts)
) p
LEFT JOIN peer_avg a ON p.mcc = a.mcc AND p.region = a.region AND p.size_category = a.size_category AND p.mon = a.mon;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_peer_flags_unique ON mv_peer_flags(merchant_id, mon);

-- =============================================================================
-- Supporting Materialized View 5: mv_txn_feats_basic
-- Purpose: Transaction-level deviation features
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_txn_feats_basic AS
WITH card_stats AS (
    SELECT
        card_id,
        AVG(amount) AS avg_amount,
        STDDEV(amount) AS stddev_amount
    FROM pg_transactions
    GROUP BY card_id
),
card_merchant_history AS (
    SELECT
        card_id,
        merchant_id,
        MIN(txn_ts) AS first_txn_ts
    FROM pg_transactions
    GROUP BY card_id, merchant_id
),
card_prev_txn AS (
    SELECT
        txn_id,
        card_id,
        txn_ts,
        LAG(txn_ts) OVER (PARTITION BY card_id ORDER BY txn_ts) AS prev_txn_ts
    FROM pg_transactions
)
SELECT
    t.txn_id,
    CASE
        WHEN cs.stddev_amount > 0 THEN (t.amount - cs.avg_amount) / cs.stddev_amount
        ELSE 0
    END AS z_amt_card,
    CASE
        WHEN cmh.first_txn_ts = t.txn_ts THEN TRUE
        ELSE FALSE
    END AS is_first_time_card_merchant,
    CASE
        WHEN cpt.prev_txn_ts IS NOT NULL THEN EXTRACT(EPOCH FROM (t.txn_ts - cpt.prev_txn_ts))
        ELSE NULL
    END AS sec_since_prev_for_card
FROM pg_transactions t
LEFT JOIN card_stats cs ON t.card_id = cs.card_id
LEFT JOIN card_merchant_history cmh ON t.card_id = cmh.card_id AND t.merchant_id = cmh.merchant_id
LEFT JOIN card_prev_txn cpt ON t.txn_id = cpt.txn_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_txn_feats_basic_unique ON mv_txn_feats_basic(txn_id);

-- =============================================================================
-- Supporting Materialized View 6: mv_txn_graph_feats
-- Purpose: Graph features (prior merchants for card)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_txn_graph_feats AS
WITH card_merchant_count AS (
    SELECT
        t.txn_id,
        COUNT(DISTINCT prev_t.merchant_id) AS prior_merchants_for_card
    FROM pg_transactions t
    LEFT JOIN pg_transactions prev_t ON t.card_id = prev_t.card_id AND prev_t.txn_ts < t.txn_ts
    GROUP BY t.txn_id
)
SELECT
    txn_id,
    prior_merchants_for_card
FROM card_merchant_count;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_txn_graph_feats_unique ON mv_txn_graph_feats(txn_id);

-- =============================================================================
-- Supporting Materialized View 7: mv_trailing_merchant
-- Purpose: Trailing merchant refund/chargeback rates
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trailing_merchant AS
WITH merchant_refunds_30d AS (
    SELECT
        merchant_id,
        date_trunc('day', txn_ts) AS d,
        SUM(CASE WHEN refund_ts IS NOT NULL AND refund_ts <= txn_ts + INTERVAL '30 days' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS refund_rate_30d_prior
    FROM pg_transactions
    GROUP BY merchant_id, date_trunc('day', txn_ts)
),
merchant_chargebacks_90d AS (
    SELECT
        merchant_id,
        date_trunc('day', txn_ts) AS d,
        SUM(CASE WHEN chargeback_ts IS NOT NULL AND chargeback_ts <= txn_ts + INTERVAL '90 days' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) AS cb_rate_90d_prior
    FROM pg_transactions
    GROUP BY merchant_id, date_trunc('day', txn_ts)
)
SELECT
    COALESCE(r.merchant_id, c.merchant_id) AS merchant_id,
    COALESCE(r.d, c.d) AS d,
    COALESCE(r.refund_rate_30d_prior, 0) AS refund_rate_30d_prior,
    COALESCE(c.cb_rate_90d_prior, 0) AS cb_rate_90d_prior
FROM merchant_refunds_30d r
FULL OUTER JOIN merchant_chargebacks_90d c ON r.merchant_id = c.merchant_id AND r.d = c.d;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trailing_merchant_unique ON mv_trailing_merchant(merchant_id, d);

-- =============================================================================
-- Main Materialized View: mv_features_txn
-- Purpose: Assembles all features (original + enrichment) for model training and domain agent queries
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_features_txn AS
SELECT
    t.txn_id,
    t.txn_ts,
    t.merchant_id,
    t.card_id,
    t.amount,
    t.currency,
    
    -- Merchant burst features
    bf.is_burst_cardtest,
    COALESCE(bf.tiny_amt_rate, 0) AS tiny_amt_rate,
    COALESCE(bf.z_uniq_cards, 0) AS z_unique_cards_30d,
    
    -- Peer-group features
    pf.z_night,
    pf.z_refund,
    
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
    CASE WHEN e.issuer_geo_mismatch THEN 1 ELSE 0 END AS issuer_geo_mismatch_flag,
    CASE WHEN e.card_type_risk THEN 1 ELSE 0 END AS card_type_risk_flag,
    e.ip_risk_score,
    CASE WHEN e.ip_proxy_detected THEN 1 ELSE 0 END AS ip_proxy_flag,
    CASE WHEN e.ip_vpn_detected THEN 1 ELSE 0 END AS ip_vpn_flag,
    CASE WHEN e.ip_tor_detected THEN 1 ELSE 0 END AS ip_tor_flag,
    e.email_risk_score,
    CASE WHEN e.phone_valid THEN 1 ELSE 0 END AS phone_valid_flag,
    CASE WHEN e.billing_shipping_mismatch THEN 1 ELSE 0 END AS address_mismatch_flag
    
FROM pg_transactions t
LEFT JOIN mv_burst_flags bf ON bf.merchant_id = t.merchant_id AND bf.d = date_trunc('day', t.txn_ts)
LEFT JOIN mv_peer_flags pf ON pf.merchant_id = t.merchant_id AND pf.mon = date_trunc('month', t.txn_ts)
LEFT JOIN mv_txn_feats_basic f ON f.txn_id = t.txn_id
LEFT JOIN mv_txn_graph_feats g ON g.txn_id = t.txn_id
LEFT JOIN mv_trailing_merchant tm ON tm.merchant_id = t.merchant_id AND tm.d = t.txn_ts::date
LEFT JOIN pg_enrichment_scores e ON e.txn_id = t.txn_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_features_txn_unique ON mv_features_txn(txn_id);

