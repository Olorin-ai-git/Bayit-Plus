# Merchant Agent Validation Framework

This directory contains validation and backtesting tools for the Merchant Agent.

## Overview

The Merchant Agent Backtesting Framework validates the merchant agent strategy by:
1. Running merchant agent analysis on historical data (24h window from 6 months ago)
2. Fetching actual fraud outcomes that occurred after the historical period
3. Comparing predictions with actual outcomes to calculate accuracy metrics

## Usage

### Basic Backtest

Run a backtest on a specific entity:

```bash
python merchant_agent_backtest.py \
    --entity-type user_id \
    --entity-id USER_12345
```

### Custom Historical Date

Test on a specific historical date:

```bash
python merchant_agent_backtest.py \
    --entity-type email \
    --entity-id user@example.com \
    --historical-date 2024-07-11
```

### Custom Historical Window

Change the default 6-month lookback period:

```bash
python merchant_agent_backtest.py \
    --entity-type ip \
    --entity-id 192.168.1.100 \
    --historical-days 90
```

### Save Results

Save backtest results to a JSON file:

```bash
python merchant_agent_backtest.py \
    --entity-type user_id \
    --entity-id USER_12345 \
    --output results/backtest_USER_12345.json
```

## How It Works

### Step 1: Historical Data Fetching

The framework fetches transaction data for a 24-hour window from the historical date (default: 6 months ago). This includes:
- Merchant information (MERCHANT_NAME, MERCHANT_RISK_LEVEL, etc.)
- Transaction details (amounts, timestamps, etc.)
- Risk scores (MODEL_SCORE)
- Fraud flags (IS_FRAUD_TX)

### Step 2: Merchant Agent Analysis

The merchant agent analyzes the historical data and produces:
- Risk score (0.0 to 1.0)
- Confidence level
- Merchant-specific findings (velocity, risk distribution, etc.)

### Step 3: Outcome Fetching

The framework fetches actual fraud outcomes that occurred after the historical period (from historical_date + 1 day to today). This includes:
- Confirmed fraud transactions (IS_FRAUD_TX = 1)
- Blocked/rejected transactions
- Fraud rate calculation

### Step 4: Validation

The framework compares predictions with actual outcomes:
- **Prediction Accuracy**: Whether high-risk prediction (>0.6) matches high fraud rate (>0.2)
- **Risk Correlation Error**: Absolute difference between predicted risk score and actual fraud rate
- **Confidence Assessment**: How well confidence scores correlate with prediction accuracy

## Output Format

The backtest produces a JSON result with:

```json
{
  "entity_type": "user_id",
  "entity_id": "USER_12345",
  "historical_date": "2024-07-11T00:00:00",
  "predictions": {
    "risk_score": 0.75,
    "confidence": 0.85,
    "findings": {...},
    "historical_transactions": 42
  },
  "actual_outcomes": {
    "row_count": 156,
    "fraud_count": 12,
    "blocked_count": 8,
    "fraud_rate": 0.077,
    "outcome_start": "2024-07-12T00:00:00",
    "outcome_end": "2025-01-11T00:00:00"
  },
  "validation": {
    "validation_complete": true,
    "predicted_risk_score": 0.75,
    "predicted_high_risk": true,
    "actual_fraud_rate": 0.077,
    "actual_high_fraud": false,
    "prediction_correct": false,
    "risk_correlation_error": 0.673
  },
  "timestamp": "2025-01-11T12:00:00"
}
```

## Validation Metrics

### Prediction Correctness

- **True Positive**: Predicted high risk AND actual high fraud
- **True Negative**: Predicted low risk AND actual low fraud
- **False Positive**: Predicted high risk BUT actual low fraud
- **False Negative**: Predicted low risk BUT actual high fraud

### Risk Correlation Error

Absolute difference between predicted risk score and actual fraud rate. Lower is better.

- **Excellent**: < 0.1
- **Good**: 0.1 - 0.3
- **Fair**: 0.3 - 0.5
- **Poor**: > 0.5

## Example Scenarios

### Scenario 1: High-Risk Merchant Pattern

```bash
# Entity with high-risk merchant associations
python merchant_agent_backtest.py \
    --entity-type email \
    --entity-id fraudster@example.com \
    --historical-date 2024-07-11
```

**Expected**: Merchant agent should detect high-risk merchant patterns and predict high risk. Validation checks if actual fraud occurred.

### Scenario 2: Merchant Velocity Pattern

```bash
# Entity with rapid merchant switching
python merchant_agent_backtest.py \
    --entity-type user_id \
    --entity-id USER_99999 \
    --historical-date 2024-07-11
```

**Expected**: Merchant agent should detect rapid merchant switching and predict high risk. Validation checks if this pattern led to fraud.

### Scenario 3: Low-Risk Merchant Pattern

```bash
# Entity with low-risk merchant associations
python merchant_agent_backtest.py \
    --entity-type email \
    --entity-id legitimate@example.com \
    --historical-date 2024-07-11
```

**Expected**: Merchant agent should detect low-risk merchant patterns and predict low risk. Validation checks if no fraud occurred.

## Integration with Investigation System

The merchant agent is integrated into the investigation orchestration graph as Step 5.2.7 (before Risk Agent at 5.2.8). It runs in parallel with other domain agents and contributes findings to the final risk assessment.

## Troubleshooting

### No Historical Data Found

If you see "No historical data found", check:
- Entity ID is correct
- Historical date has data in Snowflake
- Entity type matches the data schema

### Merchant Agent Errors

If merchant agent fails:
- Check Snowflake connection
- Verify merchant fields are available in schema
- Check investigation logs for detailed error messages

### Validation Incomplete

If validation is incomplete:
- Ensure outcome data is available (may take time for fraud to be confirmed)
- Check date ranges are correct
- Verify entity ID matches across time periods

## Future Enhancements

- Batch backtesting across multiple entities
- Statistical significance testing
- ROC curve generation
- Precision/recall metrics
- Merchant-specific validation (validate per merchant category)

