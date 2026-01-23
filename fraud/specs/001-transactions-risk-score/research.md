# Research: Per-Transaction Risk Scoring

**Feature**: Per-Transaction Risk Scoring  
**Date**: 2025-11-17  
**Phase**: 0 - Research

## Codebase Analysis

### Existing Infrastructure Identified

#### Backend Infrastructure

1. **Risk Agent** (`app/service/agent/orchestration/domain_agents/risk_agent.py`)
   - Current location: `_calculate_real_risk_score()` function (lines 380-476)
   - Current behavior: Processes transaction data from `facts["results"]` for volume weighting
   - Transaction processing: Lines 392-413 extract transaction data (amount, MODEL_SCORE, NSURE_LAST_DECISION)
   - Issue: Currently only uses transactions for volume-weighted averaging, not per-transaction scoring
   - Modification needed: Add per-transaction score calculation function that processes each transaction individually
   - Key insight: Transaction data is already available in `facts["results"]` during risk calculation

2. **Investigation State Management** (`app/service/state_update_helper.py`)
   - Current behavior: Updates `progress_json` with investigation state
   - Storage pattern: Uses `progress_json` dict stored in PostgreSQL `investigation_states` table
   - Modification needed: Add `transaction_scores` dict to `progress_json` structure
   - Key insight: `progress_json` is JSON-serialized dict, can easily add new `transaction_scores` key

3. **Investigation Transaction Mapper** (`app/service/investigation/investigation_transaction_mapper.py`)
   - Function: `map_investigation_to_transactions()` (lines 399-715)
   - Current behavior: Applies single `investigation_risk_score` to all transactions (line 600)
   - Issue: All transactions get same `predicted_risk` value
   - Modification needed: Check for `transaction_scores` dict, use per-transaction score if available, exclude transaction if missing
   - Key insight: Already has transaction ID normalization logic (lines 573-587)

4. **Domain Findings** (`app/service/agent/orchestration/domain_agents/`)
   - Current behavior: Domain agents (network, device, location, logs, authentication, merchant) produce entity-level risk scores
   - Available data: Domain findings stored in `domain_findings` dict with risk scores and evidence
   - Modification needed: Use domain findings to provide context for per-transaction scoring
   - Key insight: Domain findings already available in `state["domain_findings"]` during risk calculation

5. **Transaction Features Available** (from `facts["results"]`)
   - `PAID_AMOUNT_VALUE_IN_CURRENCY`: Transaction amount
   - `MERCHANT_NAME`: Merchant identifier
   - `DEVICE_ID`: Device identifier
   - `IP_COUNTRY_CODE`: Country code
   - `PAYMENT_METHOD`: Payment method type
   - `TX_DATETIME`: Transaction timestamp
   - `CARD_BRAND`, `BIN`, `LAST_FOUR`: Payment card details
   - `USER_AGENT`, `DEVICE_TYPE`, `DEVICE_MODEL`: Device characteristics
   - Behavioral fields: `IS_USER_FIRST_TX_ATTEMPT`, `IS_RECURRING_USER`, etc.
   - **CRITICAL**: `MODEL_SCORE` and `NSURE_LAST_DECISION` are available but MUST NOT be used per FR-005

### Database Schema Analysis

#### Investigation State Storage
- **PostgreSQL**: `investigation_states` table
- **Column**: `progress_json` (TEXT/JSONB)
- **Current Structure**: Contains `domain_findings`, `risk_score`, `overall_risk_score`, `facts`, etc.
- **New Structure**: Add `transaction_scores` dict: `{TX_ID_KEY: risk_score_float}`

#### Transaction Data Access
- **Snowflake**: `DBT.DBT_PROD.TXS` (or configured schema)
- **Access Pattern**: Transactions queried during investigation, stored in `facts["results"]`
- **Transaction ID**: `TX_ID_KEY` used as key for `transaction_scores` dict

### Technical Decisions

#### Per-Transaction Score Calculation Algorithm
- **Approach**: Calculate score for each transaction using:
  1. Transaction-specific features (amount, merchant, device, location, payment method)
  2. Entity-level domain findings (network, device, location, logs, authentication, merchant risk scores)
  3. Weighted combination: `tx_score = f(transaction_features) + g(domain_findings)`
- **Implementation Strategy**:
  - Create `_calculate_per_transaction_scores()` function in risk_agent.py
  - Process each transaction in `facts["results"]` individually
  - Extract transaction features and map to domain findings
  - Calculate weighted risk score per transaction
  - Store in `transaction_scores` dict keyed by `TX_ID_KEY`
- **Feature Weighting**:
  - Amount: Higher amounts = higher risk (normalized by max amount in investigation)
  - Merchant: Use merchant domain risk score if merchant found in domain findings
  - Device: Use device domain risk score if device found in domain findings
  - Location: Use location/network domain risk score based on IP country
  - Payment method: Risk based on payment method type (card vs bank transfer)
  - Behavioral: First transaction attempt, recurring user patterns

#### Score Storage Pattern
- **Location**: `progress_json["transaction_scores"]`
- **Structure**: `{TX_ID_KEY: float}` where float is in range [0.0, 1.0]
- **Storage Timing**: Calculate and store during risk agent execution, before investigation completion
- **Validation**: Ensure all scores are in valid range [0.0, 1.0] before storage

#### Transaction Exclusion Logic
- **Rule**: If transaction does not have score in `transaction_scores` dict, exclude from confusion matrix
- **Implementation**: In `map_investigation_to_transactions()`, check if `tx_id in transaction_scores`
- **Behavior**: If missing, skip transaction (do not set `predicted_risk`), log warning
- **Edge Case**: If `transaction_scores` dict is missing entirely, exclude all transactions (empty confusion matrix)

#### Performance Considerations
- **Batch Processing**: Process transactions in batches of 100 for large volumes
- **Efficient Storage**: Store scores as dict for O(1) lookup during mapping
- **Timeout Handling**: Ensure calculation completes within investigation timeout (30 minutes default)
- **Memory**: `transaction_scores` dict size: ~100 bytes per transaction (TX_ID_KEY + float)

### Integration Points

1. **Risk Agent Integration**
   - Modify `risk_agent_node()` to call `_calculate_per_transaction_scores()` after domain findings are complete
   - Store `transaction_scores` in state before investigation completion
   - Update `progress_json` via `state_update_helper.py`

2. **Transaction Mapper Integration**
   - Modify `map_investigation_to_transactions()` to check for `transaction_scores` dict
   - Use per-transaction score if available, exclude transaction if missing
   - Maintain backward compatibility: if `transaction_scores` missing, exclude all transactions

3. **Confusion Matrix Integration**
   - No changes needed: confusion matrix already uses `predicted_risk` from transactions
   - Per-transaction scores will automatically flow through existing logic
   - Missing transactions excluded naturally (no `predicted_risk` = excluded from matrix)

### Dependencies

- **Existing**: Risk agent, domain agents, transaction mapper, investigation state management
- **No New Dependencies**: All functionality uses existing infrastructure
- **Data Flow**: `facts["results"]` → per-transaction calculation → `transaction_scores` dict → `progress_json` → transaction mapper → confusion matrix

### Edge Cases Identified

1. **Missing Transaction Features**: Use defaults (0.0 for amounts, "UNKNOWN" for merchants), still calculate score if sufficient features available
2. **Insufficient Features**: If too many critical features missing, skip transaction (do not store score)
3. **Invalid Feature Values**: Validate and normalize before calculation, skip if invalid
4. **Large Transaction Volumes**: Batch process, ensure timeout compliance
5. **Missing Domain Findings**: Use available domain findings only, weight appropriately
6. **Missing transaction_scores Dict**: Exclude all transactions from confusion matrix (empty matrix)

### Risk Assessment

- **Low Risk**: Modifications are additive, existing functionality preserved
- **Backward Compatibility**: Old investigations without per-transaction scores will exclude transactions (empty confusion matrix) - acceptable per spec
- **Performance**: Per-transaction calculation adds minimal overhead (<5 seconds per 100 transactions)
- **Data Integrity**: Scores validated before storage, transactions excluded if scores missing

## Next Steps

1. Design per-transaction score calculation algorithm (Phase 1)
2. Define data model for `transaction_scores` dict (Phase 1)
3. Plan service modifications (Phase 1)
4. Generate implementation tasks (Phase 2)

