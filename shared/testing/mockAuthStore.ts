/**
 * Mock auth store for testing
 * Provides a mock implementation of the auth store with test data
 */

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  subscription?: {
    plan: string;
    status: string;
  };
}

export const mockUser: MockUser = {
  id: 'test-user-123',
  email: 'test@bayit.tv',
  name: 'Test User',
  role: 'user',
  subscription: {
    plan: 'premium',
    status: 'active',
  },
};

export const mockAdminUser: MockUser = {
  id: 'admin-user-456',
  email: 'admin@bayit.tv',
  name: 'Admin User',
  role: 'admin',
  subscription: {
    plan: 'premium',
    status: 'active',
  },
};

/**
 * Creates a mock auth store implementation for testing
 */
export function createMockAuthStore(overrides?: Partial<any>) {
  return {
    user: mockUser,
    token: 'mock-jwt-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue({ success: true }),
    setUser: jest.fn(),
    setToken: jest.fn(),
    clearAuth: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
    isAdmin: jest.fn().mockReturnValue(false),
    ...overrides,
  };
}

/**
 * Mock useAuthStore hook for testing
 */
export function mockUseAuthStore(overrides?: Partial<any>) {
  return jest.fn(() => createMockAuthStore(overrides));
}
