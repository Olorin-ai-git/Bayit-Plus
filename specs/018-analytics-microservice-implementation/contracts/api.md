# API Contracts: Analytics Microservice

**Feature**: Analytics Microservice  
**Date**: 2025-11-08  
**Status**: Complete

## Base URL

```
Backend: http://localhost:8090/api/v1/analytics
Frontend: http://localhost:3008
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Endpoints

### Dashboard & KPIs

#### GET /dashboard

Get analytics dashboard data including KPIs and trends.

**Query Parameters**:
- `startDate` (optional): ISO 8601 timestamp
- `endDate` (optional): ISO 8601 timestamp
- `timeWindow` (optional): `1h` | `24h` | `7d` | `30d` | `90d` | `all`
- `investigationId` (optional): Filter by investigation ID

**Response**: `AnalyticsDashboardResponse`

```json
{
  "kpis": {
    "precision": 0.85,
    "recall": 0.92,
    "f1Score": 0.88,
    "captureRate": 0.92,
    "approvalRate": 0.75,
    "falsePositiveCost": 12500.50,
    "chargebackRate": 0.02,
    "decisionThroughput": 45.2
  },
  "trends": [
    {
      "metric": "precision",
      "dataPoints": [
        { "timestamp": "2025-11-01T00:00:00Z", "value": 0.83 },
        { "timestamp": "2025-11-02T00:00:00Z", "value": 0.85 }
      ]
    }
  ],
  "recentDecisions": [...],
  "pipelineHealth": [...]
}
```

### Fraud Metrics

#### GET /metrics

Get fraud detection metrics for a time period.

**Query Parameters**:
- `startDate` (required): ISO 8601 timestamp
- `endDate` (required): ISO 8601 timestamp
- `includeLatency` (optional): boolean, default true
- `includeThroughput` (optional): boolean, default true

**Response**: `FraudMetrics`

#### GET /metrics/precision-recall

Get precision, recall, and F1 score.

**Query Parameters**: Same as `/metrics`

**Response**:
```json
{
  "precision": 0.85,
  "recall": 0.92,
  "f1Score": 0.88,
  "truePositives": 920,
  "falsePositives": 150,
  "trueNegatives": 8500,
  "falseNegatives": 80
}
```

### Cohort Analysis

#### GET /cohorts

Get cohort analysis for a dimension.

**Query Parameters**:
- `dimension` (required): `merchant` | `channel` | `geography` | `device` | `risk_band` | `model_version` | `rule_version`
- `startDate` (required): ISO 8601 timestamp
- `endDate` (required): ISO 8601 timestamp
- `minCount` (optional): Minimum transactions per cohort, default 100

**Response**: `CohortAnalysisResponse`

#### GET /cohorts/compare

Compare multiple cohorts side-by-side.

**Query Parameters**:
- `cohortIds` (required): Comma-separated cohort IDs
- `metrics` (optional): Comma-separated metric names

**Response**:
```json
{
  "cohorts": [
    {
      "id": "cohort-1",
      "name": "Merchant A",
      "metrics": {...}
    }
  ],
  "comparison": {
    "bestPerformer": {...},
    "worstPerformer": {...}
  }
}
```

### Experiments

#### GET /experiments

List all experiments.

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Default 50
- `offset` (optional): Default 0

**Response**:
```json
{
  "experiments": [...],
  "total": 25
}
```

#### POST /experiments

Create a new experiment.

**Request Body**: `Experiment` (without id, status, createdAt, updatedAt)

**Response**: `Experiment`

#### GET /experiments/{experimentId}

Get experiment details.

**Response**: `Experiment`

#### PUT /experiments/{experimentId}

Update experiment.

**Request Body**: Partial `Experiment`

**Response**: `Experiment`

#### POST /experiments/{experimentId}/promote

Promote winning variant to production.

**Request Body**:
```json
{
  "variantId": "variant-a",
  "confirmation": true
}
```

**Response**:
```json
{
  "status": "promoted",
  "impactEstimate": {...}
}
```

### Drift Detection

#### GET /drift

Get drift metrics for features.

**Query Parameters**:
- `featureNames` (optional): Comma-separated feature names
- `startDate` (required): ISO 8601 timestamp
- `endDate` (required): ISO 8601 timestamp

**Response**:
```json
{
  "driftMetrics": [
    {
      "featureName": "transaction_amount",
      "psi": 0.32,
      "klDivergence": 0.15,
      "driftDetected": true,
      "driftSeverity": "high"
    }
  ]
}
```

#### GET /drift/data-quality

Get data quality metrics.

**Query Parameters**: Same as `/drift`

**Response**:
```json
{
  "qualityMetrics": {
    "nullRate": 0.02,
    "schemaConformant": true,
    "labelDelayHours": 48.5,
    "rangeViolations": 0
  }
}
```

### Replay & Backtest

#### GET /replay/scenarios

List replay scenarios.

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Default 50

**Response**:
```json
{
  "scenarios": [...],
  "total": 10
}
```

#### POST /replay/scenarios

Create a replay scenario.

**Request Body**:
```json
{
  "name": "Test new threshold",
  "timeWindow": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-31T23:59:59Z"
  },
  "overrides": {
    "thresholds": {
      "fraud_threshold": 0.8
    }
  }
}
```

**Response**: `ReplayScenario`

#### GET /replay/scenarios/{scenarioId}

Get replay scenario status and results.

**Response**: `ReplayScenario`

#### POST /replay/scenarios/{scenarioId}/run

Start replay execution.

**Response**:
```json
{
  "status": "running",
  "estimatedCompletionTime": "2025-11-08T15:30:00Z"
}
```

#### GET /replay/scenarios/{scenarioId}/results

Get replay results comparison.

**Response**: `ReplayResults`

### Explainability

#### GET /explain/{decisionId}

Get feature attribution for a decision.

**Response**: `FeatureAttribution`

#### GET /explain/cohort/{cohortId}/top-drivers

Get top drivers for a cohort.

**Query Parameters**:
- `limit` (optional): Default 10

**Response**:
```json
{
  "cohortId": "cohort-1",
  "topDrivers": [
    {
      "feature": "transaction_amount",
      "contribution": 0.35,
      "importance": 0.35
    }
  ]
}
```

#### GET /explain/confusion-matrix

Get confusion matrix over time.

**Query Parameters**:
- `startDate` (required): ISO 8601 timestamp
- `endDate` (required): ISO 8601 timestamp
- `granularity` (optional): `hour` | `day` | `week`, default `day`

**Response**:
```json
{
  "matrix": [
    {
      "timestamp": "2025-11-01T00:00:00Z",
      "truePositives": 920,
      "falsePositives": 150,
      "trueNegatives": 8500,
      "falseNegatives": 80
    }
  ]
}
```

### Observability

#### GET /pipeline/health

Get pipeline health metrics.

**Query Parameters**:
- `pipelineId` (optional): Filter by pipeline
- `stage` (optional): Filter by stage

**Response**:
```json
{
  "pipelines": [
    {
      "pipelineId": "stream-analytics",
      "status": "healthy",
      "freshnessSeconds": 120,
      "completeness": 0.995
    }
  ]
}
```

#### GET /audit/logs

Get audit logs.

**Query Parameters**:
- `userId` (optional): Filter by user
- `action` (optional): Filter by action
- `startDate` (optional): ISO 8601 timestamp
- `endDate` (optional): ISO 8601 timestamp
- `limit` (optional): Default 100

**Response**:
```json
{
  "logs": [...],
  "total": 500
}
```

### Export

#### POST /export

Export analytics data.

**Request Body**:
```json
{
  "format": "csv" | "json" | "pdf",
  "dataType": "metrics" | "cohorts" | "experiments" | "decisions",
  "filters": {
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2025-11-08T00:00:00Z"
  },
  "includeCharts": true
}
```

**Response**: File download (Content-Type based on format)

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "Invalid date range",
  "details": {...}
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "requestId": "req-123"
}
```

### 503 Service Unavailable
```json
{
  "error": "service_unavailable",
  "message": "Analytics pipeline is down",
  "retryAfter": 60
}
```

## Rate Limiting

- Default: 100 requests per minute per user
- Export endpoints: 10 requests per hour per user
- Replay endpoints: 5 requests per hour per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1636387200
```

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `limit`: Number of items per page (default 50, max 1000)
- `offset`: Number of items to skip (default 0)

**Response Headers**:
```
X-Total-Count: 1250
X-Page-Limit: 50
X-Page-Offset: 0
```

## WebSocket Events

### Real-time Updates

Connect to: `ws://localhost:8090/ws/analytics`

**Subscribe to Events**:
```json
{
  "action": "subscribe",
  "events": ["fraud:decision", "metrics:updated", "pipeline:health"]
}
```

**Event: fraud:decision**
```json
{
  "event": "fraud:decision",
  "data": {
    "decision": {...},
    "metrics": {...}
  }
}
```

**Event: metrics:updated**
```json
{
  "event": "metrics:updated",
  "data": {
    "kpis": {...},
    "timestamp": "2025-11-08T12:00:00Z"
  }
}
```

**Event: pipeline:health**
```json
{
  "event": "pipeline:health",
  "data": {
    "pipelineId": "stream-analytics",
    "status": "degraded",
    "alerts": [...]
  }
}
```

