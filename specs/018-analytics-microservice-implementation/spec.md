# Feature Specification: Analytics Microservice

**Feature Branch**: `001-analytics-miroservice-implementation`  
**Created**: 2025-11-08  
**Status**: Draft  
**Input**: User description: "analytics miroservice implementation. create a fully functional analytics mictoservice, both in front and back, verify full integration. create a new page for it that opens when navigating to /analytics . the uis should be based onv/Users/gklainert/Documents/olorin/olorin-analytics-20251108-224151.html with olorin style look and feel glassmorphic ui. enhance the capabilities to view a lot more analytical capabilities. analytics should inclde useful frtaud information: i.e precision, recall and other fraud related metrics.Metrics pipeline (online + offline)"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature request confirmed: Create comprehensive analytics microservice for fraud detection analytics
2. Extract key concepts from description
   → Actors: Fraud Analysts, Data Scientists, Operations Teams, System Administrators
   → Actions: Analyze fraud metrics, track precision/recall, monitor model performance, conduct experiments, detect drift
   → Data: Fraud decisions, model outputs, transaction data, investigation results, performance metrics
   → Constraints: Real-time and batch processing, glassmorphic UI design, full frontend/backend integration
3. For each unclear aspect:
   → All aspects clear from existing codebase analysis and HTML reference
4. Fill User Scenarios & Testing section
   → User flows identified for all analytics categories
5. Generate Functional Requirements
   → Comprehensive requirements covering metrics pipeline, cohort analysis, experiments, drift detection, replay, explainers
6. Identify Key Entities
   → Analytics data structures and fraud metrics identified
7. Run Review Checklist
   → No [NEEDS CLARIFICATION] markers
   → No implementation details in requirements
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### User Story 1 - Analytics Dashboard Overview (Priority: P1)

As a fraud analyst, I need to view comprehensive fraud detection analytics on a single dashboard so that I can quickly assess system performance, identify trends, and make data-driven decisions about fraud detection strategies.

The analyst needs to:
- See key performance indicators (KPIs) for fraud detection including precision, recall, F1 score, capture rate, and approval rate
- View trend graphs showing how metrics change over time
- Filter analytics by date range, investigation status, and other dimensions
- Export analytics data for reporting
- Navigate to detailed views for specific metrics or cohorts

**Why this priority**: This is the foundation of the analytics microservice. Without a comprehensive overview dashboard, users cannot effectively monitor fraud detection performance or identify issues requiring attention.

**Independent Test**: Can be fully tested by navigating to `/analytics` and verifying all KPI tiles display correctly with real data, trend graphs render properly, and filters work as expected.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/analytics`, **When** the page loads, **Then** they see a glassmorphic dashboard with KPI tiles showing precision, recall, F1 score, capture rate, approval rate, false-positive cost, chargeback rate, and decision throughput metrics

2. **Given** the analytics dashboard is displayed, **When** the user selects a date range filter, **Then** all metrics and charts update to reflect data for the selected time period

3. **Given** analytics data exists for multiple investigations, **When** the user views the dashboard, **Then** they see trend graphs showing how each metric has changed over the selected time period with smooth animations

4. **Given** the user wants to export analytics data, **When** they click the export button, **Then** they can download analytics data in CSV, JSON, or PDF format with all visible metrics included

5. **Given** real-time analytics updates are enabled, **When** new fraud decisions are made, **Then** the dashboard updates automatically without requiring manual refresh

---

### User Story 2 - Fraud Metrics Pipeline (Priority: P1)

As a data scientist, I need to monitor fraud detection model performance metrics including precision, recall, F1 score, and other classification metrics so that I can evaluate model effectiveness and identify areas for improvement.

The data scientist needs to:
- View precision, recall, and F1 scores calculated from true positives, false positives, and false negatives
- See capture rate (percentage of fraud cases detected)
- Monitor approval rate (percentage of transactions approved)
- Track false-positive cost (financial impact of incorrect fraud flags)
- View chargeback rate (percentage of approved transactions that result in chargebacks)
- Monitor model and rule latency metrics (p50, p95, p99 percentiles)
- Track decision throughput (decisions per second/minute)

**Why this priority**: These are core fraud detection metrics that directly measure system effectiveness. Without accurate metrics, users cannot assess whether fraud detection is working correctly.

**Independent Test**: Can be fully tested by verifying that all fraud metrics are calculated correctly from decision data, displayed with appropriate formatting, and update in real-time as new decisions are made.

**Acceptance Scenarios**:

1. **Given** fraud decisions have been made, **When** the user views the fraud metrics section, **Then** they see precision, recall, and F1 score calculated from actual fraud outcomes with clear labels and percentage formatting

2. **Given** the system has processed transactions, **When** the user views capture rate, **Then** they see the percentage of actual fraud cases that were correctly identified by the system

3. **Given** transactions have been evaluated, **When** the user views approval rate, **Then** they see the percentage of transactions that were approved (not flagged as fraud) with trend indicators showing if approval rate is increasing or decreasing

4. **Given** false positives have occurred, **When** the user views false-positive cost, **Then** they see the total financial impact of incorrect fraud flags including customer service costs, lost revenue, and operational overhead

5. **Given** approved transactions have resulted in chargebacks, **When** the user views chargeback rate, **Then** they see the percentage of approved transactions that later resulted in chargebacks with historical trends

6. **Given** model and rule evaluations have occurred, **When** the user views latency metrics, **Then** they see p50, p95, and p99 latency percentiles for both models and rules separately, allowing identification of performance bottlenecks

7. **Given** the system is processing decisions, **When** the user views decision throughput, **Then** they see decisions per second or per minute with real-time updates showing current processing capacity

---

### User Story 3 - Cohort & Slice Analysis (Priority: P2)

As a fraud analyst, I need to segment fraud detection performance by different dimensions (merchant, channel, geography, device, risk band, model/rule version) so that I can identify patterns, optimize detection strategies, and understand performance variations across different segments.

The analyst needs to:
- Select one or more segmentation dimensions (merchant, channel, geo, device, risk band, model version, rule version)
- View performance metrics for each segment
- Compare segments side-by-side
- Identify segments with unusual performance patterns
- Ensure privacy by enforcing minimum count thresholds to prevent re-identification

**Why this priority**: Understanding performance variations across segments is critical for optimizing fraud detection. Different merchants, channels, or regions may require different strategies.

**Independent Test**: Can be fully tested by selecting different segmentation dimensions and verifying that metrics are correctly calculated for each segment, comparisons work properly, and minimum count thresholds prevent display of segments with too few data points.

**Acceptance Scenarios**:

1. **Given** fraud decisions exist for multiple merchants, **When** the user selects "merchant" as the segmentation dimension, **Then** they see performance metrics (precision, recall, F1) broken down by each merchant with merchant names and transaction counts

2. **Given** the user wants to compare performance across channels, **When** they select "channel" segmentation, **Then** they see a comparison view showing metrics for web, mobile, API, and other channels side-by-side with visual indicators highlighting significant differences

3. **Given** fraud decisions span multiple geographic regions, **When** the user segments by geography, **Then** they see metrics broken down by country or region with a map visualization showing geographic performance patterns

4. **Given** a segment has very few data points, **When** the system calculates metrics, **Then** it enforces minimum count thresholds (e.g., minimum 100 transactions) and displays a message indicating insufficient data rather than showing potentially identifiable metrics

5. **Given** the user wants to analyze performance by risk band, **When** they select risk band segmentation, **Then** they see metrics for low, medium, high, and critical risk bands showing how detection performance varies by risk level

6. **Given** multiple model and rule versions are in use, **When** the user segments by version, **Then** they see performance metrics for each version allowing comparison of newer vs older versions

---

### User Story 4 - Experiment & A/B Test Analytics (Priority: P2)

As a data scientist, I need to conduct A/B tests and multivariate experiments to evaluate different fraud detection strategies, track performance lifts, and ensure guardrail metrics remain within acceptable ranges.

The data scientist needs to:
- Assign traffic to different experiment variants (A/B or multivariate)
- Track performance lifts for each variant (improvement in precision, recall, or other metrics)
- Monitor guardrail metrics (conversion rate, authentication success rate, latency, manual review load)
- Compare variant performance side-by-side
- Identify statistically significant differences
- Promote winning variants to production

**Why this priority**: A/B testing is essential for continuously improving fraud detection. Without experiment analytics, teams cannot safely test improvements or measure their impact.

**Independent Test**: Can be fully tested by creating an experiment, assigning traffic to variants, verifying that metrics are tracked separately for each variant, and confirming that guardrail alerts trigger when metrics exceed thresholds.

**Acceptance Scenarios**:

1. **Given** a new fraud detection strategy needs testing, **When** the user creates an A/B test, **Then** they can configure traffic split (e.g., 50/50 or 80/20), define variants, and specify success metrics and guardrails

2. **Given** an experiment is running, **When** the user views experiment analytics, **Then** they see performance metrics for each variant with lift calculations showing percentage improvement over baseline

3. **Given** guardrail metrics are configured, **When** an experiment variant causes conversion rate to drop below threshold, **Then** the system alerts the user and can automatically pause the variant if configured

4. **Given** an experiment has run for sufficient time, **When** the user views statistical significance, **Then** they see confidence intervals and p-values indicating whether observed differences are statistically significant

5. **Given** a winning variant is identified, **When** the user promotes it to production, **Then** the system provides a summary of expected impact and requires confirmation before applying changes

---

### User Story 5 - Drift & Data Quality Monitoring (Priority: P2)

As a data scientist, I need to monitor data drift and data quality issues so that I can detect when model performance degrades due to changing data distributions or data quality problems.

The data scientist needs to:
- Monitor Population Stability Index (PSI) and Kullback-Leibler (KL) divergence for key features
- Track label delay (time between transaction and fraud label availability)
- Monitor schema conformance (ensure data matches expected structure)
- Detect null value spikes and rare value anomalies
- Check feature value ranges for unexpected values
- Receive alerts when drift exceeds thresholds

**Why this priority**: Data drift is a common cause of model performance degradation. Early detection allows teams to retrain models or adjust thresholds before performance significantly degrades.

**Independent Test**: Can be fully tested by introducing data drift (changing feature distributions) and verifying that PSI/KL metrics detect the drift, alerts are triggered, and data quality issues are correctly identified and reported.

**Acceptance Scenarios**:

1. **Given** feature distributions are being monitored, **When** a feature's distribution changes significantly, **Then** the system calculates PSI and KL divergence metrics and alerts the user if drift exceeds configured thresholds

2. **Given** fraud labels are delayed in availability, **When** the user views label delay tracking, **Then** they see the average and maximum delay between transaction time and label availability, helping identify data pipeline issues

3. **Given** transaction data is being ingested, **When** schema conformance monitoring detects unexpected fields or missing required fields, **Then** the system alerts the user and shows which records violate schema expectations

4. **Given** feature values are being monitored, **When** null values spike above normal levels, **Then** the system detects the anomaly, alerts the user, and shows which features are affected

5. **Given** feature ranges are configured, **When** a feature value falls outside expected range, **Then** the system flags the anomaly and shows the unexpected value and its context

---

### User Story 6 - Replay & Backtest Studio (Priority: P3)

As a data scientist, I need to replay historical fraud decisions using updated rules, models, or thresholds so that I can evaluate how changes would have affected past decisions without impacting production.

The data scientist needs to:
- Select a historical time window
- Override rules, models, or thresholds
- Run deterministic re-evaluation of historical transactions
- Compare replay results to original production decisions
- View diff reports showing differences
- Export replay results for analysis
- Promote successful configurations to production

**Why this priority**: Replay functionality enables safe testing of improvements and helps quantify the impact of changes before deploying to production. This reduces risk and improves decision-making.

**Independent Test**: Can be fully tested by selecting a historical period, configuring rule/model overrides, running replay, and verifying that results are correctly calculated and differences from production are accurately reported.

**Acceptance Scenarios**:

1. **Given** historical transaction data exists, **When** the user selects a time window and configures rule/threshold overrides, **Then** the system runs deterministic re-evaluation and stores results in a separate fact table

2. **Given** a replay has completed, **When** the user views replay results, **Then** they see a comparison showing how many decisions would have changed, impact on precision/recall, and financial implications

3. **Given** replay results show improvements, **When** the user wants to promote changes, **Then** the system provides a summary of expected impact and requires approval before applying to production

4. **Given** multiple replay scenarios exist, **When** the user compares different configurations, **Then** they see side-by-side comparison of metrics for each scenario helping identify optimal configuration

---

### User Story 7 - Explainers & Feature Attribution (Priority: P3)

As a fraud analyst, I need to understand why specific fraud decisions were made so that I can explain decisions to stakeholders, identify important fraud indicators, and improve detection rules.

The analyst needs to:
- View feature attributions for individual decisions (SHAP values or rule traces)
- See top drivers of fraud risk per cohort
- View confusion matrices over time
- Understand which features contribute most to fraud detection
- Export explanations for documentation

**Why this priority**: Explainability is critical for fraud detection systems. Analysts need to justify decisions, identify important features, and improve detection strategies based on understanding what drives decisions.

**Independent Test**: Can be fully tested by selecting a fraud decision, viewing its explanation, and verifying that feature attributions are displayed correctly, top drivers are identified, and confusion matrices show accurate classifications.

**Acceptance Scenarios**:

1. **Given** a fraud decision has been made, **When** the user views the decision explanation, **Then** they see feature attributions showing which features contributed most to the decision with positive/negative contributions clearly indicated

2. **Given** multiple decisions exist for a cohort, **When** the user views top drivers for the cohort, **Then** they see aggregate feature importance showing which features are most influential across all decisions in that cohort

3. **Given** fraud decisions have been made over time, **When** the user views confusion matrix over time, **Then** they see how true positives, false positives, true negatives, and false negatives have changed, helping identify trends in detection accuracy

4. **Given** the user needs to document a decision, **When** they export the explanation, **Then** they receive a formatted report with feature attributions, decision rationale, and supporting evidence

---

### User Story 8 - Observability & Quality Metrics (Priority: P2)

As a system administrator, I need to monitor analytics pipeline health, data completeness, and system quality so that I can ensure analytics are reliable and identify issues before they impact users.

The administrator needs to:
- Monitor analytics freshness (stream and batch processing latency)
- Track data completeness (percentage of expected data received)
- Monitor pipeline success rates and lag
- View metric SLOs (Service Level Objectives)
- Access audit logs of queries and exports
- Correlate metric regressions with system changes

**Why this priority**: Analytics are only useful if they're reliable and up-to-date. Without observability, users cannot trust the analytics or identify when data quality issues occur.

**Independent Test**: Can be fully tested by verifying that freshness metrics update correctly, completeness calculations are accurate, pipeline health is monitored, and alerts trigger when SLOs are violated.

**Acceptance Scenarios**:

1. **Given** analytics data is being processed, **When** the user views analytics freshness, **Then** they see that stream analytics are updated within X minutes and batch analytics within Y hours, with alerts if freshness exceeds thresholds

2. **Given** data is expected from multiple sources, **When** the user views data completeness, **Then** they see that at least 99% of expected data counts are received, with alerts if completeness drops below threshold

3. **Given** analytics pipelines are running, **When** the user views pipeline health, **Then** they see success rates and lag metrics for each pipeline stage, with alerts if failures exceed thresholds

4. **Given** users are querying analytics, **When** the user views audit logs, **Then** they see immutable logs of all queries and exports with timestamps, user IDs, and query parameters

5. **Given** a metric regression is detected, **When** the user investigates, **Then** they can correlate the regression with recent deployments (rule/model/config changes) via changefeed integration

---

### User Story 9 - Deep Linking & Integration (Priority: P2)

As a fraud analyst, I need to navigate seamlessly between investigations, visualizations, and analytics so that I can analyze specific cases in detail and understand how individual investigations relate to overall system performance.

The analyst needs to:
- Navigate from an investigation to its analytics view
- Navigate from visualization to analytics with pre-filtered cohorts
- Use deep links with investigation IDs to pre-filter analytics
- View investigation-specific metrics within the analytics dashboard
- Return to investigation or visualization from analytics

**Why this priority**: Seamless integration between microservices improves user experience and enables analysts to efficiently move between different views of the same data.

**Independent Test**: Can be fully tested by navigating from an investigation to `/analytics?id=investigation-123` and verifying that analytics are pre-filtered to show only data for that investigation, and that navigation links work correctly.

**Acceptance Scenarios**:

1. **Given** a user is viewing an investigation, **When** they click "View Analytics", **Then** they navigate to `/analytics?id=investigation-123` and see analytics pre-filtered to show only metrics for that investigation

2. **Given** a user is viewing a visualization, **When** they navigate to analytics with a cohort filter, **Then** the analytics dashboard opens with the specified cohort pre-selected and metrics filtered accordingly

3. **Given** analytics are displayed for a specific investigation, **When** the user wants to return to the investigation, **Then** they can click a link that navigates back to the investigation view

---

### Edge Cases

- **What happens when no fraud decisions exist for the selected time period?**
  System displays empty state with message "No data available for selected period" and suggests adjusting date range or filters

- **What happens when precision/recall cannot be calculated due to missing labels?**
  System displays "Insufficient labeled data" message and shows available metrics that don't require labels (e.g., decision throughput, latency)

- **What happens when a cohort has fewer than minimum count threshold?**
  System hides the cohort from display, shows message indicating privacy protection, and aggregates small cohorts into "Other" category if applicable

- **What happens when replay fails due to missing historical data?**
  System identifies which time periods have missing data, allows user to adjust time window, and provides partial results for available periods

- **What happens when drift detection identifies significant drift but no alerts are configured?**
  System still calculates and displays drift metrics, but requires user to manually check; recommends configuring alerts

- **What happens when analytics pipeline fails and data is stale?**
  System displays "Data may be stale" warning, shows last successful update timestamp, and provides manual refresh option

- **What happens when user exports analytics for a very large time period?**
  System warns if export will be large, allows user to proceed or adjust filters, and provides progress indicator during export generation

- **What happens when multiple users are viewing analytics simultaneously and one makes a filter change?**
  Each user's filter state is independent; changes by one user do not affect other users' views

- **What happens when real-time updates are enabled but WebSocket connection drops?**
  System displays "Disconnected" indicator, attempts automatic reconnection, shows last known state, and alerts user after multiple failed reconnection attempts

- **What happens when feature attribution cannot be calculated for a decision (e.g., black-box model)?**
  System displays available explanation methods (e.g., rule trace if available), indicates limitations, and provides alternative explanations where possible

## Requirements

### Functional Requirements

**Analytics Dashboard & Navigation**

- **FR-001**: System MUST provide an analytics dashboard accessible at `/analytics` route
- **FR-002**: System MUST display KPI tiles showing precision, recall, F1 score, capture rate, approval rate, false-positive cost, chargeback rate, and decision throughput
- **FR-003**: System MUST support date range filtering with presets (last 7 days, 30 days, 90 days, all time) and custom ranges
- **FR-004**: System MUST support filtering by investigation status, owner, and other investigation attributes
- **FR-005**: System MUST provide real-time updates toggle allowing users to enable/disable live data updates
- **FR-006**: System MUST support export functionality for analytics data in CSV, JSON, and PDF formats
- **FR-007**: System MUST implement glassmorphic UI design matching Olorin style guide with dark theme, gradient backgrounds, and translucent panels
- **FR-008**: System MUST support deep linking with investigation IDs via `/analytics?id=investigation-123` format
- **FR-009**: System MUST pre-filter analytics when accessed via deep link with investigation ID

**Fraud Metrics Pipeline**

- **FR-010**: System MUST calculate precision, recall, and F1 score from true positives, false positives, true negatives, and false negatives
- **FR-011**: System MUST calculate capture rate as percentage of actual fraud cases correctly identified
- **FR-012**: System MUST calculate approval rate as percentage of transactions approved (not flagged as fraud)
- **FR-013**: System MUST calculate false-positive cost including customer service costs, lost revenue, and operational overhead
- **FR-014**: System MUST calculate chargeback rate as percentage of approved transactions resulting in chargebacks
- **FR-015**: System MUST track model latency metrics including p50, p95, and p99 percentiles
- **FR-016**: System MUST track rule latency metrics including p50, p95, and p99 percentiles separately from model latency
- **FR-017**: System MUST calculate decision throughput as decisions per second or per minute
- **FR-018**: System MUST support both online (streaming) and offline (batch) metrics calculation
- **FR-019**: System MUST update metrics in real-time when real-time mode is enabled
- **FR-020**: System MUST display trend graphs showing how each metric changes over time

**Cohort & Slice Analysis**

- **FR-021**: System MUST support segmentation by merchant, channel, geography, device, risk band, model version, and rule version
- **FR-022**: System MUST allow users to select one or more segmentation dimensions simultaneously
- **FR-023**: System MUST calculate performance metrics (precision, recall, F1) for each segment
- **FR-024**: System MUST provide side-by-side comparison view for multiple segments
- **FR-025**: System MUST enforce minimum count thresholds (e.g., minimum 100 transactions) to prevent re-identification
- **FR-026**: System MUST hide or aggregate segments with insufficient data to meet privacy requirements
- **FR-027**: System MUST highlight segments with unusual performance patterns (significantly better or worse than average)

**Experiment & A/B Test Analytics**

- **FR-028**: System MUST support traffic assignment to A/B test variants and multivariate experiments
- **FR-029**: System MUST track performance metrics separately for each experiment variant
- **FR-030**: System MUST calculate lift metrics showing percentage improvement over baseline for each variant
- **FR-031**: System MUST monitor guardrail metrics including conversion rate, authentication success rate, latency, and manual review load
- **FR-032**: System MUST alert users when guardrail metrics exceed configured thresholds
- **FR-033**: System MUST support automatic pausing of experiment variants when guardrails are violated (if configured)
- **FR-034**: System MUST calculate statistical significance (confidence intervals, p-values) for experiment results
- **FR-035**: System MUST support promoting winning variants to production with impact summary and confirmation

**Drift & Data Quality Monitoring**

- **FR-036**: System MUST calculate Population Stability Index (PSI) for key features to detect distribution drift
- **FR-037**: System MUST calculate Kullback-Leibler (KL) divergence for key features to detect distribution drift
- **FR-038**: System MUST track label delay (time between transaction and fraud label availability)
- **FR-039**: System MUST monitor schema conformance ensuring data matches expected structure
- **FR-040**: System MUST detect null value spikes and alert when null rates exceed normal levels
- **FR-041**: System MUST detect rare value anomalies in categorical features
- **FR-042**: System MUST check feature value ranges and flag values outside expected ranges
- **FR-043**: System MUST alert users when drift metrics exceed configured thresholds
- **FR-044**: System MUST provide historical drift trends showing how distributions have changed over time

**Replay & Backtest Studio**

- **FR-045**: System MUST allow users to select historical time windows for replay
- **FR-046**: System MUST support overriding rules, models, and thresholds for replay scenarios
- **FR-047**: System MUST perform deterministic re-evaluation of historical transactions using overridden configurations
- **FR-048**: System MUST store replay results in separate fact table without modifying production data
- **FR-049**: System MUST compare replay results to original production decisions
- **FR-050**: System MUST generate diff reports showing differences between replay and production decisions
- **FR-051**: System MUST calculate impact metrics (precision/recall changes, financial implications) for replay scenarios
- **FR-052**: System MUST support comparing multiple replay scenarios side-by-side
- **FR-053**: System MUST support promoting successful replay configurations to production with approval workflow

**Explainers & Feature Attribution**

- **FR-054**: System MUST provide feature attributions for individual fraud decisions using SHAP values or rule traces
- **FR-055**: System MUST identify top drivers of fraud risk per cohort showing aggregate feature importance
- **FR-056**: System MUST display confusion matrices showing true positives, false positives, true negatives, and false negatives
- **FR-057**: System MUST show confusion matrices over time to identify trends in detection accuracy
- **FR-058**: System MUST highlight which features contribute most to fraud detection decisions
- **FR-059**: System MUST support exporting explanations for documentation purposes
- **FR-060**: System MUST indicate when feature attribution cannot be calculated (e.g., black-box models) and provide alternative explanations where available

**Observability & Quality**

- **FR-061**: System MUST monitor analytics freshness ensuring stream analytics update within X minutes and batch analytics within Y hours
- **FR-062**: System MUST track data completeness ensuring at least 99% of expected data counts are received
- **FR-063**: System MUST monitor pipeline success rates and lag for each pipeline stage
- **FR-064**: System MUST alert users when analytics freshness exceeds configured thresholds
- **FR-065**: System MUST alert users when data completeness drops below 99% threshold
- **FR-066**: System MUST alert users when pipeline failures exceed configured thresholds
- **FR-067**: System MUST maintain immutable audit logs of all analytics queries and exports
- **FR-068**: System MUST include timestamps, user IDs, and query parameters in audit logs
- **FR-069**: System MUST correlate metric regressions with system changes (rule/model/config deployments) via changefeed integration
- **FR-070**: System MUST provide lineage tracking linking raw data → features → decisions → reports

**Integration & Deep Linking**

- **FR-071**: System MUST support deep linking from investigations microservice to analytics with investigation ID
- **FR-072**: System MUST support deep linking from visualization microservice to analytics with cohort filters
- **FR-073**: System MUST pre-filter analytics when accessed via deep link
- **FR-074**: System MUST provide navigation links back to investigations and visualizations from analytics
- **FR-075**: System MUST integrate with event bus for real-time updates and cross-service communication

### Key Entities

- **Analytics Dashboard**: Main analytics interface displaying KPIs, trend graphs, and navigation controls. Contains filter state, selected time range, and real-time update preferences.

- **Fraud Metrics**: Core performance indicators including precision, recall, F1 score, capture rate, approval rate, false-positive cost, chargeback rate, model/rule latency, and decision throughput. Calculated from fraud decisions and outcomes.

- **Cohort**: A segment of fraud decisions grouped by dimension (merchant, channel, geography, device, risk band, model version, rule version). Contains performance metrics for that segment and must meet minimum count thresholds.

- **Experiment**: An A/B test or multivariate test comparing different fraud detection strategies. Contains variants, traffic assignment, performance metrics per variant, lift calculations, and guardrail monitoring.

- **Drift Metrics**: Measurements of data distribution changes including PSI, KL divergence, label delay, schema conformance, null rates, and feature range violations. Used to detect when data changes affect model performance.

- **Replay Scenario**: A backtest configuration specifying historical time window, rule/model/threshold overrides, and results comparing to production decisions. Stored separately from production data.

- **Feature Attribution**: Explanation of individual fraud decisions showing which features contributed to the decision and their relative importance. Includes SHAP values, rule traces, and top drivers per cohort.

- **Analytics Pipeline**: Processing system for calculating metrics from raw fraud decisions. Includes online (streaming) and offline (batch) components with freshness monitoring and quality checks.

- **Audit Log**: Immutable record of analytics queries and exports including timestamp, user ID, query parameters, and results. Used for compliance and troubleshooting.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can view comprehensive fraud analytics dashboard at `/analytics` route with all KPI tiles loading within 2 seconds
- **SC-002**: Analytics dashboard displays precision, recall, F1 score, and all other fraud metrics with accuracy within 0.1% of actual calculated values
- **SC-003**: Real-time analytics updates occur within 5 seconds of new fraud decisions being made
- **SC-004**: Cohort analysis supports segmentation by at least 7 dimensions (merchant, channel, geo, device, risk band, model version, rule version) with metrics calculated correctly for each segment
- **SC-005**: A/B test analytics correctly track performance lifts and guardrail metrics with statistical significance calculations accurate to 95% confidence level
- **SC-006**: Drift detection identifies significant distribution changes (PSI > 0.25 or KL divergence > threshold) within 1 hour of occurrence
- **SC-007**: Replay functionality can process historical windows of up to 90 days with results available within 10 minutes for typical transaction volumes
- **SC-008**: Feature attributions are available for at least 95% of fraud decisions with explanations generated within 1 second
- **SC-009**: Analytics pipeline maintains data completeness of at least 99% with freshness SLOs met 99.9% of the time
- **SC-010**: Deep linking from investigations and visualizations to analytics works correctly with pre-filtering applied in 100% of cases
- **SC-011**: Analytics dashboard renders with glassmorphic UI matching Olorin design system with smooth animations and responsive layout
- **SC-012**: Export functionality successfully generates CSV, JSON, and PDF exports for datasets up to 1 million records within 30 seconds
