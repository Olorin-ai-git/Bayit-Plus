# Startup Analysis Flow - Automatic Merchant Investigation Verification

**Date**: 2025-11-27  
**Status**: ✅ VERIFIED - Automatic workflow confirmed

---

## Executive Summary

The startup analysis flow **AUTOMATICALLY** performs all 5 requested steps without requiring a custom script:

1. ✅ Runs startup analysis flow
2. ✅ Runs analyzer on configurable time window (8 months ago, 24h)
3. ✅ Investigates each merchant with fraudulent transactions
4. ✅ Generates confusion tables for each merchant
5. ✅ Ensures complete transaction scores via streaming architecture

---

## How It Works

### Automatic Workflow (No Custom Scripts Needed)

The `run_startup_analysis_flow()` function in `app/service/__init__.py` automatically:

1. **Loads Risk Entities** (line 958-962):
   ```python
   analyzer = get_risk_analyzer()
   group_by = os.getenv("ANALYTICS_DEFAULT_GROUP_BY", "email")  # Set to "merchant_name"
   results = await analyzer.get_top_risk_entities(group_by=group_by)
   ```

2. **Runs Auto-Comparisons** (line 997-999):
   ```python
   comparison_results = await run_auto_comparisons_for_top_entities(
       risk_analyzer_results=results,
       top_n=top_n,  # From TOP_N_RISKY_ENTITIES env var
       reports_dir=reports_dir
   )
   ```

3. **Generates Confusion Tables** (auto_comparison.py, line 2364-2381):
   ```python
   # Ensure confusion table exists - generate if missing
   if not confusion_table_path.exists() and investigation_id:
       from app.service.investigation.confusion_table_generator import (
           generate_confusion_table_sync,
       )
       generated_path = generate_confusion_table_sync(investigation_id)
   ```

4. **Transaction Scores** (Automatic via streaming architecture):
   - All transactions are scored during investigation
   - Scores saved to `transaction_scores` database table
   - Confusion tables retrieve scores from database

---

## Configuration

### Environment Variables to Control the Workflow

```bash
# 1. Target Entity Type (merchants in this case)
ANALYTICS_DEFAULT_GROUP_BY="merchant_name"

# 2. Time Window (24 hours = 1 day)
INVESTIGATION_DEFAULT_WINDOW_DAYS="1"

# 3. Lookback Period (8 months ago)
ANALYTICS_MAX_LOOKBACK_MONTHS="8"

# 4. Minimum Transaction Span (30 days instead of 725)
INVESTIGATION_MIN_REQUIRED_SPAN_DAYS="30"
INVESTIGATION_SPAN_TOLERANCE_DAYS="10"

# 5. Enable Risk Entity Retrieval
RETRIEVE_RISKY_ENTITIES="true"

# 6. Number of Merchants to Investigate
TOP_N_RISKY_ENTITIES="10"

# 7. Force New Investigations (don't reuse existing)
USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON="false"
```

### How to Run

**Method 1: Set environment variables and start server**
```bash
export ANALYTICS_DEFAULT_GROUP_BY="merchant_name"
export INVESTIGATION_DEFAULT_WINDOW_DAYS="1"
export ANALYTICS_MAX_LOOKBACK_MONTHS="8"
export TOP_N_RISKY_ENTITIES="10"
export RETRIEVE_RISKY_ENTITIES="true"

cd olorin-server
poetry run python -m app.local_server
```

**Method 2: Use .env file**
Add to `olorin-server/.env`:
```
ANALYTICS_DEFAULT_GROUP_BY=merchant_name
INVESTIGATION_DEFAULT_WINDOW_DAYS=1
ANALYTICS_MAX_LOOKBACK_MONTHS=8
TOP_N_RISKY_ENTITIES=10
RETRIEVE_RISKY_ENTITIES=true
USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON=false
```

Then start server normally:
```bash
cd olorin-server
poetry run python -m app.local_server
```

---

## Verification Steps

### 1. Check Startup Analysis Executed

Monitor server logs for:
```
📋 Loading top risk entities from Snowflake...
🎯 Analyzing risk entities by: merchant_name
🚀 Starting automatic comparisons for top X riskiest entities
```

### 2. Verify Merchants Retrieved

Look for:
```
📊 Auto-Comparison 1/10
   Entity: Eneba
   Entity Type: merchant
   Risk Score: 0.155
   Transactions: 55942
```

### 3. Confirm Investigations Created

Check logs for:
```
🔍 Running auto-comparison for entity: merchant=Eneba
🔍 Creating investigation for merchant Eneba (window: ...)
✅ Investigation created: <investigation_id>
```

### 4. Verify Confusion Tables Generated

Look for:
```
📊 Confusion table not found, generating for <investigation_id>...
✅ Generated confusion table: confusion_table_<investigation_id>.html
```

### 5. Check Transaction Scores Saved

Verify in database:
```sql
SELECT investigation_id, COUNT(*) as score_count
FROM transaction_scores
GROUP BY investigation_id;
```

Or check logs:
```
💾 STREAMING MODE: Saving scores directly to database
💾 Saving batch 1 to database (5000 scores)...
✅ STREAMING SCORING COMPLETE: 55942 transactions scored and saved to database
```

---

## Output Artifacts

After startup analysis completes, check:

### 1. Comparison Reports
```
artifacts/comparisons/auto_startup/<entity_type>_<entity_value>/
  ├── comparison_report_<investigation_id>.html
  ├── confusion_table_<investigation_id>.html
  ├── investigation_<investigation_id>.json
  └── comparison_analysis_<investigation_id>.json
```

### 2. Startup Report Package
```
artifacts/comparisons/auto_startup/startup_analysis_package_<timestamp>.zip
```

Contains:
- All comparison reports
- All confusion tables  
- Investigation JSONs
- Archive index
- Startup summary report

### 3. Database Records

**Investigation States**:
```sql
SELECT investigation_id, status, lifecycle_stage 
FROM investigation_states 
WHERE investigation_id LIKE 'inv_%';
```

**Transaction Scores**:
```sql
SELECT investigation_id, COUNT(*) as scored_transactions
FROM transaction_scores
GROUP BY investigation_id;
```

---

## Fraud Pattern Integration

All 8 fraud patterns are automatically detected during investigations:

1. Card Testing (+20%)
2. **Geo-Impossibility (+25%)** - Impossible Travel ✅
3. BIN Attack (+15%)
4. **Time-of-Day Anomaly (+10%)** - Odd-Hour Activity ✅
5. New Device + High Amount (+12%)
6. Cross-Entity Linking (+18%)
7. **Transaction Chaining (+18%)** - NEW ✅
8. **Refund/Chargeback Spike (+15-25%)** - NEW ✅

Pattern adjustments are automatically applied to risk scores and included in confusion table calculations.

---

## Streaming Transaction Scoring

The system automatically handles large transaction volumes:

- **Batch Size**: 5,000 transactions per batch (configurable via `INVESTIGATION_STREAMING_BATCH_SIZE`)
- **Storage**: PostgreSQL `transaction_scores` table
- **Retrieval**: Confusion tables automatically retrieve scores from database
- **No Limit**: Can handle millions of transactions per investigation

### Configuration
```bash
# Enable streaming mode (default: true)
INVESTIGATION_USE_STREAMING_SCORING="true"

# Batch size (default: 5000)
INVESTIGATION_STREAMING_BATCH_SIZE="5000"

# Timeout per batch (default: 3600 seconds = 1 hour)
INVESTIGATION_PER_TX_SCORING_TIMEOUT="3600"
```

---

## Troubleshooting

### Issue: No Merchants Found

**Cause**: Time window or fraud filter too restrictive

**Solution**: Adjust environment variables:
```bash
# Try different time periods
ANALYTICS_MAX_LOOKBACK_MONTHS="6"  # or "7", "9", etc.

# Ensure fraud filter is working
# Check Snowflake has IS_FRAUD_TX column populated
```

### Issue: Confusion Tables Not Generated

**Cause**: Investigation failed or transaction scores missing

**Solution**: Check logs for:
```
❌ Investigation failed: <error>
⚠️ No transaction scores found for investigation <id>
```

Verify streaming scoring is enabled:
```bash
INVESTIGATION_USE_STREAMING_SCORING="true"
```

### Issue: Incomplete Transaction Scores

**Cause**: Timeout or memory issues (should not happen with streaming)

**Solution**: Check database directly:
```sql
SELECT 
    inv.investigation_id,
    COUNT(DISTINCT ts.transaction_id) as scored_count,
    inv.settings_json->>'$.total_transactions' as expected_count
FROM investigation_states inv
LEFT JOIN transaction_scores ts ON ts.investigation_id = inv.investigation_id
GROUP BY inv.investigation_id;
```

If scores are missing, streaming architecture should prevent this. Check logs for errors.

---

## Conclusion

✅ **The startup analysis flow AUTOMATICALLY performs all 5 requested steps:**

1. ✅ Runs startup analysis
2. ✅ Runs analyzer on configurable time window
3. ✅ Investigates merchants with fraud
4. ✅ Generates confusion tables
5. ✅ Ensures complete transaction scores

**No custom scripts needed** - just configure environment variables and start the server.

The workflow is production-ready, fully automated, and handles large-scale merchant investigations with complete transaction scoring via the streaming architecture.


