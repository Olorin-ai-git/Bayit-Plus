# Quickstart: Analytics Microservice

**Feature**: Analytics Microservice  
**Date**: 2025-11-08  
**Status**: Complete

## Overview

This guide provides quick setup and usage instructions for the analytics microservice.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11 with Poetry
- PostgreSQL or SQLite database
- Redis (optional, for caching)

## Installation

### Frontend

```bash
cd olorin-front/src/microservices/analytics
npm install
```

### Backend

```bash
cd olorin-server
poetry install
```

## Configuration

### Frontend Environment Variables

Create `.env` in `olorin-front/src/microservices/analytics`:

```env
REACT_APP_BACKEND_URL=http://localhost:8090
REACT_APP_ANALYTICS_API_URL=http://localhost:8090/api/v1/analytics
REACT_APP_WS_URL=ws://localhost:8090/ws
REACT_APP_ANALYTICS_PORT=3008
```

### Backend Environment Variables

Add to `olorin-server/.env`:

```env
# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_CACHE_ENABLED=true
ANALYTICS_CACHE_TTL_SECONDS=300
ANALYTICS_MIN_COHORT_COUNT=100

# False Positive Cost Configuration
FALSE_POSITIVE_COST_CUSTOMER_SERVICE=50.00
FALSE_POSITIVE_COST_LOST_REVENUE=100.00
FALSE_POSITIVE_COST_OPERATIONAL=25.00

# Pipeline SLOs
ANALYTICS_STREAM_FRESHNESS_MINUTES=5
ANALYTICS_BATCH_FRESHNESS_HOURS=1
ANALYTICS_COMPLETENESS_THRESHOLD=0.99

# Drift Detection Thresholds
DRIFT_PSI_THRESHOLD=0.25
DRIFT_KL_THRESHOLD=0.1
```

## Running the Service

### Development Mode

**Frontend**:
```bash
cd olorin-front
npm run start:analytics
# Service runs on http://localhost:3008
```

**Backend**:
```bash
cd olorin-server
poetry run python -m app.local_server
# API available at http://localhost:8090/api/v1/analytics
```

### Production Build

**Frontend**:
```bash
cd olorin-front/src/microservices/analytics
npm run build
```

**Backend**:
```bash
cd olorin-server
poetry run python -m app.main
```

## Module Federation Setup

### Register in Shell App

Add to `olorin-front/src/microservices/core-ui/webpack.config.js`:

```javascript
remotes: {
  // ... existing remotes
  'analytics': 'analytics@http://localhost:3008/remoteEntry.js',
}
```

### Add Route

Add to `olorin-front/src/microservices/core-ui/CoreUIApp.tsx`:

```typescript
const AnalyticsApp = React.lazy(() => import('analytics/AnalyticsApp'));

<Route path="/analytics" element={<AnalyticsApp />} />
```

## Basic Usage

### View Dashboard

Navigate to `http://localhost:3000/analytics` (or port where shell app runs).

### View Metrics for Investigation

Navigate to `/analytics?id=investigation-123` to see analytics filtered for a specific investigation.

### API Usage

#### Get Dashboard KPIs

```bash
curl -X GET "http://localhost:8090/api/v1/analytics/dashboard?timeWindow=7d" \
  -H "Authorization: Bearer <token>"
```

#### Get Precision/Recall

```bash
curl -X GET "http://localhost:8090/api/v1/analytics/metrics/precision-recall?startDate=2025-11-01T00:00:00Z&endDate=2025-11-08T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

#### Get Cohort Analysis

```bash
curl -X GET "http://localhost:8090/api/v1/analytics/cohorts?dimension=merchant&startDate=2025-11-01T00:00:00Z&endDate=2025-11-08T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

## Key Features

### 1. Dashboard Overview

- View KPIs: precision, recall, F1, capture rate, approval rate, costs, throughput
- Trend graphs showing metric changes over time
- Filter by date range, investigation, status
- Real-time updates toggle

### 2. Fraud Metrics

- Precision, recall, F1 score calculation
- Capture rate (fraud detection rate)
- Approval rate (transaction approval percentage)
- False-positive cost tracking
- Chargeback rate monitoring
- Model/rule latency percentiles (p50, p95, p99)
- Decision throughput (decisions per minute)

### 3. Cohort Analysis

- Segment by merchant, channel, geography, device, risk band, model/rule version
- Compare segments side-by-side
- Privacy protection (minimum count thresholds)
- Identify best/worst performers

### 4. A/B Testing

- Create experiments with traffic splits
- Track performance lifts
- Monitor guardrail metrics
- Statistical significance calculation
- Promote winning variants

### 5. Drift Detection

- PSI and KL divergence calculation
- Label delay tracking
- Schema conformance monitoring
- Data quality alerts (null spikes, range violations)

### 6. Replay/Backtest

- Select historical time window
- Override rules/models/thresholds
- Compare replay results to production
- View impact metrics

### 7. Explainability

- Feature attribution (SHAP values, rule traces)
- Top drivers per cohort
- Confusion matrix over time
- Export explanations

### 8. Observability

- Pipeline health monitoring
- Freshness tracking (stream/batch)
- Data completeness monitoring
- Audit logs
- Lineage tracking

## Troubleshooting

### Dashboard Not Loading

1. Check backend is running: `curl http://localhost:8090/api/v1/analytics/health`
2. Check frontend service: `curl http://localhost:3008`
3. Check browser console for errors
4. Verify Module Federation configuration

### Metrics Not Updating

1. Check real-time toggle is enabled
2. Verify WebSocket connection: Check browser Network tab
3. Check event bus: Verify `fraud:decision` events are being emitted
4. Check backend logs for errors

### Cohort Analysis Showing "Insufficient Data"

1. Verify minimum count threshold: Default is 100 transactions
2. Check date range: Ensure sufficient data in selected period
3. Verify dimension values exist in transaction data

### Export Failing

1. Check export size: Large exports may timeout
2. Verify format: Supported formats are CSV, JSON, PDF
3. Check backend logs for errors
4. Verify user permissions

## Next Steps

1. **Customize Metrics**: Configure false-positive costs and thresholds
2. **Set Up Alerts**: Configure drift detection and pipeline health alerts
3. **Create Experiments**: Set up A/B tests for fraud detection improvements
4. **Monitor Performance**: Track pipeline health and data completeness
5. **Review Audit Logs**: Monitor user queries and exports

## Additional Resources

- [API Contracts](./contracts/api.md)
- [Event Bus Contracts](./contracts/events.md)
- [Data Model](./data-model.md)
- [Research](./research.md)

