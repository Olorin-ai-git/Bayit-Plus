# Phase 7: Beta 500 Comprehensive Testing Strategy

**Status**: In Progress
**Target Coverage**: 87%+ for all Beta services
**Last Updated**: 2026-01-30

---

## Testing Overview

Comprehensive testing framework for Beta 500 features ensuring production readiness with:
- Unit tests for all services (87%+ coverage)
- Integration tests for API endpoints
- E2E tests for UI components (all platforms)
- Load testing for 500 concurrent users
- Security testing for credit system

---

## 1. Unit Testing

### 1.1 Backend Services

**Created Test Files**:
```
backend/test/unit/beta/
├── test_credit_service.py                  ✅ Exists (13/15 passing)
├── test_ai_search_service.py               ✅ Created (14 tests)
├── test_ai_recommendations_service.py      ✅ Created (17 tests)
├── test_session_service.py                 ✅ Exists
├── test_email_service.py                   ✅ Exists
└── test_fraud_service.py                   ✅ Exists
```

**Coverage Target by Service**:
| Service | Tests Created | Target Coverage | Status |
|---------|---------------|-----------------|--------|
| BetaCreditService | 15 | 90%+ | ✅ Passing (13/15) |
| BetaAISearchService | 14 | 87%+ | ⏳ Needs mock fixes |
| BetaAIRecommendationsService | 17 | 87%+ | ⏳ Needs mock fixes |
| SessionBasedCreditService | 8 | 85%+ | ✅ Passing |
| EmailVerificationService | 6 | 85%+ | ✅ Passing |
| FraudDetectionService | 7 | 85%+ | ✅ Passing |

**Total Unit Tests**: 67 tests across 6 services

### 1.2 Test Execution

**Run all Beta unit tests**:
```bash
cd backend
PYTHONPATH=. poetry run pytest test/unit/beta/ -v --cov=app/services/beta --cov-report=html
```

**Run specific service tests**:
```bash
# Credit Service
PYTHONPATH=. poetry run pytest test/unit/beta/test_credit_service.py -v

# AI Search
PYTHONPATH=. poetry run pytest test/unit/beta/test_ai_search_service.py -v

# AI Recommendations
PYTHONPATH=. poetry run pytest test/unit/beta/test_ai_recommendations_service.py -v
```

### 1.3 Known Issues

**Current Test Failures**:
1. **test_ai_search_service.py**: 13/14 failing - Mock fixture adjustments needed to match service initialization
2. **test_ai_recommendations_service.py**: Similar mock fixture issues

**Action Items**:
- [ ] Fix mock client initialization for AsyncAnthropic and AsyncOpenAI
- [ ] Adjust mock responses to match actual service method signatures
- [ ] Add proper async context manager handling in fixtures

---

## 2. Integration Testing

### 2.1 API Endpoint Tests

**Created Integration Tests**:
```
backend/test/integration/
├── test_beta_500_api.py          ✅ Exists (395 lines, 20 test methods)
└── test_beta_ai_api.py           ✅ Created (295 lines, 15 test methods)
```

**API Test Coverage**:
| Endpoint | Test Class | Methods | Status |
|----------|------------|---------|--------|
| POST /beta/signup | TestBetaSignupEndpoint | 3 | ✅ Passing |
| GET /beta/verify/{token} | TestBetaVerifyEndpoint | 2 | ✅ Passing |
| GET /beta/credits/balance | TestCreditBalanceEndpoint | 2 | ✅ Passing |
| POST /beta/credits/deduct | TestCreditDeductEndpoint | 2 | ✅ Passing |
| POST /beta/sessions/start | TestSessionStartEndpoint | 2 | ✅ Passing |
| POST /beta/sessions/checkpoint | TestSessionCheckpointEndpoint | 2 | ✅ Passing |
| POST /beta/sessions/end | TestSessionEndEndpoint | 1 | ✅ Passing |
| GET /beta/status | TestProgramStatusEndpoint | 2 | ✅ Passing |
| POST /beta/search | TestAISearchAPI | 5 | ✅ Created |
| GET /beta/search/cost-estimate | TestAISearchCostEstimate | 1 | ✅ Created |
| GET /beta/recommendations | TestAIRecommendationsAPI | 5 | ✅ Created |
| GET /beta/recommendations/cost-estimate | TestAIRecommendationsCostEstimate | 1 | ✅ Created |

**Total Integration Tests**: 28 API endpoint tests

### 2.2 Cross-Feature Integration

**Test Scenarios**:
- ✅ Search followed by recommendations (credit deduction flow)
- ✅ Credit depletion across multiple AI features
- ✅ Session management with AI feature usage
- ✅ Insufficient credit handling across features

### 2.3 Run Integration Tests

```bash
cd backend
PYTHONPATH=. poetry run pytest test/integration/test_beta_500_api.py -v
PYTHONPATH=. poetry run pytest test/integration/test_beta_ai_api.py -v
```

---

## 3. End-to-End Testing

### 3.1 Web Platform (Playwright)

**Test Files to Create**:
```
web/e2e/
├── beta-search.spec.ts              # AI Search modal tests
├── beta-recommendations.spec.ts     # Recommendations panel tests
├── beta-credits.spec.ts             # Credit balance widget tests
└── beta-enrollment.spec.ts          # Signup and enrollment flow
```

**Web E2E Test Plan**:

#### 3.1.1 AI Search Modal
```typescript
// web/e2e/beta-search.spec.ts
describe('Beta AI Search', () => {
  test('should open search modal', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="ai-search-button"]');
    await expect(page.locator('.ai-search-modal')).toBeVisible();
  });

  test('should perform search and display results', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="ai-search-button"]');
    await page.fill('input[placeholder*="Search"]', 'suspenseful thrillers');
    await page.click('button:has-text("Search")');
    await expect(page.locator('.search-results')).toBeVisible();
    await expect(page.locator('.result-card')).toHaveCount.greaterThan(0);
  });

  test('should show cost and deduct credits', async ({ page }) => {
    // Verify credit balance before search
    const beforeBalance = await page.locator('.credit-balance').textContent();

    // Perform search
    await page.click('[data-testid="ai-search-button"]');
    await page.fill('input[placeholder*="Search"]', 'test query');
    await page.click('button:has-text("Search")');

    // Verify credits deducted (2 credits per search)
    const afterBalance = await page.locator('.credit-balance').textContent();
    expect(parseInt(afterBalance)).toBe(parseInt(beforeBalance) - 2);
  });

  test('should handle insufficient credits', async ({ page }) => {
    // Mock user with low credits
    await page.route('**/api/v1/beta/credits/balance/**', route => {
      route.fulfill({
        json: { remaining_credits: 1 }
      });
    });

    await page.goto('/');
    await page.click('[data-testid="ai-search-button"]');
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.click('button:has-text("Search")');

    // Should show insufficient credits error
    await expect(page.locator('.error-message')).toContainText('insufficient');
  });
});
```

#### 3.1.2 AI Recommendations Panel
```typescript
// web/e2e/beta-recommendations.spec.ts
describe('Beta AI Recommendations', () => {
  test('should fetch personalized recommendations', async ({ page }) => {
    await page.goto('/recommendations');
    await expect(page.locator('.recommendation-card')).toHaveCount.greaterThan(0);
  });

  test('should filter by content type', async ({ page }) => {
    await page.goto('/recommendations');
    await page.click('[data-testid="filter-movies"]');
    await expect(page.locator('.recommendation-card[data-type="movie"]')).toHaveCount.greaterThan(0);
  });

  test('should show match scores and explanations', async ({ page }) => {
    await page.goto('/recommendations');
    const firstCard = page.locator('.recommendation-card').first();
    await expect(firstCard.locator('.match-score')).toBeVisible();
    await expect(firstCard.locator('.explanation')).toBeVisible();
  });
});
```

**Run Web E2E Tests**:
```bash
cd web
npm run test:e2e
npm run test:e2e:headed  # With browser UI
```

### 3.2 Mobile Platform (Detox)

**Test Files to Create**:
```
mobile-app/e2e/
├── beta-search.e2e.js              # AI Search modal tests (iOS/Android)
├── beta-recommendations.e2e.js     # Recommendations screen tests
└── beta-credits.e2e.js             # Credit widget tests
```

**Mobile E2E Test Plan**:

#### 3.2.1 AI Search Modal (iOS/Android)
```javascript
// mobile-app/e2e/beta-search.e2e.js
describe('Beta AI Search (Mobile)', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should open AI search modal', async () => {
    await element(by.id('ai-search-button')).tap();
    await expect(element(by.id('ai-search-modal'))).toBeVisible();
  });

  it('should perform search on mobile', async () => {
    await element(by.id('ai-search-button')).tap();
    await element(by.id('search-input')).typeText('thriller movies\n');
    await element(by.id('search-button')).tap();
    await expect(element(by.id('search-results'))).toBeVisible();
  });

  it('should close modal with back button', async () => {
    await element(by.id('ai-search-button')).tap();
    await element(by.id('close-button')).tap();
    await expect(element(by.id('ai-search-modal'))).not.toBeVisible();
  });
});
```

**Run Mobile E2E Tests**:
```bash
cd mobile-app

# iOS
npx detox test --configuration ios.sim.debug

# Android
npx detox test --configuration android.emu.debug
```

### 3.3 tvOS Platform (Detox + Focus Navigation)

**Test Files to Create**:
```
tvos-app/e2e/
├── beta-search-focus.e2e.js        # Focus navigation tests
└── beta-search-siri-remote.e2e.js  # Siri Remote gesture tests
```

**tvOS E2E Test Plan**:

#### 3.3.1 Focus Navigation Tests
```javascript
// tvos-app/e2e/beta-search-focus.e2e.js
describe('Beta AI Search (tvOS)', () => {
  it('should navigate with focus', async () => {
    await element(by.id('ai-search-button')).tap();

    // Navigate to search input
    await device.pressDpad('down');
    await device.pressDpad('select');

    // Type query
    await element(by.id('search-input')).typeText('thriller\n');

    // Navigate to search button
    await device.pressDpad('down');
    await device.pressDpad('select');

    // Verify results
    await expect(element(by.id('search-results'))).toBeVisible();
  });

  it('should scale on focus', async () => {
    await element(by.id('ai-search-button')).tap();
    await device.pressDpad('down');

    // Verify focus styling applied
    await expect(element(by.id('search-button'))).toHaveTransform('scale(1.05)');
  });

  it('should handle menu button press', async () => {
    await element(by.id('ai-search-button')).tap();
    await device.pressMenu();
    await expect(element(by.id('ai-search-screen'))).not.toBeVisible();
  });
});
```

**Run tvOS E2E Tests**:
```bash
cd tvos-app
npx detox test --configuration tvos.sim.debug
```

---

## 4. Load Testing

### 4.1 Load Test Objectives

**Target**: 500 concurrent Beta users performing AI operations

**Metrics to Measure**:
- Response time (p50, p95, p99)
- Error rate
- Credit deduction accuracy
- Database query performance
- API endpoint throughput

### 4.2 Load Test Setup (Locust)

**Test File**:
```python
# backend/tests/load/beta/locustfile.py
from locust import HttpUser, task, between
import random

class BetaUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        """Authenticate as Beta user."""
        self.client.post("/api/v1/auth/login", json={
            "email": f"beta-user-{random.randint(1, 500)}@example.com",
            "password": "test_password"
        })

    @task(3)
    def ai_search(self):
        """Perform AI search (weighted 3x)."""
        queries = [
            "suspenseful crime thrillers",
            "family-friendly comedies",
            "action movies with strong characters",
            "documentaries about nature",
            "romantic dramas"
        ]
        self.client.post("/api/v1/beta/search", json={
            "query": random.choice(queries),
            "limit": 10
        }, name="/beta/search")

    @task(2)
    def ai_recommendations(self):
        """Get AI recommendations (weighted 2x)."""
        content_types = ["movies", "series", "podcasts", "audiobooks"]
        self.client.get("/api/v1/beta/recommendations", params={
            "content_type": random.choice(content_types),
            "limit": 10
        }, name="/beta/recommendations")

    @task(1)
    def check_balance(self):
        """Check credit balance (weighted 1x)."""
        self.client.get(f"/api/v1/beta/credits/balance/user-{self.user_id}",
                       name="/beta/credits/balance")
```

### 4.3 Run Load Tests

**Start Load Test**:
```bash
cd backend/tests/load/beta
locust -f locustfile.py --host=https://staging.bayit.plus --users 500 --spawn-rate 50
```

**Access Dashboard**:
```
http://localhost:8089
```

**Target Metrics**:
- Response time p50: < 200ms
- Response time p95: < 500ms
- Response time p99: < 1000ms
- Error rate: < 0.1%
- Requests per second: 100+ (for 500 users)

### 4.4 Load Test Scenarios

**Scenario 1: Gradual Ramp-Up**
```bash
locust -f locustfile.py --host=https://staging.bayit.plus \
  --users 500 --spawn-rate 10 --run-time 30m
```

**Scenario 2: Spike Test**
```bash
locust -f locustfile.py --host=https://staging.bayit.plus \
  --users 500 --spawn-rate 100 --run-time 10m
```

**Scenario 3: Endurance Test**
```bash
locust -f locustfile.py --host=https://staging.bayit.plus \
  --users 300 --spawn-rate 20 --run-time 2h
```

---

## 5. Security Testing

### 5.1 Credit System Security

**Test Scenarios**:
- [ ] Race condition: Concurrent credit deductions
- [ ] Negative credit bypass attempts
- [ ] Session hijacking for credit theft
- [ ] Credit manipulation via API tampering
- [ ] Replay attacks on deduction endpoints

**Security Test File**:
```python
# backend/tests/security/test_beta_credit_security.py
import pytest
import asyncio
from concurrent.futures import ThreadPoolExecutor

@pytest.mark.asyncio
async def test_concurrent_credit_deduction_race_condition():
    """
    Test that concurrent credit deductions don't allow overdraft.
    """
    user_id = "test-user-race"
    initial_credits = 100

    # Allocate credits
    await allocate_credits(user_id, initial_credits)

    # Attempt 10 concurrent deductions of 15 credits each
    # Only 6 should succeed (100 / 15 = 6.67)
    tasks = [
        deduct_credits(user_id, "test_feature", 15)
        for _ in range(10)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Count successful deductions
    success_count = sum(1 for r in results if r[0] is True)

    # Should only allow 6 deductions
    assert success_count == 6

    # Final balance should be ~10 (100 - 90)
    balance = await get_balance(user_id)
    assert balance >= 0  # No negative balance
    assert balance <= 10  # Not more than expected

@pytest.mark.asyncio
async def test_negative_credit_bypass():
    """
    Test that API doesn't allow negative credit manipulation.
    """
    # Attempt to deduct negative credits (credit addition)
    response = client.post("/api/v1/beta/credits/deduct", json={
        "user_id": "test-user",
        "feature": "test",
        "usage_amount": -50.0  # Negative value
    })

    assert response.status_code == 422  # Validation error
```

### 5.2 API Authentication Security

**Test Scenarios**:
- [ ] Unauthorized access to Beta endpoints
- [ ] Token expiration handling
- [ ] Cross-user credit access prevention
- [ ] CSRF protection on POST endpoints

---

## 6. Test Coverage Report

### 6.1 Generate Coverage

```bash
cd backend
PYTHONPATH=. poetry run pytest test/unit/beta/ test/integration/ \
  --cov=app/services/beta \
  --cov=app/api/routes/beta \
  --cov-report=html \
  --cov-report=term-missing
```

### 6.2 Coverage Targets

| Component | Target | Current | Status |
|-----------|--------|---------|--------|
| BetaCreditService | 90% | TBD | ⏳ |
| BetaAISearchService | 87% | TBD | ⏳ |
| BetaAIRecommendationsService | 87% | TBD | ⏳ |
| SessionBasedCreditService | 85% | TBD | ⏳ |
| Beta API Routes | 85% | TBD | ⏳ |
| **Overall Beta Components** | **87%** | **TBD** | ⏳ |

---

## 7. Continuous Integration

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/beta-tests.yml`

```yaml
name: Beta 500 Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/app/services/beta/**'
      - 'backend/app/api/routes/beta/**'
      - 'backend/test/**'
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install Poetry
        run: pip install poetry
      - name: Install dependencies
        run: cd backend && poetry install
      - name: Run unit tests
        run: |
          cd backend
          PYTHONPATH=. poetry run pytest test/unit/beta/ \
            --cov=app/services/beta \
            --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
      - name: Install dependencies
        run: cd backend && poetry install
      - name: Run integration tests
        run: |
          cd backend
          PYTHONPATH=. poetry run pytest test/integration/test_beta_*.py -v

  load-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - name: Install Locust
        run: pip install locust
      - name: Run smoke load test
        run: |
          cd backend/tests/load/beta
          locust -f locustfile.py --headless \
            --host=https://staging.bayit.plus \
            --users 50 --spawn-rate 10 --run-time 2m
```

---

## 8. Test Maintenance

### 8.1 Ongoing Tasks

- [ ] Fix mock fixtures in AI service unit tests
- [ ] Create Playwright E2E tests for web
- [ ] Create Detox E2E tests for mobile
- [ ] Create Detox E2E tests for tvOS
- [ ] Implement load testing with Locust
- [ ] Add security tests for credit system
- [ ] Set up GitHub Actions CI/CD for tests
- [ ] Achieve 87%+ coverage across all Beta services

### 8.2 Test Data Management

**Test Users**:
```python
# backend/tests/fixtures/beta_users.py
BETA_TEST_USERS = [
    {
        "email": "beta-test-1@example.com",
        "credits": 5000,
        "status": "active"
    },
    {
        "email": "beta-test-low-credits@example.com",
        "credits": 50,
        "status": "active"
    },
    {
        "email": "beta-test-expired@example.com",
        "credits": 0,
        "status": "expired"
    }
]
```

---

## 9. Next Steps

**Immediate (Phase 7 Completion)**:
1. Fix AI service unit test mocks
2. Run full test suite and generate coverage report
3. Create Web E2E tests with Playwright
4. Create Mobile E2E tests with Detox
5. Create tvOS E2E tests with Detox
6. Implement load testing with Locust
7. Document test results and coverage

**Phase 8 (Infrastructure)**:
1. Set up GitHub Actions for automated testing
2. Configure test environments (staging)
3. Set up monitoring and alerting for test failures
4. Integrate coverage reporting into CI/CD

---

## Summary

**Testing Infrastructure**: ✅ Created
**Unit Tests**: ⏳ 67 tests created, needs mock fixes
**Integration Tests**: ✅ 28 API endpoint tests created
**E2E Tests**: ⏳ Documentation ready, needs implementation
**Load Tests**: ⏳ Strategy documented, needs implementation
**Coverage Target**: 87%+ (TBD after test fixes)

**Phase 7 Status**: 40% Complete
