# Contract: Investigation Time Range

**Feature**: 001-modify-analyzer-method  
**Version**: 1.0  
**Type**: Configuration Contract

## Purpose

Defines the contract for investigation time range configuration, ensuring consistent historical data retrieval for fraud investigations without fraud label contamination.

## Configuration Interface

### Input Parameters (.env)

```bash
INVESTIGATION_DEFAULT_RANGE_YEARS=2      # Required, int, >0, default: 2
INVESTIGATION_START_OFFSET_YEARS=2.5     # Required, float, >0, default: 2.5
INVESTIGATION_END_OFFSET_MONTHS=6        # Required, int, >=0, default: 6
```

### Configuration Class

```python
@dataclass
class InvestigationTimeRange:
    """Investigation time range configuration"""
    range_years: int               # Intended span of investigation (informational)
    start_offset_years: float      # Years to offset start point from today
    end_offset_months: int         # Months to offset end point from today
    
    def get_start_timestamp_sql(self) -> str:
        """Generate SQL for range start timestamp"""
        return f"DATEADD(year, -{self.start_offset_years}, CURRENT_TIMESTAMP())"
    
    def get_end_timestamp_sql(self) -> str:
        """Generate SQL for range end timestamp"""
        return f"DATEADD(month, -{self.end_offset_months}, CURRENT_TIMESTAMP())"
    
    def get_actual_range_years(self) -> float:
        """Calculate actual range in years"""
        return self.start_offset_years - (self.end_offset_months / 12.0)
    
    def validate(self) -> None:
        """Validate configuration parameters"""
        if self.range_years <= 0:
            raise ValueError(f"range_years must be > 0, got {self.range_years}")
        if self.start_offset_years <= 0:
            raise ValueError(f"start_offset_years must be > 0, got {self.start_offset_years}")
        if self.end_offset_months < 0:
            raise ValueError(f"end_offset_months must be >= 0, got {self.end_offset_months}")
        if self.start_offset_years <= (self.end_offset_months / 12.0):
            raise ValueError(f"Start ({self.start_offset_years}y) must be > End ({self.end_offset_months}mo / 12)")
        
        # Warn if computed range differs from configured range
        actual_range = self.get_actual_range_years()
        if abs(actual_range - self.range_years) > (1.0 / 12.0):  # 1 month tolerance
            import logging
            logging.warning(
                f"Configured range ({self.range_years}y) differs from computed range ({actual_range:.2f}y)"
            )
```

## Query Contract

### SQL Pattern

```sql
-- Required WHERE clause structure
WHERE TX_DATETIME >= {start_timestamp}
  AND TX_DATETIME < {end_timestamp}
  AND NSURE_LAST_DECISION = 'APPROVED'
  AND NSURE_LAST_DECISION IS NOT NULL

-- Where:
-- start_timestamp = DATEADD(year, -{start_offset_years}, CURRENT_TIMESTAMP())
-- end_timestamp = DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())
```

### Example (Default Configuration)

```sql
-- With INVESTIGATION_START_OFFSET_YEARS=2.5, INVESTIGATION_END_OFFSET_MONTHS=6
WHERE TX_DATETIME >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
  AND TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP())
  AND NSURE_LAST_DECISION = 'APPROVED'
  AND NSURE_LAST_DECISION IS NOT NULL
  
-- Time range: [Today - 2.5 years] to [Today - 6 months] = 2 year span
```

## Behavioral Requirements

### Must Implement

1. **Explicit Boundaries**: Both start and end timestamps must be explicit in WHERE clause
2. **Approved Filter**: Must include `NSURE_LAST_DECISION = 'APPROVED' AND IS NOT NULL`
3. **Database Timezone**: Use database server's `CURRENT_TIMESTAMP()` (no application timezone conversion)
4. **Fraud Column Exclusion**: SELECT clause must NOT contain ANY columns matching `*FRAUD*` pattern
5. **Consistency Check**: End offset must match analyzer end offset

### Must Not Implement

1. **Fraud columns in SELECT**: Do not include IS_FRAUD_TX, FIRST_FRAUD_STATUS_DATETIME, or any column containing "FRAUD"
2. **Implicit boundaries**: Do not rely on `TX_DATETIME >=` without corresponding `<` clause
3. **NULL approval**: Do not include transactions with `NSURE_LAST_DECISION IS NULL`
4. **Timezone conversion**: Do not use `CONVERT_TIMEZONE()` or similar functions

## Validation

### Configuration Validation

```python
def validate_investigation_config(config: InvestigationTimeRange) -> List[str]:
    """Validate investigation configuration"""
    errors = []
    
    if config.range_years <= 0:
        errors.append(f"range_years must be positive, got {config.range_years}")
    
    if config.start_offset_years <= 0:
        errors.append(f"start_offset_years must be positive, got {config.start_offset_years}")
    
    if config.end_offset_months < 0:
        errors.append(f"end_offset_months cannot be negative, got {config.end_offset_months}")
    
    # Check start > end
    if config.start_offset_years <= (config.end_offset_months / 12.0):
        errors.append(
            f"Start offset ({config.start_offset_years}y) must be greater than "
            f"end offset ({config.end_offset_months}mo = {config.end_offset_months/12.0:.2f}y)"
        )
    
    # Check computed range
    actual_range = config.get_actual_range_years()
    if abs(actual_range - config.range_years) > 0.1:  # 1.2 month tolerance
        errors.append(
            f"Computed range ({actual_range:.2f}y) differs significantly from "
            f"configured range ({config.range_years}y)"
        )
    
    return errors

def validate_consistency_with_analyzer(
    investigation_config: InvestigationTimeRange,
    analyzer_config: 'AnalyzerTimeWindow'
) -> List[str]:
    """Validate investigation config is consistent with analyzer config"""
    errors = []
    
    if investigation_config.end_offset_months != analyzer_config.end_offset_months:
        errors.append(
            f"Investigation end offset ({investigation_config.end_offset_months}mo) "
            f"must match analyzer end offset ({analyzer_config.end_offset_months}mo)"
        )
    
    return errors
```

### Query Validation

```python
def validate_investigation_query(query: str, config: InvestigationTimeRange) -> List[str]:
    """Validate generated investigation query"""
    errors = []
    
    # Check for explicit start boundary
    if f"DATEADD(year, -{config.start_offset_years}" not in query:
        errors.append(f"Missing explicit year offset in start boundary ({config.start_offset_years}y)")
    
    # Check for explicit end boundary
    if f"TX_DATETIME <" not in query:
        errors.append("Missing explicit end boundary (TX_DATETIME <)")
    
    # Check for approval filter
    if "NSURE_LAST_DECISION = 'APPROVED'" not in query:
        errors.append("Missing approval filter (NSURE_LAST_DECISION = 'APPROVED')")
    
    # Check for NULL exclusion
    if "NSURE_LAST_DECISION IS NOT NULL" not in query:
        errors.append("Missing NULL exclusion for NSURE_LAST_DECISION")
    
    # Check for fraud columns in SELECT (case-insensitive)
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
    if select_match:
        select_clause = select_match.group(1)
        if re.search(r'\bFRAUD\b', select_clause, re.IGNORECASE):
            errors.append(f"SELECT clause contains fraud columns: {select_clause}")
    
    return errors
```

## Testing Contract

### Unit Tests

```python
def test_investigation_time_range_config():
    """Test configuration loading and validation"""
    # Test valid configuration
    config = InvestigationTimeRange(
        range_years=2,
        start_offset_years=2.5,
        end_offset_months=6
    )
    config.validate()  # Should not raise
    
    # Test computed range
    assert config.get_actual_range_years() == 2.0  # 2.5 - 0.5
    
    # Test SQL generation
    assert config.get_start_timestamp_sql() == "DATEADD(year, -2.5, CURRENT_TIMESTAMP())"
    assert config.get_end_timestamp_sql() == "DATEADD(month, -6, CURRENT_TIMESTAMP())"
    
    # Test invalid configuration (start <= end)
    with pytest.raises(ValueError):
        InvestigationTimeRange(
            range_years=2,
            start_offset_years=0.4,  # 0.4y < 0.5y (6mo)
            end_offset_months=6
        ).validate()

def test_investigation_query_generation():
    """Test query generation with configuration"""
    config = InvestigationTimeRange(
        range_years=2,
        start_offset_years=2.5,
        end_offset_months=6
    )
    
    # Generate query (implementation-specific)
    query = build_investigation_query(config, entity_type='email', entity_id='test@example.com')
    
    # Validate query contains required elements
    assert "TX_DATETIME >=" in query
    assert "TX_DATETIME <" in query
    assert "DATEADD(year, -2.5" in query
    assert "DATEADD(month, -6" in query
    assert "NSURE_LAST_DECISION = 'APPROVED'" in query
    assert "NSURE_LAST_DECISION IS NOT NULL" in query
    
    # Validate no fraud columns in SELECT
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
    assert select_match
    select_clause = select_match.group(1)
    assert 'FRAUD' not in select_clause.upper()

def test_consistency_with_analyzer():
    """Test investigation config is consistent with analyzer config"""
    from analyzer_time_window import AnalyzerTimeWindow
    
    analyzer_config = AnalyzerTimeWindow(window_hours=24, end_offset_months=6, exclude_fraud=True)
    investigation_config = InvestigationTimeRange(range_years=2, start_offset_years=2.5, end_offset_months=6)
    
    errors = validate_consistency_with_analyzer(investigation_config, analyzer_config)
    assert len(errors) == 0  # Should be consistent
    
    # Test inconsistent config
    bad_investigation_config = InvestigationTimeRange(range_years=2, start_offset_years=2.5, end_offset_months=3)
    errors = validate_consistency_with_analyzer(bad_investigation_config, analyzer_config)
    assert len(errors) > 0  # Should have error
```

### Integration Tests

```python
async def test_investigation_time_range_execution():
    """Test investigation with real Snowflake query"""
    config = InvestigationTimeRange(
        range_years=2,
        start_offset_years=2.5,
        end_offset_months=6
    )
    
    # Execute query
    results = await query_snowflake_for_investigation(
        entity_type='email',
        entity_id='test@example.com',
        time_range=config
    )
    
    # Verify results contain expected time range
    assert all(
        is_within_range(tx['TX_DATETIME'], config)
        for tx in results
    )
    
    # Verify all transactions are approved
    assert all(
        tx.get('NSURE_LAST_DECISION') == 'APPROVED'
        for tx in results
    )
    
    # Verify no fraud columns in results
    if len(results) > 0:
        fraud_columns = [key for key in results[0].keys() if 'FRAUD' in key.upper()]
        assert len(fraud_columns) == 0, f"Found fraud columns in results: {fraud_columns}"
```

## Versioning

**Version 1.0** (2025-11-21):
- Initial contract definition
- Supports configurable time range years
- Supports configurable start/end offsets
- Enforces fraud column exclusion
- Enforces approved transaction filter

## Breaking Changes

### From Current Implementation

**Change 1**: Time range now configurable and offset from today
- **Impact**: Investigation queries will use different time ranges
- **Migration**: Update .env to match current behavior if needed

**Change 2**: End offset must match analyzer end offset
- **Impact**: Investigations and analyzer must be temporally consistent
- **Migration**: Automatic, enforced by validation

**Change 3**: Fraud columns excluded from SELECT
- **Impact**: Investigation results will not contain fraud columns
- **Migration**: Access fraud columns separately for confusion table generation

**Change 4**: Strict NULL exclusion for approval status
- **Impact**: Transactions with NULL NSURE_LAST_DECISION excluded
- **Migration**: No migration needed, improves data quality

## Dependencies

- Snowflake `DATEADD()` function
- Snowflake `CURRENT_TIMESTAMP()` function
- `TX_DATETIME` column existence
- `NSURE_LAST_DECISION` column existence
- Analyzer time window configuration (for consistency validation)

