/**
 * Test suite for ProtectedRoute component
 * Tests loading states, unauthenticated redirect, and authenticated rendering.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Mock authStore
const mockAuthState: {
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  user: { id: string; email?: string } | null;
} = {
  isAuthenticated: false,
  isHydrated: true,
  isLoading: false,
  user: null,
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    if (typeof selector === 'function') return selector(mockAuthState);
    return mockAuthState;
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    scope: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

function renderProtectedRoute(initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.isHydrated = true;
    mockAuthState.isLoading = false;
    mockAuthState.user = null;
  });

  // MARK: - Loading State

  describe('loading state', () => {
    it('shows loading when not hydrated', () => {
      mockAuthState.isHydrated = false;
      renderProtectedRoute();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('shows loading when isLoading is true', () => {
      mockAuthState.isLoading = true;
      renderProtectedRoute();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows spinner element during loading', () => {
      mockAuthState.isHydrated = false;
      const { container } = renderProtectedRoute();

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // MARK: - Unauthenticated Redirect

  describe('unauthenticated redirect', () => {
    it('redirects to login when not authenticated', () => {
      mockAuthState.isAuthenticated = false;
      mockAuthState.isHydrated = true;

      renderProtectedRoute();

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('preserves return URL in redirect', () => {
      mockAuthState.isAuthenticated = false;
      mockAuthState.isHydrated = true;

      render(
        <MemoryRouter initialEntries={['/protected?tab=settings#section']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('login-redirect')).toBeInTheDocument();
    });
  });

  // MARK: - Authenticated Access

  describe('authenticated access', () => {
    it('renders children when authenticated', () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = { id: 'u1', email: 'test@bayit.tv' };

      renderProtectedRoute();

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('does not redirect when authenticated', () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = { id: 'u1' };

      renderProtectedRoute();

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });
});
