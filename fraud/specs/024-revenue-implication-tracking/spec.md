# Feature Specification: Revenue Implication Tracking

**Feature Branch**: `024-revenue-implication-tracking`  
**Created**: 2024-12-06  
**Status**: Draft  
**Input**: User description: "Revenue implication tracking - modify startup analysis flow to calculate Saved Fraud GMV and Lost Revenues for business value demonstration"

## Overview

This feature modifies the existing startup analysis flow to calculate and track the revenue implications of Olorin's fraud detection capabilities. By analyzing historical data with specific time windows, the system will quantify:
1. **Saved Fraud GMV**: The monetary value saved by detecting fraud before it would have caused losses
2. **Lost Revenues**: The potential revenue lost due to false positives (legitimate transactions incorrectly blocked)
3. **Net Value**: The total business value Olorin provides (Saved Fraud GMV minus Lost Revenues)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Revenue Impact Dashboard View (Priority: P1)

As a business analyst, I want to see the calculated revenue implications for each completed investigation so that I can quantify the value Olorin provides to nSure.ai.

**Why this priority**: This is the core value proposition - demonstrating concrete financial impact of fraud detection. Without this, the feature has no visible output.

**Independent Test**: Can be fully tested by running a historical analysis on a known entity and verifying the Saved Fraud GMV and Lost Revenues appear in the investigation results with correct calculations.

**Acceptance Scenarios**:

1. **Given** an investigation has completed for an entity, **When** I view the investigation results, **Then** I see the "Saved Fraud GMV" value calculated from approved transactions in the 12-to-6 months ago window.

2. **Given** an investigation has completed for an entity, **When** I view the investigation results, **Then** I see the "Lost Revenues" value calculated from blocked legitimate transactions multiplied by the take rate.

3. **Given** both Saved Fraud GMV and Lost Revenues are calculated, **When** I view the investigation summary, **Then** I see the "Net Value" (Saved Fraud GMV - Lost Revenues) displayed prominently.

---

### User Story 2 - Historical Time Window Analysis (Priority: P1)

As a fraud analyst, I want to run the startup analysis on historical data (12+ months ago) so that I can validate Olorin's predictive capabilities using actual fraud outcomes.

**Why this priority**: This is a prerequisite for calculating revenue implications - we need historical context to measure what "would have been saved."

**Independent Test**: Can be fully tested by triggering the startup analysis flow and verifying it targets the correct historical time windows (24h analyzer at 12 months ago, investigations on 18-to-12 months ago window).

**Acceptance Scenarios**:

1. **Given** I trigger the startup analysis, **When** the 24h analyzer runs, **Then** it analyzes a time window that is at least 12 months in the past (not current data).

2. **Given** the 24h analyzer identifies entities with confirmed fraud, **When** investigations are triggered, **Then** they analyze transaction data from 18 to 12 months ago (6 months prior to the analyzer window).

3. **Given** an investigation completes, **When** revenue calculations begin, **Then** the "Saved Fraud GMV" calculation uses the 12-to-6 months ago window (post-investigation period).

---

### User Story 3 - Aggregate Revenue Report (Priority: P2)

As a business stakeholder, I want to see an aggregated view of revenue implications across all completed investigations so that I can understand the total value Olorin provides.

**Why this priority**: While individual investigation metrics are essential, aggregate reporting provides the executive summary needed for business decisions.

**Independent Test**: Can be tested by running multiple investigations and verifying the aggregate report correctly sums Saved Fraud GMV, Lost Revenues, and Net Value across all investigations.

**Acceptance Scenarios**:

1. **Given** multiple investigations have completed with revenue calculations, **When** I view the aggregate report, **Then** I see the total Saved Fraud GMV across all investigations.

2. **Given** multiple investigations have completed, **When** I view the aggregate report, **Then** I see the total Lost Revenues and total Net Value.

3. **Given** the aggregate report is generated, **When** I request it, **Then** the report includes the interim confusion matrix data alongside revenue implications.

---

### User Story 4 - Configurable Take Rate and Lifetime Value Multiplier (Priority: P3)

As an administrator, I want to configure the take rate percentage and lifetime value multiplier so that revenue calculations reflect accurate business parameters.

**Why this priority**: The default values (0.75% take rate, optional 4-6x multiplier) may need adjustment for accuracy. However, the feature works with defaults.

**Independent Test**: Can be tested by changing configuration values and verifying the Lost Revenues calculation uses the new parameters.

**Acceptance Scenarios**:

1. **Given** the default take rate is configured, **When** Lost Revenues is calculated, **Then** it uses the configured percentage (default 0.75%).

2. **Given** a lifetime value multiplier is configured, **When** Lost Revenues is calculated, **Then** the base value is multiplied by the configured factor (e.g., 4x or 6x for 2-3 year lifetime).

---

### Edge Cases

- What happens when an entity has no approved transactions in the Saved Fraud GMV window?
  - The Saved Fraud GMV should be 0, and this should be clearly indicated.
  
- What happens when there are no false positives (blocked legitimate transactions)?
  - The Lost Revenues should be 0, resulting in Net Value = Saved Fraud GMV.

- What happens when Lost Revenues exceeds Saved Fraud GMV?
  - The Net Value should be displayed as a negative number, indicating the entity may not be a good candidate for this analysis.

- How does the system handle entities with very low transaction volumes?
  - The system should still calculate values but flag them as "Low Confidence" due to small sample size.

- What happens if historical transaction data is incomplete or unavailable for the required time windows?
  - The system should skip that entity and log a warning, continuing with other entities.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST run the 24h analyzer on a time window that is at least 12 months in the past (configurable via environment variable).

- **FR-002**: System MUST trigger investigations on entities identified by the analyzer, using a 18-to-12 months ago time window for analysis.

- **FR-003**: System MUST calculate "Saved Fraud GMV" after investigation completion by summing the GMV of all APPROVED transactions for the investigated entity in the 12-to-6 months ago window.

- **FR-004**: System MUST calculate "Lost Revenues" by:
  a. Identifying legitimate transactions that Olorin BLOCKED but nSure.ai APPROVED
  b. Summing the GMV of these transactions
  c. Multiplying by the configured take rate (default 0.75%)
  d. Optionally multiplying by a lifetime value factor (configurable, default 1x)

- **FR-005**: System MUST calculate "Net Value" as Saved Fraud GMV minus Lost Revenues.

- **FR-006**: System MUST store revenue implication metrics (Saved Fraud GMV, Lost Revenues, Net Value) with each investigation result.

- **FR-007**: System MUST display revenue implication metrics in the investigation results UI (ParallelInvestigationsPage and individual investigation views).

- **FR-008**: System MUST include revenue implication data in the interim startup analysis report generated by the "Generate Confusions" feature.

- **FR-009**: System MUST support configuration of:
  - Analyzer historical offset (months in the past, default 12)
  - Investigation window start offset (default 18 months ago)
  - Investigation window end offset (default 12 months ago)
  - Saved Fraud GMV window start (default 12 months ago)
  - Saved Fraud GMV window end (default 6 months ago)
  - Take rate percentage (default 0.75%)
  - Lifetime value multiplier (default 1, can be 4 or 6)

- **FR-010**: System MUST handle missing or incomplete transaction data gracefully, skipping affected entities with appropriate logging.

### Key Entities

- **RevenueImplication**: Represents the revenue calculation for an investigation
  - Investigation ID (reference to the investigation)
  - Saved Fraud GMV (monetary value in dollars)
  - Lost Revenues (monetary value in dollars)
  - Net Value (Saved Fraud GMV - Lost Revenues)
  - Take Rate Used (percentage)
  - Lifetime Multiplier Used (factor)
  - Calculation Timestamp
  - Confidence Level (High/Medium/Low based on transaction volume)

- **ApprovedTransaction**: Transaction that was approved (used for Saved Fraud GMV)
  - Transaction ID
  - Entity ID
  - GMV (Gross Merchandise Value)
  - Transaction Date
  - Approval Source (nSure.ai, Olorin, etc.)

- **BlockedTransaction**: Transaction that was blocked (used for Lost Revenues calculation)
  - Transaction ID
  - Entity ID
  - GMV
  - Transaction Date
  - Block Source (Olorin)
  - Would-Have-Been-Approved Flag (nSure.ai would have approved)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each completed investigation displays Saved Fraud GMV, Lost Revenues, and Net Value within 30 seconds of completion.

- **SC-002**: Revenue calculations are accurate within 1% compared to manual calculation on the same data set.

- **SC-003**: The aggregate revenue report includes data from 100% of completed investigations with revenue calculations.

- **SC-004**: Historical analysis correctly uses the configured time windows (verifiable by checking transaction dates in calculations).

- **SC-005**: System processes at least 50 investigations with revenue calculations in under 1 hour (parallel processing).

- **SC-006**: Business stakeholders can identify the total Net Value across all investigations with a single click.

- **SC-007**: Configuration changes to take rate or multiplier are reflected in subsequent calculations without system restart.

## Assumptions

1. Historical transaction data for 18+ months is available in the data warehouse (Snowflake).
2. Transaction records include GMV, approval status, and can be filtered by entity.
3. The distinction between "Olorin blocked" and "nSure.ai would have approved" is determinable from existing data.
4. The existing startup analysis flow infrastructure can be extended without major architectural changes.
5. The take rate of 0.75% is an appropriate default based on business input.
6. A 6-month post-investigation window is sufficient to capture the "Saved Fraud GMV" impact.

## Out of Scope

- Real-time revenue tracking (this feature focuses on historical/batch analysis)
- Currency conversion (all calculations assumed to be in a single currency)
- Per-merchant or per-channel breakdown of revenue implications (can be added in future iteration)
- Automated alerts when Net Value drops below thresholds
