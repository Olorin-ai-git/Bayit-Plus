# Internal Service Contracts: Confusion Table Metrics

**Feature**: Confusion Table Metrics  
**Date**: 2025-11-16  
**Phase**: 1 - Design

## Overview

This document defines internal service contracts for confusion table metrics evaluation. These are internal interfaces between services, not external API contracts.

## Service Contracts

### Investigation Transaction Mapper

**Service**: `app/service/investigation/investigation_transaction_mapper.py`

#### `classify_transaction_fraud(investigation_risk_score: Optional[float], risk_threshold: float) -> str`

Classifies a transaction as "Fraud" or "Not Fraud" based on investigation risk score.

**Parameters**:
- `investigation_risk_score`: Risk score from investigation (None, 0.0-1.0)
- `risk_threshold`: Classification threshold (default: 0.3)

**Returns**: `'Fraud'` or `'Not Fraud'`

**Logic**:
1. If `investigation_risk_score is None`: Return `'Not Fraud'`
2. If `investigation_risk_score >= risk_threshold`: Return `'Fraud'`
3. Else: Return `'Not Fraud'`

**Edge Cases**:
- `investigation_risk_score = None`: Extract from `domain_findings.risk.risk_score` if available
- If still None: Return `'Not Fraud'`

### Comparison Service

**Service**: `app/service/investigation/comparison_service.py`

#### `calculate_confusion_matrix(transactions: List[Dict], risk_threshold: float) -> ConfusionMatrix`

Calculates confusion matrix metrics for a list of transactions.

**Parameters**:
- `transactions`: List of transaction dicts with `predicted_risk`, `actual_outcome`
- `risk_threshold`: Classification threshold

**Returns**: `ConfusionMatrix` object

**Logic**:
- TP: `predicted_risk >= risk_threshold AND actual_outcome == 1`
- FP: `predicted_risk >= risk_threshold AND actual_outcome == 0`
- TN: `predicted_risk < risk_threshold AND actual_outcome == 0`
- FN: `predicted_risk < risk_threshold AND actual_outcome == 1`
- Excluded: `actual_outcome is None`

**Validation**:
- Guard divide-by-zero in precision/recall/F1/accuracy calculations
- Return 0.0 if denominator is 0

#### `aggregate_confusion_matrices(matrices: List[ConfusionMatrix]) -> AggregatedConfusionMatrix`

Aggregates confusion matrices across multiple entities.

**Parameters**:
- `matrices`: List of `ConfusionMatrix` objects (one per entity)

**Returns**: `AggregatedConfusionMatrix` object

**Logic**:
- Sum TP, FP, TN, FN, excluded_count across all matrices
- Recalculate aggregated precision, recall, F1, accuracy
- Preserve per-entity breakdown

### Query Builder

**Service**: `app/service/agent/tools/snowflake_tool/query_builder.py`

#### `exclude_columns_from_select(columns: List[str], exclude_list: List[str]) -> List[str]`

Filters out excluded columns from SELECT clause.

**Parameters**:
- `columns`: List of column names to include
- `exclude_list`: List of column names to exclude (e.g., ['MODEL_SCORE', 'IS_FRAUD_TX'])

**Returns**: Filtered list of column names

**Contract**: 
- Must be called for ALL investigation queries
- Must exclude MODEL_SCORE and IS_FRAUD_TX during investigation execution
- Case-sensitive matching based on database provider

### Startup Report Generator

**Service**: `app/service/reporting/startup_report_generator.py`

#### `_generate_confusion_table_section(aggregated_matrix: AggregatedConfusionMatrix) -> str`

Generates HTML section for confusion table in startup report.

**Parameters**:
- `aggregated_matrix`: `AggregatedConfusionMatrix` object

**Returns**: HTML string for confusion table section

**Contract**:
- Must match existing report styling
- Must include aggregated metrics
- Must include per-entity breakdown (collapsible)
- Must handle edge cases (zero transactions, failed investigations)

## Data Flow Contracts

### Investigation → Classification

```
Investigation.overall_risk_score (or domain_findings.risk.risk_score)
    ↓
classify_transaction_fraud(risk_score, threshold)
    ↓
predicted_label: 'Fraud' or 'Not Fraud'
```

### Classification → Confusion Matrix

```
Transaction with predicted_label
    ↓
Query IS_FRAUD_TX at window_end
    ↓
actual_outcome: 1, 0, or None
    ↓
calculate_confusion_matrix(transactions, threshold)
    ↓
ConfusionMatrix(TP, FP, TN, FN, ...)
```

### Confusion Matrix → Aggregation

```
List[ConfusionMatrix] (one per entity)
    ↓
aggregate_confusion_matrices(matrices)
    ↓
AggregatedConfusionMatrix(total_TP, total_FP, ...)
```

### Aggregation → Report

```
AggregatedConfusionMatrix
    ↓
_generate_confusion_table_section(matrix)
    ↓
HTML section in startup report
```

## Error Handling Contracts

### Missing Risk Score

**Contract**: Must attempt extraction in priority order:
1. `investigation.overall_risk_score`
2. `investigation.domain_findings.risk.risk_score`
3. Default to None → Classify as "Not Fraud"

### NULL IS_FRAUD_TX

**Contract**: Must exclude from confusion matrix, count in `excluded_count`

### Failed Investigation

**Contract**: Must log warning, exclude entity, continue with remaining entities

### Divide-by-Zero

**Contract**: Must return 0.0 for precision/recall/F1/accuracy if denominator is 0

## Validation Contracts

### Confusion Matrix Validation

**Contract**: Must validate:
- `TP + FP + TN + FN + excluded_count = total_transactions`
- All counts >= 0
- Metrics in range [0.0, 1.0] or NaN

### Query Exclusion Validation

**Contract**: Must validate that MODEL_SCORE and IS_FRAUD_TX are not in investigation queries

## Performance Contracts

### Calculation Performance

**Contract**: 
- Confusion matrix calculation: <1 second per entity
- Aggregation: <0.5 seconds for 3 entities
- Total: <5 seconds after investigations complete

