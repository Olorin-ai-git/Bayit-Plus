# Testing Strategy

**Project:** Bayit+ Streaming Platform
**Last Updated:** 2026-01-30
**Test Coverage Target:** 87% minimum

## Overview

Bayit+ employs a comprehensive testing strategy across all platforms (backend, web, mobile, tvOS) with automated testing integrated into CI/CD pipelines. This document defines testing standards, tools, patterns, and coverage requirements.

### Testing Pyramid

```
         ╱────────────╲
        ╱   E2E Tests   ╲    ← 10% (Critical user flows)
       ╱────────────────╲
      ╱  Integration Tests ╲  ← 20% (API contracts, services)
     ╱──────────────────────╲
    ╱      Unit Tests         ╲ ← 70% (Business logic, utilities)
   ╱────────────────────────────╲
```

**Target Distribution:**
- **70% Unit Tests** - Fast, isolated, focused on business logic
- **20% Integration Tests** - API contracts, database operations, service integration
- **10% E2E Tests** - Critical user flows across platforms

---

## Testing Tools

### Backend (Python/FastAPI)

| Tool | Purpose | Version |
|------|---------|---------|
| **pytest** | Test framework | 7.4+ |
| **pytest-asyncio** | Async test support | 0.21+ |
| **pytest-cov** | Coverage reporting | 4.1+ |
| **httpx** | HTTP client for API testing | 0.25+ |
| **mongomock** | MongoDB mocking | 4.1+ |
| **faker** | Test data generation | 20.0+ |
| **freezegun** | Time mocking | 1.2+ |

### Frontend Web (React/TypeScript)

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Test framework | 29+ |
| **React Testing Library** | Component testing | 14+ |
| **@testing-library/user-event** | User interaction simulation | 14+ |
| **@testing-library/jest-dom** | DOM matchers | 6+ |
| **MSW** | API mocking | 2.0+ |
| **Playwright** | E2E testing | 1.40+ |

### Mobile (React Native)

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Test framework | 29+ |
| **React Native Testing Library** | Component testing | 12+ |
| **Detox** | E2E testing | 20+ |
| **@testing-library/react-native** | Native component testing | 12+ |

### tvOS (React Native for TV)

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Test framework | 29+ |
| **React Native Testing Library** | Component testing | 12+ |
| **Detox** | E2E testing (tvOS support) | 20+ |

---

## Unit Testing

### Backend Unit Tests

**Location:** `backend/test/unit/`

**Pattern:** `test_[module_name].py`

**Example Structure:**
```python
# backend/test/unit/test_beta_credit_service.py
import pytest
from datetime import datetime, timezone
from app.services.beta.credit_service import BetaCreditService
from app.models.beta import BetaUser

class TestBetaCreditService:
    """Test suite for Beta Credit Service"""

    @pytest.fixture
    async def credit_service(self):
        """Fixture for credit service"""
        return BetaCreditService()

    @pytest.fixture
    async def beta_user(self):
        """Fixture for beta user"""
        user = BetaUser(
            user_id="test_user_123",
            email="test@example.com",
            credits_balance=500,
            is_active=True
        )
        await user.insert()
        yield user
        await user.delete()

    @pytest.mark.asyncio
    async def test_deduct_credits_success(self, credit_service, beta_user):
        """Test successful credit deduction"""
        # Arrange
        initial_balance = beta_user.credits_balance
        deduct_amount = 5

        # Act
        result = await credit_service.deduct_credits(
            user_id=beta_user.user_id,
            amount=deduct_amount,
            reason="ai_search"
        )

        # Assert
        assert result is True
        updated_user = await BetaUser.find_one(BetaUser.user_id == beta_user.user_id)
        assert updated_user.credits_balance == initial_balance - deduct_amount

    @pytest.mark.asyncio
    async def test_deduct_credits_insufficient_balance(self, credit_service, beta_user):
        """Test credit deduction fails with insufficient balance"""
        # Arrange
        beta_user.credits_balance = 2
        await beta_user.save()

        # Act & Assert
        with pytest.raises(InsufficientCreditsError):
            await credit_service.deduct_credits(
                user_id=beta_user.user_id,
                amount=5,
                reason="ai_search"
            )
```

**Best Practices:**
- ✅ **Arrange-Act-Assert pattern** - Clear test structure
- ✅ **Descriptive test names** - `test_[what]_[condition]_[expected]`
- ✅ **Use fixtures** - Share setup code across tests
- ✅ **Mock external dependencies** - Database, APIs, time
- ✅ **Test edge cases** - Empty inputs, null values, boundary conditions
- ✅ **One assertion per test** - Focus on single behavior
- ✅ **Clean up after tests** - Use fixtures with cleanup

**Coverage Target:** 90%+ for service layer, 85%+ for utilities

---

### Frontend Unit Tests

**Location:** `web/src/components/**/*.test.tsx`

**Pattern:** `[Component].test.tsx` (co-located with component)

**Example Structure:**
::: v-pre
```typescript
// web/src/components/Feature/FeatureCard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureCard } from './FeatureCard';

describe('FeatureCard', () => {
  const mockFeature = {
    id: '123',
    title: 'Test Feature',
    description: 'Test description',
    isActive: true
  };

  it('renders feature title and description', () => {
    render(<FeatureCard feature={mockFeature} />);

    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const mockOnClick = jest.fn();
    const user = userEvent.setup();

    render(<FeatureCard feature={mockFeature} onClick={mockOnClick} />);

    await user.click(screen.getByRole('button'));

    expect(mockOnClick).toHaveBeenCalledWith(mockFeature.id);
  });

  it('shows loading state', () => {
    render(<FeatureCard feature={mockFeature} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('applies glassmorphism styles', () => {
    const { container } = render(<FeatureCard feature={mockFeature} />);

    const card = container.firstChild;
    expect(card).toHaveClass('glass-card');
  });
});
```
:::

**Best Practices:**
- ✅ **Test user behavior** - Not implementation details
- ✅ **Use semantic queries** - `getByRole`, `getByLabelText` over `getByTestId`
- ✅ **Test accessibility** - ARIA labels, keyboard navigation
- ✅ **Mock API calls** - Use MSW for realistic mocking
- ✅ **Test loading states** - Async operations, suspense
- ✅ **Test error states** - Error boundaries, error messages
- ✅ **Avoid snapshot tests** - Brittle and hard to maintain

**Coverage Target:** 85%+ for components, 90%+ for hooks and utilities

---

## Integration Testing

### Backend Integration Tests

**Location:** `backend/test/integration/`

**Pattern:** `test_[feature]_api.py`

**Example Structure:**
```python
# backend/test/integration/test_beta_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.integration
class TestBetaAPI:
    """Integration tests for Beta 500 API endpoints"""

    @pytest.fixture
    async def client(self):
        """HTTP client fixture"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client

    @pytest.fixture
    async def auth_headers(self):
        """Authenticated request headers"""
        # Create test user and get token
        token = await get_test_user_token()
        return {"Authorization": f"Bearer {token}"}

    @pytest.mark.asyncio
    async def test_get_credit_balance(self, client, auth_headers):
        """Test GET /api/v1/beta/credits/balance"""
        # Act
        response = await client.get(
            "/api/v1/beta/credits/balance",
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "is_beta_user" in data
        assert isinstance(data["balance"], int)

    @pytest.mark.asyncio
    async def test_ai_search_deducts_credits(self, client, auth_headers):
        """Test AI search deducts credits correctly"""
        # Arrange - Get initial balance
        balance_response = await client.get(
            "/api/v1/beta/credits/balance",
            headers=auth_headers
        )
        initial_balance = balance_response.json()["balance"]

        # Act - Perform AI search
        search_response = await client.post(
            "/api/v1/beta/search",
            json={"query": "test search"},
            headers=auth_headers
        )

        # Assert - Credits deducted
        assert search_response.status_code == 200
        new_balance_response = await client.get(
            "/api/v1/beta/credits/balance",
            headers=auth_headers
        )
        new_balance = new_balance_response.json()["balance"]
        assert new_balance == initial_balance - 10  # AI search costs 10 credits
```

**Best Practices:**
- ✅ **Test full request/response cycle** - Including middleware, validation
- ✅ **Test authentication** - Verify auth requirements
- ✅ **Test authorization** - Role-based access control
- ✅ **Test error responses** - 4xx, 5xx errors
- ✅ **Test rate limiting** - Multiple requests
- ✅ **Use real database** - Test database or in-memory MongoDB
- ✅ **Clean up after tests** - Delete test data

**Coverage Target:** 80%+ for API endpoints

---

### Frontend Integration Tests

**Location:** `web/src/**/*.integration.test.tsx`

**Pattern:** `[Feature].integration.test.tsx`

**Example Structure:**
::: v-pre
```typescript
// web/src/features/beta/AISearch.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { AISearchModal } from './AISearchModal';

const server = setupServer(
  rest.post('/api/v1/beta/search', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [
          { id: '1', title: 'Test Movie', type: 'movie' }
        ],
        credits_used: 10
      })
    );
  }),
  rest.get('/api/v1/beta/credits/balance', (req, res, ctx) => {
    return res(ctx.json({ balance: 500, is_beta_user: true }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('AISearch Integration', () => {
  it('performs search and updates credit balance', async () => {
    const user = userEvent.setup();

    render(<AISearchModal isOpen={true} onClose={() => {}} />);

    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search with AI...');
    await user.type(searchInput, 'romantic comedy');

    // Click search button
    await user.click(screen.getByRole('button', { name: /search/i }));

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    // Verify credit balance updated
    await waitFor(() => {
      expect(screen.getByText(/490 credits/i)).toBeInTheDocument();
    });
  });
});
```
:::

**Best Practices:**
- ✅ **Mock API with MSW** - Realistic network mocking
- ✅ **Test user flows** - Complete feature workflows
- ✅ **Test state updates** - Zustand store changes
- ✅ **Test error handling** - Network failures, API errors
- ✅ **Test loading states** - Spinners, skeletons
- ✅ **Test optimistic updates** - UI updates before API response

**Coverage Target:** 75%+ for features

---

## End-to-End (E2E) Testing

### Web E2E Tests (Playwright)

**Location:** `web/e2e/`

**Pattern:** `[feature].spec.ts`

**Example Structure:**
```typescript
// web/e2e/ai-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Search Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login as beta user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'beta@example.com');
    await page.fill('[data-testid="password-input"]', 'Test123!@#');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/');
  });

  test('user can search with AI and view results', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="ai-search-button"]');

    // Enter search query
    await page.fill('[data-testid="ai-search-input"]', 'romantic comedy in Hebrew');

    // Click search
    await page.click('[data-testid="ai-search-submit"]');

    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Verify results displayed
    const resultCount = await page.locator('[data-testid="result-card"]').count();
    expect(resultCount).toBeGreaterThan(0);

    // Verify credit balance updated
    const creditBadge = page.locator('[data-testid="credit-balance"]');
    await expect(creditBadge).toContainText(/\d+ credits/);
  });

  test('handles insufficient credits gracefully', async ({ page }) => {
    // Set up user with 0 credits (mock API)
    await page.route('**/api/v1/beta/credits/balance', route => {
      route.fulfill({
        json: { balance: 0, is_beta_user: true }
      });
    });

    // Try to search
    await page.click('[data-testid="ai-search-button"]');
    await page.fill('[data-testid="ai-search-input"]', 'test query');
    await page.click('[data-testid="ai-search-submit"]');

    // Verify error message
    await expect(page.locator('[role="alert"]')).toContainText(/insufficient credits/i);
  });
});
```

**Best Practices:**
- ✅ **Test critical paths** - Core user flows only
- ✅ **Use data-testid** - Stable selectors
- ✅ **Test across browsers** - Chrome, Firefox, Safari, Edge
- ✅ **Test responsive design** - Mobile, tablet, desktop viewports
- ✅ **Screenshot on failure** - Debug failed tests
- ✅ **Record videos** - Visual debugging
- ✅ **Parallel execution** - Faster test runs

**Playwright Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### Mobile E2E Tests (Detox)

**Location:** `mobile-app/e2e/`

**Pattern:** `[feature].e2e.js`

**Example Structure:**
```javascript
// mobile-app/e2e/aiSearch.e2e.js
describe('AI Search (Mobile)', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should perform AI search successfully', async () => {
    // Login
    await element(by.id('email-input')).typeText('beta@example.com');
    await element(by.id('password-input')).typeText('Test123!@#');
    await element(by.id('login-button')).tap();

    // Wait for home screen
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Open AI search
    await element(by.id('ai-search-button')).tap();

    // Enter query
    await element(by.id('ai-search-input')).typeText('romantic comedy');

    // Tap search
    await element(by.id('ai-search-submit')).tap();

    // Verify results
    await waitFor(element(by.id('search-results')))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.id('result-card')).atIndex(0)).toBeVisible();
  });

  it('should handle platform-specific gestures', async () => {
    // Test swipe gesture on results
    await element(by.id('search-results')).swipe('up');

    // Verify scroll worked
    await expect(element(by.id('result-card')).atIndex(5)).toBeVisible();
  });
});
```

**Detox Configuration:**
```json
// .detoxrc.json
{
  "testRunner": "jest",
  "runnerConfig": "e2e/config.json",
  "apps": {
    "ios": {
      "type": "ios.app",
      "binaryPath": "ios/build/Build/Products/Release-iphonesimulator/BayitPlus.app",
      "build": "xcodebuild -workspace ios/BayitPlus.xcworkspace -scheme BayitPlus -configuration Release -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "android": {
      "type": "android.apk",
      "binaryPath": "android/app/build/outputs/apk/release/app-release.apk",
      "build": "cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release"
    }
  },
  "devices": {
    "simulator": {
      "type": "ios.simulator",
      "device": { "type": "iPhone 15 Pro" }
    },
    "emulator": {
      "type": "android.emulator",
      "device": { "avdName": "Pixel_5_API_33" }
    }
  },
  "configurations": {
    "ios": {
      "device": "simulator",
      "app": "ios"
    },
    "android": {
      "device": "emulator",
      "app": "android"
    }
  }
}
```

---

## Test Coverage

### Measuring Coverage

**Backend:**
```bash
# Run tests with coverage
poetry run pytest --cov=app --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html
```

**Frontend:**
```bash
# Run tests with coverage
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Requirements

| Component | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| **Backend Services** | 85% | 90% |
| **Backend API Endpoints** | 80% | 85% |
| **Backend Utilities** | 85% | 90% |
| **Frontend Components** | 80% | 85% |
| **Frontend Hooks** | 85% | 90% |
| **Frontend Services** | 85% | 90% |
| **Mobile Components** | 75% | 80% |
| **tvOS Components** | 70% | 75% |

**Overall Target:** 87% minimum across all platforms

### Coverage Enforcement

**GitHub Actions CI:**
```yaml
# .github/workflows/test.yml
- name: Backend Tests with Coverage
  run: |
    poetry run pytest --cov=app --cov-report=term --cov-fail-under=87

- name: Frontend Tests with Coverage
  run: |
    npm test -- --coverage --coverageThreshold='{"global":{"branches":85,"functions":85,"lines":87,"statements":87}}'
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
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
        run: cd backend && poetry run pytest test/unit -v

      - name: Run integration tests
        run: cd backend && poetry run pytest test/integration -v

      - name: Check coverage
        run: cd backend && poetry run pytest --cov=app --cov-fail-under=87

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd web && npm ci

      - name: Run unit tests
        run: cd web && npm test -- --coverage

      - name: Run E2E tests
        run: cd web && npx playwright test

  mobile-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd mobile-app && npm ci

      - name: Run unit tests
        run: cd mobile-app && npm test

      - name: Build iOS app
        run: cd mobile-app && detox build -c ios

      - name: Run iOS E2E tests
        run: cd mobile-app && detox test -c ios
```

---

## Test Data Management

### Test Fixtures

**Backend Fixtures:**
```python
# backend/test/conftest.py
import pytest
from faker import Faker

fake = Faker()

@pytest.fixture
def test_user_data():
    """Generate test user data"""
    return {
        "email": fake.email(),
        "name": fake.name(),
        "password": "Test123!@#"
    }

@pytest.fixture
async def test_content():
    """Create test content"""
    content = Content(
        title="Test Movie",
        description="Test description",
        stream_url="https://example.com/stream.m3u8",
        section_ids=["movies"],
        content_format="movie"
    )
    await content.insert()
    yield content
    await content.delete()
```

**Frontend Fixtures:**
```typescript
// web/src/test/fixtures/content.ts
export const mockContent = {
  id: '123',
  title: 'Test Movie',
  description: 'Test description',
  thumbnail: 'https://example.com/thumb.jpg',
  duration: '1:45:00',
  rating: 7.5
};

export const mockContentList = [
  mockContent,
  { ...mockContent, id: '124', title: 'Another Movie' },
  { ...mockContent, id: '125', title: 'Third Movie' }
];
```

### Test Database

**Setup Test MongoDB:**
```python
# backend/test/conftest.py
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

@pytest.fixture(scope="session")
async def test_db():
    """Create test database"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.bayit_plus_test

    yield db

    # Cleanup after all tests
    await client.drop_database("bayit_plus_test")
    client.close()
```

---

## Best Practices Summary

### DO ✅

- **Write tests first** (TDD when possible)
- **Test behavior, not implementation**
- **Use descriptive test names**
- **Keep tests fast** (< 100ms for unit tests)
- **Mock external dependencies** (APIs, databases, time)
- **Test edge cases and error scenarios**
- **Maintain 87%+ coverage**
- **Run tests before committing**
- **Fix flaky tests immediately**
- **Update tests when code changes**

### DON'T ❌

- **Don't test implementation details**
- **Don't use snapshots excessively**
- **Don't skip tests** (no `.skip()` in committed code)
- **Don't ignore flaky tests**
- **Don't mock everything** (over-mocking makes tests useless)
- **Don't write slow tests** (if unavoidable, mark as integration)
- **Don't commit commented-out tests**
- **Don't test third-party libraries**

---

## Troubleshooting

### Common Issues

**Issue: Tests pass locally but fail in CI**

**Solution:**
- Check for time-dependent tests (use `freezegun`)
- Check for race conditions (async timing)
- Check for environment-specific configs
- Check for missing dependencies in CI

**Issue: Flaky tests (sometimes pass, sometimes fail)**

**Solution:**
- Add explicit waits for async operations
- Avoid relying on timing
- Use `waitFor` utilities
- Mock randomness (faker seed, math.random)

**Issue: Slow test suite**

**Solution:**
- Run tests in parallel
- Use test database (not production)
- Mock external APIs
- Optimize fixtures
- Move slow tests to integration suite

---

## Related Documents

- [API Overview](../api/API_OVERVIEW.md)
- [Database Schema Reference](../technical/DATABASE_SCHEMA_REFERENCE.md)
- [CI/CD Guide](../deployment/CI_CD_GUIDE.md)
- [Quality Assurance Process](../quality-reports/QA_PROCESS.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** QA Team
**Next Review:** 2026-04-30
