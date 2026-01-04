# Merchant Agent Implementation Summary

**Date**: 2025-01-11  
**Status**: ✅ Complete  
**Agent Step**: 5.2.7 (before Risk Agent at 5.2.8)

## Overview

A dedicated Merchant Domain Agent has been created and integrated into the Olorin investigation system. The agent uses Snowflake as its primary tool for finding merchant-related anomalies and fraud patterns.

## Implementation Details

### 1. Merchant Agent (`merchant_agent.py`)

**Location**: `olorin-server/app/service/agent/orchestration/domain_agents/merchant_agent.py`

**Key Features**:
- Analyzes merchant risk level distribution
- Detects merchant velocity patterns (rapid merchant switching)
- Identifies merchant category clustering and suspicious combinations
- Analyzes merchant decision patterns and anomalies
- Correlates merchant patterns with fraud outcomes

**Analysis Functions**:
- `_analyze_merchant_risk_distribution()`: Analyzes distribution of merchant risk levels
- `_analyze_merchant_velocity()`: Detects rapid merchant switching patterns
- `_analyze_merchant_category_patterns()`: Analyzes merchant category clustering
- `_analyze_merchant_decisions()`: Analyzes merchant decision patterns
- `_analyze_merchant_fraud_correlation()`: Correlates merchant patterns with fraud

### 2. Integration Updates

**Updated Files**:
- `base.py`: Added merchant agent to domain step mapping (Step 5.2.7)
- `node_factory.py`: Added merchant agent node to orchestration graph
- `edge_configurator.py`: Added merchant agent routing

**Integration Points**:
- Merchant agent runs in parallel with other domain agents
- Findings flow to Risk Agent (Step 5.2.8) for final synthesis
- Merchant risk factors are incorporated into overall risk assessment

### 3. Validation Framework

**Location**: `olorin-server/scripts/validation/merchant_agent_backtest.py`

**Purpose**: Validates merchant agent strategy by comparing historical predictions with actual outcomes.

**How It Works**:
1. **Historical Data Fetching**: Fetches 24h transaction data from 6 months ago
2. **Merchant Agent Analysis**: Runs merchant agent on historical data to get predictions
3. **Outcome Fetching**: Fetches actual fraud outcomes that occurred after historical period
4. **Validation**: Compares predictions with actual outcomes to calculate accuracy metrics

**Usage**:
```bash
python merchant_agent_backtest.py \
    --entity-type user_id \
    --entity-id USER_12345 \
    --historical-date 2024-07-11 \
    --output results/backtest.json
```

## Merchant Analysis Capabilities

### 1. Merchant Risk Distribution
- Identifies high-risk merchant associations
- Calculates risk level distribution (high/medium/low)
- Flags entities with >50% high-risk merchant transactions

### 2. Merchant Velocity Detection
- Detects rapid merchant switching (3+ merchants within 1 hour)
- Identifies first-time merchant usage patterns
- Flags high single-use merchant rates (>50% merchants used only once)

### 3. Merchant Category Analysis
- Analyzes merchant category clustering
- Identifies suspicious category combinations
- Detects high fraud rate categories (>30% fraud rate)

### 4. Merchant Decision Patterns
- Analyzes merchant acceptance/rejection patterns
- Detects decision anomalies
- Flags merchants with high rejection rates (>2x rejections vs acceptances)

### 5. Merchant-Fraud Correlation
- Correlates merchant patterns with fraud outcomes
- Identifies merchants with >20% fraud rate
- Provides merchant-specific fraud risk assessment

## Validation Metrics

The validation framework calculates:
- **Prediction Accuracy**: Whether high-risk prediction matches high fraud rate
- **Risk Correlation Error**: Absolute difference between predicted risk and actual fraud rate
- **Confidence Assessment**: How well confidence scores correlate with accuracy

## Testing Strategy

To validate the merchant agent strategy:

1. **Select Historical Date**: Choose a date 6 months ago (or custom date)
2. **Run Backtest**: Execute merchant agent on historical 24h data
3. **Compare Outcomes**: Compare predictions with actual fraud outcomes
4. **Calculate Metrics**: Evaluate prediction accuracy and risk correlation

**Example**:
```bash
# Test on entity from 6 months ago
python merchant_agent_backtest.py \
    --entity-type email \
    --entity-id user@example.com \
    --historical-days 180 \
    --output validation_results.json
```

## Next Steps

1. **Run Validation Tests**: Execute backtests on multiple entities to validate strategy
2. **Analyze Results**: Review validation metrics to identify areas for improvement
3. **Refine Strategy**: Adjust merchant agent logic based on validation findings
4. **Production Deployment**: Deploy merchant agent to production investigation workflows

## Files Created/Modified

### Created:
- `olorin-server/app/service/agent/orchestration/domain_agents/merchant_agent.py`
- `olorin-server/scripts/validation/merchant_agent_backtest.py`
- `olorin-server/scripts/validation/README.md`
- `docs/merchant-agent-implementation-summary.md`

### Modified:
- `olorin-server/app/service/agent/orchestration/domain_agents/base.py`
- `olorin-server/app/service/agent/orchestration/hybrid/graph/builders/node_factory.py`
- `olorin-server/app/service/agent/orchestration/hybrid/graph/builders/edge_configurator.py`

## Integration Status

✅ Merchant agent created  
✅ Integration with orchestration graph  
✅ Validation framework created  
✅ Documentation complete  

**Ready for**: Testing and validation

