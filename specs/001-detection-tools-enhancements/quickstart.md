# Quickstart: Detection Tools Enhancements

**Feature**: Detection Tools Enhancements  
**Date**: 2025-01-XX  
**Purpose**: Get started with precision-focused detection tools

## Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Snowflake account with `TRANSACTIONS_ENRICHED` table
- Neo4j 4.4+ with Graph Data Science library (optional, for graph features)
- MaxMind account (for IP risk scoring)
- IPQS API key (for email enrichment)
- Composio account (for Veriphone and custom tools)

## Setup

### 1. Database Migration

Run migrations to create precision detection tables and views:

```bash
cd olorin-server
python -m app.persistence.migrations.runner migrate
```

This creates:
- `pg_transactions` table
- `pg_merchants` table
- `labels_truth` table
- `pg_enrichment_scores` table
- `pg_alerts` table
- Materialized views (`mv_features_txn`, etc.)

### 2. Environment Configuration

Set required environment variables:

```bash
# Snowflake
export SNOWFLAKE_ACCOUNT=your_account
export SNOWFLAKE_USER=your_user
export SNOWFLAKE_PASSWORD=your_password
export SNOWFLAKE_WAREHOUSE=your_warehouse
export SNOWFLAKE_DATABASE=your_database

# PostgreSQL
export DATABASE_URL=postgresql://user:password@localhost:5432/olorin

# MaxMind (for IP enrichment)
export MAXMIND_ACCOUNT_ID=your_account_id
export MAXMIND_LICENSE_KEY=your_license_key

# IPQS (for email enrichment)
export IPQS_API_KEY=your_api_key

# Composio (for Veriphone and custom tools)
export COMPOSIO_API_KEY=your_api_key
export COMPOSIO_VERIPHONE_ACCOUNT_ID=your_account_id
export COMPOSIO_VERIPHONE_API_KEY=your_api_key
export COMPOSIO_VERIPHONE_USER_ID=your_user_id

# Neo4j (optional, for graph features)
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=your_password

# BIN Lookup (optional)
export MASTERCARD_API_KEY=your_api_key  # or NEUTRINO_API_KEY
```

### 3. Run ETL Pipeline

Extract mature transactions from Snowflake and load into PostgreSQL:

```bash
cd olorin-server
python scripts/etl_precision_detection.py
```

This:
1. Extracts transactions ≥6 months old from Snowflake
2. Loads into `pg_transactions` table
3. Builds `labels_truth` from mature outcomes
4. Refreshes feature engineering views

### 4. Run Enrichment Pipeline

Batch enrich transactions with external data:

```bash
python scripts/enrichment/enrichment_pipeline.py
```

This enriches transactions with:
- Graph analytics (if Neo4j configured)
- BIN lookup (if API keys configured)
- IP risk scores (using MaxMind)
- Email risk scores (using IPQS)
- Phone intelligence (using Veriphone)

### 5. Train Model

Train XGBoost model with calibration:

```bash
python scripts/train_precision_model.py
```

This:
1. Loads features from `mv_features_txn`
2. Loads labels from `labels_truth`
3. Trains XGBoost with temporal split
4. Applies isotonic/Platt calibration
5. Scores all transactions
6. Stores scores in `pg_alerts` table

## Usage

### Query Features in Domain Agents

```python
from app.service.precision_detection.feature_service import PrecisionFeatureService

# Initialize service
service = PrecisionFeatureService()

# Get features for a transaction
features = service.get_transaction_features("txn_123")
if features:
    # Check merchant burst signals
    if features.get("is_burst_cardtest"):
        print(f"Card-testing burst detected: z={features.get('z_unique_cards_30d'):.2f}")
    
    # Check model score
    model_score = features.get("model_score")
    if model_score and model_score > 0.5:
        print(f"High fraud risk: {model_score:.3f}")
    
    # Check enrichment features
    if features.get("ip_proxy_flag"):
        print("Proxy detected")
    
    if features.get("issuer_geo_mismatch_flag"):
        print("Issuer country mismatch detected")
```

### Enhance Merchant Agent

```python
# In merchant_agent.py
from app.service.precision_detection.feature_service import PrecisionFeatureService

precision_service = PrecisionFeatureService()

# After processing Snowflake data
if snowflake_data and "results" in snowflake_data:
    for record in snowflake_data["results"][:10]:
        txn_id = record.get("TX_ID_KEY")
        if txn_id:
            feats = precision_service.get_transaction_features(txn_id)
            if feats:
                if feats.get("is_burst_cardtest"):
                    findings["evidence"].append(
                        f"Card-testing burst detected: z={feats.get('z_unique_cards_30d', 0):.2f}"
                    )
```

### Enhance Risk Agent

```python
# In risk_agent.py
from app.service.precision_detection.feature_service import PrecisionFeatureService

precision_service = PrecisionFeatureService()

# Get model score
model_score = precision_service.get_model_score(txn_id)
if model_score is not None:
    risk_score = model_score  # Use calibrated probability as risk score
    findings["risk_score"] = risk_score
    findings["evidence"].append(f"Model score: {risk_score:.3f}")
```

## Monitoring

### Check ETL Status

```sql
-- Check transaction count
SELECT COUNT(*) FROM pg_transactions;

-- Check label count
SELECT COUNT(*), y_true FROM labels_truth GROUP BY y_true;

-- Check enrichment coverage
SELECT 
    COUNT(*) as total,
    COUNT(ip_risk_score) as ip_enriched,
    COUNT(email_risk_score) as email_enriched,
    COUNT(phone_carrier) as phone_enriched
FROM pg_enrichment_scores;
```

### Check Model Performance

```sql
-- Check model scores distribution
SELECT 
    COUNT(*) as count,
    AVG(score) as avg_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score
FROM pg_alerts;

-- Check precision@K
SELECT 
    threshold_cohort,
    AVG(precision_at_k) as avg_precision
FROM pg_alerts
GROUP BY threshold_cohort;
```

## Troubleshooting

### ETL Pipeline Fails

**Issue**: No mature transactions found
- **Solution**: Check Snowflake query filters (≥6 months old, ≥14 days matured)
- **Log**: Check logs for transaction count

**Issue**: Database connection fails
- **Solution**: Verify `DATABASE_URL` environment variable
- **Check**: PostgreSQL is running and accessible

### Enrichment Pipeline Fails

**Issue**: MaxMind API fails
- **Solution**: Check `MAXMIND_ACCOUNT_ID` and `MAXMIND_LICENSE_KEY`
- **Log**: Check error logs for specific API error

**Issue**: Neo4j GDS not available
- **Solution**: Install Neo4j Graph Data Science library or skip graph enrichment
- **Log**: Warning logged, enrichment continues with other sources

### Model Training Fails

**Issue**: Insufficient training data
- **Solution**: Ensure ≥1000 transactions with labels
- **Check**: `SELECT COUNT(*) FROM labels_truth WHERE y_true IN (0,1);`

**Issue**: Features missing
- **Solution**: Refresh materialized views before training
- **Command**: `REFRESH MATERIALIZED VIEW mv_features_txn;`

## Next Steps

1. **Schedule Daily ETL**: Set up cron job or scheduler for daily ETL runs
2. **Monitor Performance**: Track ETL duration, enrichment coverage, model performance
3. **Tune Thresholds**: Adjust precision@K thresholds per cohort based on backtest results
4. **Enhance Domain Agents**: Integrate precision features into all domain agents

## References

- Feature Specification: `specs/001-detection-tools-enhancements/spec.md`
- Data Model: `specs/001-detection-tools-enhancements/data-model.md`
- Research: `specs/001-detection-tools-enhancements/research.md`

