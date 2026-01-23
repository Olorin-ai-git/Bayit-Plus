# Data Model: Analyzer Time Window and Investigation Range Modifications

**Feature**: 001-modify-analyzer-method  
**Date**: 2025-11-21  
**Phase**: 1 - Design

## Overview

This feature modifies existing data access patterns without introducing new data models. All changes affect query construction and filtering logic for existing Snowflake transactions table.

---

## Entities

### Existing Entities (No Changes)

#### Transaction
**Source**: Snowflake `TRANSACTIONS` table  
**Access Pattern**: Read-only via SQL queries

**Core Attributes** (unchanged):
- `TX_ID_KEY`: Unique transaction identifier
- `TX_DATETIME`: Transaction timestamp (used for time range filtering)
- `NSURE_LAST_DECISION`: Approval status ('APPROVED', 'DECLINED', 'PENDING')
- `EMAIL`, `DEVICE_ID`, `IP`: Entity identifiers for grouping
- `PAID_AMOUNT_VALUE_IN_CURRENCY`: Transaction amount
- `MODEL_SCORE`: Risk score (0-1)

**Fraud Attributes** (accessed only in confusion table):
- `IS_FRAUD_TX`: Fraud label (1 = fraud, 0 = not fraud, NULL = unknown)
- `FIRST_FRAUD_STATUS_DATETIME`: Timestamp of fraud status

**Constraints**:
- `TX_DATETIME` must not be NULL for time-based filtering
- `NSURE_LAST_DECISION` must be 'APPROVED' for investigations
- Fraud columns excluded from investigation queries

---

#### Risk Entity
**Source**: Computed from Transaction aggregation  
**Lifecycle**: Ephemeral (query result, not persisted)

**Attributes** (unchanged):
- `entity`: Entity identifier (email, device_id, or IP)
- `transaction_count`: Number of transactions
- `total_amount`: Sum of transaction amounts
- `avg_risk_score`: Average MODEL_SCORE
- `risk_weighted_value`: Sum(MODEL_SCORE × AMOUNT)
- `max_risk_score`: Maximum MODEL_SCORE
- `fraud_count`: Count of fraud transactions (for analysis only)
- `risk_rank`: Row number ordered by risk_weighted_value DESC
- `total_entities`: Total count of entities in window

**Computation** (unchanged):
```sql
risk_weighted_value = SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY)
risk_rank = ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC)
top_10_percent = WHERE risk_rank <= CEIL(total_entities * 0.10)
```

---

#### Confusion Matrix Entry
**Source**: Computed from investigation results vs fraud labels  
**Lifecycle**: Generated post-investigation for validation

**Attributes** (unchanged):
- `transaction_id`: Transaction identifier
- `predicted_risk`: Risk score from investigation
- `predicted_label`: Binary classification (1 if predicted_risk >= threshold else 0)
- `actual_outcome`: Mapped from IS_FRAUD_TX (1 = fraud, 0 = not fraud)
- `classification`: TP, FP, TN, or FN

**Computation** (unchanged):
```python
predicted_label = 1 if predicted_risk >= risk_threshold else 0
classification = {
    (1, 1): "TP",  # predicted fraud, actual fraud
    (1, 0): "FP",  # predicted fraud, actual not fraud
    (0, 0): "TN",  # predicted not fraud, actual not fraud
    (0, 1): "FN",  # predicted not fraud, actual fraud
}[(predicted_label, is_fraud)]
```

---

## Time Window Configurations

### New Configuration Models

#### AnalyzerTimeWindow
**Source**: Configuration (.env)  
**Purpose**: Define analyzer query time boundaries

**Attributes**:
```python
class AnalyzerTimeWindow:
    window_hours: int              # Default: 24
    end_offset_months: int         # Default: 6 (months back from today)
    exclude_fraud: bool            # Default: true
    
    @property
    def start_timestamp(self) -> str:
        """DATEADD(hour, -{window_hours}, DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP()))"""
        return f"DATEADD(hour, -{self.window_hours}, DATEADD(month, -{self.end_offset_months}, CURRENT_TIMESTAMP()))"
    
    @property
    def end_timestamp(self) -> str:
        """DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())"""
        return f"DATEADD(month, -{self.end_offset_months}, CURRENT_TIMESTAMP())"
```

**Validation**:
- `window_hours` must be > 0
- `end_offset_months` must be >= 0
- Window must not be empty (start < end)

---

#### InvestigationTimeRange
**Source**: Configuration (.env)  
**Purpose**: Define investigation query time boundaries

**Attributes**:
```python
class InvestigationTimeRange:
    range_years: int               # Default: 2 (span of investigation)
    start_offset_years: float      # Default: 2.5 (years back from today)
    end_offset_months: int         # Default: 6 (months back from today)
    
    @property
    def start_timestamp(self) -> str:
        """DATEADD(year, -{start_offset_years}, CURRENT_TIMESTAMP())"""
        return f"DATEADD(year, -{self.start_offset_years}, CURRENT_TIMESTAMP())"
    
    @property
    def end_timestamp(self) -> str:
        """DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())"""
        return f"DATEADD(month, -{self.end_offset_months}, CURRENT_TIMESTAMP())"
    
    @property
    def actual_range_years(self) -> float:
        """Computed: start_offset_years - (end_offset_months / 12)"""
        return self.start_offset_years - (self.end_offset_months / 12.0)
```

**Validation**:
- `range_years` must be > 0
- `start_offset_years` must be > `end_offset_months / 12`
- Computed range should match configured range (tolerance: ±1 month)
- End timestamp should match analyzer end timestamp (consistency check)

---

## Query Filtering Patterns

### Analyzer Query Filter

**Current Pattern**:
```sql
WHERE TX_DATETIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
  AND {group_by} IS NOT NULL
```

**New Pattern**:
```sql
WHERE TX_DATETIME >= DATEADD(hour, -{window_hours}, DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP()))
  AND TX_DATETIME < DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())
  AND {group_by} IS NOT NULL
  AND (
    -- Conditional: Only if ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true
    IS_FRAUD_TX IS NULL OR IS_FRAUD_TX = 0
  )
```

**Changes**:
1. Added nested `DATEADD` for end offset
2. Added explicit upper bound (`TX_DATETIME <`)
3. Added fraud exclusion filter (conditional)

---

### Investigation Query Filter

**Current Pattern**:
```sql
WHERE TX_DATETIME >= [dynamic start]
  AND TX_DATETIME < [dynamic end]
  AND NSURE_LAST_DECISION = 'APPROVED'
```

**New Pattern**:
```sql
WHERE TX_DATETIME >= DATEADD(year, -{start_offset_years}, CURRENT_TIMESTAMP())
  AND TX_DATETIME < DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())
  AND NSURE_LAST_DECISION = 'APPROVED'
  AND NSURE_LAST_DECISION IS NOT NULL
```

**Changes**:
1. Explicit start offset (2.5 years)
2. Explicit end offset (6 months, matching analyzer)
3. Added NULL check for approval status

---

### Column Exclusion Pattern

**Current Pattern**:
```python
excluded_columns_upper = ['MODEL_SCORE', 'IS_FRAUD_TX']
field_collection = [
    field for field in field_collection
    if field.upper() not in excluded_columns_upper
]
```

**New Pattern**:
```python
# Pattern-based exclusion
excluded_columns_upper = [
    field for field in field_collection
    if 'FRAUD' in field.upper()
]

# Explicit known columns (for logging/validation)
KNOWN_FRAUD_COLUMNS = ['IS_FRAUD_TX', 'FIRST_FRAUD_STATUS_DATETIME']

# Filter field collection
field_collection = [
    field for field in field_collection
    if 'FRAUD' not in field.upper()
]

# Log excluded columns
logger.info(f"🚫 Excluded fraud columns: {excluded_columns_upper}")
```

**Changes**:
1. From explicit list to pattern matching
2. Added known columns list for validation
3. Case-insensitive matching
4. Enhanced logging

---

## Configuration Schema

### .env Parameters

```bash
# Analyzer Configuration
ANALYZER_TIME_WINDOW_HOURS=24                    # int, hours, >0
ANALYZER_END_OFFSET_MONTHS=6                     # int, months, >=0
ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true         # bool

# Investigation Configuration
INVESTIGATION_DEFAULT_RANGE_YEARS=2              # int, years, >0
INVESTIGATION_START_OFFSET_YEARS=2.5             # float, years, >0
INVESTIGATION_END_OFFSET_MONTHS=6                # int, months, >=0

# Risk Threshold
RISK_THRESHOLD_DEFAULT=0.5                       # float, 0-1
```

### Configuration Loading

```python
class AnalyzerConfig:
    """Analyzer time window configuration"""
    
    @staticmethod
    def load_from_env() -> AnalyzerTimeWindow:
        return AnalyzerTimeWindow(
            window_hours=int(os.getenv('ANALYZER_TIME_WINDOW_HOURS', '24')),
            end_offset_months=int(os.getenv('ANALYZER_END_OFFSET_MONTHS', '6')),
            exclude_fraud=os.getenv('ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS', 'true').lower() == 'true'
        )
    
    @staticmethod
    def validate(config: AnalyzerTimeWindow) -> None:
        if config.window_hours <= 0:
            raise ValueError(f"ANALYZER_TIME_WINDOW_HOURS must be > 0, got {config.window_hours}")
        if config.end_offset_months < 0:
            raise ValueError(f"ANALYZER_END_OFFSET_MONTHS must be >= 0, got {config.end_offset_months}")

class InvestigationConfig:
    """Investigation time range configuration"""
    
    @staticmethod
    def load_from_env() -> InvestigationTimeRange:
        return InvestigationTimeRange(
            range_years=int(os.getenv('INVESTIGATION_DEFAULT_RANGE_YEARS', '2')),
            start_offset_years=float(os.getenv('INVESTIGATION_START_OFFSET_YEARS', '2.5')),
            end_offset_months=int(os.getenv('INVESTIGATION_END_OFFSET_MONTHS', '6'))
        )
    
    @staticmethod
    def validate(config: InvestigationTimeRange) -> None:
        if config.range_years <= 0:
            raise ValueError(f"INVESTIGATION_DEFAULT_RANGE_YEARS must be > 0")
        if config.start_offset_years <= config.end_offset_months / 12.0:
            raise ValueError(f"Start offset ({config.start_offset_years}y) must be > end offset ({config.end_offset_months}mo)")
        
        # Verify computed range matches configured range (±1 month tolerance)
        computed_range = config.actual_range_years
        if abs(computed_range - config.range_years) > (1.0 / 12.0):
            logger.warning(f"Configured range ({config.range_years}y) differs from computed range ({computed_range:.2f}y)")
```

---

## Data Flow

### Analyzer Flow

```
1. Load AnalyzerConfig from .env
   ↓
2. Validate configuration
   ↓
3. Build time window SQL
   - Start: CURRENT_TIMESTAMP - 6mo - 24h
   - End: CURRENT_TIMESTAMP - 6mo
   ↓
4. Add fraud exclusion filter (if enabled)
   ↓
5. Execute Snowflake query
   ↓
6. Aggregate by entity (email/device/IP)
   ↓
7. Rank by risk_weighted_value
   ↓
8. Filter to top 10%: risk_rank <= CEIL(total * 0.10)
   ↓
9. Return Risk Entities
```

### Investigation Flow

```
1. Load InvestigationConfig from .env
   ↓
2. Validate configuration
   ↓
3. Build time range SQL
   - Start: CURRENT_TIMESTAMP - 2.5y
   - End: CURRENT_TIMESTAMP - 6mo
   ↓
4. Build field list (exclude FRAUD columns)
   ↓
5. Add approval filter: NSURE_LAST_DECISION = 'APPROVED' AND IS NOT NULL
   ↓
6. Execute Snowflake query
   ↓
7. Return transaction evidence
   (NO fraud columns in result set)
```

### Confusion Table Flow

```
1. Investigation complete (transactions without fraud columns)
   ↓
2. Load risk threshold from .env
   ↓
3. Query IS_FRAUD_TX separately for validation
   ↓
4. Join investigation results with fraud labels
   ↓
5. For each transaction:
   - predicted_label = 1 if predicted_risk >= threshold else 0
   - actual_label = IS_FRAUD_TX
   - classification = TP/FP/TN/FN
   ↓
6. Aggregate: sum(TP), sum(FP), sum(TN), sum(FN)
   ↓
7. Calculate metrics: precision, recall, F1, accuracy
   ↓
8. Generate HTML confusion table
```

---

## Consistency Requirements

### Time Window Consistency

**Requirement**: Both analyzer and investigation must end at the same point in time.

**Validation**:
```python
def validate_time_window_consistency(
    analyzer_config: AnalyzerTimeWindow,
    investigation_config: InvestigationTimeRange
) -> None:
    """Ensure both windows end at 6 months ago"""
    if analyzer_config.end_offset_months != investigation_config.end_offset_months:
        raise ValueError(
            f"Analyzer end offset ({analyzer_config.end_offset_months}mo) "
            f"must match investigation end offset ({investigation_config.end_offset_months}mo)"
        )
```

### Fraud Column Consistency

**Requirement**: Fraud columns excluded from investigations but accessible for confusion tables.

**Validation**:
```python
def validate_fraud_column_exclusion(select_clause: str) -> None:
    """Ensure no fraud columns in SELECT clause"""
    fraud_pattern = re.compile(r'\bFRAUD\b', re.IGNORECASE)
    if fraud_pattern.search(select_clause):
        fraud_columns = fraud_pattern.findall(select_clause)
        raise ValueError(
            f"Investigation query contains fraud columns: {fraud_columns}. "
            f"These must be excluded from SELECT clause."
        )
```

---

## Migration Considerations

### Backward Compatibility

**Existing Investigations**: No migration required. Changes affect only new investigations.

**Existing Confusion Tables**: Continue to work with existing format.

**Configuration Defaults**: Match current behavior if .env parameters not set.

### Data Validation

**Before Deployment**:
1. Verify 6-month offset window contains transactions
2. Verify 2.5-year historical range contains sufficient data
3. Test fraud column exclusion doesn't break queries
4. Validate top 10% calculation produces same results

**After Deployment**:
1. Monitor query performance for new time ranges
2. Verify confusion table generation still works
3. Check for empty result sets in analyzer
4. Validate investigation completeness

---

## Next Steps

1. ✅ **Phase 0 Complete**: Research and analysis
2. ✅ **Phase 1 In Progress**: Data model documented
3. ⏳ **Phase 1 Remaining**: Create contracts/ and quickstart.md
4. ⏳ **Phase 2**: Generate tasks.md

