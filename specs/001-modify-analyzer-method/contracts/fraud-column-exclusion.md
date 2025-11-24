# Contract: Fraud Column Exclusion

**Feature**: 001-modify-analyzer-method  
**Version**: 1.0  
**Type**: Data Access Contract

## Purpose

Defines the contract for excluding fraud-related columns from investigation queries to prevent data contamination while preserving fraud labels for post-investigation validation.

## Scope

### Applies To

- **Investigation Queries**: All Snowflake SELECT statements during investigation execution
- **Query Builder**: Any code path constructing investigation SQL queries
- **Field Collection**: Dynamic field list construction for investigations

### Does Not Apply To

- **Confusion Table Generation**: Fraud columns accessible for validation purposes
- **Analyzer Queries**: May include fraud columns in WHERE clause for filtering
- **Reporting**: Fraud columns may be queried separately for metrics

## Pattern Definition

### Exclusion Pattern

**Rule**: Exclude ANY column name containing the substring "FRAUD" (case-insensitive)

**Regex**: `r'\bFRAUD\b'` (case-insensitive word boundary match)

**Known Columns** (as of 2025-11-21):
- `IS_FRAUD_TX` - Binary fraud label (1 = fraud, 0 = not fraud)
- `FIRST_FRAUD_STATUS_DATETIME` - Timestamp of fraud status assignment

**Future-Proofing**: Pattern automatically excludes any new columns added containing "FRAUD"

## Implementation Contract

### Query Builder Interface

```python
class FraudColumnExcluder:
    """Excludes fraud-related columns from field collections"""
    
    FRAUD_PATTERN = re.compile(r'\bFRAUD\b', re.IGNORECASE)
    
    # Known fraud columns (for logging/validation)
    KNOWN_FRAUD_COLUMNS = [
        'IS_FRAUD_TX',
        'FIRST_FRAUD_STATUS_DATETIME'
    ]
    
    @classmethod
    def exclude_fraud_columns(cls, field_collection: List[str]) -> List[str]:
        """
        Exclude all fields containing 'FRAUD' from field collection.
        
        Args:
            field_collection: List of column names to filter
            
        Returns:
            Filtered list with fraud columns removed
        """
        excluded_columns = [
            field for field in field_collection
            if cls.FRAUD_PATTERN.search(field)
        ]
        
        remaining_columns = [
            field for field in field_collection
            if not cls.FRAUD_PATTERN.search(field)
        ]
        
        if excluded_columns:
            logger.info(f"🚫 Excluded {len(excluded_columns)} fraud columns from investigation query")
            logger.debug(f"🚫 Excluded columns: {', '.join(excluded_columns)}")
        
        return remaining_columns
    
    @classmethod
    def validate_no_fraud_columns(cls, query: str) -> None:
        """
        Validate that query SELECT clause contains no fraud columns.
        
        Args:
            query: SQL query string to validate
            
        Raises:
            ValueError: If fraud columns found in SELECT clause
        """
        # Extract SELECT clause
        select_match = re.search(
            r'SELECT\s+(.*?)\s+FROM',
            query,
            re.IGNORECASE | re.DOTALL
        )
        
        if not select_match:
            raise ValueError("Could not parse SELECT clause from query")
        
        select_clause = select_match.group(1)
        
        # Check for fraud columns
        fraud_matches = cls.FRAUD_PATTERN.findall(select_clause)
        if fraud_matches:
            raise ValueError(
                f"Investigation query contains fraud columns in SELECT clause: {fraud_matches}. "
                f"These must be excluded to prevent data contamination."
            )
        
        logger.info("✅ Query validation passed: No fraud columns in SELECT clause")
    
    @classmethod
    def get_fraud_columns_for_validation(cls, field_collection: List[str]) -> List[str]:
        """
        Get list of fraud columns (for separate validation queries).
        
        Args:
            field_collection: Full list of available columns
            
        Returns:
            List of fraud columns only
        """
        return [
            field for field in field_collection
            if cls.FRAUD_PATTERN.search(field)
        ]
```

## Behavioral Requirements

### Must Implement

1. **Pattern-Based Exclusion**: Use regex pattern matching, not explicit column lists
2. **Case-Insensitive**: Match "FRAUD", "fraud", "Fraud", etc.
3. **SELECT Clause Only**: Exclusion applies to SELECT clause (fraud columns may appear in WHERE for analyzer)
4. **Logging**: Log all excluded columns at INFO level
5. **Validation**: Validate no fraud columns in final query before execution

### Must Not Implement

1. **Hard-Coded Lists**: Do not use explicit lists like `['IS_FRAUD_TX', 'FIRST_FRAUD_STATUS_DATETIME']`
2. **Partial Matching**: Do not match substrings (e.g., "DEFRAUD" should not be excluded if it doesn't contain "FRAUD" as word)
3. **Silent Failures**: Do not silently exclude columns without logging
4. **Global Exclusion**: Do not exclude from confusion table queries

## Validation

### Query Validation

```python
def validate_investigation_query_fraud_exclusion(query: str) -> List[str]:
    """Validate investigation query has no fraud columns"""
    errors = []
    
    # Extract SELECT clause
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
    if not select_match:
        errors.append("Could not parse SELECT clause from query")
        return errors
    
    select_clause = select_match.group(1)
    
    # Check for fraud columns
    fraud_pattern = re.compile(r'\bFRAUD\b', re.IGNORECASE)
    fraud_matches = fraud_pattern.findall(select_clause)
    
    if fraud_matches:
        errors.append(
            f"SELECT clause contains fraud columns: {fraud_matches}. "
            f"These must be excluded from investigation queries."
        )
    
    return errors

def validate_field_collection_exclusion(
    original_fields: List[str],
    filtered_fields: List[str]
) -> List[str]:
    """Validate that fraud columns were properly excluded"""
    errors = []
    
    fraud_pattern = re.compile(r'\bFRAUD\b', re.IGNORECASE)
    
    # Check if any fraud columns remain in filtered fields
    remaining_fraud_columns = [
        field for field in filtered_fields
        if fraud_pattern.search(field)
    ]
    
    if remaining_fraud_columns:
        errors.append(
            f"Fraud columns not properly excluded: {remaining_fraud_columns}"
        )
    
    # Check if any fraud columns were in original but not filtered
    original_fraud_columns = [
        field for field in original_fields
        if fraud_pattern.search(field)
    ]
    
    if original_fraud_columns:
        logger.info(f"✅ Successfully excluded {len(original_fraud_columns)} fraud columns")
    
    return errors
```

## Testing Contract

### Unit Tests

```python
def test_fraud_column_pattern_matching():
    """Test fraud column pattern matching"""
    # Test exact matches
    assert FraudColumnExcluder.FRAUD_PATTERN.search('IS_FRAUD_TX')
    assert FraudColumnExcluder.FRAUD_PATTERN.search('FIRST_FRAUD_STATUS_DATETIME')
    
    # Test case insensitivity
    assert FraudColumnExcluder.FRAUD_PATTERN.search('is_fraud_tx')
    assert FraudColumnExcluder.FRAUD_PATTERN.search('Fraud_Status')
    
    # Test non-matches
    assert not FraudColumnExcluder.FRAUD_PATTERN.search('TX_DATETIME')
    assert not FraudColumnExcluder.FRAUD_PATTERN.search('EMAIL')
    assert not FraudColumnExcluder.FRAUD_PATTERN.search('MODEL_SCORE')

def test_fraud_column_exclusion():
    """Test fraud column exclusion from field collection"""
    field_collection = [
        'TX_ID_KEY',
        'TX_DATETIME',
        'EMAIL',
        'IS_FRAUD_TX',           # Should be excluded
        'MODEL_SCORE',
        'FIRST_FRAUD_STATUS_DATETIME',  # Should be excluded
        'DEVICE_ID'
    ]
    
    filtered = FraudColumnExcluder.exclude_fraud_columns(field_collection)
    
    # Verify fraud columns excluded
    assert 'IS_FRAUD_TX' not in filtered
    assert 'FIRST_FRAUD_STATUS_DATETIME' not in filtered
    
    # Verify other columns preserved
    assert 'TX_ID_KEY' in filtered
    assert 'EMAIL' in filtered
    assert 'MODEL_SCORE' in filtered
    
    # Verify count
    assert len(filtered) == len(field_collection) - 2

def test_query_validation():
    """Test query validation catches fraud columns"""
    # Valid query (no fraud columns)
    valid_query = """
        SELECT TX_ID_KEY, TX_DATETIME, EMAIL, MODEL_SCORE
        FROM TRANSACTIONS
        WHERE TX_DATETIME >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
    """
    
    FraudColumnExcluder.validate_no_fraud_columns(valid_query)  # Should not raise
    
    # Invalid query (contains fraud columns)
    invalid_query = """
        SELECT TX_ID_KEY, TX_DATETIME, EMAIL, IS_FRAUD_TX, MODEL_SCORE
        FROM TRANSACTIONS
        WHERE TX_DATETIME >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
    """
    
    with pytest.raises(ValueError, match="fraud columns"):
        FraudColumnExcluder.validate_no_fraud_columns(invalid_query)

def test_fraud_column_retrieval_for_validation():
    """Test retrieving fraud columns for validation queries"""
    field_collection = [
        'TX_ID_KEY',
        'EMAIL',
        'IS_FRAUD_TX',
        'FIRST_FRAUD_STATUS_DATETIME',
        'MODEL_SCORE'
    ]
    
    fraud_columns = FraudColumnExcluder.get_fraud_columns_for_validation(field_collection)
    
    assert len(fraud_columns) == 2
    assert 'IS_FRAUD_TX' in fraud_columns
    assert 'FIRST_FRAUD_STATUS_DATETIME' in fraud_columns
```

### Integration Tests

```python
async def test_investigation_excludes_fraud_columns():
    """Test investigation query excludes fraud columns"""
    # Build investigation query
    query = build_investigation_query(
        entity_type='email',
        entity_id='test@example.com',
        investigation_focus='core_fraud'  # Typically includes many columns
    )
    
    # Validate no fraud columns in SELECT
    errors = validate_investigation_query_fraud_exclusion(query)
    assert len(errors) == 0, f"Query validation failed: {errors}"
    
    # Execute query
    results = await execute_snowflake_query(query)
    
    # Verify no fraud columns in results
    if len(results) > 0:
        result_columns = list(results[0].keys())
        fraud_pattern = re.compile(r'\bFRAUD\b', re.IGNORECASE)
        fraud_in_results = [col for col in result_columns if fraud_pattern.search(col)]
        assert len(fraud_in_results) == 0, f"Results contain fraud columns: {fraud_in_results}"

async def test_confusion_table_accesses_fraud_columns():
    """Test confusion table can access fraud columns for validation"""
    # Confusion table should be able to query fraud columns separately
    fraud_query = """
        SELECT TX_ID_KEY, IS_FRAUD_TX
        FROM TRANSACTIONS
        WHERE TX_ID_KEY IN ('tx1', 'tx2', 'tx3')
    """
    
    # This query is allowed for confusion table generation
    results = await execute_snowflake_query(fraud_query)
    
    # Verify fraud columns are accessible
    assert len(results) > 0
    assert 'IS_FRAUD_TX' in results[0].keys()
```

## Usage Examples

### Investigation Query (Fraud Excluded)

```python
# Build field collection
from snowflake_tool.schema_constants import REAL_COLUMNS

# Exclude fraud columns
investigation_fields = FraudColumnExcluder.exclude_fraud_columns(REAL_COLUMNS)

# Build query with filtered fields
query = f"""
    SELECT {', '.join(investigation_fields)}
    FROM TRANSACTIONS
    WHERE TX_DATETIME >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
      AND TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP())
      AND NSURE_LAST_DECISION = 'APPROVED'
"""

# Validate before execution
FraudColumnExcluder.validate_no_fraud_columns(query)

# Execute
results = await execute_query(query)
```

### Confusion Table Query (Fraud Included)

```python
# For confusion table, query fraud columns separately
fraud_query = f"""
    SELECT TX_ID_KEY, IS_FRAUD_TX
    FROM TRANSACTIONS
    WHERE TX_ID_KEY IN ({','.join(transaction_ids)})
"""

# Fraud columns allowed for validation purposes
fraud_labels = await execute_query(fraud_query)

# Join with investigation results for confusion matrix
confusion_matrix = compute_confusion_matrix(investigation_results, fraud_labels)
```

## Versioning

**Version 1.0** (2025-11-21):
- Initial contract definition
- Pattern-based exclusion using `\bFRAUD\b`
- Known columns: IS_FRAUD_TX, FIRST_FRAUD_STATUS_DATETIME
- Applies to investigation queries only

## Breaking Changes

### From Current Implementation

**Change 1**: From explicit list to pattern-based exclusion
- **Current**: `excluded_columns = ['MODEL_SCORE', 'IS_FRAUD_TX']`
- **New**: `excluded if 'FRAUD' in column_name`
- **Impact**: Any future fraud columns automatically excluded
- **Migration**: None required (backward compatible)

**Change 2**: MODEL_SCORE no longer excluded
- **Current**: MODEL_SCORE excluded alongside IS_FRAUD_TX
- **New**: MODEL_SCORE allowed (not a fraud label)
- **Impact**: MODEL_SCORE may now appear in investigation results
- **Migration**: If MODEL_SCORE must be excluded, add separate exclusion rule

## Dependencies

- Python `re` module for regex pattern matching
- Schema constants from `snowflake_tool.schema_constants`
- Logging infrastructure
- Query execution infrastructure

