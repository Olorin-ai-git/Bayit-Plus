# Playwright Test Scripts Setup

Add these scripts to your `package.json` in the `olorin-front` directory for easy test execution.

## Add to `olorin-front/package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:chromium": "playwright test --project=chromium src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:firefox": "playwright test --project=firefox src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:webkit": "playwright test --project=webkit src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:debug": "playwright test --debug --headed src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:headed": "playwright test --headed src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:watch": "playwright test --watch src/shared/testing/e2e/parallel-investigations.e2e.test.ts",
    "test:e2e:report": "playwright show-report",
    "test:e2e:all-browsers": "playwright test --project=chromium --project=firefox --project=webkit src/shared/testing/e2e/parallel-investigations.e2e.test.ts"
  }
}
```

## Usage Examples

### Run all tests
```bash
npm run test:e2e
```

### Run tests in specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Debug mode (see browser + inspector)
```bash
npm run test:e2e:debug
```

### See browser while tests run
```bash
npm run test:e2e:headed
```

### Watch mode (auto re-run on file changes)
```bash
npm run test:e2e:watch
```

### View test report
```bash
npm run test:e2e:report
```

### Run across all browsers
```bash
npm run test:e2e:all-browsers
```

## Environment Variables

Set these before running tests:

```bash
# API endpoint
export REACT_APP_API_BASE_URL=http://localhost:8090

# Frontend base URL
export REACT_APP_BASE_URL=http://localhost:3000

# Frontend port
export REACT_APP_FRONTEND_PORT=3000

# CI mode (no retries)
export CI=true
```

## Complete Test Workflow

```bash
# 1. Install dependencies
cd olorin-front
npm install -D @playwright/test

# 2. Seed test data
cd ../olorin-server
poetry run python -m app.scripts.seed_investigations --count 10 --clear

# 3. Run tests
cd ../olorin-front
npm run test:e2e

# 4. View results
npm run test:e2e:report
```

## Parallel Execution

By default, Playwright runs multiple tests in parallel. Control this with:

```bash
# Sequential execution (slower but easier to debug)
npx playwright test --workers=1

# Use 4 workers (default on most systems)
npx playwright test --workers=4
```

## Output Files

After running tests, these files are generated:

- `playwright-report/index.html` - Interactive test report
- `test-results/results.json` - Machine-readable results
- `test-results/junit.xml` - CI/CD compatible format
- `test-results/screenshots/` - Failed test screenshots
- `test-results/videos/` - Failed test recordings

## Configuration

Test configuration in `playwright.config.ts`:

```typescript
// Timeout for each test (default: 5 minutes)
timeout: 5 * 60 * 1000,

// Expect assertion timeout (default: 5 seconds)
expect: {
  timeout: 5000
},

// Retries on CI
retries: process.env.CI ? 2 : 0,

// Parallel workers
workers: process.env.CI ? 1 : undefined,
```

## Advanced Options

### Run specific test by name
```bash
npx playwright test -g "should navigate to /parallel route"
```

### Run tests matching pattern
```bash
npx playwright test "parallel" "api"
```

### List all tests without running
```bash
npx playwright test --list
```

### Run with specific config
```bash
npx playwright test --config=playwright.config.ts
```

### Use specific browser version
```bash
npx playwright test --project=chromium --headed
```

### Trace debugging
```bash
npx playwright show-trace path/to/trace.zip
```

## Continuous Integration

### GitHub Actions

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

### GitLab CI

```yaml
test:e2e:
  script:
    - npm ci
    - npx playwright install --with-deps
    - npm run test:e2e
```

### Jenkins

```groovy
stage('E2E Tests') {
  steps {
    sh 'npm ci'
    sh 'npx playwright install --with-deps'
    sh 'npm run test:e2e'
  }
}
```

## Troubleshooting

### Playwright not found
```bash
npm install -D @playwright/test
npx playwright install
```

### Browsers not installed
```bash
npx playwright install chromium firefox webkit
npx playwright install-deps
```

### Port conflicts
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 8090
lsof -i :8090 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Timeout errors
```bash
# Increase timeout in playwright.config.ts
timeout: 10 * 60 * 1000, // 10 minutes

# Or run with --timeout flag
npx playwright test --timeout=600000
```

### Memory issues
```bash
# Run with fewer workers
npx playwright test --workers=1
```

## Performance Tips

1. **Use chromium for CI** - It's the fastest browser
2. **Run in parallel** - Use multiple workers (default)
3. **Use headed=false** - Headless is faster (default)
4. **Cache API responses** - Reduce backend calls
5. **Cleanup after tests** - Remove temporary data

## Monitoring

Add test metrics to your dashboard:

```bash
# Extract test duration from report
cat test-results/results.json | jq '.stats.duration'

# Count passed/failed
cat test-results/results.json | jq '.stats'

# See slow tests
cat test-results/results.json | jq '.tests | sort_by(-.duration) | .[0:5]'
```

## Best Practices

1. ✅ Run tests locally before pushing
2. ✅ Use meaningful test names
3. ✅ Keep tests focused and independent
4. ✅ Use Page Object Model for complex UIs
5. ✅ Set appropriate timeouts
6. ✅ Screenshot on failure for debugging
7. ✅ Use test fixtures for setup/teardown
8. ✅ Parallelize tests for speed
9. ✅ Monitor test trends over time
10. ✅ Update tests when UI changes

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-test)
- [Configuration Guide](https://playwright.dev/docs/test-configuration)

---

**Last Updated**: November 30, 2025
**Playwright Version**: Latest (@playwright/test)
**Node Version**: 18+
