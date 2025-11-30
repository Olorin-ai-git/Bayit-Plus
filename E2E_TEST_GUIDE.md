# Parallel Investigations E2E Test Guide

## Overview

Comprehensive end-to-end tests for the Parallel Investigations monitoring feature using Playwright.

**Test Location**: `olorin-front/src/shared/testing/e2e/parallel-investigations.e2e.test.ts`

**Total Tests**: 20 comprehensive scenarios covering:
- API endpoint availability
- Investigation list retrieval
- Frontend rendering
- Navigation and interaction
- Real-time updates
- Error handling
- Performance
- Accessibility
- Responsive design
- Full integration workflows

---

## Prerequisites

### 1. Install Dependencies

```bash
# Frontend
cd olorin-front
npm install -D @playwright/test

# Backend (for test data generation)
cd olorin-server
poetry install
```

### 2. Environment Setup

Create `.env` files for test configuration:

**Frontend (`olorin-front/.env.test`)**:
```bash
REACT_APP_API_BASE_URL=http://localhost:8090
REACT_APP_BASE_URL=http://localhost:3000
REACT_APP_FRONTEND_PORT=3000
```

**Backend (`olorin-server/.env.test`)**:
```bash
APP_ENV=test
BACKEND_PORT=8090
DATABASE_URL=sqlite:///./test_olorin.db
```

### 3. Seed Test Data

Before running tests, populate the database with test investigations:

```bash
cd olorin-server

# Clear existing data and create 10 test investigations
poetry run python -m app.scripts.seed_investigations --count 10 --clear
```

---

## Running Tests

### Option 1: Full Test Suite (Recommended)

Runs all tests with all browsers:

```bash
cd olorin-front

# Run all tests in parallel
npm run test:e2e

# Or using Playwright directly
npx playwright test src/shared/testing/e2e/parallel-investigations.e2e.test.ts
```

### Option 2: Single Browser

Run tests in a specific browser only:

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit
```

### Option 3: Watch Mode

Automatically re-run tests when files change:

```bash
npx playwright test --watch
```

### Option 4: Debug Mode

Run tests with browser visible and inspector:

```bash
npx playwright test --debug
```

### Option 5: Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Option 6: Single Test

Run a specific test:

```bash
npx playwright test -g "should navigate to /parallel route"
```

### Option 7: With Reporter UI

```bash
npx playwright test
npx playwright show-report
```

---

## Test Scenarios

### API Tests (Tests 1-2, 11-15)

**Test 1: API Endpoints Availability**
- Verifies `/api/v1/investigation-state/` endpoint responds
- Verifies `/api/v1/investigation-state/statistics` endpoint responds
- Confirms both return 200 OK

**Test 2: List All Investigations**
- Calls GET `/api/v1/investigation-state/?page=1&page_size=50`
- Verifies paginated response structure
- Confirms investigations array is populated

**Test 11: Create Investigation Endpoint**
- Tests POST `/api/v1/investigation-state/`
- Creates new investigation
- Verifies 201 Created response
- Confirms investigation_id is returned
- Cleans up created investigation

**Test 12: Lifecycle Endpoints**
- Tests POST `/api/v1/investigation-state/{id}/start`
- Tests POST `/api/v1/investigation-state/{id}/complete`
- Verifies status transitions work
- Confirms proper responses

**Test 13: Findings Endpoints**
- Tests GET `/api/v1/investigation-state/{id}/findings`
- Tests POST `/api/v1/investigation-state/{id}/findings`
- Verifies findings management works

**Test 14: Error Handling**
- Verifies 404 response for non-existent investigation
- Confirms proper error handling

**Test 15: Statistics Endpoint**
- Tests GET `/api/v1/investigation-state/statistics`
- Verifies investigation statistics retrieval

### Frontend UI Tests (Tests 3-10, 16-19)

**Test 3: Route Navigation**
- Navigates to `/parallel` route
- Confirms URL contains `/parallel`
- Verifies page loads without errors

**Test 4: Page Rendering**
- Waits for table/grid to render
- Confirms investigation list is displayed
- Verifies component mounts successfully

**Test 5: Data Display**
- Verifies investigation data displays in table
- Confirms row count matches API response
- Checks table headers are present

**Test 6: Status Styling**
- Verifies status indicators have color classes
- Confirms visual indicators are applied
- Checks for proper styling classes

**Test 7: Refresh Button**
- Verifies refresh button exists
- Clicks refresh button
- Confirms page remains functional after refresh
- Checks for loading indicator during refresh

**Test 8: Row Navigation**
- Clicks investigation row
- Verifies navigation to investigation details page
- Confirms ID is preserved in URL

**Test 9: Loading State**
- Simulates slow network
- Verifies loading state is shown
- Confirms error handling works

**Test 10: Empty State**
- Tests behavior with no investigations
- Verifies "No investigations" message displays
- Confirms proper empty state UI

**Test 16: Accessibility**
- Checks for proper ARIA roles
- Verifies buttons are accessible
- Confirms semantic HTML structure

**Test 17: Responsive Design**
- Sets mobile viewport (375x812)
- Confirms page is responsive
- Verifies table is usable on mobile

**Test 18: Offline Handling**
- Sets network to offline
- Verifies page handles offline state
- Confirms UI remains visible offline
- Returns to online mode

**Test 19: Auto-Refresh**
- Monitors "Last Updated" timestamp
- Waits 12 seconds
- Verifies data auto-refreshes
- Confirms polling works correctly

### Integration Tests (Test 20)

**Test 20: Full Integration Workflow**
1. Creates investigation via API
2. Navigates to Parallel Investigations page
3. Verifies investigation appears in list
4. Starts investigation via API
5. Refreshes page to see updated status
6. Cleans up test data

---

## Expected Results

All 20 tests should pass with output similar to:

```
parallel-investigations.e2e.test.ts (20 passed)
✓ 1. API endpoints should be available (2s)
✓ 2. Should list all investigations (1s)
✓ 3. Should navigate to /parallel route (3s)
✓ 4. ParallelInvestigationsPage should render (2s)
✓ 5. Should display investigation data in table (2s)
✓ 6. Should show investigation status colors (1s)
✓ 7. Should have working refresh button (2s)
✓ 8. Should navigate to investigation details on row click (2s)
✓ 9. Should handle loading state gracefully (3s)
✓ 10. Should show "No investigations" message when empty (1s)
✓ 11. API: Create investigation endpoint (1s)
✓ 12. API: Lifecycle endpoints (start, complete) (1s)
✓ 13. API: Findings endpoints (1s)
✓ 14. API: Error handling - 404 on missing investigation (1s)
✓ 15. Performance: Page load time should be reasonable (3s)
✓ 16. Accessibility: Page should have proper ARIA labels (2s)
✓ 17. Responsive design: Should work on mobile viewport (2s)
✓ 18. Should handle network errors gracefully (2s)
✓ 19. Should auto-refresh data at configured interval (15s)
✓ 20. Full integration test: Create, navigate, and monitor (5s)

Total: 20 passed (45s)
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Find process using port 8090
lsof -i :8090

# Kill process
kill -9 <PID>
```

### Database Lock

```bash
# Remove test database lock
rm olorin-server/test_olorin.db*
```

### Playwright Browser Issues

```bash
# Install browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

### API Connection Errors

```bash
# Verify backend is running
curl http://localhost:8090/health

# Check backend logs
tail -f olorin-server/logs/backend.log

# Verify frontend config
grep REACT_APP_API_BASE_URL olorin-front/.env
```

### Test Timeout Issues

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 10 * 60 * 1000, // 10 minutes instead of 5
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Performance Benchmarks

Expected performance metrics:

| Metric | Expected | Actual |
|--------|----------|--------|
| Page Load Time | < 3s | - |
| API Response Time | < 500ms | - |
| Data Render Time | < 1s | - |
| Refresh Button Response | < 500ms | - |
| Navigation Time | < 1s | - |

---

## Test Coverage

**Feature Coverage**:
- ✅ API Endpoints (6 endpoints tested)
- ✅ Frontend Navigation
- ✅ Data Display and Rendering
- ✅ User Interactions
- ✅ Error Handling
- ✅ Performance
- ✅ Accessibility
- ✅ Responsive Design
- ✅ Offline Handling
- ✅ Real-time Updates

**Browser Coverage**:
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit/Safari (Desktop)
- ✅ Mobile Chrome
- ✅ Mobile Safari

---

## Files Generated

- `playwright-report/index.html` - Visual test report
- `test-results/results.json` - Machine-readable results
- `test-results/junit.xml` - CI/CD compatible format
- `test-results/videos/` - Video recordings (on failure)
- `test-results/screenshots/` - Screenshot artifacts

---

## Next Steps

1. **Run Tests Locally**: Execute all tests with `npm run test:e2e`
2. **Review Reports**: Open `playwright-report/index.html` in browser
3. **Fix Failures**: Address any test failures
4. **CI Integration**: Add to GitHub Actions or similar
5. **Continuous Monitoring**: Schedule regular test runs

---

## Support

For issues or questions:

1. Check test output and screenshots in `playwright-report/`
2. Review Playwright documentation: https://playwright.dev
3. Check backend logs: `olorin-server/logs/backend.log`
4. Verify configuration in `.env` files

---

**Last Updated**: November 30, 2025
**Playwright Version**: @playwright/test latest
**Test Count**: 20 comprehensive scenarios
**Estimated Runtime**: 45-60 seconds (all browsers)
