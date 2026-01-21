/**
 * Test Setup File
 * 
 * Global test configuration and mocks for the admin module tests.
  */

import { vi } from 'vitest';

// Mock global fetch
global.fetch = vi.fn();

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  }
});

// Mock console methods for testing
global.console = {
  ...console,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn()
};

// Mock window object for browser-specific tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock timers
vi.useFakeTimers();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  localStorageMock.clear();
});

// Clean up after tests
afterEach(() => {
  vi.restoreAllMocks();
});

// Global test utilities
export const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers(),
  redirected: false,
  type: 'default' as ResponseType,
  url: 'http://localhost:3000',
  clone: vi.fn(),
  body: null,
  bodyUsed: false,
  arrayBuffer: vi.fn(),
  blob: vi.fn(),
  formData: vi.fn()
});

export const mockFetch = (responses: Array<{ data: any; ok?: boolean; status?: number }>) => {
  responses.forEach((response, index) => {
    (global.fetch as any).mockResolvedValueOnce(
      createMockResponse(response.data, response.ok, response.status)
    );
  });
};

// Error simulation utilities
export const simulateNetworkError = () => {
  (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
};

export const simulateTimeout = () => {
  (global.fetch as any).mockRejectedValueOnce(new Error('Request timeout'));
};

// Test data factories
export const createMockAdminUser = (overrides: Partial<any> = {}) => ({
  id: 'admin-123',
  email: 'admin@cvplus.com',
  name: 'Admin User',
  role: 'admin',
  permissions: {
    canAccessDashboard: true,
    canManageUsers: true,
    canModerateContent: true,
    canMonitorSystem: true,
    canViewAnalytics: true
  },
  ...overrides
});

export const createMockDashboardConfig = (overrides: Partial<any> = {}) => ({
  layout: 'GRID',
  refreshInterval: 30000,
  realtimeModules: ['system_health', 'active_users'],
  widgetConfiguration: [],
  filters: {
    timeRange: {
      preset: 'LAST_24_HOURS',
      customRange: {
        start: new Date(Date.now() - 86400000),
        end: new Date()
      }
    }
  },
  customization: {
    theme: 'light',
    colorScheme: 'default',
    showGrid: true,
    compactMode: false,
    animations: true,
    autoRefresh: true,
    exportFormats: ['csv', 'json']
  },
  ...overrides
});

export const createMockSystemHealth = (overrides: Partial<any> = {}) => ({
  status: 'healthy',
  uptime: 99.9,
  averageResponseTime: 150,
  errorRate: 0.1,
  activeUsers: 750,
  systemLoad: 0.65,
  lastHealthCheck: new Date(),
  issues: [],
  ...overrides
});

// Async test utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForNextTick = () => new Promise(resolve => process.nextTick(resolve));