/**
<<<<<<< HEAD
 * Jest Setup Configuration for Olorin Microservices
 * Common setup for all test environments
 */

import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Suppress known React warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: validateDOMNesting') ||
     args[0].includes('Warning: componentWillReceiveProps'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  // Suppress known warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: React.createFactory') ||
     args[0].includes('Warning: componentWillMount'))
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Mock window.matchMedia
=======
 * Jest Setup File
 * Feature: 001-extensive-investigation-report
 * Task: T078
 *
 * Global test setup and configuration for Jest tests
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia (required for responsive components)
>>>>>>> 001-modify-analyzer-method
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
<<<<<<< HEAD
    dispatchEvent: jest.fn()
  }))
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn().mockReturnValue([])
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock performance.now() for timing tests
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    timing: {},
    navigation: {}
  }
});

// Mock URL constructor
global.URL = jest.fn().mockImplementation((url) => ({
  href: url,
  origin: 'http://localhost:3000',
  protocol: 'http:',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  searchParams: new URLSearchParams()
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: 'http://localhost:3000'
  } as Response)
);

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock getComputedStyle
global.getComputedStyle = jest.fn(() => ({
  getPropertyValue: jest.fn(() => ''),
  setProperty: jest.fn(),
  removeProperty: jest.fn()
}));

// Mock document methods
Object.defineProperty(document, 'createRange', {
  value: () => ({
    setStart: jest.fn(),
    setEnd: jest.fn(),
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document
    },
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
    getClientRects: () => []
  })
});

// Mock canvas context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  canvas: {
    width: 800,
    height: 600
  }
}));

// Custom matchers
expect.extend({
  toBeValidEventType(received: string) {
    const validEventTypes = [
      'auto:investigation:started',
      'auto:investigation:completed',
      'auto:investigation:escalated',
      'manual:investigation:started',
      'manual:investigation:completed',
      'agent:execution:started',
      'agent:execution:completed',
      'rag:query:executed',
      'viz:graph:updated',
      'report:generated',
      'ui:notification:show',
      'design:tokens:updated',
      'service:health:check',
      'service:error'
    ];

    const pass = validEventTypes.includes(received);

    return {
      message: () => pass
        ? `Expected ${received} not to be a valid event type`
        : `Expected ${received} to be a valid event type. Valid types: ${validEventTypes.join(', ')}`,
      pass
    };
  },

  toHaveEventData(received: any, expectedKeys: string[]) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected event data to be an object, received ${typeof received}`,
        pass: false
      };
    }

    const missingKeys = expectedKeys.filter(key => !(key in received));
    const pass = missingKeys.length === 0;

    return {
      message: () => pass
        ? `Expected event data not to have keys: ${expectedKeys.join(', ')}`
        : `Expected event data to have keys: ${missingKeys.join(', ')}`,
      pass
    };
  },

  toBeValidServiceName(received: string) {
    const validServices = [
      'autonomous-investigation',
      'manual-investigation',
      'agent-analytics',
      'rag-intelligence',
      'visualization',
      'reporting',
      'core-ui',
      'design-system'
    ];

    const pass = validServices.includes(received);

    return {
      message: () => pass
        ? `Expected ${received} not to be a valid service name`
        : `Expected ${received} to be a valid service name. Valid services: ${validServices.join(', ')}`,
      pass
    };
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEventType(): R;
      toHaveEventData(expectedKeys: string[]): R;
      toBeValidServiceName(): R;
    }
  }

  var testUtils: {
    createMockEvent: (type: string, data?: any) => any;
    createMockInvestigation: (overrides?: any) => any;
    createMockUser: (overrides?: any) => any;
    waitForAsync: (ms?: number) => Promise<void>;
    mockTimers: () => void;
    restoreTimers: () => void;
  };
}

// Global test utilities
global.testUtils = {
  createMockEvent: (type: string, data: any = {}) => ({
    type,
    data,
    timestamp: new Date(),
    id: `mock-event-${Date.now()}`
  }),

  createMockInvestigation: (overrides: any = {}) => ({
    id: `inv-${Date.now()}`,
    userId: 'test-user',
    entityType: 'email',
    status: 'active',
    created: new Date(),
    ...overrides
  }),

  createMockUser: (overrides: any = {}) => ({
    id: `user-${Date.now()}`,
    name: 'Test User',
    email: 'test@example.com',
    role: 'investigator',
    ...overrides
  }),

  waitForAsync: (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  mockTimers: () => {
    jest.useFakeTimers();
  },

  restoreTimers: () => {
    jest.useRealTimers();
  }
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();

  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: 'http://localhost:3000'
  });
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

export {};
=======
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
>>>>>>> 001-modify-analyzer-method
