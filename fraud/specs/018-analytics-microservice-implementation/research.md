# Research: Analytics Microservice

**Feature**: Analytics Microservice  
**Date**: 2025-11-08  
**Status**: Complete

## Overview

This research document analyzes the requirements for implementing a comprehensive analytics microservice for fraud detection, covering technical approaches, dependencies, integration points, and design considerations.

## Feature Analysis

### Core Requirements

The analytics microservice must provide:

1. **Fraud Metrics Pipeline**: Calculate precision, recall, F1 score, capture rate, approval rate, false-positive cost, chargeback rate, model/rule latency, and decision throughput
2. **Cohort Analysis**: Segment by merchant, channel, geography, device, risk band, model/rule version
3. **A/B Testing**: Traffic assignment, lift tracking, guardrail monitoring, statistical significance
4. **Drift Detection**: PSI/KL divergence, label delay, schema conformance, data quality monitoring
5. **Replay/Backtest**: Historical replay with rule/model overrides, diff comparison
6. **Explainability**: Feature attribution (SHAP/rule traces), top drivers, confusion matrices
7. **Observability**: Pipeline health, freshness, completeness, audit logs, lineage tracking

### UI Design Reference

The reference HTML (`olorin-analytics-20251108-224151.html`) provides:

- **Glassmorphic Design**: Dark theme (#0b0b12 background), translucent panels (#11111a), purple/cyan gradients
- **Layout**: Header with filters, KPI tiles grid, chart cards, data tables
- **Components**: Date range selector, status filters, real-time toggle, export buttons
- **Visualizations**: Time series, donut charts, funnel charts, horizontal bars, heatmaps, scatter plots
- **Interactions**: Tab navigation, filter application, real-time updates, CSV export

## Technical Research

### Frontend Architecture

**Existing Microservice Pattern**:
- Module Federation setup (Webpack 5)
- React 18.2 with TypeScript
- React Router for navigation
- Event bus (mitt) for cross-service communication
- Tailwind CSS for styling
- Port assignment: 3008 (next available)

**Key Dependencies**:
- `chart.js` + `react-chartjs-2`: Chart visualizations (already used in visualization microservice)
- `d3.js`: Advanced visualizations (already used in visualization microservice)
- `axios`: API client (shared dependency)
- `react-window`: Virtualization for large tables (already used)

**Integration Points**:
- Event bus: Subscribe to `fraud:decision`, `investigation:updated` events
- Deep linking: Support `/analytics?id=investigation-123` format
- Navigation: Links to/from investigations and visualization microservices

### Backend Architecture

**Existing Infrastructure**:
- FastAPI application on port 8090
- Existing analytics routes at `/api/v1/analytics/*`
- Database: PostgreSQL/SQLite with transaction tables
- Fraud decision data: `is_fraud_tx`, `model_score`, `rule_score`, timestamps

**New Requirements**:
- Extend existing `/api/v1/analytics` routes
- Add metrics calculation services
- Add cohort analysis endpoints
- Add experiment management endpoints
- Add drift detection services
- Add replay engine
- Add explainability services

**Data Sources**:
- Transaction table: Contains fraud decisions, model scores, timestamps
- Investigation table: Links investigations to decisions
- Existing analytics: Risk analyzer service for entity analysis

### Metrics Calculation

**Precision/Recall/F1**:
- Requires labeled data: `is_fraud_tx` (ground truth) + model predictions
- Formula: Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1 = 2*(Precision*Recall)/(Precision+Recall)
- Challenge: Label delay (fraud labels may arrive days/weeks after transaction)

**Capture Rate**:
- Formula: (True Positives) / (Total Actual Fraud Cases)
- Requires: Confirmed fraud cases (`is_fraud_tx=1`)

**Approval Rate**:
- Formula: (Approved Transactions) / (Total Transactions)
- Approved = Not flagged as fraud by system

**False-Positive Cost**:
- Components: Customer service costs, lost revenue, operational overhead
- Requires: Configuration for cost per false positive

**Chargeback Rate**:
- Formula: (Chargebacks) / (Approved Transactions)
- Requires: Chargeback data (may need external integration)

**Latency Metrics**:
- Track: Model evaluation time, rule evaluation time
- Calculate: p50, p95, p99 percentiles
- Requires: Timing data in decision records

**Decision Throughput**:
- Formula: Decisions per second/minute
- Requires: Real-time counting of decisions

### Cohort Analysis

**Segmentation Dimensions**:
- Merchant: From transaction data
- Channel: web/mobile/API from transaction metadata
- Geography: IP country/region from transaction data
- Device: Device ID from transaction data
- Risk Band: Calculated from model_score (low/medium/high/critical)
- Model Version: From `model_version` field
- Rule Version: From rule metadata

**Privacy Requirements**:
- Minimum count threshold: 100 transactions per segment
- Aggregate small segments into "Other" category
- Hide segments with insufficient data

### A/B Testing

**Traffic Assignment**:
- Hash-based assignment: Consistent assignment per user/transaction
- Split ratios: Configurable (e.g., 50/50, 80/20)
- Variant tracking: Store variant ID in decision record

**Lift Calculation**:
- Compare metrics between variants
- Formula: Lift = (Variant Metric - Baseline Metric) / Baseline Metric * 100

**Guardrail Metrics**:
- Conversion rate: Transactions completed / Transactions started
- Auth success rate: Successful authentications / Total attempts
- Latency: p95 latency must not exceed threshold
- Manual review load: Percentage requiring manual review

**Statistical Significance**:
- Use t-test or chi-square test depending on metric type
- Calculate p-values and confidence intervals
- Require minimum sample size for significance

### Drift Detection

**PSI (Population Stability Index)**:
- Formula: Σ((Actual % - Expected %) * ln(Actual % / Expected %))
- Threshold: PSI > 0.25 indicates significant drift
- Requires: Baseline distribution and current distribution

**KL Divergence**:
- Formula: Σ(P(x) * ln(P(x) / Q(x)))
- Measures difference between distributions
- Threshold: Configurable (typically > 0.1)

**Label Delay Tracking**:
- Measure: Time between transaction timestamp and fraud label timestamp
- Alert: If delay exceeds threshold (e.g., > 7 days)

**Schema Conformance**:
- Validate: Required fields present, field types correct
- Alert: On schema violations

**Data Quality**:
- Null rate: Percentage of null values per feature
- Rare values: Detect unexpected categorical values
- Range checks: Values outside expected ranges

### Replay/Backtest

**Requirements**:
- Select historical time window
- Override rules/models/thresholds
- Re-run fraud detection deterministically
- Store results separately from production
- Compare to original decisions
- Calculate impact metrics

**Challenges**:
- Historical data availability
- Model version compatibility
- Deterministic execution (same inputs → same outputs)
- Performance for large time windows (90 days)

### Explainability

**Feature Attribution**:
- SHAP values: For ML models (requires model access)
- Rule traces: For rule-based decisions (track which rules fired)
- Feature importance: Aggregate across decisions

**Top Drivers**:
- Aggregate feature importance per cohort
- Show which features contribute most to fraud detection

**Confusion Matrix**:
- Track TP, FP, TN, FN over time
- Visualize trends in detection accuracy

### Observability

**Pipeline Health**:
- Track: Success rate, failure rate, lag per pipeline stage
- Alert: On failures exceeding threshold

**Freshness**:
- Stream: Update within 5 minutes
- Batch: Update within 1 hour
- Track: Last update timestamp

**Completeness**:
- Measure: Actual data count / Expected data count
- Threshold: ≥ 99%
- Alert: On drops below threshold

**Audit Logging**:
- Log: All queries, exports, configuration changes
- Include: Timestamp, user ID, query parameters, results summary
- Storage: Immutable log (append-only)

**Lineage Tracking**:
- Track: Raw data → Features → Decisions → Reports
- Use: OpenLineage events or custom tracking

## Integration Points

### Frontend Integration

1. **Module Federation**: Register as remote module on port 3008
2. **Routing**: Add `/analytics` route in shell app
3. **Event Bus**: Subscribe to fraud decision events
4. **Deep Linking**: Parse `?id=` query parameter for investigation filtering
5. **Navigation**: Add links from investigations and visualization microservices

### Backend Integration

1. **API Routes**: Extend `/api/v1/analytics` with new endpoints
2. **Database**: Use existing transaction and investigation tables
3. **Services**: Integrate with existing risk analyzer service
4. **Event Emission**: Emit events for real-time updates
5. **Caching**: Use Redis (if available) for metrics caching

## Design Decisions

### Real-time vs Batch

- **Real-time**: Dashboard updates, KPI tiles, recent decisions
- **Batch**: Historical analysis, cohort calculations, drift detection, replay

### Caching Strategy

- **Cache**: Recent metrics (last 1 hour) in memory/Redis
- **TTL**: 5 minutes for real-time metrics, 1 hour for batch metrics
- **Invalidation**: On new fraud decisions, manual refresh

### Performance Optimizations

- **Virtualization**: Large tables use react-window
- **Lazy Loading**: Load charts on demand
- **Pagination**: API endpoints support pagination
- **Aggregation**: Pre-calculate common metrics

### Error Handling

- **Graceful Degradation**: Show cached data if API fails
- **Error Boundaries**: React error boundaries for component failures
- **Retry Logic**: Automatic retry for transient failures
- **User Feedback**: Clear error messages and retry options

## Open Questions Resolved

1. **Q**: How to handle label delay for precision/recall?
   **A**: Show "Insufficient labeled data" message, display available metrics, track label delay separately

2. **Q**: How to ensure privacy in cohort analysis?
   **A**: Enforce minimum count thresholds (100 transactions), aggregate small segments

3. **Q**: How to handle large historical replays?
   **A**: Process in batches, show progress, allow cancellation, store results incrementally

4. **Q**: How to calculate feature attribution for black-box models?
   **A**: Use rule traces where available, indicate limitations, provide alternative explanations

5. **Q**: How to ensure deterministic replay?
   **A**: Use same model versions, same random seeds, same input data, track all dependencies

## Next Steps

1. **Phase 1**: Design data models and API contracts
2. **Phase 2**: Create task breakdown
3. **Implementation**: Start with dashboard and basic metrics, then add advanced features

