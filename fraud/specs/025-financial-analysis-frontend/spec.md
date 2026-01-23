# Feature Specification: Financial Analysis Frontend Integration

**Feature Branch**: `025-financial-analysis-frontend`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Frontend integration of financial analysis for investigations: enhance parallel investigations page with financial metrics, create new financial analysis microservice, integrate with backend revenue calculation and confusion matrix APIs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Financial Impact on Investigations List (Priority: P1)

As a fraud analyst, I want to see financial metrics (Saved Fraud GMV, Lost Revenues, Net Value) directly in the parallel investigations table so that I can quickly assess the business impact of completed investigations without drilling into each one.

**Why this priority**: This is the highest-value enhancement because it provides immediate visibility into financial outcomes where users already spend time - the investigations list. It enables quick prioritization and ROI assessment without additional clicks.

**Independent Test**: Can be fully tested by viewing the parallel investigations page at `/parallel` and verifying that completed investigations display financial columns with real calculated values from the backend.

**Acceptance Scenarios**:

1. **Given** a user is on the parallel investigations page, **When** an investigation is completed and has financial data calculated, **Then** the table displays Saved Fraud GMV, Lost Revenues, and Net Value columns with formatted currency values.

2. **Given** a user views the investigations table, **When** multiple investigations are shown, **Then** a summary panel above the table shows aggregated totals (Total Saved GMV, Total Lost Revenues, Total Net Value) across all visible investigations.

3. **Given** an investigation is in progress or has no financial data, **When** the user views the table, **Then** the financial columns display "Pending" or "-" appropriately rather than zero values.

4. **Given** the backend returns financial metrics, **When** the user views the table, **Then** Net Value is color-coded (green for positive, red for negative) for quick visual identification.

---

### User Story 2 - View Confusion Matrix Metrics (Priority: P2)

As a fraud analyst, I want to see confusion matrix metrics (True Positives, False Positives, Precision, Recall) in the investigations table so that I can evaluate the accuracy of the fraud detection model for each investigation.

**Why this priority**: Confusion metrics provide essential model performance data that complements financial metrics. Analysts need both financial impact AND detection accuracy to make informed decisions.

**Independent Test**: Can be tested by verifying that completed investigations display TP/FP counts and precision/recall percentages from the backend confusion matrix API.

**Acceptance Scenarios**:

1. **Given** an investigation is completed with confusion matrix generated, **When** the user views the investigations table, **Then** the table displays TP, FP counts and Precision percentage.

2. **Given** a user clicks on a precision value, **When** the click is registered, **Then** a tooltip or popup shows the full confusion matrix breakdown (TP, FP, TN, FN, Recall, F1 Score).

---

### User Story 3 - Financial Analysis Dashboard (Priority: P3)

As a fraud operations manager, I want a dedicated financial analysis dashboard so that I can view comprehensive revenue impact visualizations, ROI trends, and drill down into individual investigation financial details.

**Why this priority**: This is a larger feature that provides deeper analysis capabilities. While valuable, it builds on P1/P2 foundations and can be delivered after the table enhancements.

**Independent Test**: Can be tested by navigating to `/financial-analysis` and verifying dashboard components render with aggregated financial data and interactive charts.

**Acceptance Scenarios**:

1. **Given** a user navigates to the financial analysis dashboard, **When** the page loads, **Then** it displays aggregated financial metrics (Total Saved GMV, Total Lost Revenues, Total Net Value, Average Precision) from all completed investigations.

2. **Given** a user is on the financial dashboard, **When** they view the revenue impact chart, **Then** it shows a time-series visualization of cumulative savings over investigation completion dates.

3. **Given** a user clicks on an investigation row in the dashboard, **When** the detail view opens, **Then** it displays the full RevenueImplication breakdown including methodology explanation, transaction samples, and time windows used.

---

### User Story 4 - Per-Investigation Financial Detail Page (Priority: P4)

As a fraud analyst, I want to view detailed financial breakdown for a specific investigation so that I can understand exactly how savings and losses were calculated and audit the methodology.

**Why this priority**: Detailed drill-down is important for auditing and understanding specific cases, but most users will start with the summary view (P1) before needing this detail.

**Independent Test**: Can be tested by navigating to `/financial-analysis/investigation/{id}` and verifying all breakdown components render with calculation details.

**Acceptance Scenarios**:

1. **Given** a user navigates to an investigation financial detail page, **When** the page loads, **Then** it displays SavedFraudGMVBreakdown including methodology, transaction count, sample transactions, and query windows.

2. **Given** a user views the financial detail page, **When** looking at Lost Revenues section, **Then** it displays the formula applied (blocked_gmv × take_rate × lifetime_multiplier) with actual values.

3. **Given** a user views the page, **When** Net Value is displayed, **Then** it includes ROI percentage if Lost Revenues > 0, with clear positive/negative indication.

---

### Edge Cases

- What happens when an investigation has no transactions in the GMV window? Display "No data available" with explanation.
- What happens when Olorin did not predict fraud for an entity (predicted_label=0)? Show "Skipped - Not Predicted as Fraud" with explanation.
- What happens when backend revenue calculation fails? Display error state with retry option.
- What happens when precision/recall have wide confidence intervals due to small sample size? Display warning indicator.
- How does the system handle currency formatting for different locales? Use configurable currency format from environment.
- What happens when a user refreshes while data is loading? Maintain loading state without duplicate requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display financial metrics columns (Saved Fraud GMV, Lost Revenues, Net Value) in the parallel investigations table for completed investigations.
- **FR-002**: System MUST display confusion matrix metrics (TP, FP, Precision) in the investigations table for completed investigations with generated confusion matrices.
- **FR-003**: System MUST show an aggregated financial summary panel above the investigations table showing totals across all displayed investigations.
- **FR-004**: System MUST color-code Net Value (green for positive, red for negative) for quick visual identification.
- **FR-005**: System MUST handle loading, error, and empty states gracefully with appropriate user feedback.
- **FR-006**: System MUST integrate with existing backend API endpoints:
  - `GET /api/v1/investigation-state/` for investigation list
  - `POST /{investigation_id}/confusion-matrix` for confusion metrics
  - Backend revenue calculation service for financial metrics
- **FR-007**: System MUST format currency values consistently using the configured locale/format from environment variables.
- **FR-008**: System MUST update financial data in real-time as investigations complete (via existing polling/WebSocket mechanisms).
- **FR-009**: System MUST provide a dedicated financial analysis microservice (Port 3007) following the existing microservices architecture pattern.
- **FR-010**: System MUST provide drill-down capability from summary to detailed financial breakdown per investigation.
- **FR-011**: System MUST display prediction validation status when financial calculation was skipped due to entity not being predicted as fraud.
- **FR-012**: System MUST follow Tailwind CSS only styling (NO Material-UI per frontend CLAUDE.md mandate).
- **FR-013**: System MUST keep all component files under 200 lines per frontend architecture requirements.

### Key Entities *(include if feature involves data)*

- **FinancialMetrics**: Represents revenue impact data for an investigation - includes savedFraudGmv, lostRevenues, netValue, roiPercentage, confidenceLevel
- **ConfusionMetrics**: Represents model performance data - includes truePositives, falsePositives, trueNegatives, falseNegatives, precision, recall, f1Score, accuracy
- **FinancialSummary**: Aggregated financial data across multiple investigations - includes totals for saved GMV, lost revenues, net value, and optional merchant breakdown
- **RevenueBreakdown**: Detailed calculation breakdown - includes methodology, formula applied, transaction samples, query time windows

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view financial impact of all completed investigations in under 2 seconds on the parallel investigations page.
- **SC-002**: Aggregated financial summary updates automatically within 5 seconds of an investigation completing.
- **SC-003**: 100% of completed investigations with generated confusion matrices display precision/recall metrics.
- **SC-004**: Users can access detailed financial breakdown for any investigation in 1 click from the main table.
- **SC-005**: Financial analysis dashboard loads and displays all components in under 3 seconds.
- **SC-006**: System handles 100+ concurrent investigations being polled without performance degradation.
- **SC-007**: Financial data formatting is consistent across all views (table, summary panel, detail pages).
- **SC-008**: Users can understand why a financial calculation was skipped (e.g., not predicted as fraud) through clear status indicators.
- **SC-009**: All financial analysis components work across Chrome, Firefox, and Safari browsers.
- **SC-010**: Financial microservice achieves 87%+ test coverage per project requirements.

## Assumptions

1. Backend revenue calculation service and confusion matrix generation are already implemented and working (verified via E2E tests).
2. The parallel investigations page currently exists at `/parallel` and uses the `useInvestigationPolling` hook for data fetching.
3. The frontend follows microservices architecture with Webpack Module Federation.
4. Environment variables for API endpoints and feature flags are already configured.
5. Users are authenticated and have appropriate permissions to view financial data.
6. Currency is USD unless otherwise specified in environment configuration.
7. Take rate (2.5%) and lifetime multiplier (3.0x) are configured on the backend and not exposed to frontend.

## Dependencies

- **Backend**: Feature 024-revenue-implication-tracking must be complete (revenue calculation service)
- **Backend**: Confusion matrix generation service must be operational
- **Frontend**: Existing investigation microservice infrastructure
- **Frontend**: Shared components and hooks from core-ui service
- **Infrastructure**: WebSocket connection for real-time updates

## Out of Scope

- Modification of backend revenue calculation logic
- Changes to confusion matrix generation algorithms
- User-configurable take rates or lifetime multipliers
- Historical revenue trend analysis beyond simple time-series
- Export to PDF/CSV functionality (can be added later)
- Multi-currency support (USD only for now)
- A/B testing or feature flag management UI
