# Feature Specification: Confusion Table Metrics

**Feature Branch**: `001-confusion-table-metrics`  
**Created**: 2025-11-16  
**Status**: Draft  
**Input**: User description: "confusion table metrics. you are an expert data scientist. your task is to extract metrics and create a confusion table based on the following:"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Always Run Investigations on Top 3 Riskiest Entities (Priority: P1)

As a data scientist evaluating fraud detection model performance, I need the startup analysis to always run investigations on the top 3 riskiest entities identified by the risk analyzer, regardless of any conditions, so that I can consistently evaluate model performance on the highest-risk cases.

**Why this priority**: This is the foundation for all confusion table metrics. Without consistent investigation targets, we cannot generate reliable performance metrics. This must work unconditionally to ensure reproducibility.

**Independent Test**: Can be fully tested by verifying that when `AUTO_RUN_STARTUP_ANALYSIS=true`, the system always runs investigations for exactly the top 3 entities from the risk analyzer results, even if other conditions (like entity count, risk scores, etc.) might previously have prevented execution.

**Acceptance Scenarios**:

1. **Given** the risk analyzer returns at least 3 entities, **When** startup analysis runs, **Then** investigations are automatically created for the top 3 riskiest entities
2. **Given** the risk analyzer returns fewer than 3 entities, **When** startup analysis runs, **Then** investigations are created for all available entities (1 or 2)
3. **Given** the risk analyzer returns 0 entities, **When** startup analysis runs, **Then** the system logs a warning and skips investigation creation (no crash)

---

### User Story 2 - Exclude MODEL_SCORE and IS_FRAUD_TX from Investigation Queries (Priority: P1)

As a data scientist, I need investigations to completely ignore the `MODEL_SCORE` and `IS_FRAUD_TX` columns from Snowflake transaction queries during investigation execution, so that investigation results are based purely on behavioral analysis and not contaminated by existing model predictions or fraud labels.

**Why this priority**: This is CRITICAL for unbiased evaluation. If investigations use MODEL_SCORE or IS_FRAUD_TX, we cannot measure true model performance because the investigation would be influenced by the very data we're trying to evaluate.

**Independent Test**: Can be fully tested by verifying that all SQL queries executed during investigation (data ingestion, domain analysis, etc.) do NOT include `MODEL_SCORE` or `IS_FRAUD_TX` in SELECT clauses, WHERE clauses, or any other query components. This can be verified by examining query logs and ensuring these columns are absent.

**Acceptance Scenarios**:

1. **Given** an investigation is running, **When** SQL queries are executed for data ingestion, **Then** the queries do NOT include `MODEL_SCORE` or `IS_FRAUD_TX` columns
2. **Given** an investigation is running, **When** domain agents query transaction data, **Then** the queries do NOT include `MODEL_SCORE` or `IS_FRAUD_TX` columns
3. **Given** an investigation is running, **When** risk scoring is calculated, **Then** the calculation does NOT reference `MODEL_SCORE` or `IS_FRAUD_TX` values

---

### User Story 3 - Classify Transactions as Fraud/Not Fraud Based on Investigation Results (Priority: P1)

As a data scientist, I need APPROVED transactions from investigated entities to be classified as "Fraud" or "Not Fraud" based on the investigation's risk score compared to a configurable threshold, so that I can evaluate how well the investigation system identifies fraudulent transactions.

**Why this priority**: This classification is essential for building the confusion matrix. Without clear fraud/not-fraud labels from investigations, we cannot compare predictions to ground truth. We use only APPROVED transactions (filtered by `NSURE_LAST_DECISION = 'APPROVED'`) to match the same transaction set used by the risk analyzer.

**Independent Test**: Can be fully tested by verifying that after an investigation completes, all APPROVED transactions in the investigation window are labeled as "Fraud" if `investigation_risk_score >= RISK_THRESHOLD_DEFAULT` (default 0.3), and "Not Fraud" otherwise. This can be verified by checking the transaction mapping logic filters for `NSURE_LAST_DECISION = 'APPROVED'`.

**Acceptance Scenarios**:

1. **Given** an investigation completes with `overall_risk_score = 0.5`, **When** transactions are mapped, **Then** all APPROVED transactions are labeled as "Fraud" (since 0.5 >= 0.3 threshold)
2. **Given** an investigation completes with `overall_risk_score = 0.2`, **When** transactions are mapped, **Then** all APPROVED transactions are labeled as "Not Fraud" (since 0.2 < 0.3 threshold)
3. **Given** `RISK_THRESHOLD_DEFAULT` is changed to `0.7` in `.env`, **When** transactions are mapped, **Then** the new threshold (0.7) is used for classification
4. **Given** transactions exist with `NSURE_LAST_DECISION = 'REJECTED'`, **When** confusion matrix is calculated, **Then** those transactions are excluded (only APPROVED transactions included)

---

### User Story 4 - Compare Investigation Predictions to IS_FRAUD_TX Ground Truth (Priority: P1)

As a data scientist, I need investigation predictions to be compared against the `IS_FRAUD_TX` column value (current value, as it represents final confirmed fraud status), so that I can measure prediction accuracy using the single source of truth for actual fraud outcomes.

**Why this priority**: The `IS_FRAUD_TX` column represents confirmed fraud outcomes and is the authoritative source for ground truth. Since `IS_FRAUD_TX` represents the final confirmed fraud status and doesn't change retroactively, we use the current value when querying transactions within the investigation window.

**Independent Test**: Can be fully tested by verifying that for each transaction in the investigation window, the system retrieves the current `IS_FRAUD_TX` value and compares it to the investigation's fraud prediction. This can be verified by checking the comparison logic uses `IS_FRAUD_TX` as `actual_outcome`.

**Acceptance Scenarios**:

1. **Given** a transaction is predicted as "Fraud" by investigation (risk_score >= threshold), **When** compared to `IS_FRAUD_TX`, **Then** if `IS_FRAUD_TX = 1` it's counted as True Positive, if `IS_FRAUD_TX = 0` it's counted as False Positive
2. **Given** a transaction is predicted as "Not Fraud" by investigation (risk_score < threshold), **When** compared to `IS_FRAUD_TX`, **Then** if `IS_FRAUD_TX = 0` it's counted as True Negative, if `IS_FRAUD_TX = 1` it's counted as False Negative
3. **Given** `IS_FRAUD_TX` is NULL for a transaction, **When** compared to investigation prediction, **Then** the transaction is excluded from confusion matrix calculations (not counted in TP/FP/TN/FN)

---

### User Story 5 - Generate and Display Confusion Table in Reports (Priority: P2)

As a data scientist, I need confusion table metrics (TP, FP, TN, FN) to be calculated and displayed in the startup analysis report and investigation summary reports, so that I can quickly assess model performance without manual calculation.

**Why this priority**: While the calculation is critical (P1), the display is important for usability but can be added after core functionality works. Users can still access the data programmatically if needed.

**Independent Test**: Can be fully tested by verifying that the startup analysis report HTML includes a confusion table section showing TP, FP, TN, FN counts and derived metrics (precision, recall, F1, accuracy). This can be verified by generating a report and inspecting the HTML output.

**Acceptance Scenarios**:

1. **Given** investigations complete for top 3 entities, **When** startup analysis report is generated, **Then** the report includes a confusion table section with TP, FP, TN, FN counts
2. **Given** confusion table metrics are calculated, **When** the report is displayed, **Then** it shows precision, recall, F1 score, and accuracy derived from the confusion matrix
3. **Given** no transactions match the criteria, **When** the report is generated, **Then** it displays "No data available" instead of showing zeros or errors

---

### Edge Cases

- What happens when an investigation has `overall_risk_score = None` or `0.0`? → System should extract risk score from `domain_findings.risk.risk_score` if available, otherwise mark transactions as "Not Fraud" (below threshold)
- What happens when `IS_FRAUD_TX` is NULL for some transactions? → Those transactions should be excluded from confusion matrix calculations (not counted in any category)
- What happens when the investigation window has zero transactions? → Confusion matrix should show all zeros (TP=0, FP=0, TN=0, FN=0) with a note explaining no transactions were found
- What happens when `RISK_THRESHOLD_DEFAULT` is not set in `.env`? → System should use default value of `0.3` (30%)
- What happens when an investigation fails or times out? → System should log an error and exclude that entity from confusion table calculations, but continue processing other entities
- What happens when multiple investigations exist for the same entity? → System should use the most recent completed investigation for confusion table calculations
- How does system handle timezone differences between investigation window and `IS_FRAUD_TX` timestamp? → System should normalize all timestamps to UTC before comparison
- How does system retrieve `IS_FRAUD_TX` value for historical comparison? → System uses current `IS_FRAUD_TX` value (Option E). Since `IS_FRAUD_TX` represents final confirmed fraud status and doesn't change retroactively, the current value accurately reflects the fraud outcome for transactions within the investigation window.
- Which transactions are included in confusion matrix calculation? → Only APPROVED transactions (filtered by `NSURE_LAST_DECISION = 'APPROVED'`) are included, matching the same transaction set used by the risk analyzer. This ensures consistent evaluation on the same population.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST always run investigations on the top 3 riskiest entities from risk analyzer results when `AUTO_RUN_STARTUP_ANALYSIS=true`, removing any conditional logic that might prevent execution
- **FR-002**: System MUST exclude `MODEL_SCORE` and `IS_FRAUD_TX` columns from ALL SQL queries executed during investigation (data ingestion, domain analysis, risk scoring, etc.)
- **FR-003**: System MUST classify APPROVED transactions (filtered by `NSURE_LAST_DECISION = 'APPROVED'`) as "Fraud" if `investigation_risk_score >= RISK_THRESHOLD_DEFAULT`, and "Not Fraud" otherwise
- **FR-004**: System MUST use `RISK_THRESHOLD_DEFAULT` environment variable (default: `0.3`) for fraud classification threshold
- **FR-005**: System MUST compare investigation predictions to current `IS_FRAUD_TX` column values (single source of truth). Since `IS_FRAUD_TX` represents final confirmed fraud status and doesn't change retroactively, the current value is used for all APPROVED transactions within the investigation window.
- **FR-006**: System MUST calculate confusion matrix metrics: True Positives (TP), False Positives (FP), True Negatives (TN), False Negatives (FN)
- **FR-007**: System MUST exclude transactions with NULL `IS_FRAUD_TX` values from confusion matrix calculations
- **FR-008**: System MUST derive performance metrics from confusion matrix: Precision, Recall, F1 Score, Accuracy
- **FR-009**: System MUST display confusion table in startup analysis report HTML with TP, FP, TN, FN counts and derived metrics
- **FR-010**: System MUST handle cases where investigation risk score is None or 0.0 by attempting to extract from `domain_findings.risk.risk_score`
- **FR-011**: System MUST aggregate confusion matrix metrics across all 3 investigated entities in the startup analysis report
- **FR-012**: System MUST log warnings when investigations fail or entities cannot be processed, but continue with remaining entities

### Key Entities *(include if feature involves data)*

- **Investigation**: Represents a completed fraud investigation for an entity. Key attributes: `id`, `entity_type`, `entity_id`, `overall_risk_score`, `domain_findings.risk.risk_score`, `window_start`, `window_end`, `status`
- **Transaction**: Represents a transaction record from Snowflake. Key attributes: `transaction_id`, `TX_DATETIME`, `IS_FRAUD_TX` (ground truth), `predicted_risk` (from investigation), `actual_outcome` (derived from IS_FRAUD_TX)
- **Confusion Matrix**: Represents the comparison between investigation predictions and ground truth. Key metrics: `TP`, `FP`, `TN`, `FN`, `precision`, `recall`, `f1_score`, `accuracy`
- **Risk Analyzer Results**: Contains top riskiest entities identified by the risk analyzer. Key attributes: `entities` (list), each with `entity`, `risk_score`, `transaction_count`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System successfully runs investigations for top 3 riskiest entities 100% of the time when `AUTO_RUN_STARTUP_ANALYSIS=true` and risk analyzer returns at least 3 entities
- **SC-002**: Zero SQL queries during investigation execution include `MODEL_SCORE` or `IS_FRAUD_TX` columns (verified via query log analysis)
- **SC-003**: Confusion matrix is calculated correctly: TP = investigation predicts Fraud AND IS_FRAUD_TX=1, FP = investigation predicts Fraud AND IS_FRAUD_TX=0, TN = investigation predicts Not Fraud AND IS_FRAUD_TX=0, FN = investigation predicts Not Fraud AND IS_FRAUD_TX=1
- **SC-004**: Startup analysis report displays confusion table with all metrics (TP, FP, TN, FN, precision, recall, F1, accuracy) for aggregated results across top 3 entities
- **SC-005**: System handles edge cases gracefully: NULL IS_FRAUD_TX values excluded, missing risk scores handled, failed investigations logged but don't crash the process
- **SC-006**: Confusion table metrics are calculated within 5 seconds after all investigations complete (performance target)
