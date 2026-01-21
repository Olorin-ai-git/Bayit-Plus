# Bayit+ Testing Infrastructure

Comprehensive testing setup for shared components, screens, services, and stores.

## Overview

This testing infrastructure provides:
- ✅ Jest configuration for shared, web, and tvOS
- ✅ Testing utilities (render helpers, mocks, test data)
- ✅ 87%+ coverage requirements
- ✅ Unit, integration, and E2E testing support

## Directory Structure

```
shared/testing/
├── __mocks__/
│   └── fileMock.js           # Mock for image imports
├── renderWithProviders.tsx   # Helper to render with providers
├── mockAuthStore.ts          # Mock auth store
├── mockNavigation.ts         # Mock React Navigation
├── mockData.ts               # Sample test data
├── index.ts                  # Export all utilities
└── README.md                 # This file
```

## Installation

### tvOS App

```bash
cd tvos-app
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

### Web App

```bash
cd web
npm install --save-dev jest @testing-library/react @testing-library/jest-dom babel-jest identity-obj-proxy
```

### Shared

```bash
cd shared
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

## Usage

### Basic Component Test

```typescript
import { renderWithProviders, screen, fireEvent } from '@bayit/shared/testing';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('handles button press', () => {
    const onPress = jest.fn();
    renderWithProviders(<MyComponent onPress={onPress} />);

    fireEvent.press(screen.getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### Screen Test with Navigation

```typescript
import { renderWithProviders, screen } from '@bayit/shared/testing';
import { mockNavigation, mockRoute } from '@bayit/shared/testing';
import MovieDetailScreen from '../MovieDetailScreen';

// Mock navigation hooks
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

describe('MovieDetailScreen', () => {
  it('navigates to player on play button press', () => {
    renderWithProviders(<MovieDetailScreen />);

    fireEvent.press(screen.getByText('Play'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player', {
      contentId: expect.any(String),
      type: 'vod',
    });
  });
});
```

### Service Test with Mock Data

```typescript
import axios from 'axios';
import { contentService } from '../api';
import { mockMovie } from '@bayit/shared/testing';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('contentService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movie details', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockMovie });

    const result = await contentService.getMovieDetails('movie-123');

    expect(result).toEqual(mockMovie);
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/content/movie/movie-123');
  });

  it('handles API errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    await expect(contentService.getMovieDetails('invalid-id')).rejects.toThrow('Network error');
  });
});
```

### Store Test

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';
import { mockUser } from '@bayit/shared/testing';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().clearAuth();
  });

  it('logs in user', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('test@bayit.tv', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(expect.objectContaining({
      email: 'test@bayit.tv',
    }));
  });

  it('logs out user', async () => {
    const { result } = renderHook(() => useAuthStore());

    // First login
    await act(async () => {
      await result.current.login('test@bayit.tv', 'password');
    });

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

## Running Tests

### Run all tests

```bash
# tvOS
cd tvos-app && npm test

# Web
cd web && npm test

# Shared
cd shared && npm test
```

### Run with coverage

```bash
npm test -- --coverage
```

### Run in watch mode

```bash
npm test -- --watch
```

### Run specific test file

```bash
npm test -- path/to/test.test.ts
```

## Coverage Requirements

All modules must achieve **87%+ coverage** across:
- ✅ Branches
- ✅ Functions
- ✅ Lines
- ✅ Statements

Coverage reports are generated in `/coverage/` directory.

## Mock Data

Use `mockData.ts` for consistent test data:

```typescript
import {
  mockMovie,
  mockSeries,
  mockLiveChannel,
  mockSearchResults,
  mockRecommendations,
  mockChapters,
  mockCastMembers,
} from '@bayit/shared/testing';
```

## Best Practices

1. **Always use renderWithProviders** instead of plain render() to ensure all providers are available
2. **Mock navigation hooks** for screen tests
3. **Use mockData** for consistent test data across all tests
4. **Clear mocks** between tests with `jest.clearAllMocks()` in `afterEach`
5. **Test user interactions** with `fireEvent` or `userEvent`
6. **Test error states** not just happy paths
7. **Keep tests focused** - one assertion per test when possible
8. **Use descriptive test names** - "should X when Y" format
9. **Avoid implementation details** - test behavior, not implementation
10. **Mock external dependencies** - APIs, storage, navigation

## Continuous Integration

Tests run automatically on:
- ✅ Every commit (pre-commit hook)
- ✅ Every pull request (CI/CD pipeline)
- ✅ Before deployment (production gate)

CI/CD will fail if:
- ❌ Any test fails
- ❌ Coverage drops below 87%
- ❌ Linting errors exist

## Troubleshooting

### "Cannot find module" errors

Ensure all path aliases in `jest.config.js` match your `tsconfig.json`:

```javascript
moduleNameMapper: {
  '^@bayit/shared/(.*)$': '<rootDir>/../shared/$1',
}
```

### Tests timeout

Increase timeout for async tests:

```typescript
jest.setTimeout(10000); // 10 seconds
```

### Mock not working

Ensure mocks are placed before imports:

```typescript
jest.mock('@react-navigation/native');
import { useNavigation } from '@react-navigation/native';
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
