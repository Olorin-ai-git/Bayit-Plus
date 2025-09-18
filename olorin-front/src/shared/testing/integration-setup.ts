/**
 * Integration Testing Setup for Event Bus System
 * Extended setup for integration tests across microservices
 */

import { EventBusManager } from '../events/eventBus';
import { WebSocketManager } from '../events/websocket-manager';
import { ServiceAdapterRegistry } from '../events/service-adapters';
import { EventRouter } from '../events/event-routing';
import { EventPersistenceManager } from '../events/event-persistence';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock WebSocket for consistent testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState: number = MockWebSocket.OPEN;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private sentMessages: string[] = [];

  constructor(public url: string, public protocols?: string[]) {
    // Immediately set to open for testing
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 1);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }, 1);
  }

  // Test utilities
  getSentMessages(): string[] {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }

  simulateMessage(data: any): void {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data)
    });
    this.onmessage?.(event);
  }
}

// Set global WebSocket mock
(global as any).WebSocket = MockWebSocket;

// Mock localStorage for event persistence
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Integration test utilities
export const integrationTestUtils = {
  /**
   * Reset all singleton instances for clean test state
   */
  resetSingletons: () => {
    (EventBusManager as any).instance = null;
    (WebSocketManager as any).instance = null;
    (ServiceAdapterRegistry as any).instance = null;
    (EventRouter as any).instance = null;
    (EventPersistenceManager as any).instance = null;
  },

  /**
   * Get mock WebSocket instance
   */
  getMockWebSocket: (): MockWebSocket => {
    return (global as any).WebSocket.prototype || new MockWebSocket('ws://test');
  },

  /**
   * Clear all mock data and reset state
   */
  clearAllMocks: () => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    
    // Clear WebSocket messages if instance exists
    const mockWs = integrationTestUtils.getMockWebSocket();
    if (mockWs && mockWs.clearSentMessages) {
      mockWs.clearSentMessages();
    }
  },

  /**
   * Simulate network state change
   */
  setNetworkState: (isOnline: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      value: isOnline,
      writable: true
    });
    
    // Trigger network event
    const event = new Event(isOnline ? 'online' : 'offline');
    window.dispatchEvent(event);
  },

  /**
   * Wait for events to propagate through the system
   */
  waitForEventPropagation: (timeout: number = 100): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  },

  /**
   * Create test investigation data
   */
  createTestInvestigation: (overrides: any = {}) => ({
    id: 'test-investigation-001',
    userId: 'test-user-001',
    entityType: 'user_id' as const,
    status: 'initializing' as const,
    aiMode: 'balanced' as const,
    created: new Date(),
    ...overrides
  }),

  /**
   * Create test user data
   */
  createTestUser: (overrides: any = {}) => ({
    id: 'test-user-001',
    name: 'Test User',
    email: 'test@example.com',
    role: 'investigator',
    ...overrides
  }),

  /**
   * Create test notification data
   */
  createTestNotification: (overrides: any = {}) => ({
    id: `notification-${Date.now()}`,
    type: 'info' as const,
    title: 'Test Notification',
    message: 'This is a test notification',
    duration: 5000,
    ...overrides
  }),

  /**
   * Create test agent execution data
   */
  createTestAgentExecution: (overrides: any = {}) => ({
    id: 'test-execution-001',
    agentId: 'test-agent-001',
    status: 'running' as const,
    startTime: new Date(),
    ...overrides
  }),

  /**
   * Create test risk factors
   */
  createTestRiskFactors: () => [
    {
      id: 'risk-factor-001',
      category: 'behavioral',
      score: 85,
      description: 'Unusual login pattern detected'
    },
    {
      id: 'risk-factor-002',
      category: 'geographic',
      score: 70,
      description: 'Login from new geographic location'
    },
    {
      id: 'risk-factor-003',
      category: 'device',
      score: 60,
      description: 'Unrecognized device fingerprint'
    }
  ],

  /**
   * Create test design tokens
   */
  createTestDesignTokens: (overrides: any = {}) => ({
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
    spacing: { md: '1rem', lg: '1.5rem' },
    shadows: { md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    ...overrides
  }),

  /**
   * Verify event sequence
   */
  verifyEventSequence: (events: Array<{ event: string; data?: any }>, actualEvents: any[]) => {
    events.forEach((expectedEvent, index) => {
      const actualEvent = actualEvents.find(e => e.event === expectedEvent.event);
      expect(actualEvent).toBeDefined();
      
      if (expectedEvent.data) {
        expect(actualEvent.data).toMatchObject(expectedEvent.data);
      }
    });
  },

  /**
   * Mock successful API responses
   */
  mockApiResponses: () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => JSON.stringify({ success: true })
    });
  },

  /**
   * Mock API failures
   */
  mockApiFailures: () => {
    (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(
      new Error('Network error')
    );
  },

  /**
   * Create event collector for testing workflows
   */
  createEventCollector: () => {
    const events: Array<{ event: string; data: any; timestamp: Date }> = [];
    
    const collector = {
      events,
      
      addEvent: (event: string, data: any) => {
        events.push({ event, data, timestamp: new Date() });
      },
      
      getEvents: () => [...events],
      
      getEventsByType: (eventType: string) => 
        events.filter(e => e.event === eventType),
      
      getEventsAfter: (timestamp: Date) => 
        events.filter(e => e.timestamp >= timestamp),
      
      clear: () => {
        events.length = 0;
      },
      
      waitForEvent: (eventType: string, timeout: number = 1000): Promise<any> => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          const checkForEvent = () => {
            const event = events.find(e => e.event === eventType);
            if (event) {
              resolve(event.data);
            } else if (Date.now() - startTime > timeout) {
              reject(new Error(`Timeout waiting for event: ${eventType}`));
            } else {
              setTimeout(checkForEvent, 10);
            }
          };
          
          checkForEvent();
        });
      },
      
      waitForEvents: (count: number, timeout: number = 1000): Promise<void> => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          const checkForEvents = () => {
            if (events.length >= count) {
              resolve();
            } else if (Date.now() - startTime > timeout) {
              reject(new Error(`Timeout waiting for ${count} events. Got ${events.length}`));
            } else {
              setTimeout(checkForEvents, 10);
            }
          };
          
          checkForEvents();
        });
      }
    };
    
    return collector;
  },

  /**
   * Performance testing utilities
   */
  performance: {
    measureEventPropagation: async (triggerFn: () => void, expectedEventCount: number) => {
      const startTime = Date.now();
      triggerFn();
      
      // Wait for events to propagate
      await integrationTestUtils.waitForEventPropagation(200);
      
      const endTime = Date.now();
      return {
        duration: endTime - startTime,
        eventsPerSecond: expectedEventCount / ((endTime - startTime) / 1000)
      };
    },
    
    measureMemoryUsage: () => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    }
  }
};

// Global setup for integration tests
beforeEach(() => {
  integrationTestUtils.clearAllMocks();
  integrationTestUtils.setNetworkState(true);
});

afterEach(() => {
  integrationTestUtils.resetSingletons();
});

// Global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default integrationTestUtils;
