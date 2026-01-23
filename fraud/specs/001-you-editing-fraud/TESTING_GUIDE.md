# Investigation Comparison Feature - Testing Guide

**Feature**: Investigation Comparison Pipeline  
**Date**: 2025-01-27  
**Status**: ✅ Tests Created

## Test Files Created

### Frontend E2E Tests (Playwright)

**File**: `olorin-front/src/shared/testing/e2e/investigation-comparison.e2e.test.ts`

**Test Coverage**:
1. ✅ Display comparison page with controls
2. ✅ Run comparison with default presets
3. ✅ Display delta metrics when comparison completes
4. ✅ Allow custom window selection
5. ✅ Navigate from investigations-management page
6. ✅ Limit selection to 2 investigations
7. ✅ Export comparison results as JSON
8. ✅ Handle empty state gracefully

**Run Tests**:
```bash
cd olorin-front
npx playwright test investigation-comparison.e2e.test.ts
```

**Run with UI**:
```bash
npx playwright test investigation-comparison.e2e.test.ts --ui
```

**Run specific test**:
```bash
npx playwright test investigation-comparison.e2e.test.ts -g "should display comparison page"
```

### Backend Integration Test

**File**: `olorin-server/scripts/test_investigation_comparison.py`

**Test Coverage**:
1. ✅ Fetch existing investigations from database
2. ✅ Find two investigations with matching entities
3. ✅ Run comparison between them
4. ✅ Validate response structure
5. ✅ Validate metrics calculation
6. ✅ Validate delta computation (B - A)
7. ✅ Validate summary generation

**Run Test**:
```bash
cd olorin-server
poetry run python scripts/test_investigation_comparison.py
```

**Requirements**:
- At least 2 investigations in database
- Investigations must have:
  - `entity_type` (email, phone, device_id, ip, account_id, card_fingerprint, merchant_id)
  - `entity_id` (the actual entity value)
  - `from` (ISO 8601 datetime)
  - `to` (ISO 8601 datetime)
- Both investigations should have the same `entity_type` and `entity_id` for meaningful comparison

## Prerequisites

### Frontend Tests

1. **Start Frontend Server**:
   ```bash
   cd olorin-front
   npm run dev:shell
   # or
   npm run dev:all-services
   ```

2. **Start Backend Server**:
   ```bash
   cd olorin-server
   poetry run python -m app.local_server
   ```

3. **Install Playwright** (if not already installed):
   ```bash
   cd olorin-front
   npx playwright install
   ```

### Backend Tests

1. **Ensure Backend is Running**:
   ```bash
   cd olorin-server
   poetry run python -m app.local_server
   ```

2. **Ensure Database Connection**:
   - Database provider configured (Snowflake/PostgreSQL)
   - Connection credentials in `.env` file

3. **Ensure Test Data**:
   - At least 2 investigations with matching entities
   - Investigations with time windows (`from` and `to` fields)

## Creating Test Data

### Option 1: Use Existing Investigations

If you have existing investigations in the database, the backend test will automatically:
1. Fetch all investigations
2. Filter those with entity_type, entity_id, from, and to
3. Find pairs with matching entities
4. Run comparison

### Option 2: Create Test Investigations via API

```bash
# Create Investigation A
curl -X POST http://localhost:8090/api/investigation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "test-inv-a",
    "entity_type": "email",
    "entity_id": "test@example.com",
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-15T00:00:00Z",
    "name": "Test Investigation A"
  }'

# Create Investigation B (same entity, different time window)
curl -X POST http://localhost:8090/api/investigation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "test-inv-b",
    "entity_type": "email",
    "entity_id": "test@example.com",
    "from": "2024-07-01T00:00:00Z",
    "to": "2024-07-15T00:00:00Z",
    "name": "Test Investigation B"
  }'
```

## Test Execution

### Frontend E2E Tests

**All Tests**:
```bash
cd olorin-front
npx playwright test investigation-comparison.e2e.test.ts
```

**With Debugging**:
```bash
npx playwright test investigation-comparison.e2e.test.ts --debug
```

**With UI Mode** (Recommended):
```bash
npx playwright test investigation-comparison.e2e.test.ts --ui
```

**View Results**:
```bash
npx playwright show-report
```

### Backend Integration Test

**Run Test**:
```bash
cd olorin-server
poetry run python scripts/test_investigation_comparison.py
```

**Expected Output**:
```
============================================================
Investigation Comparison Backend Test
============================================================

1. Fetching investigations...
Found 5 total investigations
Found 3 investigations with entity and time window

2. Finding comparable investigations...
Found 2 investigations for entity email:test@example.com
✅ Found comparable pair:
   Investigation A: inv-001 (Test Investigation A)
   Investigation B: inv-002 (Test Investigation B)
   Entity: email:test@example.com

3. Running comparison...
Running comparison:
  Entity: email:test@example.com
  Window A: 2024-01-01T00:00:00Z to 2024-01-15T00:00:00Z
  Window B: 2024-07-01T00:00:00Z to 2024-07-15T00:00:00Z
✅ Comparison test passed!
  Window A: 150 transactions, precision=0.750, recall=0.600
  Window B: 180 transactions, precision=0.720, recall=0.650
  Delta: precision=-0.030, recall=+0.050

4. Test Results:
============================================================
{
  "status": "success",
  "investigation_a": "inv-001",
  "investigation_b": "inv-002",
  ...
}

✅ All tests passed!
```

## Test Validation

### Frontend Tests Validate

- ✅ Page loads correctly
- ✅ Controls are visible and functional
- ✅ Comparison runs successfully
- ✅ Results display correctly
- ✅ Delta metrics show correctly
- ✅ Export functionality works
- ✅ Integration with investigations-management works
- ✅ Selection limiting works (max 2)
- ✅ Empty states handled gracefully

### Backend Tests Validate

- ✅ Response structure is correct
- ✅ All required fields present
- ✅ Metrics calculated correctly
- ✅ Delta computation correct (B - A)
- ✅ Summary generated and non-empty
- ✅ Per-merchant breakdown (if requested)
- ✅ Histograms (if requested)
- ✅ Timeseries (if requested)

## Troubleshooting

### Frontend Tests Fail

**Issue**: Page not loading
- **Solution**: Ensure frontend server is running on `http://localhost:3000`
- **Check**: `npm run dev:shell` or `npm run dev:all-services`

**Issue**: API calls failing
- **Solution**: Ensure backend server is running on `http://localhost:8090`
- **Check**: `poetry run python -m app.local_server`

**Issue**: Elements not found
- **Solution**: Check browser console for errors
- **Check**: Run with `--debug` flag to see what's happening

### Backend Tests Fail

**Issue**: No investigations found
- **Solution**: Create test investigations (see "Creating Test Data" above)
- **Check**: Verify investigations have `entity_type`, `entity_id`, `from`, `to`

**Issue**: No matching entity pairs
- **Solution**: Create investigations with same `entity_type` and `entity_id`
- **Check**: Verify both investigations have matching entities

**Issue**: Database connection error
- **Solution**: Check database credentials in `.env` file
- **Check**: Verify database provider is configured correctly

**Issue**: Import errors
- **Solution**: Ensure running in poetry environment: `poetry run python`
- **Check**: Verify all dependencies installed: `poetry install`

## Continuous Integration

### GitHub Actions

Tests can be integrated into CI/CD pipeline:

```yaml
# .github/workflows/test-comparison.yml
name: Test Investigation Comparison

on: [push, pull_request]

jobs:
  frontend-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd olorin-front && npm install
      - run: npx playwright install
      - run: npx playwright test investigation-comparison.e2e.test.ts

  backend-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: cd olorin-server && poetry install
      - run: poetry run python scripts/test_investigation_comparison.py
```

## Next Steps

1. ✅ **Tests Created**: Frontend E2E and backend integration tests
2. ⏭️ **Run Tests**: Execute tests against real environment
3. ⏭️ **Fix Issues**: Address any test failures
4. ⏭️ **Add More Tests**: Expand coverage as needed
5. ⏭️ **CI Integration**: Add to CI/CD pipeline

---

**Test Status**: ✅ **READY FOR EXECUTION**

