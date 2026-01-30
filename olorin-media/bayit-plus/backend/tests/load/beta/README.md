# Beta 500 Load Testing

Load testing infrastructure for Beta 500 AI features using Locust.

---

## Overview

Simulates 500 concurrent Beta users performing:
- **AI Search** (weighted 3x) - 2 credits per search
- **AI Recommendations** (weighted 2x) - 3 credits per request
- **Credit Balance Checks** (weighted 1x) - 0 credits

---

## Prerequisites

```bash
# Install Locust
pip install locust

# Or via Poetry (in backend directory)
poetry add --dev locust
```

---

## Quick Start

### 1. Interactive Mode (Web UI)

```bash
locust -f locustfile.py --host=https://staging.bayit.plus
```

Then open: http://localhost:8089

Configure:
- Number of users: 500
- Spawn rate: 50 users/second
- Host: https://staging.bayit.plus

### 2. Headless Mode (CLI)

```bash
# Standard test: 500 users for 30 minutes
locust -f locustfile.py --headless \
    --host=https://staging.bayit.plus \
    --users 500 \
    --spawn-rate 50 \
    --run-time 30m
```

---

## Test Scenarios

### Scenario 1: Gradual Ramp-Up
```bash
# 10 users per second spawn rate
locust -f locustfile.py --headless \
    --host=https://staging.bayit.plus \
    --users 500 \
    --spawn-rate 10 \
    --run-time 30m
```

**Purpose**: Test system under gradually increasing load

**Metrics to Watch**:
- Response time degradation curve
- At what user count does p95 exceed 500ms?
- Database connection pool saturation

---

### Scenario 2: Spike Test
```bash
# 100 users per second spawn rate
locust -f locustfile.py --headless \
    --host=https://staging.bayit.plus \
    --users 500 \
    --spawn-rate 100 \
    --run-time 10m
```

**Purpose**: Test system under sudden traffic spike

**Metrics to Watch**:
- Error rate during spike
- Recovery time after spike
- Circuit breaker activation

---

### Scenario 3: Endurance Test
```bash
# 300 sustained users for 2 hours
locust -f locustfile.py --headless \
    --host=https://staging.bayit.plus \
    --users 300 \
    --spawn-rate 20 \
    --run-time 2h
```

**Purpose**: Test for memory leaks and resource exhaustion

**Metrics to Watch**:
- Memory usage over time
- Database connection leaks
- Response time drift
- Error rate stability

---

## Target Performance Metrics

### Response Times
| Percentile | Target | Acceptable | Unacceptable |
|------------|--------|------------|--------------|
| p50 (median) | < 200ms | < 300ms | > 300ms |
| p95 | < 500ms | < 750ms | > 750ms |
| p99 | < 1000ms | < 1500ms | > 1500ms |

### Throughput
- **Requests/Second**: 100+ (for 500 concurrent users)
- **Search RPS**: 50+ (weighted 3x)
- **Recommendations RPS**: 33+ (weighted 2x)
- **Balance Check RPS**: 16+ (weighted 1x)

### Reliability
- **Error Rate**: < 0.1% (1 in 1000 requests)
- **Timeout Rate**: < 0.05%
- **5xx Errors**: < 0.01%

---

## Monitoring During Load Tests

### 1. Locust Web UI
- **URL**: http://localhost:8089
- **Metrics**: Real-time RPS, response times, error rates
- **Charts**: Response time distribution, request counts

### 2. Backend Monitoring

```bash
# Monitor backend logs
tail -f /path/to/backend/logs/app.log

# Watch CPU and memory
htop

# Monitor MongoDB connections
mongosh --eval "db.serverStatus().connections"
```

### 3. Database Metrics

**MongoDB Atlas Dashboard**:
- Query execution time
- Connection count
- CPU and memory usage
- Disk I/O

**Key Queries to Monitor**:
```javascript
// Find slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10)

// Current operations
db.currentOp()

// Connection count
db.serverStatus().connections
```

---

## Troubleshooting

### High Error Rate (> 1%)

**Possible Causes**:
1. Database connection pool exhausted
2. API rate limiting triggered
3. Credit depletion for test users

**Solutions**:
```bash
# Reduce spawn rate
locust -f locustfile.py --spawn-rate 10

# Reduce total users
locust -f locustfile.py --users 300

# Check backend logs for errors
tail -f backend/logs/app.log | grep ERROR
```

---

### High Response Times (p95 > 1000ms)

**Possible Causes**:
1. Database query performance
2. External API latency (Claude, OpenAI)
3. CPU/memory saturation

**Solutions**:
1. Add database indexes
2. Implement caching for AI responses
3. Scale backend horizontally

---

### Credit Exhaustion

**Symptom**: Many 400 errors with "insufficient credits"

**Solution**: Reset test user credits
```python
# Script to reset credits
from app.models.beta_credit import BetaCredit

async def reset_test_credits():
    for i in range(1, 501):
        user_id = f"beta-user-{i}"
        credit = await BetaCredit.find_one({"user_id": user_id})
        if credit:
            credit.remaining_credits = 5000
            await credit.save()
```

---

## Custom Metrics

### Credit Consumption Tracking

The load test tracks:
- Total credits consumed per endpoint
- Users with low credit warnings
- Credit depletion rate

View in summary output at test completion.

---

## Interpreting Results

### Success Criteria
✅ **PASS** if ALL of the following:
- p95 response time < 500ms
- p99 response time < 1000ms
- Error rate < 0.1%
- RPS > 100 for 500 users
- No memory leaks during endurance test

⚠️ **WARNING** if ANY of the following:
- p95 response time 500-750ms
- Error rate 0.1-0.5%
- Occasional 5xx errors

❌ **FAIL** if ANY of the following:
- p95 response time > 750ms
- Error rate > 0.5%
- Consistent 5xx errors
- System crash during test

---

## Advanced Usage

### Custom User Behavior

Edit `locustfile.py` to adjust task weights:

```python
@task(5)  # Change from 3 to 5
def ai_search(self):
    # More search operations
    pass

@task(1)  # Change from 2 to 1
def ai_recommendations(self):
    # Fewer recommendations
    pass
```

### Distributed Load Testing

Run Locust across multiple machines:

```bash
# On master machine
locust -f locustfile.py --master --host=https://staging.bayit.plus

# On worker machines
locust -f locustfile.py --worker --master-host=<master-ip>
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Locust
        run: pip install locust
      - name: Run load test
        run: |
          cd backend/tests/load/beta
          locust -f locustfile.py --headless \
            --host=https://staging.bayit.plus \
            --users 500 --spawn-rate 50 --run-time 10m \
            --html=report.html
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: load-test-report
          path: backend/tests/load/beta/report.html
```

---

## Related Documentation

- [Phase 7: Testing Strategy](../../../docs/beta/PHASE7_TESTING_STRATEGY.md)
- [Beta 500 Implementation Progress](../../../BETA_500_IMPLEMENTATION_PROGRESS.md)
- [Locust Documentation](https://docs.locust.io/)

---

## Support

For issues or questions:
1. Check backend logs: `tail -f backend/logs/app.log`
2. Review MongoDB Atlas metrics
3. Verify test user credentials
4. Check GCloud secrets are properly configured
