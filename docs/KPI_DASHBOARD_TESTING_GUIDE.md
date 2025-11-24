# KPI Dashboard - Testing Guide

**Date**: 2025-01-31  
**Purpose**: End-to-End Testing Instructions

## Prerequisites

### Backend Setup
```bash
cd olorin-server

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Set environment variables
export KPI_DEFAULT_DATE_RANGE_DAYS=30
export DATABASE_URL="your_database_url"
```

### Frontend Setup
```bash
cd olorin-front

# Install dependencies (if not already installed)
npm install
```

## Test Execution

### 1. Unit Tests (Backend)

```bash
cd olorin-server

# Run KPI-specific tests
pytest tests/test_kpi_dashboard_e2e.py -v

# Expected output:
# ✅ test_kpi_daily_metrics_model PASSED
# ✅ test_kpi_threshold_sweep_model PASSED
# ✅ test_kpi_breakdown_model PASSED
# ✅ test_kpi_daily_metrics_response PASSED
# ✅ test_kpi_dashboard_response PASSED
# ✅ test_service_initialization PASSED
# ✅ test_get_dashboard_metrics_no_data PASSED
# ✅ test_get_current_tenant_from_scope PASSED
# ✅ test_check_kpi_permission_admin PASSED
# ✅ test_router_registration PASSED
```

### 2. Database Migration Test

```bash
cd olorin-server

# Test migration SQL syntax
psql $DATABASE_URL -f app/persistence/migrations/007_add_kpi_tables.sql --dry-run

# Or for SQLite:
sqlite3 test.db < app/persistence/migrations/007_add_kpi_tables.sql

# Verify tables created
psql $DATABASE_URL -c "\dt kpi_*"
```

### 3. Backend API Test

```bash
# Start backend server
cd olorin-server
uvicorn app.main:app --reload --port 8080

# In another terminal, test endpoints:

# 1. Get dashboard (requires auth token)
curl -X GET "http://localhost:8080/api/v1/kpi/dashboard/test_pilot" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with KPIDashboardResponse or 404 if no data

# 2. Get daily metrics
curl -X GET "http://localhost:8080/api/v1/kpi/daily/test_pilot?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# 3. Get threshold sweep
curl -X GET "http://localhost:8080/api/v1/kpi/threshold-sweep/test_pilot" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# 4. Get breakdowns
curl -X GET "http://localhost:8080/api/v1/kpi/breakdowns/test_pilot?breakdown_type=merchant" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 4. Frontend Component Test

```bash
cd olorin-front

# Start frontend dev server
npm start

# Navigate to:
# http://localhost:3000/investigations/poc/test_pilot/overview

# Expected behavior:
# - If no data: Shows "No Data Available" message
# - If data exists: Shows dashboard with tiles, charts, breakdowns
# - If error: Shows error message
```

### 5. Route Navigation Test

```bash
# Test navigation from home page
# 1. Navigate to: http://localhost:3000/
# 2. Click "KPI Dashboard" button
# 3. Should navigate to: /investigations/poc/default/overview

# Test direct route access
# Navigate to: http://localhost:3000/investigations/poc/test_pilot/overview
# Should load KPI dashboard for test_pilot
```

### 6. Error Handling Test

```bash
# Test missing pilot ID
# Navigate to: /investigations/poc//overview (empty pilot ID)
# Expected: Shows "Missing Pilot ID" error

# Test invalid pilot ID
# Navigate to: /investigations/poc/invalid_pilot/overview
# Expected: Shows "No Data Available" or API error

# Test without authentication
# Expected: 401 Unauthorized from API
```

## Test Data Setup

### Option 1: Use Test Data Script

```python
# Create test data in database
from app.models.kpi_models import KPIDailyMetrics, KPIThresholdSweep, KPIBreakdown
from app.persistence.database import get_db
from datetime import datetime, timedelta

db = next(get_db())

# Create daily metrics
metric = KPIDailyMetrics(
    pilot_id="test_pilot",
    tenant_id="test_tenant",
    metric_date=datetime.utcnow(),
    precision=0.95,
    recall=0.88,
    fpr=0.12,
    net_savings=125000.0,
    latency_p95=45.2,
    error_rate=0.003,
)

db.add(metric)
db.commit()
```

### Option 2: Use Nightly Aggregation Job

```bash
# Run nightly aggregation job (when implemented)
python scripts/nightly_kpi_aggregation.py --pilot-id test_pilot --tenant-id test_tenant
```

## Verification Checklist

### Backend
- [ ] Models can be instantiated
- [ ] Schemas validate correctly
- [ ] Service layer works
- [ ] Router endpoints respond
- [ ] Database queries execute
- [ ] Tenant scoping works
- [ ] RBAC permissions work

### Frontend
- [ ] Components render
- [ ] Routes navigate correctly
- [ ] API calls work
- [ ] Error handling works
- [ ] Loading states work
- [ ] Charts display (when data exists)
- [ ] Tiles display correctly

### Integration
- [ ] Backend and frontend communicate
- [ ] Authentication works
- [ ] Tenant isolation works
- [ ] Error messages display properly
- [ ] No data state handled correctly

## Expected Test Results

### With No Data
- Backend returns empty arrays and None values
- Frontend shows "No Data Available" message
- No errors or crashes

### With Test Data
- Backend returns populated response
- Frontend displays tiles with values
- Charts render with data points
- Breakdowns table shows rows

### With Errors
- Backend returns proper error responses
- Frontend displays error messages
- No fallback values used
- Proper error handling

## Troubleshooting

### Backend Issues
- **Import errors**: Check Python dependencies installed
- **Database errors**: Verify database connection and migration run
- **Auth errors**: Check JWT token and user scopes

### Frontend Issues
- **Route not found**: Verify route registered in InvestigationApp
- **API errors**: Check API base URL and authentication
- **Component errors**: Check imports and component structure

## Test Coverage Goals

- **Backend**: 87%+ coverage
- **Frontend**: Component rendering and interaction
- **Integration**: End-to-end flow
- **Error Cases**: All error paths tested

---

**Status**: ✅ **TEST SUITE READY**


