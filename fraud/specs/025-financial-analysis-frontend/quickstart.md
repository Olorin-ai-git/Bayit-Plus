# Quickstart: Financial Analysis Frontend Integration

**Feature**: 025-financial-analysis-frontend
**Date**: 2025-12-06

## Prerequisites

- Node.js 18+
- Python 3.11
- Backend server running on port 8090
- Frontend shell running on port 3000

## Environment Setup

### Backend (olorin-server)

No additional environment variables required - uses existing revenue configuration.

### Frontend (olorin-front)

Add to `.env`:

```bash
# Financial Analysis Feature
REACT_APP_FEATURE_ENABLE_FINANCIAL_ANALYSIS=true
REACT_APP_FINANCIAL_ANALYSIS_PORT=3007
REACT_APP_FINANCIAL_REFRESH_INTERVAL_MS=30000
REACT_APP_CURRENCY_CODE=USD
REACT_APP_CURRENCY_LOCALE=en-US
```

## Development Commands

### Start Backend

```bash
cd olorin-server
poetry run python -m app.local_server
```

### Start Frontend Services

```bash
cd olorin-front

# Start shell app
npm run start:shell

# Start investigation service (includes financial columns)
npm run start:investigation

# Start financial analysis microservice (new)
npm run start:financial-analysis
```

### Run Tests

```bash
# Frontend tests
cd olorin-front
npm test -- --coverage

# Backend tests
cd olorin-server
poetry run pytest test/unit/test_financial_router.py -v
```

## API Verification

### Check Financial Metrics Endpoint

```bash
curl http://localhost:8090/api/v1/financial/{investigation_id}/metrics
```

Expected response for completed investigation:

```json
{
  "investigationId": "abc-123",
  "revenueMetrics": {
    "savedFraudGmv": 10234.56,
    "lostRevenues": 7597.48,
    "netValue": 2637.08,
    "confidenceLevel": "high",
    "approvedFraudTxCount": 15,
    "blockedLegitTxCount": 8
  },
  "confusionMetrics": {
    "truePositives": 42,
    "falsePositives": 23,
    "precision": 0.646,
    "recall": 0.84
  },
  "calculatedAt": "2025-12-06T10:30:00Z"
}
```

### Check Financial Summary Endpoint

```bash
curl "http://localhost:8090/api/v1/financial/summary?investigation_ids=abc-123,def-456"
```

## Frontend Verification

1. Navigate to `http://localhost:3000/parallel`
2. Verify completed investigations show financial columns
3. Verify summary panel appears above table
4. Navigate to `http://localhost:3007/financial-analysis` for dashboard

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Financial columns show "-" | Investigation not completed or prediction validation failed |
| Summary panel not loading | Check API endpoint and network tab |
| Port 3007 not accessible | Run `npm run start:financial-analysis` |
| Currency format wrong | Check REACT_APP_CURRENCY_LOCALE setting |
