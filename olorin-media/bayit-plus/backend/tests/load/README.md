# Beta 500 Load Testing

Comprehensive load testing suite for the Beta 500 credit system using Locust.

## Overview

Tests the Beta 500 credit system under high concurrency to verify:
- ✅ Atomic credit deductions (no race conditions)
- ✅ AI endpoint performance under load
- ✅ Credit balance polling scalability
- ✅ No credit leakage during concurrent operations
- ✅ Threshold monitoring performance

## Prerequisites

```bash
# Install Locust (already in dev dependencies)
poetry install

# Start backend server (MUST be running on port 8000)
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Running Load Tests

### Basic Run (500 users, 15 minutes)

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000 \
    --users 500 \
    --spawn-rate 10 \
    --run-time 15m \
    --html=test-results/load-test-report.html
```

### Quick Test (100 users, 3 minutes)

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000 \
    --users 100 \
    --spawn-rate 20 \
    --run-time 3m \
    --headless
```

### Interactive UI Mode

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000
```

Then open http://localhost:8089 in your browser to control the test.

### Race Condition Stress Test

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000 \
    --users 1000 \
    --spawn-rate 50 \
    --run-time 10m \
    RaceConditionTester
```

## Load Test Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--users` | Total number of concurrent users | Required |
| `--spawn-rate` | Users spawned per second | Required |
| `--run-time` | Test duration (e.g., 10m, 1h) | Required |
| `--headless` | Run without web UI | False |
| `--html` | Save HTML report to file | None |
| `--csv` | Save CSV stats to file | None |

## Task Distribution

The `BetaUser` simulates realistic user behavior:

| Task | Weight | % of Requests | Credits Used |
|------|--------|---------------|--------------|
| Get credit balance | 3 | 30% | 0 |
| AI search | 2 | 20% | 5 |
| AI recommendations | 1 | 10% | 3 |
| Concurrent deductions | 1 | 10% | 15 (3x5) |
| Threshold check | 1 | 10% | 0 |

**Total**: 8 tasks, weighted to simulate real-world usage patterns.

## Success Criteria

The load test validates these criteria:

| Metric | Target | Status |
|--------|--------|--------|
| **95th percentile response time** | < 500ms | ✅ Pass / ❌ Fail |
| **Error rate** | < 1% | ✅ Pass / ❌ Fail |
| **Credit integrity** | No leakage | ✅ Verified |
| **Atomic operations** | All succeed | ✅ Verified |

## Interpreting Results

### Example Output

```
================================================================================
Beta 500 Load Test Complete
================================================================================
Total Requests: 45,230
Total Failures: 127
Error Rate: 0.28%

Performance Metrics:
  Average Response Time: 234.56ms
  Median Response Time: 189.23ms
  95th Percentile: 456.78ms
  99th Percentile: 892.45ms
  Max Response Time: 1,234.56ms
  Min Response Time: 12.34ms

================================================================================
Success Criteria Validation:
================================================================================
✅ 95th percentile < 500ms: True (456.78ms)
✅ Error rate < 1%: True (0.28%)

🎉 All success criteria met!
================================================================================
```

### What to Look For

**✅ Good Results:**
- Error rate < 1%
- 95th percentile < 500ms
- No race condition errors
- Consistent credit balance across requests

**❌ Red Flags:**
- High error rates (> 1%)
- Slow response times (p95 > 500ms)
- 402 errors (insufficient credits) indicate credit leakage
- 500 errors indicate server issues

## Test Scenarios

### Scenario 1: Normal Load (500 users)

Tests typical production load:

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000 \
    --users 500 \
    --spawn-rate 10 \
    --run-time 15m \
    --headless
```

**Expected:**
- p95 < 500ms
- Error rate < 1%
- Smooth credit deduction

### Scenario 2: Spike Load (1000 users burst)

Tests sudden traffic spike:

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000 \
    --users 1000 \
    --spawn-rate 100 \
    --run-time 5m \
    --headless
```

**Expected:**
- Graceful degradation
- No crashes
- Error rate still < 5%

### Scenario 3: Race Condition Test

Aggressively tests atomic operations:

```bash
poetry run locust -f tests/load/beta_load_test.py \
    --host http://localhost:8000 \
    --users 200 \
    --spawn-rate 50 \
    --run-time 10m \
    RaceConditionTester
```

**Expected:**
- Zero credit discrepancies
- All deductions atomic
- No 409 Conflict errors

## Monitoring During Tests

### Backend Logs

Monitor backend logs during load test:

```bash
tail -f logs/backend.log | grep -E "ERROR|WARNING|credit"
```

### MongoDB Performance

Monitor MongoDB operations:

```bash
mongosh "mongodb+srv://cluster.example.net/bayit_plus" \
    --eval 'db.currentOp({active: true})'
```

### System Resources

Monitor server resources:

```bash
htop  # CPU/Memory usage
```

## Troubleshooting

### Issue: High Error Rate (> 1%)

**Causes:**
- Backend not started
- MongoDB connection issues
- Insufficient server resources

**Fix:**
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check logs for errors
tail -50 logs/backend.log
```

### Issue: Slow Response Times (p95 > 500ms)

**Causes:**
- Database query optimization needed
- High concurrent connections
- Insufficient indexes

**Fix:**
- Review MongoDB query performance
- Add database indexes
- Optimize AI service calls

### Issue: Credit Discrepancies

**Causes:**
- Race condition in credit deduction
- Missing atomic operations
- Optimistic locking failure

**Fix:**
- Verify atomic `$inc` operations in `credit_service.py`
- Check version field increments
- Review transaction handling

## Advanced Usage

### Custom User Scenarios

Create custom load test scenarios:

```python
# tests/load/custom_scenario.py
from locust import HttpUser, task, between

class CustomUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def custom_task(self):
        # Your custom test logic
        pass
```

### Distributed Load Testing

Run load test across multiple machines:

**Master:**
```bash
poetry run locust -f tests/load/beta_load_test.py \
    --master \
    --host http://localhost:8000
```

**Workers (on other machines):**
```bash
poetry run locust -f tests/load/beta_load_test.py \
    --worker \
    --master-host=<master-ip>
```

## Integration with CI/CD

Add load testing to GitHub Actions:

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run load test
        run: |
          poetry install
          poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 10
          poetry run locust -f tests/load/beta_load_test.py \
            --host http://localhost:8000 \
            --users 500 \
            --spawn-rate 10 \
            --run-time 15m \
            --headless \
            --html=test-results/load-test-report.html
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: load-test-report
          path: test-results/load-test-report.html
```

## References

- [Locust Documentation](https://docs.locust.io/)
- [Beta 500 Plan](../../docs/implementation/BETA_500_PLAN.md)
- [Credit Service Source](../../app/services/beta/credit_service.py)
- [Atomic Operations](../../docs/architecture/CREDIT_ATOMIC_OPERATIONS.md)
