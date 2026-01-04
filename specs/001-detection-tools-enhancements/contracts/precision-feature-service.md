# Contract: PrecisionFeatureService

**Service**: PrecisionFeatureService  
**Location**: `app/service/precision_detection/feature_service.py`  
**Purpose**: Provide precision-focused features and model scores to domain agents

## Interface

### get_transaction_features(txn_id: str) -> Optional[Dict[str, Any]]

Retrieve all precision features for a transaction.

**Parameters**:
- `txn_id` (str): Transaction ID

**Returns**:
- `Optional[Dict[str, Any]]`: Dictionary with feature values or None if not found

**Raises**:
- `ValueError`: If txn_id is empty or invalid
- `DatabaseError`: If query fails

**Example**:
```python
service = PrecisionFeatureService()
features = service.get_transaction_features("txn_123")
if features:
    burst_flag = features.get("is_burst_cardtest")
    model_score = features.get("model_score")
```

### get_merchant_burst_signals(merchant_id: str, date: str) -> Optional[Dict[str, Any]]

Retrieve merchant burst signals for a specific merchant and date.

**Parameters**:
- `merchant_id` (str): Merchant ID
- `date` (str): Date in YYYY-MM-DD format

**Returns**:
- `Optional[Dict[str, Any]]`: Dictionary with burst signals or None if not found

**Raises**:
- `ValueError`: If merchant_id or date is invalid
- `DatabaseError`: If query fails

**Example**:
```python
signals = service.get_merchant_burst_signals("merchant_456", "2024-01-15")
if signals:
    is_burst = signals.get("is_burst_cardtest")
    z_unique_cards = signals.get("z_unique_cards_30d")
```

### get_model_score(txn_id: str) -> Optional[float]

Retrieve calibrated model score for a transaction.

**Parameters**:
- `txn_id` (str): Transaction ID

**Returns**:
- `Optional[float]`: Calibrated probability (0-1) or None if not found

**Raises**:
- `ValueError`: If txn_id is empty or invalid
- `DatabaseError`: If query fails

**Example**:
```python
score = service.get_model_score("txn_123")
if score is not None:
    if score > 0.5:
        print("High fraud risk")
```

## Data Contract

### Feature Dictionary Structure

```python
{
    "txn_id": str,
    "txn_ts": datetime,
    "merchant_id": str,
    "card_id": str,
    "amount": float,
    "currency": str,
    
    # Merchant burst features
    "is_burst_cardtest": bool,
    "tiny_amt_rate": float,
    "z_unique_cards_30d": float,
    
    # Peer-group features
    "z_night": float,
    "z_refund": float,
    
    # Transaction-level features
    "z_amt_card": float,
    "is_first_time_card_merchant": bool,
    "sec_since_prev_for_card": int,
    
    # Graph features
    "prior_merchants_for_card": int,
    
    # Trailing merchant features
    "refund_rate_30d_prior": float,
    "cb_rate_90d_prior": float,
    
    # Enrichment features (may be None)
    "component_fraud_rate": Optional[float],
    "shortest_path_to_fraud": Optional[int],
    "shared_card_pressure": Optional[float],
    "pagerank_score": Optional[float],
    "issuer_geo_mismatch_flag": Optional[int],
    "card_type_risk_flag": Optional[int],
    "ip_risk_score": Optional[float],
    "ip_proxy_flag": Optional[int],
    "ip_vpn_flag": Optional[int],
    "ip_tor_flag": Optional[int],
    "email_risk_score": Optional[float],
    "phone_valid_flag": Optional[int],
    "address_mismatch_flag": Optional[int],
    
    # Model score
    "model_score": Optional[float]
}
```

## Error Handling

**Missing Data**:
- Returns `None` if transaction not found (no fallback values)
- Enrichment features may be `None` if enrichment data not available
- Logs warnings for missing enrichment data

**Database Errors**:
- Raises `DatabaseError` with clear error message
- Logs error details for debugging
- Does not retry automatically (caller handles retries)

## Performance Requirements

- Single transaction lookup: <100ms
- Batch lookups: Use database connection pooling
- Cache frequently accessed features (optional, not required)

## Dependencies

- PostgreSQL connection (via SQLAlchemy)
- `mv_features_txn` materialized view
- `pg_alerts` table

## Testing Contract

**Unit Tests**:
- Test `get_transaction_features()` with valid txn_id
- Test `get_transaction_features()` with invalid txn_id (returns None)
- Test `get_merchant_burst_signals()` with valid merchant_id and date
- Test `get_model_score()` with valid txn_id
- Test error handling for database failures

**Integration Tests**:
- Test with real PostgreSQL database
- Test with materialized views populated
- Test performance requirements (<100ms)

