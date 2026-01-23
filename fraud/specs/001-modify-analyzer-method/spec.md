# Feature Specification: Analyzer Time Window and Investigation Range Modifications

**Feature Branch**: `001-modify-analyzer-method`  
**Created**: 2025-11-21  
**Status**: Draft - Clarified  
**Input**: User description: "modify analyzer method. analyzer should run on 24H (change .env configuration for it) . it should starting 6 months from today = 6 months - 24H. it should return top 10% of riskiest entities same as implemented now. analyzer should not include transactions with confirmed fraud change .env configuration for it) ."

## Clarifications Received

1. **Time Window Direction**: Window **ends** at 6 months ago → `[6 months + 24h ago] to [6 months ago]`
2. **Confirmed Fraud Definition**: Multiple indicators - any transaction with fraud-related columns populated
3. **Fraud Column Exclusion**: Pattern-based - exclude ANY column containing "FRAUD" (`*FRAUD*`)
4. **APPROVED Filter**: Strict exclusion - `WHERE APPROVED = TRUE AND APPROVED IS NOT NULL`
5. **Top 10% Calculation**: Preserve existing logic using `CEIL(total_entities * 0.10)` with `ROW_NUMBER()`
6. **Timezone**: Database server timezone (Snowflake/PostgreSQL default)
7. **Current Implementation**: Found in `app/service/agent/tools/snowflake_tool/real_client.py` (lines 450-496)
8. **Scheduling**: No scheduling changes - only data window size modification

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Analyzer for 24-Hour Rolling Window (Priority: P1)

As a fraud analyst, I want the analyzer to process transactions from a 24-hour rolling window starting 6 months ago (6 months - 24H), so that I can identify risky entities based on recent patterns within the historical period while excluding confirmed fraud transactions.

**Why this priority**: This is the core functionality change that enables the system to analyze a specific time window without contamination from already-confirmed fraud cases, providing cleaner risk assessments.

**Independent Test**: Can be fully tested by configuring the analyzer time window in .env, running the analyzer, and verifying that: (1) only transactions within the 24H window are processed, (2) the window starts at 6 months ago, (3) confirmed fraud transactions are excluded, and (4) the top 10% riskiest entities are returned.

**Acceptance Scenarios**:

1. **Given** the analyzer is configured with a 24H time window in .env, **When** the analyzer runs, **Then** it processes only transactions from the period [6 months ago - 24H] to [6 months ago]
2. **Given** the analyzer runs with fraud exclusion enabled in .env, **When** processing transactions, **Then** all transactions with confirmed fraud status are excluded from analysis
3. **Given** the analyzer completes processing, **When** results are generated, **Then** the top 10% of riskiest entities are returned as currently implemented
4. **Given** transactions exist both inside and outside the 24H window, **When** the analyzer runs, **Then** only transactions within the specified window are included in risk calculations

---

### User Story 2 - Configure Investigation Time Range (Priority: P1)

As a fraud investigator, I want investigations to query a 2-year time range (from 2.5 years ago to 6 months ago) with only approved transactions and no fraud-related columns, so that I can analyze historical patterns without bias from fraud labels.

**Why this priority**: This ensures investigations use clean historical data without fraud column contamination, enabling unbiased analysis of patterns that may correlate with risk.

**Independent Test**: Can be fully tested by initiating an investigation and verifying that: (1) the default time range spans 2 years (2.5 years ago to 6 months ago), (2) Snowflake queries exclude all fraud-related columns, (3) only transactions with APPROVED = TRUE are included.

**Acceptance Scenarios**:

1. **Given** an investigation is initiated with default settings, **When** the Snowflake query is executed, **Then** the time range is from 2.5 years ago to 6 months ago (2-year window)
2. **Given** the investigation query is constructed, **When** querying Snowflake, **Then** no fraud-related columns (IS_FRAUD, FRAUD_TYPE, etc.) are included in the SELECT or WHERE clauses
3. **Given** transactions exist with various approval statuses, **When** the investigation query runs, **Then** only transactions where APPROVED = TRUE are included
4. **Given** the investigation time range is configured, **When** the analyzer processes entities, **Then** the analyzer window (6 months - 24H) and investigation window (2.5 years to 6 months ago) are properly separated

---

### User Story 3 - Validate Confusion Table Against Fraud Labels (Priority: P2)

As a data scientist, I want the confusion table to compare Olorin risk threshold classifications against actual fraud labels (IS_FRAUD_TX), so that I can measure the accuracy of risk predictions without using fraud data in the investigation itself.

**Why this priority**: This provides validation metrics for the system's performance while maintaining separation between training/analysis data (no fraud labels) and evaluation data (with fraud labels).

**Independent Test**: Can be fully tested by running the analyzer, generating the confusion table, and verifying that: (1) each transaction is classified based on Olorin risk threshold, (2) classifications are compared to IS_FRAUD_TX values, (3) the confusion matrix is correctly calculated.

**Acceptance Scenarios**:

1. **Given** the analyzer has produced risk scores, **When** the confusion table is generated, **Then** each transaction is classified as fraud/not-fraud based on the Olorin risk threshold
2. **Given** IS_FRAUD_TX labels exist in the database, **When** generating the confusion table, **Then** Olorin predictions are compared against IS_FRAUD_TX values to create the confusion matrix
3. **Given** the confusion table is complete, **When** reviewing results, **Then** true positives, false positives, true negatives, and false negatives are correctly counted
4. **Given** the investigation excludes fraud columns, **When** the confusion table is prepared, **Then** fraud labels are only accessed for evaluation purposes, not for investigation analysis

---

### Edge Cases

- What happens when the 24H window contains no transactions? → System returns empty entity list
- How does the system handle cases where fewer entities exist than 10%? → CEIL ensures at least 1 entity if any exist
- What happens when all transactions in the period have fraud columns populated (all excluded)? → Empty result set, log warning
- What happens when APPROVED column is NULL? → **Excluded** (strict filter: `APPROVED = TRUE AND APPROVED IS NOT NULL`)
- What happens when APPROVED column is FALSE? → **Excluded** (strict filter requires TRUE)
- What happens when IS_FRAUD_TX is NULL during confusion table generation? → Transaction excluded from confusion matrix (existing behavior)
- What happens if any column matching `*FRAUD*` pattern exists in investigation query? → Query validation fails, error raised
- How does the system handle database timezone? → Uses database server's `CURRENT_TIMESTAMP()` (Snowflake/PostgreSQL default)
- What happens if analyzer window and investigation range have different end dates? → Both MUST end at 6 months ago for consistency
- What happens when PII data is NULL or empty? → Hash empty string or NULL marker consistently
- What happens if hashing salt is not configured? → Use default salt with warning in logs (security risk)
- What happens when LLM receives hashed PII? → Investigation continues with hashed values, no reverse lookup during analysis
- What happens to PII in error messages? → Must be hashed before logging errors

## Requirements *(mandatory)*

### Functional Requirements

#### Analyzer Requirements

- **FR-001**: System MUST support configurable time window for analyzer via .env configuration (default: 24 hours)
- **FR-002**: System MUST calculate analyzer time range ending at 6 months ago: `[CURRENT_DATE - 6 months - time_window] to [CURRENT_DATE - 6 months]`
- **FR-003**: System MUST exclude transactions with ANY fraud-related columns populated (pattern: `*FRAUD*`) when .env exclusion flag is enabled
- **FR-004**: System MUST return top 10% of riskiest entities using existing calculation: `WHERE risk_rank <= CEIL(total_entities * 0.10)` ordered by `risk_weighted_value DESC`
- **FR-005**: System MUST use database server timestamp (`CURRENT_TIMESTAMP()` or `CURRENT_DATE`) for calculating time offsets dynamically

#### Investigation Requirements

- **FR-006**: System MUST set default investigation time range to 2 years (from 2.5 years ago to 6 months ago)
- **FR-007**: Snowflake queries executed during investigation MUST NOT include ANY columns containing "FRAUD" in their name (pattern: `*FRAUD*`) in SELECT, WHERE, JOIN, or any other clause
- **FR-008**: Investigation queries MUST filter to only include transactions where `APPROVED = TRUE AND APPROVED IS NOT NULL` (strict exclusion of NULL and FALSE)
- **FR-009**: System MUST maintain clear separation between analyzer window (ends at 6 months ago) and investigation historical period (ends at 6 months ago, spans 2 years backward)

#### Confusion Table Requirements

- **FR-010**: System MUST generate confusion table by comparing Olorin risk threshold classifications against `IS_FRAUD_TX` column values
- **FR-011**: System MUST classify each transaction as fraud/not-fraud using: `predicted_label = 1 if predicted_risk >= risk_threshold else 0`
- **FR-012**: System MUST access `IS_FRAUD_TX` and other fraud columns ONLY for confusion table generation, never during investigation queries
- **FR-013**: System MUST calculate confusion matrix using existing logic: `TP: predicted=1 AND actual=1, FP: predicted=1 AND actual=0, TN: predicted=0 AND actual=0, FN: predicted=0 AND actual=1`

#### Configuration Requirements

- **FR-014**: System MUST support the following .env configuration parameters:
  - `ANALYZER_TIME_WINDOW_HOURS`: Time window for analyzer in hours (default: 24)
  - `ANALYZER_EXCLUDE_CONFIRMED_FRAUD`: Boolean flag to exclude confirmed fraud transactions (default: true)
  - `INVESTIGATION_DEFAULT_RANGE_YEARS`: Default investigation time range in years (default: 2)
  - `INVESTIGATION_START_OFFSET_YEARS`: Years offset from today for investigation start (default: 2.5)
  - `INVESTIGATION_END_OFFSET_MONTHS`: Months offset from today for investigation end (default: 6)

#### Security and Privacy Requirements

- **FR-015**: System MUST hash all Personally Identifiable Information (PII) before logging or sending to LLM
- **FR-016**: PII fields that MUST be hashed include: EMAIL, PHONE_NUMBER, FIRST_NAME, LAST_NAME, IP, DEVICE_ID, USER_AGENT, UNIQUE_USER_ID
- **FR-017**: System MUST use a consistent, deterministic hashing algorithm (SHA-256) to allow correlation while protecting privacy
- **FR-018**: System MUST provide a configurable salt for PII hashing via .env configuration
- **FR-019**: Hashing MUST occur before data reaches logging infrastructure or LLM API calls
- **FR-020**: System MUST maintain mapping between hashed and original values in secure storage for authorized investigation access only

### Key Entities

- **Analyzer Time Window**: 24-hour window ending at 6 months ago: `[Today - 6mo - 24h] to [Today - 6mo]`; defines which transactions are included in risk analysis
- **Investigation Time Range**: 2-year historical period ending at 6 months ago: `[Today - 2.5y] to [Today - 6mo]`; used for investigation queries
- **Risk Entity**: Entity (merchant, customer, email, device_id, IP, etc.) being analyzed; has calculated risk score and ranking in top 10%
- **Transaction**: Financial transaction record; must have `APPROVED = TRUE AND APPROVED IS NOT NULL`; fraud columns excluded during investigation
- **Confusion Table Entry**: Comparison record showing Olorin prediction (based on risk threshold) vs. actual fraud label (`IS_FRAUD_TX`) for validation
- **Fraud-Related Column**: Any column name containing "FRAUD" (case-insensitive pattern match); excluded from investigation queries

### Fraud Column Exclusion Pattern

Based on schema analysis, the following columns match the `*FRAUD*` pattern and must be excluded from investigation queries:

- `IS_FRAUD_TX` - Primary fraud label (1 = fraud, 0 = not fraud)
- `FIRST_FRAUD_STATUS_DATETIME` - Timestamp when fraud status was first recorded
- Any future columns added that contain "FRAUD" in their name

**Implementation Note**: Use case-insensitive pattern matching to catch variations like `fraud`, `FRAUD`, `Fraud`, etc.

### APPROVED Column Clarification

The "APPROVED" status is determined by the `NSURE_LAST_DECISION` column:

- **Column Name**: `NSURE_LAST_DECISION` (Snowflake/PostgreSQL)
- **Approved Condition**: `NSURE_LAST_DECISION = 'APPROVED' AND NSURE_LAST_DECISION IS NOT NULL`
- **Exclusions**: 
  - `NSURE_LAST_DECISION IS NULL` → Excluded
  - `NSURE_LAST_DECISION = 'DECLINED'` → Excluded
  - `NSURE_LAST_DECISION = 'PENDING'` → Excluded
  - Any other value except 'APPROVED' → Excluded

**Current Implementation**: Already filtering approved transactions in analyzer (see `risk_analyzer.py` line 192)

### PII Fields Requiring Hashing

The following fields contain Personally Identifiable Information and MUST be hashed before logging or sending to LLM:

**Tier 1 - Direct Identifiers** (highest sensitivity):
- `EMAIL` - User email address
- `PHONE_NUMBER` - User phone number
- `FIRST_NAME` - User first name
- `LAST_NAME` - User last name
- `UNIQUE_USER_ID` - User identifier
- `DATE_OF_BIRTH` - User date of birth

**Tier 2 - Technical Identifiers** (high sensitivity):
- `IP` - IP address
- `DEVICE_ID` - Device identifier
- `USER_AGENT` - Browser user agent string
- `VISITOR_ID` - Visitor tracking ID

**Tier 3 - Quasi-Identifiers** (medium sensitivity):
- `CARD_BIN` - Credit card BIN (first 6 digits)
- `LAST_FOUR` - Credit card last 4 digits
- `BILLING_ADDRESS_LINE_1` - Billing street address
- `SHIPPING_ADDRESS_LINE_1` - Shipping street address

**Hashing Requirements**:
- Algorithm: SHA-256 with configurable salt
- Format: `sha256(salt + value)` as hex string
- Null handling: Hash "NULL" string for null values
- Empty string handling: Hash empty string as-is
- Case sensitivity: Normalize to lowercase before hashing (for emails/IDs)

**Non-PII Fields** (no hashing required):
- Transaction amounts (PAID_AMOUNT_VALUE_IN_CURRENCY)
- Timestamps (TX_DATETIME)
- Risk scores (MODEL_SCORE)
- Transaction IDs (TX_ID_KEY)
- Country codes (IP_COUNTRY_CODE)
- Device types (DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analyzer processes transactions within exact 24H window ending at 6 months ago: `TX_DATETIME >= (CURRENT_TIMESTAMP - 6mo - 24h) AND TX_DATETIME < (CURRENT_TIMESTAMP - 6mo)`
- **SC-002**: Zero transactions with `IS_FRAUD_TX` or other fraud columns populated are included in analyzer when exclusion is enabled
- **SC-003**: Investigation queries span exactly 2 years ending at 6 months ago: `TX_DATETIME >= (CURRENT_TIMESTAMP - 2.5y) AND TX_DATETIME < (CURRENT_TIMESTAMP - 6mo)`
- **SC-004**: Investigation SQL queries contain zero column references matching pattern `*FRAUD*` (case-insensitive) in SELECT clause
- **SC-005**: 100% of transactions in investigation results have `NSURE_LAST_DECISION = 'APPROVED' AND IS NOT NULL`
- **SC-006**: Confusion table uses existing logic: `predicted_label = (predicted_risk >= threshold)` compared to `IS_FRAUD_TX` with TP/FP/TN/FN counts
- **SC-007**: Analyzer time window configurable via `ANALYZER_TIME_WINDOW_HOURS` .env parameter (default: 24)
- **SC-008**: Both analyzer and investigation windows end at exactly the same point: 6 months ago from `CURRENT_TIMESTAMP`
- **SC-009**: Top 10% calculation preserved: `WHERE risk_rank <= CEIL(total_entities * 0.10)` using `ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC)`
- **SC-010**: Time offset parameters configurable via .env without code changes: `INVESTIGATION_START_OFFSET_YEARS`, `INVESTIGATION_END_OFFSET_MONTHS`
- **SC-011**: Database server timezone used for all date calculations (no application-level timezone conversion required)
- **SC-012**: 100% of PII fields (EMAIL, PHONE_NUMBER, IP, etc.) are hashed using SHA-256 before appearing in logs (verified by log inspection)
- **SC-013**: 100% of PII fields are hashed before being sent to LLM API calls (verified by API request inspection)
- **SC-014**: Hashed PII values are deterministic: same input always produces same hash (verified by repeated hashing)
- **SC-015**: All error messages and exception logs contain only hashed PII, never plaintext (verified by error log inspection)

## Implementation Notes

### Time Range Visualization

```
<-- Past ------------------------------------------------- Now -->
|                |              |              |              |
2.5y ago    6mo+24h ago     6mo ago        Today           Future
    |<--- Investigation Range --->|
         (2 years: 2.5y→6mo ago)
                      |<- 24H -->|
                   Analyzer Window
                (6mo+24h → 6mo ago)

Key Points:
- Investigation: [Today - 2.5 years] to [Today - 6 months] = 2 year span
- Analyzer: [Today - 6 months - 24h] to [Today - 6 months] = 24 hour window
- Both end at the same point: 6 months ago
- Investigation looks backward 2 years from that point
- Analyzer looks backward 24 hours from that point
```

### Configuration Example

```env
# Analyzer Configuration
ANALYZER_TIME_WINDOW_HOURS=24
ANALYZER_EXCLUDE_CONFIRMED_FRAUD=true

# Investigation Configuration
INVESTIGATION_DEFAULT_RANGE_YEARS=2
INVESTIGATION_START_OFFSET_YEARS=2.5
INVESTIGATION_END_OFFSET_MONTHS=6

# PII Security Configuration
PII_HASHING_ENABLED=true
PII_HASH_SALT=your-secure-random-salt-here-change-in-production
PII_HASH_ALGORITHM=SHA256
```

### Query Filtering Logic

**Analyzer Query Pattern (Snowflake):**
```sql
-- Analyzer Time Window: Ends at 6 months ago, spans 24 hours backward
WHERE TX_DATETIME >= DATEADD(hour, -24, DATEADD(month, -6, CURRENT_TIMESTAMP()))
  AND TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP())
  AND (
    -- Exclude any transaction with fraud-related columns populated
    -- Pattern: Any column matching *FRAUD* must be NULL or 0
    IS_FRAUD_TX IS NULL OR IS_FRAUD_TX = 0
    -- Add other FRAUD_* columns as needed based on .env flag
  )
  AND {group_by} IS NOT NULL

-- Top 10% Calculation (existing logic preserved)
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as risk_rank,
    COUNT(*) OVER() as total_entities
  FROM risk_calculations
)
SELECT * FROM ranked
WHERE risk_rank <= CEIL(total_entities * 0.10)
ORDER BY risk_weighted_value DESC
```

**Investigation Query Pattern (Snowflake):**
```sql
-- Investigation Time Range: 2.5 years ago to 6 months ago (2 year span)
WHERE TX_DATETIME >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
  AND TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP())
  AND NSURE_LAST_DECISION = 'APPROVED'  -- APPROVED column
  AND NSURE_LAST_DECISION IS NOT NULL    -- Strict NULL exclusion
  
-- CRITICAL: SELECT clause must NOT include ANY columns matching *FRAUD* pattern
-- Examples of EXCLUDED columns:
--   - IS_FRAUD_TX
--   - FIRST_FRAUD_STATUS_DATETIME
--   - Any other column containing "FRAUD"
```

### Current Implementation Reference

Based on codebase analysis, the following files contain the relevant implementation:

1. **Analyzer Core Logic**:
   - File: `olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`
   - Method: `get_top_risk_entities()` (lines 450-496)
   - Current behavior: Uses `DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())`
   - **Needs modification**: Change to end at 6 months ago instead of today

2. **Risk Analyzer Service**:
   - File: `olorin-server/app/service/analytics/risk_analyzer.py`
   - Method: `get_top_risk_entities()` (lines 135-234)
   - Handles time window parsing and query building
   - **Needs modification**: Update date calculation logic

3. **Investigation Query Builder**:
   - File: `olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`
   - Method: `build_investigation_query()` (line 87+)
   - Current behavior: Already excludes MODEL_SCORE and IS_FRAUD_TX (lines 111-119)
   - **Needs modification**: Expand exclusion to ALL columns matching `*FRAUD*` pattern

4. **Confusion Matrix Calculation**:
   - File: `olorin-server/app/service/investigation/metrics_calculation.py`
   - Method: `compute_confusion_matrix()` (lines 24-75)
   - Current behavior: Compares predicted_risk vs IS_FRAUD_TX
   - **No changes needed**: Logic already correct

5. **Schema Constants**:
   - File: `olorin-server/app/service/agent/tools/snowflake_tool/schema_constants.py`
   - Contains column definitions including IS_FRAUD_TX (line 212), FIRST_FRAUD_STATUS_DATETIME (line 309)
   - **Reference only**: Used to identify all fraud-related columns

## Changes Required

### 1. Modify Analyzer Time Window Calculation

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`

**Current Query (line 480)**:
```sql
WHERE {TX_DATETIME} >= DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())
```

**New Query**:
```sql
WHERE {TX_DATETIME} >= DATEADD(hour, -{time_window_hours}, DATEADD(month, -6, CURRENT_TIMESTAMP()))
  AND {TX_DATETIME} < DATEADD(month, -6, CURRENT_TIMESTAMP())
```

**Explanation**: Change from looking back `time_window_hours` from now to looking back `time_window_hours` from 6 months ago, with explicit end boundary.

### 2. Add Fraud Exclusion Filter to Analyzer

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`

**Add after line 481**:
```sql
AND ({group_by} IS NOT NULL)
AND (
  -- Exclude transactions with fraud indicators when flag enabled
  {IS_FRAUD_TX} IS NULL OR {IS_FRAUD_TX} = 0
)
```

**Configuration**: Add `.env` parameter `ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true`

### 3. Expand Fraud Column Exclusion in Investigation Queries

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`

**Current Exclusion (lines 113-114)**:
```python
excluded_columns_upper = ['MODEL_SCORE', 'IS_FRAUD_TX']
```

**New Exclusion**:
```python
# Exclude any column containing "FRAUD" (case-insensitive)
excluded_columns_upper = [
    field for field in field_collection
    if 'FRAUD' in field.upper()
]
# This will automatically exclude:
#   - IS_FRAUD_TX
#   - FIRST_FRAUD_STATUS_DATETIME
#   - Any future fraud-related columns
```

### 4. Add Investigation Time Range Configuration

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`

**Add time range parameters** (if not already present):
```python
# Investigation time range: 2.5 years ago to 6 months ago (2 year span)
investigation_start = DATEADD(year, -2.5, CURRENT_TIMESTAMP())
investigation_end = DATEADD(month, -6, CURRENT_TIMESTAMP())

WHERE {TX_DATETIME} >= {investigation_start}
  AND {TX_DATETIME} < {investigation_end}
```

### 5. Add .env Configuration Parameters

**File**: `.env` or `.env.example`

```bash
# Analyzer Configuration
ANALYZER_TIME_WINDOW_HOURS=24
ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true

# Investigation Time Range Configuration
INVESTIGATION_DEFAULT_RANGE_YEARS=2
INVESTIGATION_START_OFFSET_YEARS=2.5
INVESTIGATION_END_OFFSET_MONTHS=6

# Risk Threshold for Confusion Matrix
RISK_THRESHOLD_DEFAULT=0.5
```

### Validation Requirements

- Verify analyzer window ends exactly at 6 months ago (not today)
- Verify investigation range ends exactly at 6 months ago (same endpoint)
- Ensure ALL fraud columns (pattern `*FRAUD*`) are excluded from investigation queries
- Ensure fraud columns are accessed only during confusion table generation (post-investigation)
- Confirm all time calculations use database server `CURRENT_TIMESTAMP()`
- Validate that top 10% calculation maintains exact existing behavior: `CEIL(total_entities * 0.10)` with `ROW_NUMBER()`
- Verify APPROVED filter is strict: `= TRUE AND IS NOT NULL`
