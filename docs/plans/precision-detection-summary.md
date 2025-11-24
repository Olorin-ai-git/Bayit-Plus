# Precision Detection Enhancement - Executive Summary

## Overview

This document summarizes the integration of **retro-only, precision-focused detection** into Olorin's domain agent system. The enhancement uses mature ground-truth labels (fraud/chargeback outcomes) to engineer high-signal features that significantly improve detection precision beyond generic anomaly detection.

---

## Current State Analysis

### Existing Infrastructure

✅ **Snowflake Integration**
- Comprehensive `TRANSACTIONS_ENRICHED` table (300+ columns)
- SnowflakeQueryService for transaction queries
- Domain agents already query Snowflake for transaction history

✅ **PostgreSQL Setup**
- `transactions_enriched` table with schema parity
- Existing anomaly detection system (STL+MAD, CUSUM, Isolation Forest)
- Investigation results storage

✅ **Domain Agents**
- Network, Device, Location, Logs, Authentication, Merchant, Risk agents
- LLM-based analysis with algorithmic scoring fallbacks
- Currently ignore MODEL_SCORE (only used for sorting)

### Gaps Identified

❌ **No Retro Labeling System**
- No ground-truth labels from mature outcomes
- Cannot evaluate precision on historical data

❌ **Limited Feature Engineering**
- Generic anomaly detection only
- No merchant burst/card-testing detection
- No peer-group comparisons
- No graph features

❌ **No Calibrated Model**
- No supervised model trained on retro labels
- No precision@K targeting for investigation capacity

---

## Enhancement Strategy

### Core Principle

**Use today's truth (final fraud/chargeback outcomes) to label transactions ≥6 months old (and ≥14 days matured)**

This ensures:
- ✅ Leak-free labels (outcomes are final)
- ✅ Mature data (chargebacks/disputes resolved)
- ✅ High precision (real fraud patterns, not false positives)

### Five Precision-Focused Feature Modules

#### 1. Merchant Burst & Card-Testing Detection
**What**: Detects classic testing campaigns (high unique cards, small/round amounts, short time window)

**Implementation**:
- Materialized view: `mv_merchant_day` (daily aggregates)
- Z-score calculation: `mv_burst_z` (vs trailing 30d baseline)
- Flags: `mv_burst_flags` (z_uniq_cards ≥ 3 AND tiny_amt_rate ≥ 5%)

**Precision**: Very high in backtests (card-testing campaigns are strong fraud signals)

#### 2. Peer-Group Outliers
**What**: Compares merchants to MCC×region×volume peers, flags extreme rates

**Implementation**:
- Merchant size bucketing: `mv_merchant_size` (NTILE(5) by MCC)
- Monthly rates: `mv_merchant_month` (night rate, refund rate)
- Peer stats: `mv_peer_stats` (avg/std by cohort)
- Flags: `mv_peer_flags` (z-score ≥ 3 for night/refund rates)

**Precision**: High when combined with burst detection

#### 3. Transaction-Level Deviations
**What**: Per-card and per-merchant deviation features (amount, time, first-time)

**Implementation**:
- Card amount stats: `mv_card_amount_stats` (rolling monthly baseline)
- Transaction features: `mv_txn_feats_basic` (z_amt_card, first_time_card_merchant, interarrival)

**Precision**: Moderate individually, high when stacked

#### 4. Graph Features
**What**: Card↔merchant bipartite graph features (degrees, shared neighbors)

**Implementation**:
- Degrees: `mv_degrees` (merchant), `mv_card_deg` (card)
- Graph features: `mv_txn_graph_feats` (prior_merchants_for_card)

**Precision**: Moderate, but cheap to compute

#### 5. Refund/Chargeback Precursors
**What**: Merchant-level trailing rates (30d refund, 90d chargeback) prior to transaction

**Implementation**:
- Trailing merchant: `mv_trailing_merchant` (rolling windows, leak-free)

**Precision**: High when combined with amount/velocity anomalies

---

## Integration with Domain Agents

### Merchant Agent Enhancement

**Current**: Analyzes merchant transaction patterns, risk levels

**Enhanced**: 
- ✅ Check `mv_burst_flags` for card-testing signals
- ✅ Check `mv_peer_flags` for peer-group outliers
- ✅ Add precision features to evidence

**Impact**: Higher precision on merchant-level fraud detection

### Risk Agent Enhancement

**Current**: Synthesizes domain findings, calculates final risk

**Enhanced**:
- ✅ Stack calibrated model score from `pg_alerts`
- ✅ Use precision features as additional signals
- ✅ Weight precision model score appropriately

**Impact**: More accurate final risk assessment

### Network Agent Enhancement

**Current**: IP patterns, VPN detection, geographic anomalies

**Enhanced**:
- ✅ Use graph features (`prior_merchants_for_card`) for network analysis
- ✅ Cross-reference with merchant burst signals

**Impact**: Better detection of coordinated fraud networks

### Location Agent Enhancement

**Current**: Geographic patterns, impossible travel

**Enhanced**:
- ✅ Use merchant burst signals (card-testing often involves geographic anomalies)
- ✅ Cross-reference with peer outliers

**Impact**: Better detection of location-based fraud patterns

---

## Model Training & Calibration

### Training Pipeline

1. **Load Mature Data**: Transactions ≥6 months old, ≥14 days matured
2. **Temporal Split**: Train on oldest 70%, test on newest 30%
3. **Feature Assembly**: Join all 5 feature modules → `mv_features_txn`
4. **Train XGBoost**: Shallow trees (max_depth=4), regularization (reg_lambda=2.0)
5. **Calibrate**: Isotonic regression on validation set
6. **Threshold Selection**: Choose threshold for precision@K (target ≥90%)

### Model Outputs

- **Scores**: Calibrated probabilities (0-1) stored in `pg_alerts.score`
- **Thresholds**: Per-cohort thresholds (future: MCC×region×size)
- **Predictions**: `y_pred` (boolean) based on threshold

### Evaluation Metrics

- **Confusion Matrix**: TP, FP, TN, FN by month & model version
- **Precision@K**: Precision at top K transactions per day (investigation capacity)
- **Per-Cohort Metrics**: Precision/recall by MCC×region×size

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Daily ETL (2 AM)                                             │
│ 1. Extract mature transactions from Snowflake               │
│ 2. Load into pg_transactions                                 │
│ 3. Build pg_merchants aggregates                            │
│ 4. Update labels_truth (mature outcomes)                    │
│ 5. Refresh materialized views                               │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Weekly Training (Sunday 3 AM)                               │
│ 1. Load training data (mv_features_txn + labels_truth)     │
│ 2. Train XGBoost model                                      │
│ 3. Calibrate with isotonic regression                       │
│ 4. Score all transactions → pg_alerts                       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Real-Time Investigation                                      │
│ 1. Domain agents query PrecisionFeatureService               │
│ 2. Get precision features for transactions                   │
│ 3. Get model scores from pg_alerts                          │
│ 4. Add precision signals to evidence                        │
│ 5. Enhance risk assessment                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Benefits

### 1. Higher Precision
- **Before**: Generic anomaly detection (high recall, low precision)
- **After**: Precision-focused features + calibrated model (≥90% precision@K)

### 2. Retro Evaluation
- Can backtest on historical data
- Measure precision@K aligned with investigation capacity
- Tune thresholds per cohort

### 3. Domain Agent Enhancement
- Agents get access to high-signal features
- Model scores provide additional precision signal
- Better evidence for LLM analysis

### 4. Scalable Architecture
- Materialized views for fast feature lookup
- Batch ETL (daily) + real-time feature access
- Model retraining (weekly) keeps scores fresh

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- ✅ PostgreSQL schema setup
- ✅ ETL pipeline (Snowflake → PostgreSQL)
- ✅ Materialized views for feature engineering

### Phase 2: Model Training (Week 3)
- ✅ Training pipeline
- ✅ Model calibration
- ✅ Scoring pipeline

### Phase 3: Integration (Week 4)
- ✅ PrecisionFeatureService
- ✅ Domain agent enhancements
- ✅ Testing with real investigations

### Phase 4: Evaluation (Week 5)
- ✅ Evaluation queries
- ✅ Monitoring dashboard
- ✅ Performance tuning

---

## Success Criteria

1. **Precision@K**: ≥90% precision at K=100 transactions/day
2. **Feature Coverage**: All 5 feature modules operational
3. **Domain Agent Improvement**: 20%+ improvement in detection precision
4. **Model Performance**: AUC-ROC ≥0.85 on test set
5. **ETL Performance**: <30 minutes for daily ETL job

---

## Next Steps

1. **Review Plan**: Stakeholder review of enhancement plan
2. **Schema Migration**: Create and run PostgreSQL migrations
3. **ETL Testing**: Test ETL pipeline with sample data
4. **Baseline Metrics**: Establish current precision baseline
5. **Iterative Rollout**: Deploy features incrementally and measure impact

---

## Questions & Considerations

### Q: How do we handle schema differences between Snowflake and PostgreSQL?
**A**: ETL script maps Snowflake columns to PostgreSQL schema. Key mappings:
- `TX_ID_KEY` → `txn_id`
- `MERCHANT_ID` → `merchant_id`
- `CARD_BIN || CARD_LAST4` → `card_id` (construct from BIN+LAST4)

### Q: What if we don't have 6 months of historical data?
**A**: Adjust maturity window (e.g., 3 months) and maturity days (e.g., 7 days). The system is configurable via environment variables.

### Q: How do we handle model versioning?
**A**: `pg_alerts.model_version` tracks model versions. Can compare performance across versions.

### Q: What about real-time scoring for new transactions?
**A**: Current design is retro-only. For real-time scoring, would need:
- Feature computation pipeline for new transactions
- Model inference service
- This is a future enhancement.

### Q: How do we integrate with existing anomaly detection?
**A**: Precision features complement anomaly detection:
- Anomaly detection: Real-time, generic patterns
- Precision detection: Retro, high-signal patterns
- Domain agents can use both signals

---

## References

- **Full Plan**: `docs/plans/precision-detection-enhancement-plan.md`
- **Snowflake Schema**: `olorin-server/scripts/snowflake_setup.sql`
- **PostgreSQL Schema**: `olorin-server/scripts/postgres_setup.sql`
- **Domain Agents**: `olorin-server/app/service/agent/orchestration/domain_agents/`

