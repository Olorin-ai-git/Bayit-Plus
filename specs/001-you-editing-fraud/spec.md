# Feature Specification: Investigation Comparison Pipeline

**Feature Branch**: `001-you-editing-fraud`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "You are editing our fraud analytics product ("Olorin"). Implement: A backend investigation/evaluation pipeline that compares matched time windows for a specific entity (and/or merchant scope) and returns metrics + deltas. A frontend Comparison page (Tailwind CSS with shadcn/ui components, dark theme, neon-accent colors) that visualizes the results side-by-side and supports presets & custom windows."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare Default Time Windows for Entity (Priority: P1)

A fraud analyst wants to compare recent fraud patterns against historical patterns for a specific entity (email, phone, device, etc.) to identify changes in fraud rates, model performance, and risk distribution.

**Why this priority**: This is the core use case - comparing two matched time windows (default: Recent 14d vs Retro 14d 6mo back) provides immediate value for fraud investigation without requiring configuration.

**Independent Test**: Can be fully tested by calling the API with an entity type and value, receiving comparison metrics, and verifying the frontend displays both windows side-by-side with deltas. Delivers immediate investigative value.

**Acceptance Scenarios**:

1. **Given** a valid entity (e.g., email="user@example.com"), **When** a user requests a comparison with default windows, **Then** the system returns metrics for Recent 14d and Retro 14d (6mo back) with deltas computed
2. **Given** transactions exist for the entity in both windows, **When** the comparison is executed, **Then** confusion matrix metrics (TP/FP/TN/FN), precision, recall, F1, accuracy, and fraud_rate are computed for each window
3. **Given** the comparison completes, **When** viewing the frontend page, **Then** both windows are displayed side-by-side with KPI cards, metrics, and a delta strip showing changes
4. **Given** pending labels exist in the recent window, **When** viewing results, **Then** pending_label_count is displayed and excluded from confusion matrix calculations

---

### User Story 2 - Custom Time Window Comparison (Priority: P2)

A fraud analyst needs to compare custom time periods (e.g., last 30 days vs same period 6 months ago) to investigate specific fraud patterns or seasonal trends.

**Why this priority**: Custom windows enable flexible investigation scenarios beyond the default preset, allowing analysts to match specific business cycles or incident timelines.

**Independent Test**: Can be tested independently by providing custom start/end dates for both windows via the API and verifying the frontend allows custom date selection with "Match durations" toggle. Delivers flexibility for advanced investigations.

**Acceptance Scenarios**:

1. **Given** a user selects "Custom" preset, **When** they specify start and end dates for Window A and Window B, **Then** the system compares those exact time ranges (inclusive start, exclusive end, America/New_York timezone)
2. **Given** "Match durations" toggle is enabled, **When** Window A duration changes, **Then** Window B automatically adjusts to match the duration while preserving its start date offset
3. **Given** custom windows are specified, **When** the comparison executes, **Then** metrics are computed for the exact specified ranges and displayed with custom labels

---

### User Story 3 - Merchant-Scoped Comparison (Priority: P2)

A merchant operations team wants to compare fraud metrics across specific merchants or evaluate a single merchant's performance over time.

**Why this priority**: Merchant-level analysis is critical for understanding which merchants drive changes in fraud patterns and for merchant-specific investigations.

**Independent Test**: Can be tested by filtering by merchant_ids in the API request and verifying per-merchant breakdown appears in results. Delivers merchant-specific insights.

**Acceptance Scenarios**:

1. **Given** merchant_ids are provided in the request, **When** comparison executes, **Then** global metrics are computed for transactions matching those merchants, and per_merchant breakdown is included (up to max_merchants)
2. **Given** no entity is specified but merchant_ids are provided, **When** comparison executes, **Then** metrics are computed globally for those merchants
3. **Given** per-merchant data exceeds max_merchants, **When** results are returned, **Then** global totals are unaffected and only top merchants by transaction volume are included in breakdown

---

### User Story 4 - Visualize Risk Distribution and Trends (Priority: P2)

An analyst needs to understand how predicted risk scores are distributed and how fraud patterns change over time within each window.

**Why this priority**: Histograms and timeseries provide visual context for understanding model performance shifts and identifying anomalies that raw metrics don't reveal.

**Independent Test**: Can be tested independently by requesting include_histograms and include_timeseries options and verifying charts render correctly. Delivers visual insights for pattern recognition.

**Acceptance Scenarios**:

1. **Given** include_histograms=true, **When** comparison completes, **Then** risk_histogram with 10 bins is included in response and displayed as a bar chart in each window panel
2. **Given** include_timeseries=true, **When** comparison completes, **Then** timeseries_daily with daily counts and confusion matrix values is included and displayed as a line chart
3. **Given** distribution drift is detected, **When** viewing results, **Then** PSI and KS statistics are computed and displayed in the delta section

---

### User Story 5 - Export and Share Investigation Results (Priority: P3)

An analyst needs to export comparison results for reporting, share findings with stakeholders, or create tickets for follow-up actions.

**Why this priority**: Export and sharing capabilities enable collaboration and documentation but are not required for core investigation functionality.

**Independent Test**: Can be tested independently by clicking export buttons and verifying JSON/CSV downloads, copy summary functionality, and external link generation. Delivers collaboration and documentation value.

**Acceptance Scenarios**:

1. **Given** comparison results are displayed, **When** user clicks "Export JSON", **Then** a JSON file matching the API response format is downloaded
2. **Given** comparison results are displayed, **When** user clicks "Export CSV", **Then** a CSV file with tabular data (metrics, per-merchant breakdown) is downloaded
3. **Given** investigation_summary is generated, **When** user clicks "Copy summary", **Then** the prose summary is copied to clipboard
4. **Given** external integrations are configured, **When** user clicks "Open in Splunk case" or "Create Jira ticket", **Then** appropriate URLs are opened with investigation context

---

### Edge Cases

- What happens when no transactions exist for the selected entity in either window? → System returns zeros for all metrics, displays graceful "No data" message, and investigation_summary notes empty windows
- What happens when predicted_risk is NULL for some transactions? → Transactions are excluded from over_threshold count, excluded_missing_predicted_risk is reported, but total_transactions includes them
- What happens when all labels are pending (unknown) in recent window? → recent_known metrics show zeros, pending_label_count equals total_transactions, confusion matrix is empty, but recent_all still reports total counts
- How does system handle divide-by-zero in metric calculations? → Precision, recall, F1 return 0.0 with warning logged; accuracy returns 0.0 if no known labels; never crashes
- What happens when merchant breakdown exceeds max_merchants? → Global totals computed on all merchants, per_merchant array capped at max_merchants (sorted by volume), warning logged
- How are entity values normalized? → Email normalized case-insensitively (LOWER), phone in E164 format, other entities as-is; PII masked in UI unless user has privileged role
- What happens when custom windows overlap? → System allows overlap; each transaction assigned to window based on event_ts; metrics computed independently per window
- How does system handle timezone edge cases? → All windows use America/New_York timezone; inclusive start, exclusive end semantics applied consistently

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute comparison metrics for two time windows (Window A and Window B) with matched durations
- **FR-002**: System MUST support default preset windows: Recent 14d (today-14d to today) vs Retro 14d (6mo back, same 14-day duration)
- **FR-003**: System MUST support custom time windows with user-specified start and end dates (ISO format, America/New_York timezone)
- **FR-004**: System MUST filter transactions by entity_type and entity_value when provided (email, phone, device_id, ip, account_id, card_fingerprint, merchant_id)
- **FR-005**: System MUST filter transactions by merchant_ids list when provided
- **FR-006**: System MUST compute confusion matrix metrics (TP, FP, TN, FN) using known labels only (exclude NULL actual_outcome)
- **FR-007**: System MUST compute derived metrics: precision, recall, F1, accuracy, fraud_rate for each window
- **FR-008**: System MUST compute deltas (B - A) for precision, recall, F1, accuracy, fraud_rate
- **FR-009**: System MUST report total_transactions (before label filtering) and over_threshold count (predicted_risk >= risk_threshold)
- **FR-010**: System MUST report pending_label_count for recent window (transactions with NULL actual_outcome)
- **FR-011**: System MUST exclude transactions with NULL predicted_risk from over_threshold count and report excluded_missing_predicted_risk
- **FR-012**: System MUST support optional risk_histogram (10 bins) when include_histograms=true
- **FR-013**: System MUST support optional timeseries_daily (14-day daily aggregates) when include_timeseries=true
- **FR-014**: System MUST compute per-merchant breakdown when include_per_merchant=true, capped at max_merchants (default 25)
- **FR-015**: System MUST generate investigation_summary (3-6 sentences) highlighting entity scope, headline counts, key deltas, and notable patterns
- **FR-016**: System MUST persist comparison results to artifacts/investigation_<entityType>_<slug>_<winAstart>_<winBend>.json (artifacts directory at olorin-server root, slug generated by: lowercase, replace special chars with hyphens, max 50 chars)
- **FR-017**: System MUST expose POST /api/investigation/compare endpoint accepting entity, windowA, windowB, risk_threshold (default from RISK_THRESHOLD_DEFAULT env var or 0.7), merchant_ids, and options
- **FR-018**: System MUST provide CLI entry point evaluate_investigation with same parameters as API
- **FR-019**: Frontend MUST render route /investigate/compare with entity picker, window picker, risk threshold control, and merchant filter
- **FR-020**: Frontend MUST display two side-by-side panels (Window A and Window B) with KPI cards, metrics, confusion matrix values (TP/FP/TN/FN), charts (when requested), and delta strip. Basic confusion matrix display via KPI cards in US1; visual ConfusionMatrixTile component in US4.
- **FR-021**: Frontend MUST display pending_label_count when present in recent window (displayed in metrics section or as banner)
- **FR-022**: Frontend MUST support export to JSON and CSV formats
- **FR-023**: Frontend MUST support "Copy summary" functionality for investigation_summary
- **FR-024**: Frontend MUST mask PII in UI unless user has privileged role (roles: "admin", "investigator" checked via auth service/JWT claims)
- **FR-025**: System MUST handle zero-row windows gracefully (return zeros, display message, never crash)
- **FR-026**: System MUST guard against divide-by-zero in all metric calculations (return 0.0 with warning)
- **FR-027**: System MUST normalize entity values case-insensitively where applicable (email: LOWER, phone: E164 format using phonenumbers library or regex pattern ^\+[1-9]\d{1,14}$)
- **FR-028**: System MUST use inclusive start, exclusive end semantics for all time windows in America/New_York timezone

### Key Entities *(include if feature involves data)*

- **ComparisonRequest**: Request payload containing entity (type/value), windowA, windowB, risk_threshold, merchant_ids, and options (include_per_merchant, max_merchants, include_histograms, include_timeseries)
- **WindowSpec**: Specification for a time window with preset ('recent_14d'|'retro_14d_6mo_back'|'custom'), optional start/end ISO dates, and optional label
- **WindowMetrics**: Aggregated metrics for a single window including total_transactions, over_threshold, confusion matrix (TP/FP/TN/FN), derived metrics (precision/recall/F1/accuracy/fraud_rate), optional pending_label_count, optional risk_histogram, optional timeseries_daily
- **ComparisonResponse**: Complete comparison result containing entity, threshold, windowA/B specs, metrics for A and B, deltas, optional per_merchant breakdown, excluded_missing_predicted_risk, and investigation_summary
- **PerMerchantMetrics**: Merchant-specific metrics subset (partial WindowMetrics) for a single merchant in a single window
- **Transaction**: Source data entity with transaction_id, merchant_id, event_ts, predicted_risk, actual_outcome, and entity fields (email_normalized, phone_e164, device_id, ip, account_id, card_fingerprint)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Backend comparison API completes within 5 seconds for entity-scoped queries with <100K transactions per window
- **SC-002**: Frontend page loads comparison results and renders all visualizations within 2 seconds after API response
- **SC-003**: 100% of metric calculations handle edge cases (zero rows, divide-by-zero, NULL values) without crashing
- **SC-004**: Comparison results are persisted to artifacts directory with deterministic filenames for 100% of successful comparisons
- **SC-005**: Frontend displays pending_label_count banner with correct count for 100% of recent windows containing pending labels
- **SC-006**: Export functionality (JSON/CSV) generates valid files matching API response structure for 100% of export requests
- **SC-007**: Custom window selection with "Match durations" toggle correctly preserves duration matching for 100% of user interactions
- **SC-008**: Per-merchant breakdown respects max_merchants limit while preserving global totals accuracy for 100% of requests
- **SC-009**: Investigation_summary is generated and contains entity scope, headline counts, key deltas, and notable patterns for 100% of comparisons
- **SC-010**: All time windows respect America/New_York timezone and inclusive start/exclusive end semantics for 100% of comparisons
