# Quick Start: Confusion Table Metrics

**Feature**: Confusion Table Metrics  
**Date**: 2025-11-16  
**Phase**: 1 - Design

## Overview

The Confusion Table Metrics feature evaluates fraud detection model performance by comparing investigation predictions to ground truth fraud labels. The system automatically runs investigations on the top 3 riskiest entities, excludes MODEL_SCORE and IS_FRAUD_TX from investigation queries (ensuring unbiased evaluation), classifies transactions based on investigation risk scores, and displays confusion matrix metrics in the startup analysis report.

## Key Features

- **Unconditional Top 3 Investigations**: Always runs investigations for top 3 riskiest entities when startup analysis is enabled
- **Unbiased Evaluation**: Excludes MODEL_SCORE and IS_FRAUD_TX from investigation queries to prevent contamination
- **Fraud Classification**: Classifies transactions as Fraud/Not Fraud based on investigation risk_score vs configurable threshold (default: 0.3)
- **Ground Truth Comparison**: Compares predictions to IS_FRAUD_TX column at investigation window end date
- **Confusion Matrix**: Calculates TP, FP, TN, FN and derived metrics (precision, recall, F1, accuracy)
- **Report Display**: Shows aggregated confusion table in startup analysis report HTML

## Configuration

### Environment Variables

```bash
# Fraud classification threshold (default: 0.3)
RISK_THRESHOLD_DEFAULT=0.3

# Enable startup analysis (required)
AUTO_RUN_STARTUP_ANALYSIS=true

# Database provider (affects column naming)
DATABASE_PROVIDER=snowflake  # or 'postgresql'
```

### .env File Setup

Add to `olorin-server/.env`:

```bash
# Confusion Table Metrics Configuration
RISK_THRESHOLD_DEFAULT=0.3
AUTO_RUN_STARTUP_ANALYSIS=true
DATABASE_PROVIDER=snowflake
```

## Usage

### Automatic Execution (Startup Analysis)

The confusion table metrics are automatically generated when the server starts with `AUTO_RUN_STARTUP_ANALYSIS=true`:

1. **Server Startup**: Risk analyzer identifies top riskiest entities
2. **Investigation Execution**: System runs investigations for top 3 entities (unconditional)
3. **Query Exclusion**: All investigation queries exclude MODEL_SCORE and IS_FRAUD_TX
4. **Transaction Classification**: Transactions classified based on investigation risk_score vs threshold
5. **Ground Truth Comparison**: Predictions compared to IS_FRAUD_TX values
6. **Confusion Matrix Calculation**: TP, FP, TN, FN calculated per entity
7. **Report Generation**: Startup analysis report includes confusion table section

### Viewing Results

#### Startup Analysis Report

The confusion table is displayed in the startup analysis report HTML:

**Location**: `artifacts/reports/startup/startup_analysis_{timestamp}.html`

**Section**: "Confusion Matrix Metrics"

**Content**:
- Aggregated metrics across all 3 entities:
  - True Positives (TP)
  - False Positives (FP)
  - True Negatives (TN)
  - False Negatives (FN)
  - Precision
  - Recall
  - F1 Score
  - Accuracy
- Per-entity breakdown (collapsible section)

#### Report Structure

```html
<section id="confusion-matrix-metrics">
  <h2>Confusion Matrix Metrics</h2>
  
  <div class="aggregated-metrics">
    <h3>Aggregated Metrics (All Entities)</h3>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>True Positives</td><td>{total_TP}</td></tr>
      <tr><td>False Positives</td><td>{total_FP}</td></tr>
      <tr><td>True Negatives</td><td>{total_TN}</td></tr>
      <tr><td>False Negatives</td><td>{total_FN}</td></tr>
      <tr><td>Precision</td><td>{aggregated_precision:.3f}</td></tr>
      <tr><td>Recall</td><td>{aggregated_recall:.3f}</td></tr>
      <tr><td>F1 Score</td><td>{aggregated_f1_score:.3f}</td></tr>
      <tr><td>Accuracy</td><td>{aggregated_accuracy:.3f}</td></tr>
    </table>
  </div>
  
  <details>
    <summary>Per-Entity Breakdown</summary>
    <!-- Per-entity confusion matrices -->
  </details>
</section>
```

## Verification

### Verify Query Exclusion

Check that investigation queries exclude MODEL_SCORE and IS_FRAUD_TX:

```bash
# Check investigation logs
grep -r "SELECT.*MODEL_SCORE" artifacts/investigations/
grep -r "SELECT.*IS_FRAUD_TX" artifacts/investigations/

# Should return no results (or only in ground truth comparison queries)
```

### Verify Top 3 Execution

Check that investigations run for top 3 entities unconditionally:

```bash
# Check startup logs
grep "Starting auto-comparisons for top" logs/startup.log

# Should show: "Starting auto-comparisons for top 3 riskiest entities"
# Even if risk analyzer returns fewer than 3 entities
```

### Verify Confusion Matrix

Check that confusion matrix is calculated correctly:

```python
# Expected confusion matrix logic:
# TP = predicted Fraud AND IS_FRAUD_TX = 1
# FP = predicted Fraud AND IS_FRAUD_TX = 0
# TN = predicted Not Fraud AND IS_FRAUD_TX = 0
# FN = predicted Not Fraud AND IS_FRAUD_TX = 1
```

## Testing

### Unit Tests

```bash
# Run unit tests for confusion matrix calculation
pytest tests/unit/test_comparison_service.py::test_confusion_matrix_calculation

# Run unit tests for fraud classification
pytest tests/unit/test_investigation_transaction_mapper.py::test_fraud_classification

# Run unit tests for query exclusion
pytest tests/unit/test_query_builder.py::test_exclude_model_score_and_is_fraud_tx
```

### Integration Tests

```bash
# Run E2E test for confusion table flow
pytest tests/integration/test_confusion_table_e2e.py

# Test should verify:
# 1. Top 3 investigations run unconditionally
# 2. Investigation queries exclude MODEL_SCORE/IS_FRAUD_TX
# 3. Transactions classified correctly
# 4. Confusion matrix calculated correctly
# 5. Report displays confusion table
```

### Manual Testing

1. **Start Server**:
   ```bash
   cd olorin-server
   AUTO_RUN_STARTUP_ANALYSIS=true python -m uvicorn app.main:app --reload
   ```

2. **Wait for Startup Analysis**: Check logs for completion

3. **Verify Report**: Open `artifacts/reports/startup/startup_analysis_{timestamp}.html`

4. **Check Confusion Table**: Verify section exists with correct metrics

## Troubleshooting

### No Confusion Table in Report

**Issue**: Confusion table section missing from report

**Check**:
- Are investigations completing successfully?
- Are confusion matrix metrics being calculated?
- Check logs for errors in comparison service

**Solution**: Verify all investigations complete, check comparison service logs

### Zero Transactions in Confusion Matrix

**Issue**: All confusion matrix counts are zero

**Check**:
- Are transactions being retrieved for investigation window?
- Is IS_FRAUD_TX being queried correctly?
- Are transactions being classified correctly?

**Solution**: Verify transaction queries, check IS_FRAUD_TX values, verify classification logic

### MODEL_SCORE/IS_FRAUD_TX Still in Queries

**Issue**: Investigation queries still include excluded columns

**Check**:
- Are query builders updated?
- Are column exclusion filters applied?
- Check query logs for column names

**Solution**: Verify all query builders exclude these columns, add validation

### Incorrect Classification

**Issue**: Transactions classified incorrectly

**Check**:
- Is RISK_THRESHOLD_DEFAULT set correctly?
- Is investigation risk_score being extracted correctly?
- Check risk score extraction logic (overall_risk_score vs domain_findings)

**Solution**: Verify threshold configuration, check risk score extraction priority

## Performance

### Expected Performance

- **Confusion Matrix Calculation**: <1 second per entity
- **Aggregation**: <0.5 seconds for 3 entities
- **Report Generation**: <2 seconds including confusion table
- **Total**: <5 seconds after investigations complete

### Optimization

- Batch IS_FRAUD_TX queries for all transactions
- Cache confusion matrix calculations
- Use efficient data structures for aggregation

## Next Steps

1. **Implementation**: Follow tasks.md for detailed implementation steps
2. **Testing**: Run unit and integration tests
3. **Verification**: Check confusion table in startup report
4. **Monitoring**: Monitor performance and accuracy metrics

