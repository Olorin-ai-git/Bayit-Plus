# Analytics Microservice

Comprehensive fraud detection analytics microservice for the Olorin platform.

## Overview

The Analytics Microservice provides real-time and historical analytics for fraud detection decisions, including:

- **Dashboard**: KPI tiles, trend graphs, and real-time monitoring
- **Metrics Pipeline**: Precision, recall, F1 score, latency, throughput
- **Cohort Analysis**: Segment performance by merchant, channel, geography, device, risk band, model/rule version
- **Experiments**: A/B testing with traffic assignment and lift tracking
- **Drift Detection**: PSI/KL divergence monitoring and data quality checks
- **Replay Engine**: Historical backtesting with configurable thresholds
- **Explainability**: Feature attribution and decision explanations
- **Observability**: Pipeline health, freshness, and completeness monitoring
- **Deep Linking**: URL-based filtering and cross-service navigation

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (glassmorphic UI)
- **Backend**: Python + FastAPI + PostgreSQL/Snowflake
- **Module Federation**: Webpack 5 for runtime composition
- **Event Bus**: mitt for inter-service communication

## Installation

```bash
# Frontend dependencies
cd olorin-front/src/microservices/analytics
npm install

# Backend dependencies (already installed in olorin-server)
# No additional dependencies required
```

## Configuration

### Environment Variables

**Frontend:**
- `REACT_APP_API_BASE_URL`: API base URL (default: `http://localhost:8090`)
- `REACT_APP_ANALYTICS_PORT`: Dev server port (default: `3008`)
- `REACT_APP_MAX_DATE_RANGE_DAYS`: Maximum date range for queries (default: `365`)

**Backend:**
- `DATABASE_PROVIDER`: Database provider (`postgresql` or `snowflake`)
- `ANALYTICS_DEFAULT_TIME_WINDOW`: Default time window (default: `30d`)
- `COHORT_MIN_COUNT_THRESHOLD`: Minimum transactions per cohort (default: `100`)
- `FALSE_POSITIVE_COST`: Cost per false positive in USD (default: `50.0`)
- `DRIFT_PSI_THRESHOLD`: PSI threshold for drift detection (default: `0.2`)
- `PIPELINE_FRESHNESS_THRESHOLD_MINUTES`: Freshness threshold (default: `5`)
- `PIPELINE_COMPLETENESS_THRESHOLD`: Completeness threshold (default: `0.99`)

## Running

### Development

```bash
# Frontend (from olorin-front root)
npm run start:analytics

# Backend (from olorin-server root)
# Analytics endpoints are automatically included in the main API router
uvicorn app.main:app --reload
```

### Production

The microservice is automatically loaded via Module Federation when accessing `/analytics` route in the shell application.

## API Endpoints

All endpoints are prefixed with `/api/v1/analytics`:

- `GET /dashboard` - Get dashboard data
- `GET /metrics` - Get fraud metrics
- `GET /metrics/precision-recall` - Get precision/recall metrics
- `GET /cohorts` - Get cohort analysis
- `GET /cohorts/compare` - Compare cohorts
- `GET /experiments/{id}/results` - Get experiment results
- `GET /drift/detect` - Detect feature drift
- `GET /drift/quality` - Check data quality
- `POST /replay` - Replay historical scenario
- `GET /explain/{decisionId}` - Get decision explanation
- `GET /pipeline/freshness` - Check pipeline freshness
- `GET /pipeline/completeness` - Check pipeline completeness
- `POST /export` - Export analytics data

## Deep Linking

The analytics microservice supports deep linking via URL parameters:

- `/analytics?id={investigationId}` - Filter by investigation
- `/analytics?timeWindow={window}` - Set time window (1h, 24h, 7d, 30d, 90d, all)
- `/analytics?startDate={iso}&endDate={iso}` - Set custom date range

## Event Bus Integration

The microservice publishes and subscribes to events:

- `analytics:navigate` - Navigation events
- `analytics:filter-changed` - Filter change events
- `analytics:deep-link` - Deep linking events

## Testing

```bash
# Frontend tests
cd olorin-front/src/microservices/analytics
npm test

# Backend tests
cd olorin-server
pytest app/service/analytics/
```

## Code Structure

```
analytics/
├── components/
│   ├── common/          # ErrorBoundary, LoadingState, EmptyState
│   ├── dashboard/       # Dashboard components
│   ├── metrics/         # Metrics display components
│   └── cohort/          # Cohort analysis components
├── hooks/               # React hooks (useAnalytics, useFilters, etc.)
├── services/            # API clients and event bus
├── types/               # TypeScript type definitions
├── utils/               # Formatters and validators
├── AnalyticsApp.tsx     # Main app component
├── bootstrap.tsx        # Module Federation entry
└── webpack.config.js    # Webpack configuration
```

## Contributing

1. Follow the coding standards: no hardcoded values, no mocks/stubs, files <200 lines
2. Use existing infrastructure (database provider, event bus, etc.)
3. Ensure all code is production-ready (no TODOs or placeholders)
4. Write tests for new functionality

## License

Part of the Olorin platform.

