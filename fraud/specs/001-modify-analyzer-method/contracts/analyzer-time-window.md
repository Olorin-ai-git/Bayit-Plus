# Contract: Analyzer Time Window

**Feature**: 001-modify-analyzer-method  
**Version**: 1.0  
**Type**: Configuration Contract

## Purpose

Defines the contract for analyzer time window configuration, ensuring consistent time range calculations across analyzer queries.

## Configuration Interface

### Input Parameters (.env)

```bash
ANALYZER_TIME_WINDOW_HOURS=24        # Required, int, >0, default: 24
ANALYZER_END_OFFSET_MONTHS=6         # Required, int, >=0, default: 6
ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true  # Required, bool, default: true
```

### Configuration Class

```python
@dataclass
class AnalyzerTimeWindow:
    """Analyzer time window configuration"""
    window_hours: int              # Hours to look back from end point
    end_offset_months: int         # Months to offset end point from today
    exclude_fraud: bool            # Whether to exclude fraud transactions
    
    def get_start_timestamp_sql(self) -> str:
        """Generate SQL for window start timestamp"""
        return f"DATEADD(hour, -{self.window_hours}, DATEADD(month, -{self.end_offset_months}, CURRENT_TIMESTAMP()))"
    
    def get_end_timestamp_sql(self) -> str:
        """Generate SQL for window end timestamp"""
        return f"DATEADD(month, -{self.end_offset_months}, CURRENT_TIMESTAMP())"
    
    def validate(self) -> None:
        """Validate configuration parameters"""
        if self.window_hours <= 0:
            raise ValueError(f"window_hours must be > 0, got {self.window_hours}")
        if self.end_offset_months < 0:
            raise ValueError(f"end_offset_months must be >= 0, got {self.end_offset_months}")
```

## Query Contract

### SQL Pattern

```sql
-- Required WHERE clause structure
WHERE TX_DATETIME >= {start_timestamp}
  AND TX_DATETIME < {end_timestamp}
  AND {group_by} IS NOT NULL
  AND {fraud_exclusion_filter}  -- Optional, based on exclude_fraud flag

-- Where:
-- start_timestamp = DATEADD(hour, -{window_hours}, DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP()))
-- end_timestamp = DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())
-- fraud_exclusion_filter = (IS_FRAUD_TX IS NULL OR IS_FRAUD_TX = 0) if exclude_fraud else empty
```

### Example (Default Configuration)

```sql
-- With ANALYZER_TIME_WINDOW_HOURS=24, ANALYZER_END_OFFSET_MONTHS=6
WHERE TX_DATETIME >= DATEADD(hour, -24, DATEADD(month, -6, CURRENT_TIMESTAMP()))
  AND TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP())
  AND EMAIL IS NOT NULL
  AND (IS_FRAUD_TX IS NULL OR IS_FRAUD_TX = 0)
```

## Behavioral Requirements

### Must Implement

1. **Explicit Boundaries**: Both start and end timestamps must be explicit in WHERE clause
2. **Nested Date Operations**: Start timestamp must nest hour offset within month offset
3. **Database Timezone**: Use database server's `CURRENT_TIMESTAMP()` (no application timezone conversion)
4. **Fraud Exclusion**: When enabled, exclude transactions where `IS_FRAUD_TX = 1`
5. **NULL Handling**: Allow `IS_FRAUD_TX IS NULL` (treat as non-fraud)

### Must Not Implement

1. **Application-level date calculations**: Do not calculate dates in Python and pass as parameters
2. **Implicit end boundaries**: Do not rely on `TX_DATETIME >=` without corresponding `<` clause
3. **Time zone conversion**: Do not use `CONVERT_TIMEZONE()` or similar functions
4. **Hard-coded values**: Do not hard-code window hours or offset months

## Validation

### Configuration Validation

```python
def validate_analyzer_config(config: AnalyzerTimeWindow) -> List[str]:
    """Validate analyzer configuration"""
    errors = []
    
    if config.window_hours <= 0:
        errors.append(f"window_hours must be positive, got {config.window_hours}")
    
    if config.window_hours > 8760:  # 365 days
        errors.append(f"window_hours exceeds 1 year ({config.window_hours}h)")
    
    if config.end_offset_months < 0:
        errors.append(f"end_offset_months cannot be negative, got {config.end_offset_months}")
    
    if config.end_offset_months > 120:  # 10 years
        errors.append(f"end_offset_months exceeds 10 years ({config.end_offset_months}mo)")
    
    return errors
```

### Query Validation

```python
def validate_analyzer_query(query: str, config: AnalyzerTimeWindow) -> List[str]:
    """Validate generated analyzer query"""
    errors = []
    
    # Check for explicit start boundary
    if f"DATEADD(hour, -{config.window_hours}" not in query:
        errors.append("Missing explicit hour offset in start boundary")
    
    # Check for explicit end boundary
    if f"TX_DATETIME <" not in query:
        errors.append("Missing explicit end boundary (TX_DATETIME <)")
    
    # Check for fraud exclusion when enabled
    if config.exclude_fraud and "IS_FRAUD_TX" not in query:
        errors.append("Fraud exclusion enabled but IS_FRAUD_TX not in WHERE clause")
    
    # Check for timezone conversion (should not exist)
    if "CONVERT_TIMEZONE" in query.upper():
        errors.append("Query contains timezone conversion (not allowed)")
    
    return errors
```

## Testing Contract

### Unit Tests

```python
def test_analyzer_time_window_config():
    """Test configuration loading and validation"""
    # Test valid configuration
    config = AnalyzerTimeWindow(window_hours=24, end_offset_months=6, exclude_fraud=True)
    config.validate()  # Should not raise
    
    # Test start timestamp SQL
    assert config.get_start_timestamp_sql() == "DATEADD(hour, -24, DATEADD(month, -6, CURRENT_TIMESTAMP()))"
    
    # Test end timestamp SQL
    assert config.get_end_timestamp_sql() == "DATEADD(month, -6, CURRENT_TIMESTAMP())"
    
    # Test invalid configuration
    with pytest.raises(ValueError):
        AnalyzerTimeWindow(window_hours=0, end_offset_months=6, exclude_fraud=True).validate()

def test_analyzer_query_generation():
    """Test query generation with configuration"""
    config = AnalyzerTimeWindow(window_hours=24, end_offset_months=6, exclude_fraud=True)
    
    # Generate query (implementation-specific)
    query = build_analyzer_query(config, group_by='EMAIL')
    
    # Validate query contains required elements
    assert "TX_DATETIME >=" in query
    assert "TX_DATETIME <" in query
    assert "DATEADD(hour, -24" in query
    assert "DATEADD(month, -6" in query
    assert "IS_FRAUD_TX IS NULL OR IS_FRAUD_TX = 0" in query
```

### Integration Tests

```python
async def test_analyzer_time_window_execution():
    """Test analyzer with real Snowflake query"""
    config = AnalyzerTimeWindow(window_hours=24, end_offset_months=6, exclude_fraud=True)
    
    # Execute query
    results = await get_top_risk_entities(
        time_window_hours=config.window_hours,
        # ... other params
    )
    
    # Verify results contain expected time range
    assert all(
        is_within_window(tx['TX_DATETIME'], config)
        for tx in results
    )
    
    # Verify no fraud transactions when exclusion enabled
    if config.exclude_fraud:
        assert all(
            tx.get('fraud_count', 0) == 0  # Fraud count in aggregation
            for tx in results
        )
```

## Versioning

**Version 1.0** (2025-11-21):
- Initial contract definition
- Supports configurable time window hours
- Supports configurable end offset
- Supports fraud transaction exclusion

## Breaking Changes

### From Current Implementation

**Change 1**: Time window now ends at offset months instead of today
- **Impact**: All analyzer queries will return different time ranges
- **Migration**: Update .env to set `ANALYZER_END_OFFSET_MONTHS=0` to maintain current behavior (not recommended)

**Change 2**: Explicit end boundary required
- **Impact**: Queries must include `TX_DATETIME <` clause
- **Migration**: Automatic, no action required

**Change 3**: Fraud exclusion filter added
- **Impact**: Results may exclude transactions that were previously included
- **Migration**: Set `ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=false` to disable

## Dependencies

- Snowflake `DATEADD()` function
- Snowflake `CURRENT_TIMESTAMP()` function
- `TX_DATETIME` column existence
- `IS_FRAUD_TX` column existence (if fraud exclusion enabled)

