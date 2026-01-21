import '@testing-library/jest-dom';

// Mock webpack module federation for testing
global.__webpack_require__ = {
  e: jest.fn(() => Promise.resolve()),
  t: jest.fn((module) => {
    const mockModules = {
      'investigation/InvestigationDashboard': () => Promise.resolve({
        default: () => 'Investigation Dashboard'
      }),
      'agentAnalytics/AgentAnalyticsDashboard': () => Promise.resolve({
        default: () => 'Agent Analytics Dashboard'
      }),
      'ragIntelligence/KnowledgeBase': () => Promise.resolve({
        default: () => 'Knowledge Base'
      }),
      'visualization/DataVisualization': () => Promise.resolve({
        default: () => 'Data Visualization'
      }),
      'reporting/ReportDashboard': () => Promise.resolve({
        default: () => 'Report Dashboard'
      }),
      'coreUi/Layout': () => Promise.resolve({
        default: () => 'Layout Component'
      }),
      'designSystem/DesignSystemFoundation': () => Promise.resolve({
        default: () => 'Design System Foundation'
      })
    };

    return mockModules[module] || (() => Promise.reject(new Error(`Module not found: ${module}`)));
  })
};

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  }
});

// Mock window object for global olorin namespace
Object.defineProperty(global, 'window', {
  writable: true,
  value: {
    olorin: undefined, // Will be set up by TestSetup
    location: {
      href: 'http://localhost:3000',
      reload: jest.fn()
    },
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }
});

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
) as jest.Mock;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen = null;
  onclose = null;
  onmessage = null;
  onerror = null;

  constructor(url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen({} as Event);
    }, 10);
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({} as CloseEvent);
  }
}

global.WebSocket = MockWebSocket as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor() {}
  observe() {}
  disconnect() {}
} as any;

// Mock console methods to reduce test noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Cleanup function
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();

  // Clear window.olorin
  if (global.window?.olorin) {
    delete global.window.olorin;
  }

  // Clear localStorage and sessionStorage
  global.window.localStorage.clear();
  global.window.sessionStorage.clear();
});

// Global test utilities
global.waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

global.createMockServiceResponse = (data: any, delay: number = 100) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};

global.createMockError = (message: string, code?: string) => {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
};

// Integration test specific setup
beforeAll(() => {
  // Set longer timeout for integration tests
  jest.setTimeout(30000);
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};

// Type declarations for global test utilities
declare global {
  function waitFor(ms: number): Promise<void>;
  function createMockServiceResponse(data: any, delay?: number): Promise<any>;
  function createMockError(message: string, code?: string): Error;
}