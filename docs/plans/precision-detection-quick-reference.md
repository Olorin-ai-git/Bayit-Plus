# Precision Detection - Quick Reference Guide

## For Developers: Key Code Snippets

### 1. Query Precision Features for a Transaction

```python
from app.service.precision_detection.feature_service import PrecisionFeatureService
from sqlalchemy import create_engine

pg_engine = create_engine(os.getenv('DATABASE_URL'))
service = PrecisionFeatureService(pg_engine)

# Get all precision features for a transaction
features = service.get_transaction_features("txn_12345")
# Returns: {
#   'txn_id': 'txn_12345',
#   'is_burst_cardtest': True,
#   'z_unique_cards_30d': 4.2,
#   'tiny_amt_rate': 0.15,
#   'z_night': 2.8,
#   'z_refund': 3.5,
#   'z_amt_card': 1.2,
#   'is_first_time_card_merchant': False,
#   ...
# }
```

### 2. Check Merchant Burst Signals

```python
# Check if merchant had card-testing burst on a specific day
burst_signals = service.get_merchant_burst_signals("merchant_123", "2024-01-15")
if burst_signals and burst_signals.get('is_burst_cardtest'):
    print(f"Card-testing detected: z={burst_signals['z_uniq_cards']:.2f}")
```

### 3. Get Model Score

```python
# Get calibrated model score for a transaction
model_score = service.get_model_score("txn_12345")
if model_score and model_score > 0.8:
    print(f"High precision model score: {model_score:.3f}")
```

### 4. SQL: Query Top-K High-Score Transactions

```sql
-- Get top 100 transactions by model score for today
SELECT 
  t.txn_id,
  t.merchant_id,
  t.amount,
  t.txn_ts,
  a.score,
  a.y_pred
FROM pg_alerts a
JOIN pg_transactions t USING (txn_id)
WHERE t.txn_ts::date = CURRENT_DATE
  AND a.model_version = 'gbm_v1'
ORDER BY a.score DESC
LIMIT 100;
```

### 5. SQL: Check Precision@K Performance

```sql
-- Precision@100 for last 7 days
WITH ranked AS (
  SELECT
    date_trunc('day', t.txn_ts) AS d,
    a.score, l.y_true, t.txn_id,
    ROW_NUMBER() OVER (PARTITION BY date_trunc('day', t.txn_ts)
                       ORDER BY a.score DESC) AS rn
  FROM pg_alerts a
  JOIN labels_truth l USING (txn_id)
  JOIN pg_transactions t USING (txn_id)
  WHERE t.txn_ts >= CURRENT_DATE - INTERVAL '7 days'
),
topk AS (SELECT * FROM ranked WHERE rn <= 100)
SELECT 
  d,
  COUNT(*) FILTER (WHERE y_true=1)::float / COUNT(*) AS precision_at_k
FROM topk
GROUP BY d
ORDER BY d DESC;
```

### 6. Domain Agent Integration Example

```python
# In merchant_agent.py
from app.service.precision_detection.feature_service import PrecisionFeatureService

async def merchant_agent_node(state: InvestigationState, config: Optional[Dict] = None):
    # ... existing code ...
    
    # NEW: Get precision features
    precision_service = PrecisionFeatureService(get_pg_engine())
    snowflake_data = state.get("snowflake_data", {})
    
    if snowflake_data and isinstance(snowflake_data, dict) and "results" in snowflake_data:
        for record in snowflake_data["results"][:10]:
            txn_id = record.get("TX_ID_KEY") or record.get("tx_id_key")
            if txn_id:
                # Get precision features
                feats = precision_service.get_transaction_features(txn_id)
                if feats:
                    # Add burst signals
                    if feats.get("is_burst_cardtest"):
                        findings["evidence"].append(
                            f"Card-testing burst: z={feats.get('z_unique_cards_30d', 0):.2f}"
                        )
                    
                    # Add peer outlier signals
                    if feats.get("z_refund", 0) >= 3:
                        findings["evidence"].append(
                            f"Peer-group refund outlier: z={feats.get('z_refund', 0):.2f}"
                        )
                    
                    # Add model score
                    model_score = precision_service.get_model_score(txn_id)
                    if model_score and model_score > 0.7:
                        findings["risk_indicators"].append(
                            f"High precision model score: {model_score:.3f}"
                        )
    
    # ... rest of existing code ...
```

---

## Key SQL Queries

### Refresh Materialized Views

```sql
-- Refresh all feature views (run after ETL)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_merchant_day;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_burst_z;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_burst_flags;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_merchant_size;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_merchant_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_peer_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_peer_flags;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_card_amount_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_feats_basic;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_degrees;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_card_deg;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_graph_feats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trailing_merchant;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_features_txn;
```

### Check Label Coverage

```sql
-- Check how many transactions have labels
SELECT 
  COUNT(*) as total_txns,
  COUNT(l.txn_id) as labeled_txns,
  COUNT(*) FILTER (WHERE l.y_true=1) as positive_labels,
  COUNT(*) FILTER (WHERE l.y_true=0) as negative_labels
FROM pg_transactions t
LEFT JOIN labels_truth l USING (txn_id)
WHERE t.txn_ts <= CURRENT_DATE - INTERVAL '6 months';
```

### Check Feature Coverage

```sql
-- Check feature coverage for transactions
SELECT 
  COUNT(*) as total_txns,
  COUNT(f.txn_id) as txns_with_features,
  COUNT(*) FILTER (WHERE f.is_burst_cardtest) as burst_detected,
  COUNT(*) FILTER (WHERE f.z_refund >= 3) as peer_outliers
FROM pg_transactions t
LEFT JOIN mv_features_txn f USING (txn_id)
WHERE t.txn_ts >= CURRENT_DATE - INTERVAL '30 days';
```

### Model Performance by Cohort

```sql
-- Precision/recall by MCC and region
SELECT 
  m.mcc,
  m.region,
  COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=1) AS tp,
  COUNT(*) FILTER (WHERE l.y_true=0 AND a.y_pred=1) AS fp,
  COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=0) AS fn,
  (COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=1))::float
    / NULLIF(COUNT(*) FILTER (WHERE a.y_pred=1),0) AS precision,
  (COUNT(*) FILTER (WHERE l.y_true=1 AND a.y_pred=1))::float
    / NULLIF(COUNT(*) FILTER (WHERE l.y_true=1),0) AS recall
FROM pg_alerts a
JOIN labels_truth l USING (txn_id)
JOIN pg_transactions t USING (txn_id)
JOIN pg_merchants m USING (merchant_id)
WHERE a.model_version = 'gbm_v1'
GROUP BY m.mcc, m.region
ORDER BY precision DESC;
```

---

## Environment Variables

```bash
# PostgreSQL connection
DATABASE_URL=postgresql://user:pass@host:5432/db

# Maturity configuration
PRECISION_MATURITY_DAYS=14  # Days to wait for outcomes to mature
PRECISION_HISTORICAL_MONTHS=6  # Months of historical data to use

# Model configuration
PRECISION_MODEL_VERSION=gbm_v1
PRECISION_TARGET_PRECISION=0.9  # Target precision@K
PRECISION_K=100  # Top K transactions per day
```

---

## Common Issues & Solutions

### Issue: Materialized views not refreshing

**Solution**: Ensure indexes exist on base tables:
```sql
CREATE INDEX IF NOT EXISTS idx_pg_txn_ts ON pg_transactions(txn_ts);
CREATE INDEX IF NOT EXISTS idx_pg_txn_merchant ON pg_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pg_txn_card ON pg_transactions(card_id);
```

### Issue: ETL taking too long

**Solution**: 
1. Add date filters to limit historical window
2. Use batch inserts (1000 rows at a time)
3. Run ETL during off-peak hours

### Issue: Model scores missing for new transactions

**Solution**: 
- Model only scores mature transactions (≥6 months old)
- For real-time scoring, need separate pipeline (future enhancement)

### Issue: Feature values NULL

**Solution**: 
- Check materialized views are refreshed
- Verify base tables have data
- Check JOIN conditions (merchant_id, date alignment)

---

## Testing Checklist

- [ ] ETL pipeline extracts transactions from Snowflake
- [ ] Labels are created correctly (y_true = 0/1)
- [ ] Materialized views refresh without errors
- [ ] Feature service returns features for known transactions
- [ ] Model training completes successfully
- [ ] Model scores are written to pg_alerts
- [ ] Domain agents can access precision features
- [ ] Precision@K evaluation runs successfully

---

## Performance Tuning

### Materialized View Refresh

```sql
-- Refresh concurrently (non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_features_txn;

-- Check refresh status
SELECT schemaname, matviewname, last_refresh
FROM pg_matviews
WHERE matviewname LIKE 'mv_%';
```

### Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pg_alerts_score ON pg_alerts(score DESC);
CREATE INDEX IF NOT EXISTS idx_pg_alerts_model ON pg_alerts(model_version, score DESC);
CREATE INDEX IF NOT EXISTS idx_labels_y_true ON labels_truth(y_true);
```

### Batch Processing

```python
# Process transactions in batches
batch_size = 1000
for i in range(0, len(transactions), batch_size):
    batch = transactions[i:i+batch_size]
    load_to_postgres(batch, pg_engine)
```

---

## Monitoring Queries

### Daily ETL Status

```sql
-- Check latest ETL timestamp
SELECT MAX(created_at) as last_etl_run
FROM pg_transactions;

-- Check label freshness
SELECT MAX(created_at) as last_label_update
FROM labels_truth;
```

### Model Performance Trends

```sql
-- Precision@K over time
WITH daily_prec AS (
  SELECT 
    date_trunc('day', t.txn_ts) AS d,
    AVG(CASE WHEN l.y_true=1 AND a.y_pred=1 THEN 1.0 ELSE 0.0 END) 
      FILTER (WHERE a.y_pred=1) AS precision
  FROM pg_alerts a
  JOIN labels_truth l USING (txn_id)
  JOIN pg_transactions t USING (txn_id)
  WHERE a.model_version = 'gbm_v1'
  GROUP BY d
)
SELECT d, precision
FROM daily_prec
ORDER BY d DESC
LIMIT 30;
```

---

## Quick Start

1. **Run migrations**:
   ```bash
   psql -U postgres -d fraud_analytics -f migrations/009_precision_detection_tables.sql
   psql -U postgres -d fraud_analytics -f migrations/010_precision_detection_features.sql
   ```

2. **Run ETL**:
   ```bash
   python scripts/etl_snowflake_to_postgres.py
   ```

3. **Train model**:
   ```bash
   python scripts/train_precision_model.py
   ```

4. **Test feature service**:
   ```python
   from app.service.precision_detection.feature_service import PrecisionFeatureService
   service = PrecisionFeatureService(pg_engine)
   features = service.get_transaction_features("test_txn_id")
   print(features)
   ```

---

## References

- **Full Plan**: `docs/plans/precision-detection-enhancement-plan.md`
- **Summary**: `docs/plans/precision-detection-summary.md`
- **Feature Service**: `olorin-server/app/service/precision_detection/feature_service.py`
- **ETL Script**: `olorin-server/scripts/etl_snowflake_to_postgres.py`
- **Training Script**: `olorin-server/scripts/train_precision_model.py`

