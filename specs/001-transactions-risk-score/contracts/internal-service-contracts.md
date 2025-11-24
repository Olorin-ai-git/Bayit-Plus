# Internal Service Contracts: Per-Transaction Risk Scoring

**Feature**: Per-Transaction Risk Scoring  
**Date**: 2025-11-17  
**Phase**: 1 - Design

## Overview

This document defines the internal service contracts for per-transaction risk scoring functionality. These contracts define the interfaces between risk agent, state management, and transaction mapper services.

## Service Contracts

### 1. Risk Agent → State Management

**Function**: `_calculate_per_transaction_scores()`  
**Location**: `app/service/agent/orchestration/domain_agents/risk_agent.py`

**Input**:
```python
{
  "facts": {
    "results": List[Dict[str, Any]]  # Transaction data from Snowflake
  },
  "domain_findings": Dict[str, Dict[str, Any]]  # Entity-level domain findings
}
```

**Output**:
```python
{
  "transaction_scores": Dict[str, float]  # {TX_ID_KEY: risk_score}
}
```

**Contract**:
- **Preconditions**:
  - `facts["results"]` contains transaction data
  - `domain_findings` contains at least one domain with risk_score
  - Transaction IDs (`TX_ID_KEY`) are valid strings
- **Postconditions**:
  - All scores in `transaction_scores` are in range [0.0, 1.0]
  - All transaction IDs are valid (non-empty strings)
  - Scores are calculated for transactions with sufficient features
- **Error Handling**:
  - Missing features: Use defaults, exclude transaction if insufficient
  - Invalid features: Normalize or exclude transaction
  - Missing domain findings: Use available findings only

### 2. State Management → Storage

**Function**: `apply_state_updates()`  
**Location**: `app/service/state_update_helper.py`

**Input**:
```python
{
  "transaction_scores": Dict[str, float]  # Per-transaction scores
}
```

**Output**: Updated `progress_json` in PostgreSQL

**Contract**:
- **Preconditions**:
  - `transaction_scores` dict is valid (all scores in [0.0, 1.0])
  - Investigation state exists in database
- **Postconditions**:
  - `progress_json["transaction_scores"]` contains scores dict
  - Scores persisted to database
  - State version incremented
- **Error Handling**:
  - Invalid scores: Reject update, log error
  - Database error: Rollback, log error

### 3. Transaction Mapper → Confusion Matrix

**Function**: `map_investigation_to_transactions()`  
**Location**: `app/service/investigation/investigation_transaction_mapper.py`

**Input**:
```python
{
  "investigation": {
    "progress_json": {
      "transaction_scores": Dict[str, float]  # Per-transaction scores
    }
  }
}
```

**Output**:
```python
[
  {
    "transaction_id": str,
    "predicted_risk": float,  # From transaction_scores[tx_id] if available
    "predicted_label": str,    # "Fraud" or "Not Fraud"
    ...
  },
  ...
]
```

**Contract**:
- **Preconditions**:
  - Investigation has `progress_json` with optional `transaction_scores`
  - Transactions queried from Snowflake
- **Postconditions**:
  - Transactions with scores in `transaction_scores` have `predicted_risk` set
  - Transactions without scores excluded (no `predicted_risk` field)
  - Excluded transactions logged with warning
- **Error Handling**:
  - Missing `transaction_scores`: Exclude all transactions, log warning
  - Missing transaction ID: Skip transaction, log warning

## Data Flow Contracts

### Score Calculation Contract

**Flow**: `facts["results"]` → `_calculate_per_transaction_scores()` → `transaction_scores` dict → `progress_json`

**Guarantees**:
- All scores calculated are in valid range [0.0, 1.0]
- Transaction IDs match `TX_ID_KEY` from `facts["results"]`
- Scores stored before investigation completion

### Score Usage Contract

**Flow**: `progress_json["transaction_scores"]` → `map_investigation_to_transactions()` → `predicted_risk` → confusion matrix

**Guarantees**:
- Transactions with scores use per-transaction score
- Transactions without scores excluded (no fallback)
- Confusion matrix only includes transactions with scores

## Error Contracts

### Score Calculation Errors

**Error**: Insufficient features for transaction  
**Behavior**: Transaction excluded from `transaction_scores` dict  
**Logging**: Warning logged with transaction ID and missing features

**Error**: Invalid feature values  
**Behavior**: Normalize if possible, exclude if not  
**Logging**: Warning logged with transaction ID and invalid features

**Error**: Missing domain findings  
**Behavior**: Use available domain findings only  
**Logging**: Info logged with available domains

### Storage Errors

**Error**: Invalid score range  
**Behavior**: Reject update, transaction excluded  
**Logging**: Error logged with transaction ID and invalid score

**Error**: Database write failure  
**Behavior**: Rollback transaction, investigation continues without per-transaction scores  
**Logging**: Error logged with investigation ID

### Usage Errors

**Error**: Missing `transaction_scores` dict  
**Behavior**: Exclude all transactions from confusion matrix  
**Logging**: Warning logged

**Error**: Missing transaction ID in scores  
**Behavior**: Exclude transaction from confusion matrix  
**Logging**: Warning logged with transaction ID

## Performance Contracts

### Score Calculation Performance
- **Target**: <5 seconds per 100 transactions
- **Batch Size**: Process transactions in batches of 100
- **Timeout**: Must complete within investigation timeout (30 minutes default)

### Storage Performance
- **Write**: Single database update for all scores (dict stored as JSON)
- **Read**: O(1) lookup for individual transaction scores
- **Size**: ~100 bytes per transaction

### Usage Performance
- **Lookup**: O(1) dict lookup per transaction
- **Filtering**: O(n) where n = number of transactions
- **Impact**: Minimal overhead on confusion matrix calculation

## Testing Contracts

### Unit Test Contracts
- **Score Calculation**: Test with various transaction feature combinations
- **Storage**: Test score validation and persistence
- **Usage**: Test transaction exclusion logic

### Integration Test Contracts
- **End-to-End**: Full flow from calculation to confusion matrix
- **Backward Compatibility**: Old investigations without scores
- **Error Handling**: Missing features, invalid scores, database errors

