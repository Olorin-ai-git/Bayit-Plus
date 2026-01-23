# Quickstart Guide: Fraud Anomaly Detection Service

**Feature**: Fraud Anomaly Detection  
**Date**: 2025-11-09  
**Status**: Complete

## Overview

This guide provides step-by-step instructions to get started with the Fraud Anomaly Detection service, including setup, configuration, and basic usage.

## Prerequisites

- Python 3.11+ (backend)
- Node.js 18+ (frontend)
- PostgreSQL 14+ (metadata storage)
- Snowflake account with `marts_txn_window` table
- Existing olorin-server and olorin-front repositories

## Backend Setup

### 1. Install Dependencies

```bash
cd olorin-server
poetry add statsmodels scikit-learn pandas numpy apscheduler
poetry install
```

### 2. Environment Configuration

Create `.env` file or update existing with anomaly detection settings:

```bash
# =============================================================================
# Anomaly Detection Configuration (Optional - all have defaults)
# =============================================================================

# Detection Run Configuration
ANOMALY_DETECTION_RUN_INTERVAL_MINUTES=15

# Default Detector Parameters
ANOMALY_DEFAULT_K_THRESHOLD=3.0
ANOMALY_DEFAULT_PERSISTENCE=2
ANOMALY_DEFAULT_MIN_SUPPORT=100

# Severity Thresholds (Global Defaults)
ANOMALY_SEVERITY_INFO_MAX=2.0
ANOMALY_SEVERITY_WARN_MAX=4.0
ANOMALY_SEVERITY_CRITICAL_MIN=6.0

# Guardrails Configuration
ANOMALY_HYSTERESIS_RAISE_K=3.0
ANOMALY_HYSTERESIS_CLEAR_K=2.0
ANOMALY_COOLDOWN_MIN_MINUTES=5
ANOMALY_COOLDOWN_MAX_MINUTES=60

# STL+MAD Detector Defaults
ANOMALY_STL_PERIOD=7
ANOMALY_STL_ROBUST=true

# CUSUM Detector Defaults
ANOMALY_CUSUM_DELTA_MULTIPLIER=0.75
ANOMALY_CUSUM_THRESHOLD_MULTIPLIER=5.0

# Isolation Forest Defaults
ANOMALY_ISOFOREST_N_ESTIMATORS=100
ANOMALY_ISOFOREST_CONTAMINATION=0.1

# Scheduler Configuration (Optional)
ENABLE_SCHEDULED_DETECTION=true
ANOMALY_DETECTION_INTERVAL_MINUTES=15

# =============================================================================
# Database Configuration (Required)
# =============================================================================
DATABASE_PROVIDER=postgresql  # or snowflake
DATABASE_URL=postgresql://user:pass@localhost:5432/olorin

# PostgreSQL Configuration (if using PostgreSQL)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=olorin
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Snowflake Configuration (if using Snowflake provider)
SNOWFLAKE_ACCOUNT=your_account.region.snowflakecomputing.com
SNOWFLAKE_USER=your_user
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_TRANSACTIONS_TABLE=TRANSACTIONS_ENRICHED

# =============================================================================
# Optional: Skip Services on Startup Failure (for microservices isolation)
# =============================================================================
SKIP_DB_ON_STARTUP_FAILURE=false
SKIP_DB_PROVIDER_ON_STARTUP_FAILURE=false
SKIP_AGENT_ON_STARTUP_FAILURE=true
SKIP_ANOMALY_CONFIG_ON_STARTUP_FAILURE=true
```

### 3. Database Migration

Run Alembic migration to create anomaly detection tables:

```bash
cd olorin-server
poetry run alembic revision --autogenerate -m "add_anomaly_detection_tables"
poetry run alembic upgrade head
```

This creates:
- `detectors` table
- `detection_runs` table
- `anomaly_events` table

### 4. Start Backend Server

```bash
cd olorin-server
poetry run python -m app.local_server
```

Server starts on `http://localhost:8090`

## Frontend Setup

### 1. Install Dependencies

No new dependencies required (uses existing React, TypeScript, Tailwind).

### 2. Environment Configuration

Update `.env` or existing environment configuration:

```bash
# Analytics API (existing)
REACT_APP_API_BASE_URL=http://localhost:8090
REACT_APP_ANALYTICS_PORT=3008

# WebSocket (for anomaly streaming)
REACT_APP_WS_BASE_URL=ws://localhost:8090
```

### 3. Start Frontend Development Server

```bash
cd olorin-front
npm run dev:analytics
```

Analytics microservice starts on `http://localhost:3008`

## Basic Usage

### 1. Create a Detector

**Via API**:

```bash
curl -X POST http://localhost:8090/v1/analytics/detectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Decline Rate Monitor",
    "type": "stl_mad",
    "cohort_by": ["merchant_id", "channel", "geo"],
    "metrics": ["decline_rate"],
    "params": {
      "period": 672,
      "robust": true,
      "k": 3.5,
      "persistence": 2,
      "min_support": 50
    },
    "enabled": true
  }'
```

**Via Frontend**:

1. Navigate to `http://localhost:3008/analytics/detectors`
2. Click "Create Detector"
3. Fill in detector configuration form
4. Click "Save"

### 2. Run Detection Manually

**Via API**:

```bash
curl -X POST http://localhost:8090/v1/analytics/anomalies/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "detector_id": "550e8400-e29b-41d4-a716-446655440000",
    "window_from": "2025-11-09T00:00:00Z",
    "window_to": "2025-11-09T23:59:59Z"
  }'
```

**Via Frontend**:

1. Navigate to Detector Studio (`/analytics/detectors/:id`)
2. Click "Run Detection"
3. Select time window
4. Click "Execute"

### 3. View Anomalies

**Via API**:

```bash
curl "http://localhost:8090/v1/analytics/anomalies?severity=critical&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Via Frontend**:

1. Navigate to Anomaly Hub (`/analytics/anomalies`)
2. View anomaly list
3. Filter by severity, metric, cohort
4. Click anomaly to view details

### 4. Create Investigation from Anomaly

**Via API**:

```bash
curl -X POST http://localhost:8090/v1/analytics/anomalies/{anomaly_id}/investigate \
  -H "Authorization: Bearer <token>"
```

**Via Frontend**:

1. Navigate to Anomaly Hub
2. Click "Investigate" button on an anomaly
3. Review investigation parameters (pre-filled from anomaly)
4. Click "Create Investigation"

### 5. Stream Anomalies in Real-Time

**Via WebSocket**:

```javascript
const ws = new WebSocket('ws://localhost:8090/v1/stream/anomalies?token=<token>');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'anomaly') {
    console.log('New anomaly detected:', message.event);
  }
};

ws.send(JSON.stringify({
  type: 'subscribe',
  filters: {
    severity: ['critical', 'warn']
  }
}));
```

**Via Frontend**:

Anomaly Hub automatically connects to WebSocket and displays new anomalies in real-time.

## Scheduled Detection Runs

Scheduled detection runs start automatically when:

1. Detector is enabled (`enabled: true`)
2. `ANOMALY_DETECTION_ENABLED=true` in environment
3. Scheduler is running (starts with backend server)

Runs execute every `ANOMALY_DETECTION_INTERVAL_MINUTES` (default: 15 minutes).

## Configuration Reference

### Detector Parameters

**STL+MAD Detector**:
- `period` (int): Seasonality period in windows (default: 672 = 7 days at 15m)
- `robust` (bool): Use robust STL (default: true)
- `k` (float): Score threshold (default: 3.5)
- `persistence` (int): Required consecutive windows (default: 2)
- `min_support` (int): Minimum transactions per window (default: 50)

**CUSUM Detector**:
- `delta` (float): Shift detection sensitivity (default: 0.75 * std)
- `threshold` (float): Alert threshold (default: 5 * std)
- `k` (float): Score threshold (default: 3.5)
- `persistence` (int): Required consecutive windows (default: 2)
- `min_support` (int): Minimum transactions per window (default: 50)

**Isolation Forest Detector**:
- `n_estimators` (int): Number of trees (default: 200)
- `contamination` (float): Expected anomaly rate (default: 0.005)
- `k` (float): Score threshold (default: 3.5)
- `persistence` (int): Required consecutive windows (default: 2)
- `min_support` (int): Minimum transactions per window (default: 50)

### Severity Thresholds

Global defaults (can be overridden per detector):

- **info**: score 2.0 - 3.0
- **warn**: score 3.0 - 4.5
- **critical**: score > 4.5

## Troubleshooting

### Detection Runs Fail

1. Check Snowflake connection: Verify `SNOWFLAKE_*` environment variables
2. Check database connection: Verify `DATABASE_URL` is correct
3. Check logs: Review backend logs for error messages
4. Verify detector configuration: Ensure detector params are valid

### No Anomalies Detected

1. Check detector is enabled: `enabled: true`
2. Check time window: Ensure data exists for selected window
3. Check min_support: Ensure cohorts have >= min_support transactions
4. Check score thresholds: Lower `k` if too strict

### WebSocket Connection Issues

1. Check WebSocket URL: Verify `REACT_APP_WS_BASE_URL` is correct
2. Check authentication: Ensure token is valid
3. Check CORS: Verify backend CORS allows frontend origin
4. Check network: Verify firewall allows WebSocket connections

### Frontend Not Loading

1. Check API URL: Verify `REACT_APP_API_BASE_URL` is correct
2. Check port: Verify analytics microservice is running on correct port
3. Check browser console: Review for JavaScript errors
4. Check network tab: Verify API requests are successful

## Next Steps

- Read [Data Model](./data-model.md) for detailed entity definitions
- Review [API Contracts](./contracts/api.yaml) for complete API reference
- Check [WebSocket Contracts](./contracts/websocket.md) for real-time event details
- See [Implementation Plan](./plan.md) for architecture details

## Support

For issues or questions:
- Check backend logs: `olorin-server/logs/`
- Check frontend console: Browser developer tools
- Review API documentation: `http://localhost:8090/docs` (Swagger UI)

