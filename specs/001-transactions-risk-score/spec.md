# Feature Specification: Per-Transaction Risk Scoring

**Feature Branch**: `001-transactions-risk-score`  
**Created**: 2025-11-17  
**Status**: Draft  
**Input**: User description: "transactions risk score. create a spec for Option 3: Calculate per-transaction score using transaction features"

## Clarifications

### Session 2025-11-17

- Q: How do entity-level domain findings map to individual transactions? → A: Domain findings contain mappings of specific entities to risk scores (e.g., merchant domain findings include `merchant_risks: {merchant_name: risk_score}`). Per-transaction scoring matches transaction features to these mappings.
- Q: What is the minimum set of features required to calculate a per-transaction score? → A: At least 2 of 4 critical features required (amount, merchant, device, location). Transactions with fewer than 2 critical features are excluded from scoring.
- Q: What happens when a transaction feature doesn't match any entity in domain findings mappings? → A: Use aggregate domain risk score as fallback (e.g., merchant domain's overall `risk_score` if merchant not in `merchant_risks` dict). Prefer entity-specific mappings when available, fall back to aggregate domain score when not.
- Q: What is the exact formula for combining transaction features with domain findings? → A: Weighted sum: 60% transaction features + 40% domain findings. Formula: `tx_score = 0.6 * feature_score + 0.4 * domain_score`, where feature_score is calculated from transaction-specific features (amount, merchant, device, location) and domain_score is the weighted average of matched domain findings.
- Q: How are individual transaction features (amount, merchant, device, location) combined into feature_score? → A: Normalized weighted average: normalize each feature to [0,1] range, then average with equal weights (25% each). Formula: `feature_score = (normalized_amount + normalized_merchant + normalized_device + normalized_location) / 4`, where each feature is normalized based on its value and domain findings mappings.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calculate Per-Transaction Risk Scores During Investigation (Priority: P1)

During an investigation, the system calculates a unique risk score for each transaction based on transaction-specific features (amount, merchant, device, location, payment method, etc.) combined with entity-level domain findings. These per-transaction scores are stored in the investigation state and used for confusion matrix calculations instead of applying a single entity-level risk score to all transactions.

**Why this priority**: This is the core functionality that enables accurate per-transaction fraud detection. Without this, all transactions receive the same risk score, leading to poor precision in confusion matrix metrics. This directly addresses the user's need for per-transaction scoring.

**Independent Test**: Can be fully tested by running an investigation and verifying that:
1. Each transaction in `facts["results"]` receives a unique risk score
2. Transaction scores are stored in `progress_json.transaction_scores` dict
3. Confusion matrix uses per-transaction scores instead of single entity score
4. Precision and recall metrics improve compared to single-score approach

**Acceptance Scenarios**:

1. **Given** an investigation with 10 transactions for an entity, **When** the risk agent calculates scores, **Then** each transaction has a unique risk score stored in `transaction_scores` dict keyed by `TX_ID_KEY`
2. **Given** transactions with different amounts (low vs high), **When** risk scores are calculated, **Then** high-amount transactions receive higher risk scores than low-amount transactions (all else equal)
3. **Given** transactions with different merchants, **When** risk scores are calculated, **Then** transactions with high-risk merchants (from merchant domain findings) receive higher scores
4. **Given** transactions with different device IDs, **When** risk scores are calculated, **Then** transactions with suspicious devices (from device domain findings) receive higher scores
5. **Given** transactions with different IP countries, **When** risk scores are calculated, **Then** transactions from high-risk countries (from location/network domain findings) receive higher scores

---

### User Story 2 - Use Per-Transaction Scores in Confusion Matrix (Priority: P1)

When generating confusion tables and calculating metrics, the system uses per-transaction risk scores instead of applying a single entity-level risk score to all transactions. Each transaction is classified as Fraud/Not Fraud based on its individual risk score compared to the threshold.

**Why this priority**: This is essential for accurate evaluation metrics. Without using per-transaction scores, the confusion matrix cannot properly measure investigation performance. This directly impacts the ability to assess fraud detection accuracy.

**Independent Test**: Can be fully tested by:
1. Running an investigation with per-transaction scores
2. Generating a confusion table
3. Verifying that each transaction uses its own `predicted_risk` value
4. Confirming that TP/FP/TN/FN counts reflect per-transaction predictions

**Acceptance Scenarios**:

1. **Given** an investigation with per-transaction scores stored, **When** `map_investigation_to_transactions()` is called, **Then** each transaction's `predicted_risk` is set from `transaction_scores[tx_id]` instead of `overall_risk_score`
2. **Given** transactions with scores [0.2, 0.4, 0.6, 0.8] and threshold 0.3, **When** confusion matrix is calculated, **Then** transactions with scores >= 0.3 are classified as Fraud, others as Not Fraud
3. **Given** per-transaction scores exist but some transactions are missing scores, **When** mapping occurs, **Then** missing transactions are excluded from confusion matrix calculations with a warning log

---

### User Story 3 - Blend Transaction Features with Entity-Level Domain Findings (Priority: P2)

Per-transaction risk scores combine transaction-specific features (amount, merchant, device, location, payment method) with entity-level domain findings (network risk, device risk, location risk, etc.) to provide context-aware scoring. Transaction features contribute directly to the score, while domain findings provide entity-level risk context.

**Why this priority**: This provides the most accurate risk assessment by combining transaction-specific signals with entity-level patterns. However, it can be implemented after basic per-transaction scoring (P1) is working.

**Independent Test**: Can be fully tested by:
1. Verifying that transaction amount influences per-transaction score
2. Verifying that merchant risk (from merchant domain) influences per-transaction score
3. Verifying that device risk (from device domain) influences per-transaction score
4. Verifying that location risk (from location/network domain) influences per-transaction score

**Acceptance Scenarios**:

1. **Given** a transaction with high amount ($1000) and entity-level device risk score 0.8, **When** per-transaction score is calculated, **Then** the score reflects both high amount and high device risk
2. **Given** a transaction with low-risk merchant (from merchant domain findings) and high-risk location (from location domain findings), **When** per-transaction score is calculated, **Then** the score balances both factors appropriately
3. **Given** transaction features and domain findings, **When** calculating per-transaction score, **Then** the formula uses weighted sum: `tx_score = 0.6 * feature_score + 0.4 * domain_score`, where feature_score combines transaction-specific features (amount, merchant, device, location) and domain_score is the weighted average of matched domain findings

---

### Edge Cases

- What happens when a transaction is missing required features (e.g., no device_id, no merchant_name)?
  - **Answer**: Attempt to calculate score with available features using default values (e.g., 0.0 for missing amounts, "UNKNOWN" for missing merchants). If fewer than 2 of 4 critical features (amount, merchant, device, location) are available, exclude transaction from confusion matrix
- How does system handle transactions with NULL or invalid feature values?
  - **Answer**: Validate and normalize feature values before calculation, log warnings for invalid data. If too many critical features are missing or invalid, exclude transaction from confusion matrix (do not use entity-level score as fallback)
- What happens when domain findings are incomplete (e.g., only 2 out of 6 domains have scores)?
  - **Answer**: Use available domain findings only, weight them appropriately, and still calculate per-transaction scores using transaction features
- What happens when a transaction feature doesn't match any entity in domain findings mappings (e.g., merchant "XYZ" not in merchant_risks dict)?
  - **Answer**: Use aggregate domain risk score as fallback (e.g., merchant domain's overall `risk_score`). Prefer entity-specific mappings when available, fall back to aggregate domain score when transaction feature doesn't match any mapped entity
- How does system handle very large transaction volumes (1000+ transactions)?
  - **Answer**: Batch process transactions, store scores efficiently in `transaction_scores` dict, ensure calculation completes within investigation timeout
- What happens when `transaction_scores` dict is missing from `progress_json`?
  - **Answer**: Exclude all transactions from confusion matrix calculations (empty confusion matrix), log warning that per-transaction scores are not available

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate a unique risk score for each transaction during investigation using transaction-specific features (amount, merchant, device, location, payment method, behavioral patterns)
- **FR-002**: System MUST store per-transaction risk scores in `progress_json.transaction_scores` as a dictionary mapping `TX_ID_KEY` to risk score (float 0.0-1.0)
- **FR-003**: System MUST combine transaction-specific features with entity-level domain findings when calculating per-transaction scores. When transaction features don't match entity-specific mappings in domain findings, use aggregate domain risk score as fallback (e.g., merchant domain's overall `risk_score` if merchant not found in `merchant_risks` dict). Calculate feature_score using normalized weighted average: normalize each feature (amount, merchant, device, location) to [0,1] range, then average with equal weights (25% each). Calculate domain_score as confidence-weighted average of matched domain findings (weight each domain by its confidence score, default to equal weights if confidence unavailable). Final score: `tx_score = 0.6 * feature_score + 0.4 * domain_score`
- **FR-004**: System MUST use per-transaction scores in `map_investigation_to_transactions()` - transactions without per-transaction scores MUST be excluded from confusion matrix calculations (no fallback to entity-level score)
- **FR-005**: System MUST NOT use `MODEL_SCORE` or `NSURE_LAST_DECISION` in per-transaction risk score calculation (only Approved transactions are considered). System MUST validate that these fields are not accessed during per-transaction score calculation
- **FR-006**: System MUST handle missing or NULL transaction features gracefully by using default values and entity-level domain findings. System MUST require at least 2 of 4 critical features (amount, merchant, device, location) to calculate a per-transaction score - transactions with fewer features are excluded
- **FR-007**: System MUST ensure per-transaction scores are calculated and stored before investigation completion
- **FR-008**: System MUST log warnings when transactions are excluded from confusion matrix due to missing per-transaction scores
- **FR-009**: System MUST validate that per-transaction scores are in valid range [0.0, 1.0] before storage

### Key Entities *(include if feature involves data)*

- **Transaction Risk Score**: A float value (0.0-1.0) representing the fraud risk for a specific transaction, calculated from transaction features and entity-level domain findings. Stored in `progress_json.transaction_scores[TX_ID_KEY]`.
- **Transaction Features**: Transaction-specific attributes used for risk calculation:
  - `PAID_AMOUNT_VALUE_IN_CURRENCY`: Transaction amount (higher amounts = higher risk)
  - `MERCHANT_NAME`: Merchant identifier (risk from merchant domain findings)
  - `DEVICE_ID`: Device identifier (risk from device domain findings)
  - `IP_COUNTRY_CODE`: Country code (risk from location/network domain findings)
  - `PAYMENT_METHOD`: Payment method type (card, bank transfer, etc.)
  - `TX_DATETIME`: Transaction timestamp (for temporal patterns)
  - `CARD_BRAND`, `BIN`, `LAST_FOUR`: Payment card details
  - `USER_AGENT`, `DEVICE_TYPE`, `DEVICE_MODEL`: Device characteristics
  - Behavioral fields: `IS_USER_FIRST_TX_ATTEMPT`, `IS_RECURRING_USER`, etc.
- **Entity-Level Domain Findings**: Risk scores and evidence from domain analyses (network, device, location, logs, authentication, merchant) that provide context for all transactions in the investigation window. Domain findings contain mappings of specific entities to risk scores (e.g., merchant domain findings include `merchant_risks: {merchant_name: risk_score}` dict, device domain findings include `device_risks: {device_id: risk_score}` dict). Per-transaction scoring matches transaction features (MERCHANT_NAME, DEVICE_ID, IP_COUNTRY_CODE) to these entity-specific risk mappings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Per-transaction risk scores are calculated for transactions where sufficient features are available - transactions without scores are excluded from confusion matrix (not counted in TP/FP/TN/FN)
- **SC-002**: Confusion matrix precision improves by at least 10% compared to single entity-level score approach (baseline: applying single `overall_risk_score` to all transactions, measured on test investigations with 10+ transactions)
- **SC-003**: Confusion matrix recall remains >= 95% (maintains high fraud detection rate)
- **SC-004**: Per-transaction score calculation completes within investigation timeout (no performance degradation)
- **SC-005**: Investigations without per-transaction scores: confusion matrix calculations exclude all transactions (empty confusion matrix) rather than using entity-level score fallback
- **SC-006**: Per-transaction scores show variance: at least 20% of transactions in a typical investigation (investigation with 10+ transactions) have scores that differ from entity-level score by >0.1 (demonstrates per-transaction differentiation)
- **SC-007**: Confusion table generation uses per-transaction scores when available: 100% of transactions with per-transaction scores use their individual scores instead of entity-level score
