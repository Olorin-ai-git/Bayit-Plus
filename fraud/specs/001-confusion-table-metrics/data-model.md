# Data Model: Confusion Table Metrics

**Feature**: Confusion Table Metrics  
**Date**: 2025-11-16  
**Phase**: 1 - Design

## Overview

This document defines the data models for confusion table metrics evaluation, including confusion matrix structures, fraud classification logic, and aggregated metrics for startup analysis reports.

## Core Models

### ConfusionMatrix

Represents the confusion matrix metrics for a single entity investigation.

```python
class ConfusionMatrix(BaseModel):
    """Confusion matrix metrics for a single entity."""
    entity_type: str  # 'email', 'device_id', 'ip', etc.
    entity_id: str    # Entity identifier
    investigation_id: Optional[str]  # Investigation ID if available
    
    # Confusion matrix counts
    TP: int  # True Positives: predicted Fraud AND IS_FRAUD_TX = 1
    FP: int  # False Positives: predicted Fraud AND IS_FRAUD_TX = 0
    TN: int  # True Negatives: predicted Not Fraud AND IS_FRAUD_TX = 0
    FN: int  # False Negatives: predicted Not Fraud AND IS_FRAUD_TX = 1
    
    # Excluded transactions
    excluded_count: int  # Transactions with NULL IS_FRAUD_TX
    
    # Derived metrics
    precision: float  # TP / (TP + FP), or 0.0 if TP + FP = 0
    recall: float    # TP / (TP + FN), or 0.0 if TP + FN = 0
    f1_score: float  # 2 * (precision * recall) / (precision + recall), or 0.0 if precision + recall = 0
    accuracy: float  # (TP + TN) / (TP + FP + TN + FN), or 0.0 if total = 0
    
    # Investigation metadata
    investigation_risk_score: Optional[float]  # Risk score from investigation
    risk_threshold: float  # Threshold used for classification (RISK_THRESHOLD_DEFAULT)
    total_transactions: int  # Total transactions in investigation window
    
    # Window information
    window_start: datetime
    window_end: datetime
```

### AggregatedConfusionMatrix

Aggregated confusion matrix metrics across multiple entities (for startup report).

```python
class AggregatedConfusionMatrix(BaseModel):
    """Aggregated confusion matrix across multiple entities."""
    # Aggregated counts
    total_TP: int  # Sum of TP across all entities
    total_FP: int  # Sum of FP across all entities
    total_TN: int  # Sum of TN across all entities
    total_FN: int  # Sum of FN across all entities
    total_excluded: int  # Sum of excluded transactions
    
    # Aggregated derived metrics
    aggregated_precision: float  # total_TP / (total_TP + total_FP)
    aggregated_recall: float    # total_TP / (total_TP + total_FN)
    aggregated_f1_score: float  # 2 * (precision * recall) / (precision + recall)
    aggregated_accuracy: float  # (total_TP + total_TN) / (total_TP + total_FP + total_TN + total_FN)
    
    # Per-entity breakdown
    entity_matrices: List[ConfusionMatrix]  # Individual entity confusion matrices
    
    # Metadata
    entity_count: int  # Number of entities analyzed
    risk_threshold: float  # Threshold used for classification
    calculation_timestamp: datetime  # When metrics were calculated
```

### FraudClassification

Represents the fraud classification result for a transaction.

```python
class FraudClassification(BaseModel):
    """Fraud classification for a transaction."""
    transaction_id: str
    predicted_label: str  # 'Fraud' or 'Not Fraud'
    predicted_risk: Optional[float]  # Investigation risk score
    actual_label: Optional[str]  # 'Fraud' or 'Not Fraud' from IS_FRAUD_TX, or None if NULL
    actual_outcome: Optional[int]  # IS_FRAUD_TX value: 1, 0, or None
    confusion_category: Optional[str]  # 'TP', 'FP', 'TN', 'FN', or None if excluded
```

### InvestigationQueryConfig

Configuration for investigation queries to exclude MODEL_SCORE and IS_FRAUD_TX.

```python
class InvestigationQueryConfig(BaseModel):
    """Configuration for investigation query exclusion."""
    exclude_columns: List[str] = ['MODEL_SCORE', 'IS_FRAUD_TX']  # Columns to exclude
    database_provider: str  # 'snowflake' or 'postgresql'
    
    def get_excluded_columns(self) -> List[str]:
        """Get excluded columns with proper case for database provider."""
        if self.database_provider.lower() == 'snowflake':
            return ['MODEL_SCORE', 'IS_FRAUD_TX']
        else:
            return ['model_score', 'is_fraud_tx']
```

## Data Flow

### 1. Investigation Execution

```
Risk Analyzer → Top 3 Entities → Investigation Creation
                                    ↓
                            SQL Query (excludes MODEL_SCORE, IS_FRAUD_TX)
                                    ↓
                            Investigation Execution
                                    ↓
                            Investigation Completion
                                    ↓
                            overall_risk_score or domain_findings.risk.risk_score
```

### 2. Transaction Classification

```
Investigation Risk Score → Compare to RISK_THRESHOLD_DEFAULT
                                    ↓
                            Classification: 'Fraud' or 'Not Fraud'
                                    ↓
                            Map to all transactions in window
                                    ↓
                            predicted_risk = investigation_risk_score
                            predicted_label = 'Fraud' if risk_score >= threshold else 'Not Fraud'
```

### 3. Ground Truth Comparison

```
Transaction with predicted_label → Query IS_FRAUD_TX at window_end
                                            ↓
                                    actual_outcome = IS_FRAUD_TX value
                                            ↓
                                    Classify into TP/FP/TN/FN
                                            ↓
                                    Exclude if IS_FRAUD_TX is NULL
```

### 4. Confusion Matrix Calculation

```
Per-Entity Transactions → Count TP/FP/TN/FN
                                ↓
                        Calculate precision, recall, F1, accuracy
                                ↓
                        Create ConfusionMatrix object
                                ↓
                        Aggregate across entities
                                ↓
                        Create AggregatedConfusionMatrix
```

## Database Schema Impact

### Transaction Query (Investigation)

**CRITICAL**: Must exclude MODEL_SCORE and IS_FRAUD_TX

```sql
-- Snowflake (investigation query)
SELECT
    TX_ID_KEY,
    TX_DATETIME,
    EMAIL,
    DEVICE_ID,
    IP,
    -- ... other columns ...
    -- MODEL_SCORE EXCLUDED
    -- IS_FRAUD_TX EXCLUDED
FROM DBT.DBT_PROD.TXS
WHERE ...
```

### Ground Truth Query (Post-Investigation)

**CRITICAL**: Only queries IS_FRAUD_TX for comparison

```sql
-- Snowflake (ground truth query)
SELECT
    TX_ID_KEY,
    IS_FRAUD_TX  -- Only column needed for comparison
FROM DBT.DBT_PROD.TXS
WHERE TX_ID_KEY IN (...)
  AND TX_DATETIME <= '{investigation_window_end}'
```

## Validation Rules

### Confusion Matrix Validation

1. **Sum Check**: `TP + FP + TN + FN + excluded_count = total_transactions`
2. **Non-Negative**: All counts must be >= 0
3. **Precision Range**: `0.0 <= precision <= 1.0` (or NaN if TP + FP = 0)
4. **Recall Range**: `0.0 <= recall <= 1.0` (or NaN if TP + FN = 0)
5. **F1 Range**: `0.0 <= f1_score <= 1.0` (or NaN if precision + recall = 0)
6. **Accuracy Range**: `0.0 <= accuracy <= 1.0` (or NaN if total = 0)

### Fraud Classification Validation

1. **Predicted Label**: Must be 'Fraud' or 'Not Fraud'
2. **Predicted Risk**: Must be None or 0.0 <= risk <= 1.0
3. **Actual Outcome**: Must be None, 0, or 1
4. **Confusion Category**: Must be None, 'TP', 'FP', 'TN', or 'FN'

## Error Handling

### Missing Risk Score

```python
# Priority order for risk score extraction:
1. investigation.overall_risk_score
2. investigation.domain_findings.risk.risk_score
3. Default: None → Classify as "Not Fraud" (below threshold)
```

### NULL IS_FRAUD_TX

```python
# Transactions with NULL IS_FRAUD_TX:
- Excluded from confusion matrix counts
- Counted in excluded_count
- Not included in TP/FP/TN/FN calculations
```

### Failed Investigation

```python
# If investigation fails:
- Log warning
- Exclude entity from confusion matrix
- Continue processing remaining entities
- Include in report with status: "failed"
```

## Environment Configuration

### Required Environment Variables

```bash
# Fraud classification threshold (default: 0.3)
RISK_THRESHOLD_DEFAULT=0.3

# Enable startup analysis (required for confusion table)
AUTO_RUN_STARTUP_ANALYSIS=true

# Database provider (affects column naming)
DATABASE_PROVIDER=snowflake  # or 'postgresql'
```

## Integration Points

### Startup Analysis Flow

```python
# app/service/__init__.py
# Modify: Remove conditional check, always run for top 3
comparison_results = await run_auto_comparisons_for_top_entities(
    risk_analyzer_results=results,
    top_n=3,  # Always 3, unconditional
    reports_dir=reports_dir
)
```

### Transaction Mapping

```python
# app/service/investigation/investigation_transaction_mapper.py
# Add: Fraud classification logic
risk_threshold = float(os.getenv('RISK_THRESHOLD_DEFAULT', '0.3'))
predicted_label = 'Fraud' if investigation_risk_score >= risk_threshold else 'Not Fraud'
```

### Comparison Service

```python
# app/service/investigation/comparison_service.py
# Add: Confusion matrix calculation and aggregation
def calculate_confusion_matrix(
    transactions: List[Dict],
    risk_threshold: float
) -> ConfusionMatrix:
    # Calculate TP, FP, TN, FN
    # Return ConfusionMatrix object

def aggregate_confusion_matrices(
    matrices: List[ConfusionMatrix]
) -> AggregatedConfusionMatrix:
    # Aggregate across entities
    # Return AggregatedConfusionMatrix object
```

### Report Generator

```python
# app/service/reporting/startup_report_generator.py
# Add: Confusion table section
def _generate_confusion_table_section(
    aggregated_matrix: AggregatedConfusionMatrix
) -> str:
    # Generate HTML for confusion table
    # Include TP, FP, TN, FN, precision, recall, F1, accuracy
    # Include per-entity breakdown (collapsible)
```

