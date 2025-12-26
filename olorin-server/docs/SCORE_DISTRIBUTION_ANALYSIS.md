# Model Score Distribution Analysis

## Overview

This feature implements statistical analysis of model score distribution across fraud and safe transactions, as suggested by Ziv. It provides data-driven insights to inform and optimize the selection algorithm used in the fraud detection system.

## Purpose

The distribution analysis helps answer critical questions:
- **Model Calibration**: Does high model score actually correlate with fraud?
- **Optimal Thresholds**: Where should we set score cutoffs for investigation?
- **False Positive Cost**: How much safe GMV would we flag at different thresholds?
- **Fraud Concentration**: Which score ranges contain most fraud GMV?

## Architecture

### Components

1. **ScoreDistributionAnalyzer** (`app/service/analytics/score_distribution_analyzer.py`)
   - Core analysis engine
   - Queries approved transactions from Snowflake/PostgreSQL
   - Generates distribution across score buckets

2. **Analysis Script** (`scripts/analyze_model_score_distribution.py`)
   - Command-line interface for running analysis
   - CSV export for detailed data
   - Optional matplotlib visualization

3. **Configuration** (`.env`)
   - Reuses existing selector configuration
   - Minimal new configuration: bucket count and artifacts directory

## Configuration

All configuration reuses existing selector settings to avoid duplication:

```bash
# Existing selector configuration (reused)
SELECTOR_TIME_WINDOW_HOURS=24              # Analysis window size
SELECTOR_HISTORICAL_OFFSET_MONTHS=12       # How far back to analyze
SELECTOR_REFERENCE_DATE=                   # Optional: specific date override

# Distribution-specific configuration
ANALYSIS_NUM_BUCKETS=20                    # Number of score buckets (0-1 range)
ARTIFACTS_DIR=olorin-server/artifacts      # Output directory for exports
```

## Usage

### Basic Usage

Run analysis for default time period (12 months ago, 24-hour window):

```bash
poetry run python scripts/analyze_model_score_distribution.py
```

### Specific Date Analysis

Analyze a specific historical date:

```bash
poetry run python scripts/analyze_model_score_distribution.py --reference-date 2024-12-22
```

### Custom Configuration

```bash
# 48-hour window with 10 buckets
poetry run python scripts/analyze_model_score_distribution.py \
    --time-window-hours 48 \
    --num-buckets 10

# Skip CSV export and visualization
poetry run python scripts/analyze_model_score_distribution.py \
    --no-csv \
    --no-plot
```

### Command-Line Options

- `--reference-date YYYY-MM-DD`: Specific date to analyze (default: 12 months ago)
- `--time-window-hours N`: Window size in hours (default: 24)
- `--num-buckets N`: Number of score buckets (default: 20)
- `--no-csv`: Skip CSV export
- `--no-plot`: Skip matplotlib visualization

## Output

### Console Summary

```
📊 MODEL SCORE DISTRIBUTION ANALYSIS - SUMMARY

📋 Overall Statistics:
   Total Fraud GMV: $17,094.93
   Total Safe GMV: $2,088,330.41
   Total Fraud Transactions: 176
   Total Safe Transactions: 32,738
   Fraud Rate: 0.53%
   Number of Buckets: 19

📊 Distribution by Score Bucket:
Bucket Range    Fraud GMV       Safe GMV        Fraud %    Total Txs
--------------------------------------------------------------------------------
0.00-0.05       $625.00         $274,861.76     0.19%      1,070
0.05-0.10       $462.86         $221,252.45     0.21%      1,430
...
0.80-0.85       $2,207.12       $27,555.11      2.81%      249
0.85-0.90       $695.00         $29,954.13      1.97%      152
```

### CSV Export

File: `artifacts/score_distribution_YYYYMMDD_HHMMSS.csv`

Columns:
- `bucket_range`: Score range (e.g., "0.75-0.80")
- `bucket_min`: Minimum score in bucket
- `bucket_max`: Maximum score in bucket
- `fraud_gmv`: Total fraud GMV in bucket
- `safe_gmv`: Total safe GMV in bucket
- `fraud_count`: Number of fraud transactions
- `safe_count`: Number of safe transactions
- `fraud_percentage`: Fraud rate within bucket
- `total_gmv`: Combined fraud + safe GMV

### Visualization (Optional)

File: `artifacts/score_distribution_YYYYMMDD_HHMMSS.png`

Bar chart showing:
- **Red bars**: Fraud GMV by score bucket
- **Green bars**: Safe GMV by score bucket
- X-axis: Model score buckets (0-1)
- Y-axis: Total GMV ($)

## Integration with Selector Algorithm

### Current Selector Logic

The `RiskAnalyzer` (`app/service/analytics/risk_analyzer.py`) uses:

```python
risk_weighted_value = SUM(MODEL_SCORE * GMV) * COUNT(*)
```

### How to Use Distribution Insights

1. **Run Historical Analysis**
   ```bash
   # Analyze multiple historical dates
   poetry run python scripts/analyze_model_score_distribution.py --reference-date 2024-11-15
   poetry run python scripts/analyze_model_score_distribution.py --reference-date 2024-10-15
   poetry run python scripts/analyze_model_score_distribution.py --reference-date 2024-09-15
   ```

2. **Identify Patterns**
   - Look for score ranges with high fraud concentration
   - Identify thresholds with optimal precision/recall trade-off
   - Understand false positive costs at different cutoffs

3. **Refine Selection Algorithm**

   Example refinements based on analysis:

   ```python
   # Add minimum score threshold if analysis shows low scores never contain fraud
   if avg_risk_score < 0.40:
       continue  # Skip low-score entities

   # Weight high-score entities more heavily if analysis confirms correlation
   if avg_risk_score > 0.75:
       risk_weighted_value *= 2.0  # Double weight for high scores

   # Add score-based percentile filtering
   top_percentage_by_score = calculate_from_distribution(analysis)
   ```

4. **Validate Changes**
   - Re-run distribution analysis after selector changes
   - Compare precision/recall before and after
   - Monitor false positive rate

## Example Analysis Workflow

### Step 1: Run Multi-Period Analysis

```bash
# Analyze last 6 months, one 24h window per month
for month in {1..6}; do
    offset=$((month * 30))
    date=$(date -v-${offset}d +%Y-%m-%d)
    poetry run python scripts/analyze_model_score_distribution.py \
        --reference-date $date
done
```

### Step 2: Aggregate Results

Combine CSV exports to identify consistent patterns:

```python
import pandas as pd
import glob

# Load all CSVs
csv_files = glob.glob("artifacts/score_distribution_*.csv")
dfs = [pd.read_csv(f) for f in csv_files]

# Calculate average fraud % by bucket
combined = pd.concat(dfs).groupby('bucket_range').agg({
    'fraud_percentage': 'mean',
    'fraud_gmv': 'sum',
    'safe_gmv': 'sum'
})

print(combined.sort_values('fraud_percentage', ascending=False))
```

### Step 3: Determine Optimal Threshold

Based on analysis, calculate ROI for different thresholds:

```python
# If investigation costs $50 per entity
investigation_cost = 50

# Calculate expected value for each bucket
for bucket in buckets:
    expected_fraud_recovery = bucket['fraud_gmv'] * fraud_recovery_rate
    investigation_total_cost = (bucket['fraud_count'] + bucket['safe_count']) * investigation_cost
    roi = (expected_fraud_recovery - investigation_total_cost) / investigation_total_cost
    print(f"Bucket {bucket['range']}: ROI = {roi:.2%}")
```

## Technical Details

### Query Structure

```sql
WITH score_buckets AS (
    SELECT
        FLOOR(MODEL_SCORE * 20) / 20.0 AS score_bucket_min,
        (FLOOR(MODEL_SCORE * 20) + 1) / 20.0 AS score_bucket_max,
        CASE WHEN IS_FRAUD_TX = 1 THEN 'fraud' ELSE 'safe' END AS tx_type,
        GMV,
        MODEL_SCORE
    FROM DBT.DBT_PROD.TXS
    WHERE TX_DATETIME >= [start] AND TX_DATETIME < [end]
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND MODEL_SCORE IS NOT NULL
      AND GMV IS NOT NULL
)
SELECT
    score_bucket_min,
    score_bucket_max,
    tx_type,
    COUNT(*) as transaction_count,
    SUM(GMV) as total_gmv,
    AVG(GMV) as avg_gmv,
    MIN(GMV) as min_gmv,
    MAX(GMV) as max_gmv,
    AVG(MODEL_SCORE) as avg_score
FROM score_buckets
GROUP BY score_bucket_min, score_bucket_max, tx_type
ORDER BY score_bucket_min, tx_type
```

### Database Provider Support

Supports both:
- **Snowflake**: Primary transaction data source
- **PostgreSQL**: Alternative for testing/development

Provider selected via `DATABASE_PROVIDER` environment variable.

### Bucket Calculation

For 20 buckets (default):
- Bucket size: 0.05 (1.0 / 20)
- Bucket 0: 0.00-0.05
- Bucket 1: 0.05-0.10
- ...
- Bucket 19: 0.95-1.00

Formula: `FLOOR(MODEL_SCORE * num_buckets) / num_buckets`

## Performance Considerations

- **Query Time**: ~30-60 seconds for 24h window on Snowflake
- **Data Volume**: Typical 24h window = 30,000-50,000 approved transactions
- **Caching**: No caching - each run queries fresh data
- **Cost**: Minimal - single aggregation query per run

## Troubleshooting

### No Data Returned

```
⚠️  No results found
```

**Solutions**:
- Try longer time window: `--time-window-hours 48`
- Try different reference date: `--reference-date 2024-11-01`
- Verify database connectivity and credentials
- Check `DATABASE_PROVIDER` environment variable

### Missing Buckets in Output

Some score ranges may have zero transactions, resulting in fewer than 20 buckets. This is normal and indicates no approved transactions in that score range.

### Matplotlib Not Available

```
⚠️  matplotlib not available
```

**Solution**:
```bash
poetry add matplotlib
# or
pip install matplotlib
```

## Future Enhancements

Potential improvements:
1. **Automated Threshold Recommendation**: ML model to suggest optimal score cutoffs
2. **Time Series Analysis**: Track distribution changes over time
3. **Multi-Dimensional Analysis**: Break down by merchant category, country, etc.
4. **Interactive Dashboard**: Web-based visualization with drill-down
5. **A/B Testing Framework**: Compare different selector configurations

## References

- Original suggestion: Ziv (Dec 22, 2025)
- Related code: `app/service/analytics/risk_analyzer.py`
- Selector configuration: `.env` lines 418, 741, 751
