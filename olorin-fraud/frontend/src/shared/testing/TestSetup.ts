import { EventBus } from '../events/ServiceEventBus';
import { ServiceDiscovery } from '../../shell/services/ServiceDiscovery';
import { ServiceHealthMonitor } from '../../shell/services/ServiceHealthMonitor';
import { ServiceCommunication } from '../services/ServiceCommunication';

export interface TestEnvironment {
  eventBus: EventBus;
  serviceDiscovery: ServiceDiscovery;
  healthMonitor: ServiceHealthMonitor;
  services: Record<string, ServiceCommunication>;
}

export class TestSetup {
  private static instance: TestSetup;
  private environment: TestEnvironment | null = null;

  static getInstance(): TestSetup {
    if (!TestSetup.instance) {
      TestSetup.instance = new TestSetup();
    }
    return TestSetup.instance;
  }

  /**
   * Set up test environment with mock services
   */
  async setupTestEnvironment(): Promise<TestEnvironment> {
    console.log('[TestSetup] Setting up test environment...');

    // Initialize event bus
    const eventBus = new EventBus();

    // Initialize service discovery with mock services
    const serviceDiscovery = new ServiceDiscovery();

    // Initialize health monitor
    const healthMonitor = new ServiceHealthMonitor();

    // Initialize service communication for each microservice
    const services = {
      shell: new ServiceCommunication('shell', eventBus),
      investigation: new ServiceCommunication('investigation', eventBus),
      agentAnalytics: new ServiceCommunication('agentAnalytics', eventBus),
      ragIntelligence: new ServiceCommunication('ragIntelligence', eventBus),
      visualization: new ServiceCommunication('visualization', eventBus),
      reporting: new ServiceCommunication('reporting', eventBus),
      coreUi: new ServiceCommunication('coreUi', eventBus),
      designSystem: new ServiceCommunication('designSystem', eventBus)
    };

    // Set up global olorin namespace for testing
    if (!global.window) {
      (global as any).window = {};
    }

    global.window.olorin = {
      version: '1.0.0-test',
      environment: 'test',
      services: {
        serviceDiscovery,
        healthMonitor,
        ...services
      },
      eventBus,
      monitoring: {
        captureException: jest.fn()
      },
      config: {
        apiBaseUrl: 'http://localhost:8090',
        wsUrl: 'ws://localhost:8090',
        enableDebug: true
      },
      registerService: jest.fn(),
      getService: jest.fn()
    };

    this.environment = {
      eventBus,
      serviceDiscovery,
      healthMonitor,
      services
    };

    console.log('[TestSetup] Test environment ready');
    return this.environment;
  }

  /**
   * Clean up test environment
   */
  cleanupTestEnvironment(): void {
    if (this.environment) {
      console.log('[TestSetup] Cleaning up test environment...');

      // Clear all event listeners
      this.environment.eventBus.clear();

      // Clear service communication
      Object.values(this.environment.services).forEach(service => {
        service.clearPendingRequests();
      });

      // Stop health monitoring
      this.environment.healthMonitor.stopMonitoring();

      this.environment = null;
    }

    // Clean up global olorin namespace
    if (global.window?.olorin) {
      delete global.window.olorin;
    }

    console.log('[TestSetup] Test environment cleaned up');
  }

  /**
   * Get current test environment
   */
  getTestEnvironment(): TestEnvironment | null {
    return this.environment;
  }

  /**
   * Create mock service responses
   */
  createMockServiceResponse(service: string, data: any, delay: number = 100): void {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    const serviceComm = this.environment.services[service];
    if (!serviceComm) {
      throw new Error(`Service ${service} not found`);
    }

    // Set up mock response handlers
    serviceComm.onMessage('test-request', async (requestData) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return data;
    });
  }

  /**
   * Simulate service error
   */
  simulateServiceError(service: string, error: string): void {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    this.environment.eventBus.emit('service:error', {
      service,
      error,
      timestamp: new Date().toISOString()
    }, 'test');
  }

  /**
   * Simulate service ready
   */
  simulateServiceReady(service: string): void {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    this.environment.eventBus.emit('service:ready', {
      service,
      timestamp: new Date().toISOString()
    }, 'test');
  }

  /**
   * Wait for event in tests
   */
  async waitForEvent(eventType: string, timeout: number = 5000): Promise<any> {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      this.environment!.eventBus.once(eventType, (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  /**
   * Assert service health
   */
  async assertServiceHealth(service: string, expectedStatus: string): Promise<void> {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    const serviceConfig = this.environment.serviceDiscovery.getService(service);
    expect(serviceConfig).toBeDefined();
    expect(serviceConfig!.status).toBe(expectedStatus);
  }

  /**
   * Assert event was emitted
   */
  assertEventEmitted(eventType: string, expectedData?: any): void {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    const history = this.environment.eventBus.getHistory();
    const event = history.find(e => e.type === eventType);

    expect(event).toBeDefined();
    if (expectedData) {
      expect(event!.data).toEqual(expectedData);
    }
  }
}

// Jest setup helpers
export const setupTestEnvironment = async (): Promise<TestEnvironment> => {
  const testSetup = TestSetup.getInstance();
  return await testSetup.setupTestEnvironment();
};

export const cleanupTestEnvironment = (): void => {
  const testSetup = TestSetup.getInstance();
  testSetup.cleanupTestEnvironment();
};

// Jest global setup
beforeEach(async () => {
  await setupTestEnvironment();
});

afterEach(() => {
  cleanupTestEnvironment();
});

// Export for use in tests
export default TestSetup;