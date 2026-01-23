# Quickstart: Robust E2E Testing Setup & Execution

**Branch**: `001-robust-e2e-testing` | **Version**: 1.0.0 | **Updated**: 2025-11-04

## Prerequisites

- **Node.js**: 18+ LTS
- **npm**: 8+
- **Playwright**: 1.40+ (auto-installed by npm)
- **Backend Service**: Running on `http://localhost:8090` (configurable)
- **Frontend Service**: Running on `http://localhost:3000` (configurable)

## Installation

### 1. Install Dependencies

```bash
cd olorin-front
npm install
npm install @playwright/test --save-dev  # Already in package.json
npx playwright install                   # Install browsers for Playwright
```

### 2. Verify Installation

```bash
npx playwright --version    # Should show >= 1.40
npm list @playwright/test   # Verify package installed
```

## Configuration

### Environment Variables

All configuration is **environment-driven** using variables. Create a `.env.test` file or export them:

```bash
# Frontend Configuration
export PLAYWRIGHT_TEST_BASE_URL="http://localhost:3000"

# Backend Configuration
export PLAYWRIGHT_BACKEND_BASE_URL="http://localhost:8090"

# Investigation Timeouts (milliseconds)
export PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS="120000"  # 120 seconds
export PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS="1000"             # 1 second
export PLAYWRIGHT_EVENTS_POLL_INTERVAL_MS="1000"               # 1 second

# Logging & Debugging
export PLAYWRIGHT_ENABLE_VERBOSE_LOGGING="true"   # Set false in CI
export PLAYWRIGHT_ENABLE_MOBILE_TESTS="false"     # Enable if testing mobile

# Retry & Resilience
export PLAYWRIGHT_MAX_RETRIES="3"
export PLAYWRIGHT_BACKOFF_BASE_MS="100"
export PLAYWRIGHT_BACKOFF_MAX_MS="10000"

# Server Logs (optional)
export PLAYWRIGHT_LOG_FETCH_METHOD="both"          # 'http', 'shell', or 'both'
# export PLAYWRIGHT_LOG_FETCH_CMD="docker logs olorin-server"  # Shell command (optional)
export PLAYWRIGHT_SKIP_SERVER_LOG_ASSERTIONS="false"

# Debug Limits
export PLAYWRIGHT_MAX_BUTTONS_TO_DEBUG="10"
export PLAYWRIGHT_MAX_FINDINGS_TO_LOG="5"
export PLAYWRIGHT_MAX_TEXT_TRUNCATE_LENGTH="100"
```

### Configuration Load Order

1. **Environment Variables** (highest priority)
2. **`.env.test`** file (if present)
3. **`.env`** file (if present)
4. **Defaults** in `playwright.config.ts` (lowest priority)

## Running Tests Locally

### 1. Start Services

**Terminal 1 - Frontend**:
```bash
cd olorin-front
npm run dev:shell        # Start development server on :3000
# or for microservices:
npm run dev:all-services # Start all 6 microservices
```

**Terminal 2 - Backend**:
```bash
cd olorin-server
poetry run python -m app.local_server  # Start on :8090
```

### 2. Run E2E Tests

**All Tests (All Browsers)**:
```bash
npx playwright test

# Output:
# Running 7 tests using 8 workers
#
# ✓ investigation-state-mgmt.e2e.test.ts
# ✓ trigger-investigation.spec.ts
# ✓ verify-progress-and-events.spec.ts
# ...
#
# 7 passed (45s)
```

**Single Test File**:
```bash
npx playwright test src/shared/testing/e2e/investigation-state-mgmt.e2e.test.ts
```

**Single Test (by name)**:
```bash
npx playwright test -g "complete investigation lifecycle"
```

**Specific Browser**:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**With Verbose Logging**:
```bash
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=true npx playwright test
```

**Debug Mode** (Interactive):
```bash
npx playwright test --debug

# Browser opens with:
# - Step-through debugging
# - Live HTML inspector
# - Locator picker
```

**UI Mode** (Recommended for Development):
```bash
npx playwright test --ui

# Opens interactive test explorer with:
# - Test browser preview
# - Live locator inspector
# - Time-travel debugging
```

### 3. View Test Results

**HTML Report**:
```bash
npx playwright show-report
# Opens browser to: file:///.../olorin-front/playwright-report/index.html
```

**JSON Results** (for CI/CD):
```bash
cat test-results/results.json | jq .

# Shows:
# - Pass/fail status
# - Timings
# - Error details
# - Artifacts (screenshots, videos, traces)
```

**JUnit XML** (for CI):
```bash
cat test-results/junit.xml
# Jenkins, GitLab CI, GitHub Actions compatible
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests
on:
  push:
    branches: [main, 'dev/**']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      backend:
        image: olorin-server:latest
        ports:
          - 8090:8090
        env:
          APP_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm install
      - run: npx playwright install --with-deps

      - name: Run E2E Tests
        env:
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
          PLAYWRIGHT_BACKEND_BASE_URL: http://localhost:8090
          PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS: 180000
          PLAYWRIGHT_ENABLE_VERBOSE_LOGGING: false
          CI: true
        run: npx playwright test

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

      - name: Publish JUnit Results
        if: always()
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: test-results/junit.xml
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
e2e-tests:
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  services:
    - name: olorin-server:latest
      alias: backend
  variables:
    PLAYWRIGHT_TEST_BASE_URL: "http://localhost:3000"
    PLAYWRIGHT_BACKEND_BASE_URL: "http://backend:8090"
    PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS: "180000"
  script:
    - npm install
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    reports:
      junit: test-results/junit.xml
  retry: 1
```

## Common Tasks

### Check Configuration Validity

```bash
node -e "
  require('dotenv').config({ path: '.env.test' });
  const { loadPlaywrightTestConfig } = require('./src/shared/testing/config');
  try {
    const config = loadPlaywrightTestConfig();
    console.log('✅ Configuration valid:', config);
  } catch (e) {
    console.error('❌ Configuration invalid:', e.message);
    process.exit(1);
  }
"
```

### Extract Investigation ID from Last Test Run

```bash
# From HTML report
grep -o 'inv_[a-zA-Z0-9]*' playwright-report/index.html | head -1

# From test output logs
grep -o 'investigationId.*[a-zA-Z0-9]*' test-results/*.log | head -1
```

### Test a Specific Investigation ID

```bash
# Modify test to use static ID (for debugging):
# Uncomment in test file: const investigationId = 'inv_abc123';

npx playwright test -g "complete investigation lifecycle"
```

### Capture Detailed Logs

```bash
# Enable all debug output
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=true \
  DEBUG=pw:api \
  npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Test Mobile Responsiveness

```bash
PLAYWRIGHT_ENABLE_MOBILE_TESTS=true npx playwright test --project="Mobile Chrome"
PLAYWRIGHT_ENABLE_MOBILE_TESTS=true npx playwright test --project="Mobile Safari"
```

## Troubleshooting

### Investigation Doesn't Complete Within Timeout

**Symptom**: `Error: Investigation did not complete within 120000ms`

**Solutions**:
```bash
# Increase timeout
export PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS="240000"
npx playwright test

# Or modify in test:
test.setTimeout(240000);  // 4 minutes
```

**Debug**:
```bash
# Check backend is running
curl http://localhost:8090/health

# Check frontend is running
curl http://localhost:3000

# View real-time logs
tail -f olorin-server.log
```

### Start Investigation Button Not Found

**Symptom**: `AssertionError: "Start Investigation" button NOT visible`

**Solutions**:
```bash
# Enable debug mode to see all buttons
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=true npx playwright test --debug

# In debugger, check:
// page.locator('button').count()
// page.locator('button').allTextContents()

# Update button selector if changed:
// Old: button:has-text("Start Investigation")
// New: [data-testid="start-investigation-btn"]
```

### Backend API Timeout

**Symptom**: `Error: API request timeout after 30000ms`

**Solutions**:
```bash
# Increase API timeout
export PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS="2000"  # Less frequent
export PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS="300000"  # Longer total

# Check backend performance
curl -w "@curl-format.txt" http://localhost:8090/api/investigations/health
```

### Server Logs Not Available

**Symptom**: `WARN: Server logs unavailable - skipping log assertions`

**Solutions**:

Option 1 - Use HTTP endpoint:
```bash
curl http://localhost:8090/admin/logs?investigationId=inv_abc123
```

Option 2 - Use shell command:
```bash
export PLAYWRIGHT_LOG_FETCH_METHOD="shell"
export PLAYWRIGHT_LOG_FETCH_CMD="docker logs olorin-server | grep inv_abc123"
npx playwright test
```

Option 3 - Skip log assertions:
```bash
export PLAYWRIGHT_SKIP_SERVER_LOG_ASSERTIONS="true"
npx playwright test
```

### WebSocket Connection Failures

**Symptom**: `WebSocket connection refused at ws://localhost:8090`

**Solution**:
```bash
# WebSocket issues usually indicate backend not running
# Tests fall back to HTTP polling (slower but works)

# Verify WebSocket support
wscat -c ws://localhost:8090/ws/investigation
```

### Tests Flaky (Random Failures)

**Symptom**: Same test passes sometimes, fails sometimes

**Solutions**:
```bash
# Run with increased retries
npx playwright test --retries 2

# Use Playwright's native waits instead of arbitrary sleeps
// ❌ Wrong: await page.waitForTimeout(1000);
// ✅ Right: await page.waitForURL('**/investigation/progress**');

# Increase polling interval
export PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS="2000"
```

### Memory Issues on CI

**Symptom**: `Out of memory` or test process killed

**Solutions**:
```bash
# Reduce workers (default is CPU count)
npx playwright test --workers 1

# In CI config:
workers: 1  # Set in playwright.config.ts for CI
```

## Performance Baseline

**Expected Execution Times** (Local Development):

```
Investigation State Management Test:
- Setup & navigation: 5-10s
- Investigation execution: 30-60s (backend dependent)
- Results retrieval: 5-10s
- Total: ~45-80 seconds

All 7 E2E tests (sequential):
- Single browser: 5-7 minutes
- Parallel (4 workers): 2-3 minutes
- With all browsers (3x): 15-20 minutes

CI/CD Execution (optimized):
- Single browser: 3-5 minutes
- With 1 retry: 6-10 minutes
```

## Maintenance & Updates

### Update Playwright

```bash
npm update @playwright/test
npx playwright install --with-deps

# Run tests with new version
npx playwright test
```

### Update Browser Compatibility

```bash
# Check for deprecations
npx playwright doctor

# Update selectors if UI changed
# Playwright has built-in locator inspector:
npx playwright test --ui
# Use "Pick Locator" tool to update selectors
```

### Add New Test

```bash
# Create test file following pattern:
# src/shared/testing/e2e/{feature}.e2e.test.ts

cat > src/shared/testing/e2e/new-feature.e2e.test.ts << 'EOF'
import { test, expect } from '@playwright/test';
import { loadPlaywrightTestConfig } from '../config/playwright.config';

test.describe('New Feature E2E', () => {
  let config: ReturnType<typeof loadPlaywrightTestConfig>;

  test.beforeAll(() => {
    config = loadPlaywrightTestConfig();
  });

  test('feature works correctly', async ({ page }) => {
    await page.goto(`${config.baseUrl}/path`);
    // Add test steps
  });
});
EOF

# Run just the new test
npx playwright test -g "feature works correctly"
```

## Documentation Links

- **Playwright Docs**: https://playwright.dev
- **Test Configuration**: See `/specs/001-robust-e2e-testing/data-model.md`
- **API Contracts**: See `/specs/001-robust-e2e-testing/data-model.md`
- **Backend API**: See `olorin-server/docs/api`
- **Implementation Plan**: See `/specs/001-robust-e2e-testing/plan.md`

## Support

**Issues?**

1. Check this quickstart troubleshooting section
2. Review test logs: `PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=true npx playwright test`
3. Open issue with:
   - Full test output
   - Environment details (OS, Node version, services running)
   - Screenshots/videos from test-results/

---

**Version**: 1.0.0
**Last Updated**: 2025-11-04
**Status**: Ready for Use ✅
