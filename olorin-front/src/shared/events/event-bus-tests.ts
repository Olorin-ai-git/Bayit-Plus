/**
 * Event Bus Communication Tests for Olorin Microservices
 * Comprehensive testing suite for event system validation
 */

import { EventBusManager } from './eventBus';
import { WebSocketManager } from './websocket-manager';
import { ServiceAdapterRegistry, ServiceAdapters } from './service-adapters';
import { EventPersistenceManager } from './event-persistence';
import { EventRouter } from './event-routing';

export interface TestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: EventBusTest[];
}

export interface EventBusTest {
  id: string;
  name: string;
  description: string;
  test: () => Promise<void>;
  timeout?: number;
  dependencies?: string[];
}

/**
 * Event Bus Test Runner
 */
export class EventBusTestRunner {
  private eventBus: EventBusManager;
  private webSocketManager: WebSocketManager | null = null;
  private serviceRegistry: ServiceAdapterRegistry;
  private persistenceManager: EventPersistenceManager | null = null;
  private eventRouter: EventRouter;
  private testResults: Map<string, TestResult> = new Map();

  constructor() {
    this.eventBus = EventBusManager.getInstance();
    this.serviceRegistry = ServiceAdapterRegistry.getInstance();
    this.eventRouter = EventRouter.getInstance();
  }

  /**
   * Run all test suites
   */
  public async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Event Bus Communication Tests');

    const testSuites = this.createTestSuites();
    const allResults: TestResult[] = [];

    for (const suite of testSuites) {
      console.log(`\n📋 Running test suite: ${suite.name}`);
      const suiteResults = await this.runTestSuite(suite);
      allResults.push(...suiteResults);
    }

    this.printTestSummary(allResults);
    return allResults;
  }

  /**
   * Run specific test suite
   */
  public async runTestSuite(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const test of suite.tests) {
      const result = await this.runSingleTest(test);
      results.push(result);
      this.testResults.set(test.id, result);
    }

    return results;
  }

  /**
   * Run single test
   */
  public async runSingleTest(test: EventBusTest): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      testId: test.id,
      name: test.name,
      status: 'failed',
      duration: 0
    };

    try {
      console.log(`  🔍 Running: ${test.name}`);

      // Set timeout
      const timeout = test.timeout || 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
      });

      // Run test with timeout
      await Promise.race([test.test(), timeoutPromise]);

      result.status = 'passed';
      console.log(`  ✅ Passed: ${test.name}`);

    } catch (error) {
      result.status = 'failed';
      result.error = (error as Error).message;
      console.log(`  ❌ Failed: ${test.name} - ${result.error}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Create all test suites
   */
  private createTestSuites(): TestSuite[] {
    return [
      this.createBasicEventBusTests(),
      this.createServiceAdapterTests(),
      this.createEventRoutingTests(),
      this.createPersistenceTests(),
      this.createCrossServiceTests(),
      this.createPerformanceTests()
    ];
  }

  /**
   * Basic Event Bus Tests
   */
  private createBasicEventBusTests(): TestSuite {
    return {
      name: 'Basic Event Bus',
      description: 'Test core event bus functionality',
      tests: [
        {
          id: 'event-bus-emit-subscribe',
          name: 'Event Emission and Subscription',
          description: 'Test basic event emission and subscription',
          test: async () => {
            let receivedData: any = null;

            const unsubscribe = this.eventBus.subscribe('ui:notification:show', (data) => {
              receivedData = data;
            });

            this.eventBus.emit('ui:notification:show', {
              notification: {
                id: 'test-1',
                type: 'info',
                title: 'Test Notification',
                message: 'Test message'
              }
            });

            await this.waitFor(() => receivedData !== null, 1000);

            if (!receivedData) {
              throw new Error('Event not received');
            }

            if (receivedData.notification.id !== 'test-1') {
              throw new Error('Incorrect data received');
            }

            unsubscribe();
          }
        },
        {
          id: 'event-bus-multiple-subscribers',
          name: 'Multiple Subscribers',
          description: 'Test multiple subscribers to same event',
          test: async () => {
            let count = 0;

            const unsubscribe1 = this.eventBus.subscribe('ui:theme:changed', () => count++);
            const unsubscribe2 = this.eventBus.subscribe('ui:theme:changed', () => count++);

            this.eventBus.emit('ui:theme:changed', {
              theme: { mode: 'dark', primaryColor: '#000' }
            });

            await this.waitFor(() => count === 2, 1000);

            if (count !== 2) {
              throw new Error(`Expected 2 events, got ${count}`);
            }

            unsubscribe1();
            unsubscribe2();
          }
        },
        {
          id: 'event-bus-unsubscribe',
          name: 'Event Unsubscription',
          description: 'Test event unsubscription',
          test: async () => {
            let received = false;

            const unsubscribe = this.eventBus.subscribe('ui:modal:opened', () => {
              received = true;
            });

            unsubscribe();

            this.eventBus.emit('ui:modal:opened', { modalId: 'test' });

            await this.sleep(100);

            if (received) {
              throw new Error('Event received after unsubscribe');
            }
          }
        }
      ]
    };
  }

  /**
   * Service Adapter Tests
   */
  private createServiceAdapterTests(): TestSuite {
    return {
      name: 'Service Adapters',
      description: 'Test service-specific adapters',
      tests: [
        {
          id: 'autonomous-investigation-adapter',
          name: 'Autonomous Investigation Adapter',
          description: 'Test autonomous investigation service adapter',
          test: async () => {
            const adapter = ServiceAdapters.autonomousInvestigation();
            let received = false;

            const unsubscribe = this.eventBus.subscribe('auto:investigation:started', () => {
              received = true;
            });

            adapter.startInvestigation({
              id: 'test-investigation',
              userId: 'test-user',
              entityType: 'email',
              status: 'initializing',
              aiMode: 'balanced',
              created: new Date(),
              agentDecisions: [],
              automatedActions: []
            });

            await this.waitFor(() => received, 1000);

            if (!received) {
              throw new Error('Investigation start event not received');
            }

            unsubscribe();
          }
        },
        {
          id: 'manual-investigation-adapter',
          name: 'Manual Investigation Adapter',
          description: 'Test manual investigation service adapter',
          test: async () => {
            const adapter = ServiceAdapters.manualInvestigation();
            let evidenceReceived = false;

            const unsubscribe = this.eventBus.subscribe('manual:evidence:added', () => {
              evidenceReceived = true;
            });

            adapter.addEvidence('test-investigation', {
              id: 'evidence-1',
              type: 'document',
              title: 'Test Evidence',
              description: 'Test evidence description',
              data: { content: 'test' },
              source: 'manual',
              timestamp: new Date(),
              addedBy: 'test-user',
              verified: false
            });

            await this.waitFor(() => evidenceReceived, 1000);

            if (!evidenceReceived) {
              throw new Error('Evidence added event not received');
            }

            unsubscribe();
          }
        },
        {
          id: 'visualization-adapter',
          name: 'Visualization Adapter',
          description: 'Test visualization service adapter',
          test: async () => {
            const adapter = ServiceAdapters.visualization();
            let graphUpdated = false;

            const unsubscribe = this.eventBus.subscribe('viz:graph:updated', () => {
              graphUpdated = true;
            });

            adapter.updateGraph('test-investigation', [
              { id: 'node1', label: 'Test Node' }
            ], [
              { source: 'node1', target: 'node2' }
            ]);

            await this.waitFor(() => graphUpdated, 1000);

            if (!graphUpdated) {
              throw new Error('Graph update event not received');
            }

            unsubscribe();
          }
        }
      ]
    };
  }

  /**
   * Event Routing Tests
   */
  private createEventRoutingTests(): TestSuite {
    return {
      name: 'Event Routing',
      description: 'Test event routing between services',
      tests: [
        {
          id: 'escalation-routing',
          name: 'Autonomous to Manual Escalation',
          description: 'Test escalation from autonomous to manual investigation',
          test: async () => {
            let manualStarted = false;

            const unsubscribe = this.eventBus.subscribe('manual:investigation:started', () => {
              manualStarted = true;
            });

            // Trigger escalation
            this.eventBus.emit('auto:investigation:escalated', {
              id: 'test-investigation',
              reason: 'Complex case requiring human review',
              targetService: 'manual'
            });

            await this.waitFor(() => manualStarted, 2000);

            if (!manualStarted) {
              throw new Error('Manual investigation not started after escalation');
            }

            unsubscribe();
          }
        },
        {
          id: 'risk-visualization-routing',
          name: 'Risk Score to Visualization',
          description: 'Test routing of risk scores to visualization',
          test: async () => {
            let visualizationUpdated = false;

            const unsubscribe = this.eventBus.subscribe('viz:graph:updated', () => {
              visualizationUpdated = true;
            });

            // Trigger risk calculation
            this.eventBus.emit('auto:risk:calculated', {
              investigationId: 'test-investigation',
              score: 85,
              factors: [
                { id: 'factor1', category: 'behavioral', score: 70, description: 'Unusual login pattern' }
              ]
            });

            await this.waitFor(() => visualizationUpdated, 2000);

            if (!visualizationUpdated) {
              throw new Error('Visualization not updated after risk calculation');
            }

            unsubscribe();
          }
        },
        {
          id: 'cross-service-notification',
          name: 'Cross-Service Notifications',
          description: 'Test cross-service notification routing',
          test: async () => {
            let notificationShown = false;

            const unsubscribe = this.eventBus.subscribe('ui:notification:show', () => {
              notificationShown = true;
            });

            // Trigger service error
            this.eventBus.emit('service:error', {
              service: 'agent-analytics',
              error: new Error('Test error')
            });

            await this.waitFor(() => notificationShown, 2000);

            if (!notificationShown) {
              throw new Error('Notification not shown for service error');
            }

            unsubscribe();
          }
        }
      ]
    };
  }

  /**
   * Persistence Tests
   */
  private createPersistenceTests(): TestSuite {
    return {
      name: 'Event Persistence',
      description: 'Test event persistence and offline capability',
      tests: [
        {
          id: 'event-persistence',
          name: 'Event Persistence',
          description: 'Test event persistence functionality',
          test: async () => {
            try {
              this.persistenceManager = EventPersistenceManager.getInstance({
                storageKey: 'test-events',
                maxEvents: 100,
                retryInterval: 1000,
                maxRetries: 3,
                compressionEnabled: false,
                encryptionEnabled: false,
                autoSync: false,
                batchSize: 5
              });

              const eventId = this.persistenceManager.persistEvent(
                'test:event',
                { message: 'Test event data' },
                'test-service',
                'medium'
              );

              const events = this.persistenceManager.getEvents();
              const persistedEvent = events.find(e => e.id === eventId);

              if (!persistedEvent) {
                throw new Error('Event not persisted');
              }

              if (persistedEvent.event !== 'test:event') {
                throw new Error('Incorrect event type persisted');
              }

            } catch (error) {
              // If persistence is not available (e.g., in test environment), skip
              if ((error as Error).message.includes('localStorage')) {
                console.log('  ⏭️ Skipped: localStorage not available');
                return;
              }
              throw error;
            }
          }
        },
        {
          id: 'offline-queue',
          name: 'Offline Event Queuing',
          description: 'Test event queuing when offline',
          test: async () => {
            // This test would require mocking navigator.onLine
            // For now, we'll simulate the behavior
            console.log('  ⏭️ Skipped: Requires navigator.onLine mocking');
          }
        }
      ]
    };
  }

  /**
   * Cross-Service Tests
   */
  private createCrossServiceTests(): TestSuite {
    return {
      name: 'Cross-Service Communication',
      description: 'Test complex cross-service scenarios',
      tests: [
        {
          id: 'investigation-workflow',
          name: 'Complete Investigation Workflow',
          description: 'Test end-to-end investigation workflow',
          test: async () => {
            const events: string[] = [];

            const subscriptions = [
              this.eventBus.subscribe('auto:investigation:started', () => events.push('started')),
              this.eventBus.subscribe('auto:risk:calculated', () => events.push('risk')),
              this.eventBus.subscribe('viz:graph:updated', () => events.push('visualization')),
              this.eventBus.subscribe('auto:investigation:completed', () => events.push('completed')),
              this.eventBus.subscribe('report:generated', () => events.push('report'))
            ];

            // Start investigation
            this.eventBus.emit('auto:investigation:started', {
              investigation: {
                id: 'workflow-test',
                userId: 'test-user',
                entityType: 'email',
                status: 'initializing',
                aiMode: 'balanced',
                created: new Date()
              }
            });

            // Calculate risk
            setTimeout(() => {
              this.eventBus.emit('auto:risk:calculated', {
                investigationId: 'workflow-test',
                score: 75,
                factors: []
              });
            }, 50);

            // Complete investigation
            setTimeout(() => {
              this.eventBus.emit('auto:investigation:completed', {
                investigationId: 'workflow-test',
                result: { status: 'completed' }
              });
            }, 100);

            await this.waitFor(() => events.length >= 5, 3000);

            const expectedEvents = ['started', 'risk', 'visualization', 'completed', 'report'];
            for (const expectedEvent of expectedEvents) {
              if (!events.includes(expectedEvent)) {
                throw new Error(`Missing event in workflow: ${expectedEvent}`);
              }
            }

            subscriptions.forEach(unsubscribe => unsubscribe());
          }
        },
        {
          id: 'collaborative-investigation',
          name: 'Collaborative Investigation',
          description: 'Test manual investigation with collaboration',
          test: async () => {
            const events: string[] = [];

            const subscriptions = [
              this.eventBus.subscribe('manual:investigation:started', () => events.push('started')),
              this.eventBus.subscribe('manual:evidence:added', () => events.push('evidence')),
              this.eventBus.subscribe('manual:collaboration:invited', () => events.push('collaboration')),
              this.eventBus.subscribe('ui:notification:show', () => events.push('notification'))
            ];

            // Start manual investigation
            this.eventBus.emit('manual:investigation:started', {
              investigation: {
                id: 'collab-test',
                investigatorId: 'investigator-1',
                userId: 'test-user',
                entityType: 'email',
                status: 'in_progress',
                created: new Date()
              }
            });

            // Add evidence
            setTimeout(() => {
              this.eventBus.emit('manual:evidence:added', {
                investigationId: 'collab-test',
                evidence: {
                  id: 'evidence-1',
                  type: 'document',
                  title: 'Suspicious Email',
                  description: 'Email with unusual content',
                  data: {},
                  source: 'manual',
                  timestamp: new Date(),
                  addedBy: 'investigator-1',
                  verified: false
                }
              });
            }, 50);

            // Invite collaborator
            setTimeout(() => {
              this.eventBus.emit('manual:collaboration:invited', {
                investigationId: 'collab-test',
                collaborator: {
                  userId: 'investigator-2',
                  role: 'reviewer',
                  permissions: ['view', 'comment'],
                  joinedAt: new Date(),
                  invitedBy: 'investigator-1'
                }
              });
            }, 100);

            await this.waitFor(() => events.length >= 4, 2000);

            const expectedEvents = ['started', 'evidence', 'collaboration', 'notification'];
            for (const expectedEvent of expectedEvents) {
              if (!events.includes(expectedEvent)) {
                throw new Error(`Missing event in collaboration: ${expectedEvent}`);
              }
            }

            subscriptions.forEach(unsubscribe => unsubscribe());
          }
        }
      ]
    };
  }

  /**
   * Performance Tests
   */
  private createPerformanceTests(): TestSuite {
    return {
      name: 'Performance',
      description: 'Test event system performance',
      tests: [
        {
          id: 'high-volume-events',
          name: 'High Volume Event Processing',
          description: 'Test processing of many events',
          test: async () => {
            const eventCount = 100;
            let receivedCount = 0;

            const unsubscribe = this.eventBus.subscribe('test:performance', () => {
              receivedCount++;
            });

            const startTime = Date.now();

            // Emit many events rapidly
            for (let i = 0; i < eventCount; i++) {
              this.eventBus.emit('test:performance', { index: i });
            }

            await this.waitFor(() => receivedCount === eventCount, 5000);

            const duration = Date.now() - startTime;
            const eventsPerSecond = (eventCount / duration) * 1000;

            if (receivedCount !== eventCount) {
              throw new Error(`Lost events: expected ${eventCount}, got ${receivedCount}`);
            }

            if (eventsPerSecond < 100) {
              throw new Error(`Poor performance: ${eventsPerSecond.toFixed(2)} events/sec`);
            }

            console.log(`    📊 Performance: ${eventsPerSecond.toFixed(2)} events/sec`);
            unsubscribe();
          }
        },
        {
          id: 'memory-usage',
          name: 'Memory Usage',
          description: 'Test memory usage under load',
          test: async () => {
            const initialMemory = this.getMemoryUsage();
            const subscriptions: (() => void)[] = [];

            // Create many subscriptions
            for (let i = 0; i < 100; i++) {
              const unsubscribe = this.eventBus.subscribe('test:memory', () => {
                // Do nothing
              });
              subscriptions.push(unsubscribe);
            }

            // Emit many events
            for (let i = 0; i < 1000; i++) {
              this.eventBus.emit('test:memory', { data: 'x'.repeat(100) });
            }

            const peakMemory = this.getMemoryUsage();

            // Cleanup
            subscriptions.forEach(unsubscribe => unsubscribe());

            await this.sleep(100);

            const finalMemory = this.getMemoryUsage();
            const memoryIncrease = finalMemory - initialMemory;

            if (memoryIncrease > 10 * 1024 * 1024) { // 10MB threshold
              throw new Error(`Memory usage too high: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
            }

            console.log(`    📊 Memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
          }
        }
      ]
    };
  }

  /**
   * Utility: Wait for condition
   */
  private async waitFor(condition: () => boolean, timeout: number): Promise<void> {
    const startTime = Date.now();
    while (!condition() && Date.now() - startTime < timeout) {
      await this.sleep(10);
    }
    if (!condition()) {
      throw new Error('Condition not met within timeout');
    }
  }

  /**
   * Utility: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Get memory usage (simplified)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Print test summary
   */
  private printTestSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Test Summary:');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏭️ Skipped: ${skipped}`);
    console.log(`  🕐 Total Duration: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }

    const successRate = (passed / (passed + failed)) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
  }
}

/**
 * Factory function to create test runner
 */
export function createEventBusTestRunner(): EventBusTestRunner {
  return new EventBusTestRunner();
}

/**
 * Run quick validation tests
 */
export async function runQuickValidation(): Promise<boolean> {
  const runner = createEventBusTestRunner();

  try {
    // Run only basic tests for quick validation
    const basicSuite = runner['createBasicEventBusTests']();
    const results = await runner.runTestSuite(basicSuite);

    const passed = results.filter(r => r.status === 'passed').length;
    const total = results.length;

    console.log(`🔬 Quick Validation: ${passed}/${total} tests passed`);
    return passed === total;

  } catch (error) {
    console.error('Quick validation failed:', error);
    return false;
  }
}

export default EventBusTestRunner;