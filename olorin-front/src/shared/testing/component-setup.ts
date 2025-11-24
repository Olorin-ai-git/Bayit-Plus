/**
<<<<<<< HEAD
 * Component Testing Setup for Olorin Microservices
 * Setup for React component testing with React Testing Library
 */

import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement, ReactNode } from 'react';
import { EventBusManager } from '../events/eventBus';
import { ServiceAdapterRegistry } from '../events/service-adapters';

// Mock Tailwind CSS classes
jest.mock('../../shared/utils', () => ({
  ...jest.requireActual('../../shared/utils'),
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock design tokens
jest.mock('../../shared/figma/design-tokens', () => ({
  getDesignTokens: () => ({
    colors: {
      primary: { 500: '#3b82f6' },
      secondary: { 500: '#64748b' },
      success: { 500: '#22c55e' },
      warning: { 500: '#f59e0b' },
      error: { 500: '#ef4444' }
    },
    typography: {
      fontSize: { base: '1rem', lg: '1.125rem' },
      fontWeight: { normal: 400, bold: 700 }
    },
    spacing: { md: '1rem', lg: '1.5rem' }
  }),
  getServiceColors: (service: string) => ({
    primary: '#3b82f6',
    secondary: '#dbeafe'
  })
}));

// Mock event bus for components
const mockEventBus = {
  subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
  emit: jest.fn(),
  cleanup: jest.fn(),
  stats: jest.fn(() => ({ listeners: 0, components: 0 }))
};

jest.mock('../events/eventBus', () => ({
  EventBusManager: {
    getInstance: () => mockEventBus
  },
  useEventBus: () => mockEventBus
}));

// Provider wrapper for components that need context
interface ProvidersProps {
  children: ReactNode;
}

const TestProviders = ({ children }: ProvidersProps) => {
  return React.createElement('div', { 'data-testid': 'test-wrapper' }, children);
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestProviders, ...options });

// Component test utilities
export const componentTestUtils = {
  /**
   * Render component with test providers
   */
  renderWithProviders: customRender,

  /**
   * Mock event subscription
   */
  mockEventSubscription: (eventType: string, handler: Function) => {
    const unsubscribe = jest.fn();
    mockEventBus.subscribe.mockReturnValue(unsubscribe);
    return { unsubscribe, handler };
  },

  /**
   * Trigger event emission
   */
  emitEvent: (eventType: string, data: any) => {
    mockEventBus.emit(eventType, data);
  },

  /**
   * Mock component props
   */
  createMockProps: (overrides: any = {}) => ({
    className: 'test-class',
    'data-testid': 'test-component',
    ...overrides
  }),

  /**
   * Assert event was emitted
   */
  expectEventEmitted: (eventType: string, data?: any) => {
    if (data) {
      expect(mockEventBus.emit).toHaveBeenCalledWith(eventType, data);
    } else {
      expect(mockEventBus.emit).toHaveBeenCalledWith(eventType, expect.any(Object));
    }
  },

  /**
   * Assert event subscription
   */
  expectEventSubscribed: (eventType: string) => {
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      eventType,
      expect.any(Function),
      expect.any(String)
    );
  },

  /**
   * Mock theme context
   */
  mockTheme: (theme: any = {}) => ({
    mode: 'light',
    primaryColor: '#3b82f6',
    ...theme
  }),

  /**
   * Mock notification
   */
  mockNotification: (overrides: any = {}) => ({
    id: `notification-${Date.now()}`,
    type: 'info',
    title: 'Test Notification',
    message: 'Test message',
    duration: 5000,
    ...overrides
  }),

  /**
   * Mock investigation data
   */
  mockInvestigation: (overrides: any = {}) => ({
    id: `investigation-${Date.now()}`,
    title: 'Test Investigation',
    status: 'active',
    priority: 'medium',
    created: new Date(),
    ...overrides
  }),

  /**
   * Mock form validation
   */
  mockFormValidation: () => ({
    isValid: true,
    errors: {},
    touched: {},
    values: {}
  }),

  /**
   * Simulate user interaction
   */
  simulateUserInput: async (element: HTMLElement, value: string) => {
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(element, { target: { value } });
    fireEvent.blur(element);
  },

  /**
   * Wait for element to appear
   */
  waitForElement: async (testId: string, timeout: number = 1000) => {
    const { waitFor, screen } = await import('@testing-library/react');
    return waitFor(
      () => screen.getByTestId(testId),
      { timeout }
    );
  },

  /**
   * Mock API response
   */
  mockApiResponse: (data: any, status: number = 200) => {
    const mockResponse = {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers()
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
    return mockResponse;
  },

  /**
   * Mock WebSocket connection
   */
  mockWebSocket: () => {
    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    (global.WebSocket as jest.Mock).mockImplementation(() => mockWs);
    return mockWs;
  }
};

// Global component test matchers
expect.extend({
  toHaveValidAccessibility(received: HTMLElement) {
    // Basic accessibility checks
    const hasAriaLabel = received.getAttribute('aria-label');
    const hasRole = received.getAttribute('role');
    const hasAltText = received.tagName === 'IMG' ? received.getAttribute('alt') : true;

    const pass = !!(hasAriaLabel || hasRole) && hasAltText !== null;

    return {
      message: () => pass
        ? `Expected element not to have valid accessibility attributes`
        : `Expected element to have aria-label, role, or alt text for accessibility`,
      pass
    };
  },

  toHaveServiceEventHandling(received: any, serviceName: string) {
    const hasEventSubscription = mockEventBus.subscribe.mock.calls.some(
      call => call[2] === serviceName
    );

    return {
      message: () => hasEventSubscription
        ? `Expected component not to have event handling for service ${serviceName}`
        : `Expected component to have event handling for service ${serviceName}`,
      pass: hasEventSubscription
    };
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidAccessibility(): R;
      toHaveServiceEventHandling(serviceName: string): R;
    }
  }
}

// Reset component mocks before each test
beforeEach(() => {
  mockEventBus.subscribe.mockClear();
  mockEventBus.emit.mockClear();
  mockEventBus.cleanup.mockClear();
});

export { customRender as render };
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
=======
 * Component Tests Setup File
 * Feature: 001-extensive-investigation-report
 * Task: T078
 *
 * Setup for component tests with React Testing Library
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver (required for lazy loading components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver (required for responsive components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;
>>>>>>> 001-modify-analyzer-method
