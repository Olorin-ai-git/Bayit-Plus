# AI Features Testing Guide

**Last Updated:** 2026-01-30
**Status:** ✅ Production Ready

---

## Overview

This guide covers testing strategies for Bayit+ AI features (AI Search, AI Recommendations, Auto Catch-Up). Testing AI features requires special considerations due to non-deterministic LLM behavior, credit consumption, and external API dependencies.

**Testing Layers:**
- Unit Tests (67+ backend, 40+ frontend)
- Integration Tests (28+ tests)
- E2E Tests (Playwright web, Detox mobile)
- Load Tests (Locust 500 concurrent users)
- Manual QA Checklist

---

## Testing Strategy

### Test Pyramid

```
       ┌─────────────────┐
       │   E2E Tests     │  (10% - Slow, expensive)
       │   ~15 tests     │
       ├─────────────────┤
       │ Integration     │  (20% - Medium speed)
       │   ~30 tests     │
       ├─────────────────┤
       │  Unit Tests     │  (70% - Fast, cheap)
       │  ~110 tests     │
       └─────────────────┘
```

---

## Unit Testing

### Backend Unit Tests (pytest)

#### 1. Credit Service Tests

```python
# backend/test/unit/services/test_beta_credit_service.py
import pytest
from app.services.beta_credit_service import BetaCreditService
from app.models.beta_user import BetaUser
from app.core.exceptions import InsufficientCreditsError

@pytest.mark.asyncio
async def test_deduct_credits_success(db_session):
    """Test successful credit deduction."""
    service = BetaCreditService()

    # Create test user
    user = await BetaUser(
        user_id="test_user",
        email="test@example.com",
        balance=100,
    ).insert()

    # Deduct credits
    new_balance = await service.deduct_credits(
        user_id="test_user",
        amount=10,
        feature="ai_search",
    )

    assert new_balance == 90

    # Verify transaction logged
    from app.models.beta_transaction import BetaCreditTransaction
    transactions = await BetaCreditTransaction.find(
        BetaCreditTransaction.user_id == "test_user"
    ).to_list()

    assert len(transactions) == 1
    assert transactions[0].amount == -10
    assert transactions[0].feature == "ai_search"

@pytest.mark.asyncio
async def test_insufficient_credits(db_session):
    """Test insufficient credits error."""
    service = BetaCreditService()

    user = await BetaUser(
        user_id="test_user",
        email="test@example.com",
        balance=5,
    ).insert()

    with pytest.raises(InsufficientCreditsError):
        await service.deduct_credits(
            user_id="test_user",
            amount=10,
            feature="ai_search",
        )

@pytest.mark.asyncio
async def test_optimistic_locking(db_session):
    """Test race condition handling."""
    service = BetaCreditService()

    user = await BetaUser(
        user_id="test_user",
        email="test@example.com",
        balance=100,
        version=0,
    ).insert()

    # Simulate concurrent deductions
    import asyncio
    results = await asyncio.gather(
        service.deduct_credits("test_user", 10, "ai_search"),
        service.deduct_credits("test_user", 10, "ai_search"),
        service.deduct_credits("test_user", 10, "ai_search"),
        return_exceptions=True,
    )

    # All should succeed due to retry logic
    assert all(isinstance(r, int) for r in results)

    # Final balance correct
    final_user = await BetaUser.find_one(BetaUser.user_id == "test_user")
    assert final_user.balance == 70
```

#### 2. AI Service Tests with Mocking

```python
# backend/test/unit/services/test_ai_service.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.beta.ai_search_service import AISearchService

@pytest.mark.asyncio
async def test_ai_search_with_mocked_llm():
    """Test AI search with mocked LLM response."""
    service = AISearchService()

    # Mock LLM response
    mock_response = {
        "results": [
            {
                "id": "1",
                "title": "Israeli Comedy Movie",
                "relevance_score": 0.95,
                "ai_insight": "Perfect match for Israeli comedy",
            },
        ],
    }

    with patch.object(service.llm_client, "search", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_response

        results = await service.search("Israeli comedy movies")

        assert len(results) == 1
        assert results[0]["title"] == "Israeli Comedy Movie"
        assert results[0]["relevance_score"] == 0.95

        # Verify LLM called with correct params
        mock_search.assert_called_once()

@pytest.mark.asyncio
async def test_ai_search_error_handling():
    """Test AI search handles LLM errors gracefully."""
    service = AISearchService()

    with patch.object(service.llm_client, "search", side_effect=Exception("LLM API error")):
        with pytest.raises(Exception) as exc_info:
            await service.search("test query")

        assert "LLM API error" in str(exc_info.value)
```

#### 3. Rate Limiter Tests

```python
# backend/test/unit/core/test_rate_limiter.py
import pytest
from app.core.rate_limiter import LLMRateLimiter
from app.core.exceptions import RateLimitExceededError

@pytest.mark.asyncio
async def test_rate_limit_enforcement():
    """Test rate limiting works correctly."""
    limiter = LLMRateLimiter()

    user_id = "test_user"
    feature = "ai_search"

    # First 10 requests should succeed
    for i in range(10):
        result = await limiter.check_rate_limit(user_id, feature)
        assert result is True

    # 11th request should fail (limit: 10/minute for testing)
    with pytest.raises(RateLimitExceededError):
        await limiter.check_rate_limit(user_id, feature)
```

### Frontend Unit Tests (Jest)

#### 1. Credit Store Tests

```typescript
// web/src/stores/__tests__/betaCreditsStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useBetaCreditsStore } from '../betaCreditsStore';
import { aiService } from '../../services/aiService';

jest.mock('../../services/aiService');

describe('betaCreditsStore', () => {
  beforeEach(() => {
    useBetaCreditsStore.setState({ balance: 0, isBetaUser: false });
  });

  it('fetches balance successfully', async () => {
    (aiService.getCreditBalance as jest.Mock).mockResolvedValue({
      balance: 500,
      is_beta_user: true,
    });

    const { result } = renderHook(() => useBetaCreditsStore());

    await act(async () => {
      await result.current.fetchBalance();
    });

    expect(result.current.balance).toBe(500);
    expect(result.current.isBetaUser).toBe(true);
  });

  it('handles insufficient credits', async () => {
    const { result } = renderHook(() => useBetaCreditsStore());

    act(() => {
      useBetaCreditsStore.setState({ balance: 5 });
    });

    expect(result.current.balance).toBe(5);
    expect(result.current.balance < 10).toBe(true); // Insufficient for AI search
  });

  it('deducts credits optimistically', async () => {
    (aiService.deductCredits as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useBetaCreditsStore());

    act(() => {
      useBetaCreditsStore.setState({ balance: 100 });
    });

    await act(async () => {
      await result.current.deductCredits(10, 'ai_search');
    });

    expect(result.current.balance).toBe(90);
  });
});
```

#### 2. Component Tests

::: v-pre
```typescript
// web/src/components/ai/__tests__/AISearchModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AISearchModal } from '../AISearchModal';
import { useAISearchStore } from '../../../stores/aiSearchStore';
import { useBetaCreditsStore } from '../../../stores/betaCreditsStore';

jest.mock('../../../stores/aiSearchStore');
jest.mock('../../../stores/betaCreditsStore');

describe('AISearchModal', () => {
  beforeEach(() => {
    (useAISearchStore as jest.Mock).mockReturnValue({
      isOpen: true,
      results: [],
      loading: false,
      search: jest.fn(),
      close: jest.fn(),
    });

    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 100,
      deductCredits: jest.fn(),
    });
  });

  it('renders search input', () => {
    render(<AISearchModal />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows insufficient credits warning', () => {
    (useBetaCreditsStore as jest.Mock).mockReturnValue({
      balance: 5,
      deductCredits: jest.fn(),
    });

    render(<AISearchModal />);
    expect(screen.getByText(/insufficient credits/i)).toBeInTheDocument();
  });

  it('performs search on enter', async () => {
    const mockSearch = jest.fn();
    (useAISearchStore as jest.Mock).mockReturnValue({
      isOpen: true,
      results: [],
      loading: false,
      search: mockSearch,
      close: jest.fn(),
    });

    render(<AISearchModal />);

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Israeli comedy' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 13 });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('Israeli comedy');
    });
  });
});
```
:::

---

## Integration Testing

### API Integration Tests

```python
# backend/test/integration/test_ai_features_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.integration
async def test_ai_search_e2e(client: AsyncClient, beta_user_token: str):
    """Test AI search end-to-end flow."""

    # 1. Check initial balance
    balance_response = await client.get(
        "/api/v1/beta/credits/balance",
        headers={"Authorization": f"Bearer {beta_user_token}"},
    )
    assert balance_response.status_code == 200
    initial_balance = balance_response.json()["balance"]

    # 2. Perform AI search
    search_response = await client.post(
        "/api/v1/beta/search",
        json={"query": "Israeli comedy movies from 2020s"},
        headers={"Authorization": f"Bearer {beta_user_token}"},
    )
    assert search_response.status_code == 200
    data = search_response.json()
    assert "results" in data
    assert len(data["results"]) > 0

    # 3. Verify credits deducted
    balance_response_after = await client.get(
        "/api/v1/beta/credits/balance",
        headers={"Authorization": f"Bearer {beta_user_token}"},
    )
    final_balance = balance_response_after.json()["balance"]
    assert final_balance == initial_balance - 10  # AI search costs 10 credits

@pytest.mark.integration
async def test_rate_limiting(client: AsyncClient, beta_user_token: str):
    """Test rate limiting enforcement."""

    # Perform 11 requests rapidly (limit: 10/minute)
    for i in range(11):
        response = await client.post(
            "/api/v1/beta/search",
            json={"query": f"test query {i}"},
            headers={"Authorization": f"Bearer {beta_user_token}"},
        )

        if i < 10:
            assert response.status_code == 200
        else:
            assert response.status_code == 429  # Rate limit exceeded

@pytest.mark.integration
async def test_insufficient_credits_handling(client: AsyncClient):
    """Test insufficient credits error handling."""

    # Create user with only 5 credits
    # (Test fixture creates user with low balance)

    response = await client.post(
        "/api/v1/beta/search",
        json={"query": "test query"},
        headers={"Authorization": f"Bearer {low_balance_token}"},
    )

    assert response.status_code == 402  # Payment Required
    assert "insufficient credits" in response.json()["detail"].lower()
```

---

## E2E Testing

### Web E2E (Playwright)

```typescript
// web/tests/e2e/ai-features.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as beta user
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'beta@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/');
  });

  test('should display credit balance', async ({ page }) => {
    await expect(page.locator('text=🪙')).toBeVisible();
    const balance = await page.locator('[data-testid="credit-balance"]').textContent();
    expect(parseInt(balance)).toBeGreaterThan(0);
  });

  test('should perform AI search', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Meta+K');
    await expect(page.locator('text=AI Search')).toBeVisible();

    // Enter query
    await page.fill('input[placeholder*="Search"]', 'Israeli comedy movies');
    await page.click('button:has-text("Search")');

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]');
    const results = await page.locator('[data-testid="search-result"]').count();
    expect(results).toBeGreaterThan(0);

    // Verify credit deduction
    const newBalance = await page.locator('[data-testid="credit-balance"]').textContent();
    // Balance should be reduced
  });

  test('should show insufficient credits warning', async ({ page }) => {
    // Mock API to return low balance
    await page.route('**/api/v1/beta/credits/balance', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ balance: 5, is_beta_user: true }),
      });
    });

    await page.reload();
    await page.keyboard.press('Meta+K');
    await expect(page.locator('text=Insufficient credits')).toBeVisible();
  });

  test('should load AI recommendations', async ({ page }) => {
    await expect(page.locator('text=AI Recommendations')).toBeVisible();

    // Click refresh button
    await page.click('button:has-text("Refresh")');

    // Wait for recommendations to load
    await page.waitForSelector('[data-testid="ai-recommendations"]');
    const recommendations = await page.locator('[data-testid="recommendation-item"]').count();
    expect(recommendations).toBeGreaterThan(0);
  });
});
```

### Mobile E2E (Detox)

```typescript
// mobile-app/e2e/ai-features.e2e.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('AI Features E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display credit balance', async () => {
    await detoxExpect(element(by.text('🪙'))).toBeVisible();
    await detoxExpect(element(by.id('credit-balance'))).toBeVisible();
  });

  it('should open AI search modal', async () => {
    await element(by.id('search-tab')).tap();
    await element(by.id('ai-search-button')).tap();
    await detoxExpect(element(by.text('AI Search'))).toBeVisible();
  });

  it('should perform AI search', async () => {
    await element(by.id('search-tab')).tap();
    await element(by.id('ai-search-button')).tap();
    await element(by.id('search-input')).typeText('Israeli comedy\n');
    await element(by.text('Search (-10)')).tap();

    await detoxExpect(element(by.id('search-results'))).toBeVisible();
  });

  it('should show AI recommendations', async () => {
    await detoxExpect(element(by.text('AI Recommendations'))).toBeVisible();
    await element(by.id('refresh-recommendations')).tap();
    await detoxExpect(element(by.id('recommendations-list'))).toBeVisible();
  });
});
```

---

## Load Testing

### Locust Load Tests

```python
# backend/test/load/locustfile.py
from locust import HttpUser, task, between
import random

class BetaUserLoadTest(HttpUser):
    """Load test for Beta 500 AI features."""

    wait_time = between(1, 3)
    auth_token = None

    def on_start(self):
        """Login as beta user."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": f"beta{random.randint(1, 500)}@example.com", "password": "test"},
        )
        self.auth_token = response.json()["access_token"]

    @task(10)
    def check_balance(self):
        """Check credit balance."""
        self.client.get(
            "/api/v1/beta/credits/balance",
            headers={"Authorization": f"Bearer {self.auth_token}"},
        )

    @task(3)
    def ai_search(self):
        """Perform AI search."""
        queries = [
            "Israeli comedy movies",
            "Family-friendly series",
            "Documentaries about Jewish history",
            "Movies similar to Fauda",
        ]
        self.client.post(
            "/api/v1/beta/search",
            json={"query": random.choice(queries)},
            headers={"Authorization": f"Bearer {self.auth_token}"},
        )

    @task(5)
    def ai_recommendations(self):
        """Get AI recommendations."""
        self.client.get(
            "/api/v1/beta/recommendations",
            headers={"Authorization": f"Bearer {self.auth_token}"},
        )

    @task(1)
    def catch_up(self):
        """Get catch-up summary."""
        channel_ids = ["channel_1", "channel_2", "channel_3"]
        self.client.get(
            f"/api/v1/live/{random.choice(channel_ids)}/catchup",
            headers={"Authorization": f"Bearer {self.auth_token}"},
        )
```

**Run Load Test:**
```bash
# 500 concurrent users, ramp up over 60 seconds
locust -f test/load/locustfile.py --headless -u 500 -r 10 -t 5m
```

---

## Manual QA Checklist

### Pre-Release Checklist

#### AI Search
- [ ] Search with specific queries returns relevant results
- [ ] Search with vague queries shows helpful suggestions
- [ ] Search with Hebrew queries works correctly
- [ ] Search with English queries works correctly
- [ ] Empty query shows validation message
- [ ] Insufficient credits shows warning
- [ ] Credits deducted correctly (10 per search)
- [ ] Results display correctly on all platforms (Web, iOS, Android, tvOS)
- [ ] Keyboard shortcut (Cmd/Ctrl+K) works on web
- [ ] Modal closes on ESC key
- [ ] Focus navigation works on tvOS

#### AI Recommendations
- [ ] Recommendations load on home screen
- [ ] Recommendations personalized based on viewing history
- [ ] Refresh button works correctly
- [ ] Credits deducted correctly (5 per refresh)
- [ ] Insufficient credits shows warning
- [ ] Recommendations display correctly on all platforms
- [ ] Horizontal scroll works smoothly
- [ ] AI badge displayed on each recommendation
- [ ] Last updated timestamp shown

#### Auto Catch-Up
- [ ] Catch-up button visible on live channels
- [ ] Button disabled when channel not live
- [ ] Summary generates successfully
- [ ] Summary displayed in modal/screen
- [ ] Credits deducted correctly (15 per summary)
- [ ] Insufficient credits shows warning
- [ ] Modal closes correctly
- [ ] Summary readable and relevant
- [ ] Focus navigation works on tvOS

#### Credit Management
- [ ] Balance displays correctly
- [ ] Balance updates in real-time
- [ ] Low credit warnings (50, 20, 10)
- [ ] Zero credit state handled gracefully
- [ ] Transaction log accurate
- [ ] Admin can grant credits
- [ ] Admin can refund credits
- [ ] Audit trail accessible

### Cross-Platform Testing

**Web:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Responsive (320px to 2560px)

**Mobile:**
- [ ] iOS 16+ (iPhone SE, 15, 15 Pro Max)
- [ ] Android 10+ (various devices)

**tvOS:**
- [ ] Apple TV 4K (tvOS 17+)
- [ ] Focus navigation
- [ ] Siri Remote gestures

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ai-tests.yml
name: AI Features Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install poetry
          poetry install

      - name: Run unit tests
        run: |
          cd backend
          poetry run pytest test/unit/services/test_beta_credit_service.py -v
          poetry run pytest test/unit/services/test_ai_service.py -v

      - name: Run integration tests
        run: |
          cd backend
          poetry run pytest test/integration/test_ai_features_api.py -v

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd web
          npm install

      - name: Run unit tests
        run: |
          cd web
          npm test -- --coverage

      - name: Run E2E tests
        run: |
          cd web
          npm run test:e2e
```

---

## Test Coverage Requirements

**Minimum Coverage: 87%**

```bash
# Backend
cd backend
poetry run pytest --cov=app --cov-report=html --cov-report=term
# Target: 87%+ coverage

# Frontend
cd web
npm test -- --coverage
# Target: 87%+ coverage
```

---

## Best Practices

1. **Mock LLM Responses** - Don't call real APIs in unit tests
2. **Use Test Fixtures** - Consistent test data across tests
3. **Test Edge Cases** - Low credits, no history, empty results
4. **Test Error Paths** - Network failures, API errors, timeouts
5. **Verify Credit Deductions** - Always check balance changes
6. **Test Rate Limiting** - Ensure limits enforced correctly
7. **Test All Platforms** - Web, iOS, Android, tvOS
8. **Run Tests in CI** - Automated testing on every commit

---

## Related Documentation

- [AI Features Overview](../features/AI_FEATURES_OVERVIEW.md) - Technical overview
- [AI API Reference](../api/AI_API_REFERENCE.md) - API documentation
- [Testing Strategy](TESTING_STRATEGY.md) - Overall testing strategy

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** QA Team
**Next Review:** 2026-03-30
