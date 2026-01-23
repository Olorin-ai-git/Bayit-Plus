# Data Model: Per-Transaction Risk Scoring

**Feature**: Per-Transaction Risk Scoring  
**Date**: 2025-11-17  
**Phase**: 1 - Design

## Overview

This document defines the data structures and models for storing and accessing per-transaction risk scores during investigations.

## Core Data Structures

### 1. Transaction Scores Dictionary

**Location**: `progress_json["transaction_scores"]`  
**Type**: `Dict[str, float]`  
**Structure**: `{TX_ID_KEY: risk_score}`

**Example**:
```json
{
  "transaction_scores": {
    "tx_123456": 0.75,
    "tx_123457": 0.42,
    "tx_123458": 0.89,
    "tx_123459": 0.31
  }
}
```

**Constraints**:
- Keys: Transaction IDs (`TX_ID_KEY` from Snowflake)
- Values: Risk scores in range [0.0, 1.0]
- All scores must be validated before storage
- Missing scores indicate transaction should be excluded from confusion matrix

### 2. Progress JSON Structure

**Location**: PostgreSQL `investigation_states.progress_json`  
**Type**: JSON (TEXT/JSONB column)

**Updated Structure**:
```json
{
  "domain_findings": {
    "network": {"risk_score": 0.5, "confidence": 0.7, ...},
    "device": {"risk_score": 0.8, "confidence": 0.7, ...},
    ...
  },
  "risk_score": 0.567,
  "overall_risk_score": 0.567,
  "transaction_scores": {
    "tx_123456": 0.75,
    "tx_123457": 0.42,
    ...
  },
  "facts": {
    "results": [...]
  },
  ...
}
```

**Key Points**:
- `transaction_scores` is a new top-level key in `progress_json`
- Stored alongside existing `risk_score` and `overall_risk_score`
- Both entity-level and per-transaction scores coexist
- Entity-level scores remain for backward compatibility

### 3. Transaction Feature Model

**Source**: `facts["results"]` (transaction data from Snowflake)  
**Type**: `List[Dict[str, Any]]`

**Key Fields Used for Per-Transaction Scoring**:
```python
{
  "TX_ID_KEY": str,                    # Transaction identifier (required)
  "PAID_AMOUNT_VALUE_IN_CURRENCY": float,  # Transaction amount
  "MERCHANT_NAME": str,                # Merchant identifier
  "DEVICE_ID": str,                    # Device identifier
  "IP_COUNTRY_CODE": str,              # Country code
  "PAYMENT_METHOD": str,               # Payment method type
  "TX_DATETIME": str,                  # Transaction timestamp
  "CARD_BRAND": str,                   # Card brand
  "BIN": str,                          # Bank Identification Number
  "LAST_FOUR": str,                    # Last 4 digits of card
  "USER_AGENT": str,                   # User agent string
  "DEVICE_TYPE": str,                  # Device type
  "DEVICE_MODEL": str,                 # Device model
  "IS_USER_FIRST_TX_ATTEMPT": bool,    # First transaction flag
  "IS_RECURRING_USER": bool,           # Recurring user flag
  ...
}
```

**Excluded Fields** (MUST NOT be used):
- `MODEL_SCORE`: nSure scoring (excluded per FR-005)
- `NSURE_LAST_DECISION`: Decision field (excluded per FR-005, only Approved transactions considered)

### 4. Domain Findings Model

**Location**: `progress_json["domain_findings"]`  
**Type**: `Dict[str, Dict[str, Any]]`

**Structure**:
```python
{
  "network": {
    "risk_score": float,      # Entity-level network risk (0.0-1.0)
    "confidence": float,      # Confidence in network analysis
    "evidence": List[str],    # Evidence items
    ...
  },
  "device": {
    "risk_score": float,      # Entity-level device risk (0.0-1.0)
    "confidence": float,
    "evidence": List[str],
    ...
  },
  "location": {
    "risk_score": float,      # Entity-level location risk (0.0-1.0)
    "confidence": float,
    "evidence": List[str],
    ...
  },
  "logs": {
    "risk_score": float,      # Entity-level logs risk (0.0-1.0)
    "confidence": float,
    "evidence": List[str],
    ...
  },
  "authentication": {
    "risk_score": float,      # Entity-level auth risk (0.0-1.0)
    "confidence": float,
    "evidence": List[str],
    ...
  },
  "merchant": {
    "risk_score": float,      # Entity-level merchant risk (0.0-1.0)
    "confidence": float,
    "evidence": List[str],
    ...
  }
}
```

**Usage**: Domain findings provide entity-level risk context for per-transaction scoring

## Data Flow

### 1. Score Calculation Flow

```
facts["results"] (transactions)
    ↓
Extract transaction features
    ↓
Map to domain findings (merchant → merchant domain, device → device domain, etc.)
    ↓
Calculate per-transaction score using features + domain findings
    ↓
Validate score in range [0.0, 1.0]
    ↓
Store in transaction_scores dict
    ↓
Update progress_json via state_update_helper
```

### 2. Score Usage Flow

```
Investigation completed with transaction_scores
    ↓
map_investigation_to_transactions() called
    ↓
For each transaction:
    - Check if tx_id in transaction_scores
    - If yes: use transaction_scores[tx_id] as predicted_risk
    - If no: exclude transaction (skip, log warning)
    ↓
Confusion matrix calculation uses predicted_risk values
    ↓
Missing transactions excluded (no predicted_risk = excluded)
```

## Validation Rules

### Score Validation
- **Range**: [0.0, 1.0] (inclusive)
- **Type**: float
- **Required**: All stored scores must pass validation
- **Invalid Scores**: Transactions with invalid scores excluded from storage

### Transaction ID Validation
- **Format**: String (matches `TX_ID_KEY` from Snowflake)
- **Required**: Must exist for all transactions
- **Missing ID**: Transaction excluded from scoring

### Feature Validation
- **Missing Features**: Use default values (0.0 for amounts, "UNKNOWN" for strings)
- **Invalid Features**: Normalize or exclude transaction if too many critical features missing
- **Critical Features**: Amount, Merchant, Device, Location (at least 2 required for scoring)

## Storage Considerations

### PostgreSQL Storage
- **Table**: `investigation_states`
- **Column**: `progress_json` (TEXT/JSONB)
- **Size**: ~100 bytes per transaction (TX_ID_KEY + float)
- **1000 transactions**: ~100KB additional storage per investigation

### Performance
- **Lookup**: O(1) dict lookup for transaction scores
- **Storage**: Efficient dict structure, no additional queries needed
- **Memory**: Minimal overhead, scores stored in existing JSON structure

## Backward Compatibility

### Old Investigations (No transaction_scores)
- **Behavior**: `transaction_scores` key missing from `progress_json`
- **Handling**: All transactions excluded from confusion matrix (empty matrix)
- **Logging**: Warning logged that per-transaction scores not available

### Migration
- **No Migration Needed**: Old investigations remain unchanged
- **New Investigations**: Automatically include `transaction_scores` if calculation succeeds
- **Partial Scores**: If some transactions have scores and others don't, only transactions with scores included

## Edge Cases

### Missing transaction_scores Dict
- **Detection**: `progress_json.get("transaction_scores")` returns `None`
- **Behavior**: Exclude all transactions from confusion matrix
- **Logging**: Warning logged

### Partial Scores
- **Detection**: Some transactions have scores, others don't
- **Behavior**: Only transactions with scores included in confusion matrix
- **Logging**: Warning logged for excluded transactions

### Invalid Scores
- **Detection**: Score outside [0.0, 1.0] range
- **Behavior**: Score not stored, transaction excluded
- **Logging**: Error logged with transaction ID

### Missing Transaction Features
- **Detection**: Critical features missing (amount, merchant, device, location)
- **Behavior**: Use defaults if sufficient features available, exclude if too many missing
- **Logging**: Warning logged for missing features

