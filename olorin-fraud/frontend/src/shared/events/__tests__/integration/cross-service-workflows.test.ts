/**
 * Cross-Service Workflows Integration Tests
 * Tests complete workflows across all 8 microservices
 */

import { EventBusManager } from '../../eventBus';
import { WebSocketManager } from '../../websocket-manager';
import { ServiceAdapterRegistry, ServiceAdapters } from '../../service-adapters';
import { EventRouter } from '../../event-routing';
import { EventPersistenceManager } from '../../event-persistence';
import type {
  AutonomousInvestigation,
  ManualInvestigation,
  AIDecision,
  RiskFactor,
  Evidence,
  Collaborator,
  AgentExecution,
  AgentPerformanceMetrics,
  RAGInsight,
  Location,
  User,
  Notification,
  ThemeConfig,
  DesignTokens
} from '../../eventBus';

// Mock WebSocket for integration testing
const mockWebSocketManager = {
  send: jest.fn(),
  broadcast: jest.fn(),
  sendToService: jest.fn(),
  subscribe: jest.fn(() => jest.fn()),
  getConnectionState: jest.fn(() => 'connected'),
  getStats: jest.fn(() => ({
    connectionState: 'connected',
    connectionAttempts: 0,
    queuedMessages: 0,
    subscriptions: 0,
    uptime: 1000
  }))
};

jest.mock('../../websocket-manager', () => ({
  WebSocketManager: {
    getInstance: () => mockWebSocketManager
  }
}));

// Mock storage for persistence
const mockStorage = new Map<string, any>();
const mockStorageUtils = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const value = mockStorage.get(key);
    return value !== undefined ? value : defaultValue;
  }),
  set: jest.fn((key: string, value: any) => {
    mockStorage.set(key, value);
  })
};

jest.mock('../../storage', () => ({
  storage: mockStorageUtils
}));

describe('Cross-Service Workflows Integration Tests', () => {
  let eventBusManager: EventBusManager;
  let serviceAdapters: ServiceAdapterRegistry;
  let eventRouter: EventRouter;
  let persistenceManager: EventPersistenceManager;
  
  // Event collectors for workflow verification
  let eventHistory: Array<{ event: string; data: any; timestamp: Date; service?: string }> = [];
  
  beforeEach(() => {
    // Clear singleton instances
    (EventBusManager as any).instance = null;
    (ServiceAdapterRegistry as any).instance = null;
    (EventRouter as any).instance = null;
    (EventPersistenceManager as any).instance = null;
    
    // Clear mock data
    mockStorage.clear();
    eventHistory = [];
    jest.clearAllMocks();
    
    // Initialize components
    eventBusManager = EventBusManager.getInstance();
    serviceAdapters = ServiceAdapterRegistry.getInstance();
    eventRouter = EventRouter.getInstance();
    persistenceManager = EventPersistenceManager.getInstance({
      storageKey: 'test-workflow-events',
      maxEvents: 100,
      retryInterval: 100,
      maxRetries: 3,
      compressionEnabled: false,
      encryptionEnabled: false,
      autoSync: false,
      batchSize: 5
    });
    
    // Set up event history collector
    const allEventTypes = [
      'auto:investigation:started',
      'auto:investigation:completed',
      'auto:investigation:escalated',
      'auto:ai:decision',
      'auto:risk:calculated',
      'manual:investigation:started',
      'manual:investigation:completed',
      'manual:workflow:updated',
      'manual:evidence:added',
      'manual:collaboration:invited',
      'agent:execution:started',
      'agent:execution:completed',
      'agent:performance:updated',
      'agent:anomaly:detected',
      'rag:query:executed',
      'rag:knowledge:updated',
      'rag:insight:generated',
      'viz:graph:updated',
      'viz:map:location:added',
      'viz:chart:data:updated',
      'report:generated',
      'report:export:started',
      'report:export:completed',
      'ui:navigation:changed',
      'ui:notification:show',
      'ui:theme:changed',
      'ui:modal:opened',
      'ui:modal:closed',
      'design:tokens:updated',
      'design:component:generated',
      'design:figma:synced',
      'design:validation:failed',
      'websocket:connected',
      'websocket:disconnected',
      'websocket:message',
      'service:health:check',
      'service:error',
      'service:recovery'
    ];
    
    allEventTypes.forEach(eventType => {
      eventBusManager.subscribe(eventType as any, (data) => {
        eventHistory.push({
          event: eventType,
          data,
          timestamp: new Date(),
          service: extractServiceFromEvent(eventType)
        });
      }, 'workflow-collector');
    });
  });
  
  afterEach(() => {
    eventBusManager.cleanup('workflow-collector');
    serviceAdapters.cleanup();
  });
  
  function extractServiceFromEvent(event: string): string {
    if (event.startsWith('auto:')) return 'autonomous-investigation';
    if (event.startsWith('manual:')) return 'manual-investigation';
    if (event.startsWith('agent:')) return 'agent-analytics';
    if (event.startsWith('rag:')) return 'rag-intelligence';
    if (event.startsWith('viz:')) return 'visualization';
    if (event.startsWith('report:')) return 'reporting';
    if (event.startsWith('ui:')) return 'core-ui';
    if (event.startsWith('design:')) return 'design-system';
    return 'system';
  }
  
  function getEventsByService(service: string): Array<{ event: string; data: any; timestamp: Date }> {
    return eventHistory.filter(e => e.service === service);
  }
  
  function waitForEvents(count: number, timeout: number = 2000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkEvents = () => {
        if (eventHistory.length >= count) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for ${count} events. Got ${eventHistory.length}`));
        } else {
          setTimeout(checkEvents, 10);
        }
      };
      checkEvents();
    });
  }

  describe('Complete Investigation Workflow', () => {
    it('should handle autonomous investigation to risk analysis to visualization to reporting', async () => {
      // Start autonomous investigation
      const investigation: AutonomousInvestigation = {
        id: 'workflow-test-001',
        userId: 'user-suspicious-001',
        entityType: 'email',
        status: 'initializing',
        aiMode: 'aggressive',
        created: new Date()
      };
      
      ServiceAdapters.autonomousInvestigation().startInvestigation(investigation);
      
      // Simulate AI decision
      const aiDecision: AIDecision = {
        id: 'decision-001',
        type: 'continue',
        confidence: 0.85,
        reasoning: 'Multiple risk indicators detected, continuing investigation'
      };
      
      ServiceAdapters.autonomousInvestigation().makeAIDecision(investigation.id, aiDecision);
      
      // Calculate risk score with factors
      const riskFactors: RiskFactor[] = [
        {
          id: 'factor-001',
          category: 'behavioral',
          score: 85,
          description: 'Login at unusual hours (3:00 AM)'
        },
        {
          id: 'factor-002',
          category: 'geographic',
          score: 70,
          description: 'Login from new country (Moldova)'
        },
        {
          id: 'factor-003',
          category: 'device',
          score: 60,
          description: 'Unrecognized device fingerprint'
        }
      ];
      
      ServiceAdapters.autonomousInvestigation().updateRiskScore(investigation.id, 78, riskFactors);
      
      // Complete investigation
      const result = {
        verdict: 'high_risk',
        riskScore: 78,
        confidence: 0.85,
        recommendedAction: 'escalate_to_manual',
        factors: riskFactors
      };
      
      ServiceAdapters.autonomousInvestigation().completeInvestigation(investigation.id, result);
      
      // Wait for all events to propagate
      await waitForEvents(8); // Expected: start, ai_decision, risk_calculated, viz_updated, completed, report_generated
      
      // Verify autonomous investigation events
      const autoEvents = getEventsByService('autonomous-investigation');
      expect(autoEvents.length).toBeGreaterThanOrEqual(4);
      
      const startEvent = autoEvents.find(e => e.event === 'auto:investigation:started');
      expect(startEvent).toBeDefined();
      expect(startEvent?.data.investigation.id).toBe(investigation.id);
      
      const aiDecisionEvent = autoEvents.find(e => e.event === 'auto:ai:decision');
      expect(aiDecisionEvent).toBeDefined();
      expect(aiDecisionEvent?.data.decision.type).toBe('continue');
      
      const riskEvent = autoEvents.find(e => e.event === 'auto:risk:calculated');
      expect(riskEvent).toBeDefined();
      expect(riskEvent?.data.score).toBe(78);
      
      const completedEvent = autoEvents.find(e => e.event === 'auto:investigation:completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data.result.verdict).toBe('high_risk');
      
      // Verify visualization events
      const vizEvents = getEventsByService('visualization');
      expect(vizEvents.length).toBeGreaterThanOrEqual(1);
      
      const vizUpdateEvent = vizEvents.find(e => e.event === 'viz:graph:updated');
      expect(vizUpdateEvent).toBeDefined();
      expect(vizUpdateEvent?.data.nodes.length).toBeGreaterThan(0);
      expect(vizUpdateEvent?.data.edges.length).toBeGreaterThan(0);
      
      // Verify reporting events (triggered by routing rules)
      const reportEvents = getEventsByService('reporting');
      expect(reportEvents.length).toBeGreaterThanOrEqual(1);
      
      // Verify WebSocket messages were sent
      expect(mockWebSocketManager.send).toHaveBeenCalledTimes(4); // One for each autonomous investigation event
    });

    it('should handle autonomous to manual escalation workflow', async () => {
      // Start autonomous investigation
      const autoInvestigation: AutonomousInvestigation = {
        id: 'escalation-test-001',
        userId: 'user-complex-case',
        entityType: 'user_id',
        status: 'analyzing',
        aiMode: 'balanced',
        created: new Date()
      };
      
      ServiceAdapters.autonomousInvestigation().startInvestigation(autoInvestigation);
      
      // Escalate to manual (this should trigger manual investigation start)
      eventBusManager.emit('auto:investigation:escalated', {
        id: autoInvestigation.id,
        reason: 'Complex fraud pattern requires human expertise',
        targetService: 'manual' as const
      });
      
      // Wait for escalation to trigger manual investigation
      await waitForEvents(3, 1000);
      
      // Verify escalation event was recorded
      const escalationEvent = eventHistory.find(e => e.event === 'auto:investigation:escalated');
      expect(escalationEvent).toBeDefined();
      expect(escalationEvent?.data.reason).toContain('human expertise');
      
      // Verify manual investigation was started
      const manualStartEvent = eventHistory.find(e => e.event === 'manual:investigation:started');
      expect(manualStartEvent).toBeDefined();
      expect(manualStartEvent?.data.investigation.id).toBe(autoInvestigation.id);
      
      // Simulate manual investigation workflow
      const evidence: Evidence = {
        id: 'evidence-001',
        type: 'transaction_log',
        data: {
          transactionId: 'tx-suspicious-001',
          amount: 5000.00,
          timestamp: new Date(),
          merchantCategory: 'gambling'
        },
        timestamp: new Date()
      };
      
      ServiceAdapters.manualInvestigation().addEvidence(autoInvestigation.id, evidence);
      
      // Invite collaborator
      const collaborator: Collaborator = {
        id: 'collab-senior-001',
        name: 'Senior Fraud Analyst Sarah Chen',
        role: 'reviewer',
        permissions: ['read', 'comment', 'approve']
      };
      
      ServiceAdapters.manualInvestigation().inviteCollaborator(autoInvestigation.id, collaborator);
      
      // Complete manual investigation
      ServiceAdapters.manualInvestigation().startInvestigation({
        id: autoInvestigation.id,
        investigatorId: 'investigator-001',
        userId: autoInvestigation.userId,
        entityType: autoInvestigation.entityType,
        status: 'completed',
        created: new Date()
      });
      
      await waitForEvents(8, 2000);
      
      // Verify complete workflow
      const manualEvents = getEventsByService('manual-investigation');
      expect(manualEvents.length).toBeGreaterThanOrEqual(3);
      
      const evidenceEvent = manualEvents.find(e => e.event === 'manual:evidence:added');
      expect(evidenceEvent).toBeDefined();
      expect(evidenceEvent?.data.evidence.type).toBe('transaction_log');
      
      const collaborationEvent = manualEvents.find(e => e.event === 'manual:collaboration:invited');
      expect(collaborationEvent).toBeDefined();
      expect(collaborationEvent?.data.collaborator.name).toContain('Sarah Chen');
      
      // Verify UI notifications were triggered
      const notificationEvents = eventHistory.filter(e => e.event === 'ui:notification:show');
      expect(notificationEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Agent Analytics Workflow', () => {
    it('should handle agent execution to performance monitoring to anomaly detection to RAG analysis', async () => {
      const agentId = 'fraud-detection-agent-001';
      
      // Start agent execution
      const execution: AgentExecution = {
        id: 'exec-001',
        agentId: agentId,
        status: 'running',
        startTime: new Date()
      };
      
      ServiceAdapters.agentAnalytics().startExecution(agentId, execution);
      
      // Complete execution
      ServiceAdapters.agentAnalytics().completeExecution(agentId, execution.id, {
        status: 'completed',
        executionTime: 2500,
        processedItems: 150,
        flaggedItems: 8
      });
      
      // Update performance metrics (high error rate to trigger RAG)
      const performanceMetrics: AgentPerformanceMetrics = {
        id: 'metrics-001',
        agentId: agentId,
        averageExecutionTime: 2500,
        successRate: 85,
        errorRate: 15 // High error rate should trigger analysis
      };
      
      ServiceAdapters.agentAnalytics().updatePerformance(agentId, performanceMetrics);
      
      // Detect anomaly
      const anomaly = {
        id: 'anomaly-001',
        agentId: agentId,
        type: 'performance_degradation',
        severity: 'high' as const,
        description: 'Agent execution time increased by 200% over last 24 hours'
      };
      
      ServiceAdapters.agentAnalytics().detectAnomaly(agentId, anomaly);
      
      await waitForEvents(6, 1500);
      
      // Verify agent analytics events
      const agentEvents = getEventsByService('agent-analytics');
      expect(agentEvents.length).toBeGreaterThanOrEqual(4);
      
      const executionStartEvent = agentEvents.find(e => e.event === 'agent:execution:started');
      expect(executionStartEvent).toBeDefined();
      
      const executionCompleteEvent = agentEvents.find(e => e.event === 'agent:execution:completed');
      expect(executionCompleteEvent).toBeDefined();
      
      const performanceEvent = agentEvents.find(e => e.event === 'agent:performance:updated');
      expect(performanceEvent).toBeDefined();
      expect(performanceEvent?.data.metrics.errorRate).toBe(15);
      
      const anomalyEvent = agentEvents.find(e => e.event === 'agent:anomaly:detected');
      expect(anomalyEvent).toBeDefined();
      expect(anomalyEvent?.data.anomaly.severity).toBe('high');
      
      // Verify UI notifications for anomaly
      const anomalyNotifications = eventHistory.filter(e => 
        e.event === 'ui:notification:show' && 
        e.data.notification.title.includes('Agent Anomaly')
      );
      expect(anomalyNotifications.length).toBe(1);
    });
  });

  describe('RAG Intelligence to Visualization Workflow', () => {
    it('should handle RAG query to insight generation to chart visualization', async () => {
      // Execute RAG query
      const queryResults = [
        {
          pattern: 'late_night_transactions',
          frequency: 15,
          risk_score: 0.78,
          description: 'Unusual transaction timing pattern'
        },
        {
          pattern: 'rapid_successive_logins',
          frequency: 8,
          risk_score: 0.65,
          description: 'Multiple login attempts in short timeframe'
        }
      ];
      
      ServiceAdapters.ragIntelligence().executeQuery(
        'query-fraud-patterns-001',
        'SELECT pattern, frequency, risk_score FROM fraud_patterns WHERE confidence > 0.6',
        queryResults
      );
      
      // Update knowledge base
      ServiceAdapters.ragIntelligence().updateKnowledge('fraud_database_sync');
      
      // Generate insight
      const insight: RAGInsight = {
        id: 'insight-001',
        content: 'Analysis of recent fraud patterns indicates a 23% increase in late-night transaction anomalies, particularly in the gambling and cryptocurrency sectors. Correlation with IP geolocation data suggests coordinated attack patterns.',
        confidence: 0.87,
        sources: ['transaction_logs', 'ip_geolocation', 'merchant_categories', 'fraud_database']
      };
      
      ServiceAdapters.ragIntelligence().generateInsight('investigation-insight-001', insight);
      
      await waitForEvents(4, 1000);
      
      // Verify RAG events
      const ragEvents = getEventsByService('rag-intelligence');
      expect(ragEvents.length).toBe(3);
      
      const queryEvent = ragEvents.find(e => e.event === 'rag:query:executed');
      expect(queryEvent).toBeDefined();
      expect(queryEvent?.data.results.length).toBe(2);
      
      const knowledgeEvent = ragEvents.find(e => e.event === 'rag:knowledge:updated');
      expect(knowledgeEvent).toBeDefined();
      
      const insightEvent = ragEvents.find(e => e.event === 'rag:insight:generated');
      expect(insightEvent).toBeDefined();
      expect(insightEvent?.data.insight.confidence).toBe(0.87);
      
      // Verify visualization chart update was triggered
      const chartUpdateEvents = eventHistory.filter(e => e.event === 'viz:chart:data:updated');
      expect(chartUpdateEvents.length).toBe(1);
      
      const chartUpdate = chartUpdateEvents[0];
      expect(chartUpdate.data.chartId).toBe('insight-investigation-insight-001');
      expect(chartUpdate.data.data.confidence).toBe(0.87);
      expect(chartUpdate.data.data.sources).toBe(4);
    });
  });

  describe('Design System Global Update Workflow', () => {
    it('should handle design tokens update to theme propagation to component validation', async () => {
      // Update design tokens
      const designTokens: DesignTokens = {
        colors: {
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            500: '#3b82f6',
            600: '#2563eb',
            900: '#1e3a8a'
          },
          semantic: {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#06b6d4'
          }
        },
        typography: {
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem'
          },
          fontWeight: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        shadows: {
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }
      };
      
      ServiceAdapters.designSystem().updateTokens(designTokens, 'figma_sync_v2.1');
      
      // Sync with Figma
      const syncedComponents = [
        'Button',
        'Input',
        'Modal',
        'Card',
        'Navigation',
        'DataTable',
        'Charts'
      ];
      
      ServiceAdapters.designSystem().syncFigma(syncedComponents);
      
      // Simulate component generation
      const newComponent = {
        id: 'alert-banner',
        name: 'AlertBanner',
        category: 'feedback',
        props: [
          { name: 'type', type: 'success | warning | error | info', required: true },
          { name: 'message', type: 'string', required: true },
          { name: 'closable', type: 'boolean', required: false }
        ],
        examples: [
          { name: 'Success Alert', props: { type: 'success', message: 'Operation completed successfully' } },
          { name: 'Error Alert', props: { type: 'error', message: 'An error occurred' } }
        ]
      };
      
      ServiceAdapters.designSystem().generateComponent(newComponent);
      
      // Simulate validation failure
      const validationErrors = [
        {
          field: 'color_contrast',
          message: 'Warning text on yellow background fails WCAG AA standards (2.8:1 ratio)',
          severity: 'error' as const
        },
        {
          field: 'font_size',
          message: 'Small text below 14px may be difficult to read',
          severity: 'warning' as const
        }
      ];
      
      ServiceAdapters.designSystem().reportValidationFailure('alert-banner', validationErrors);
      
      await waitForEvents(6, 1500);
      
      // Verify design system events
      const designEvents = getEventsByService('design-system');
      expect(designEvents.length).toBe(4);
      
      const tokensEvent = designEvents.find(e => e.event === 'design:tokens:updated');
      expect(tokensEvent).toBeDefined();
      expect(tokensEvent?.data.source).toBe('figma_sync_v2.1');
      
      const figmaEvent = designEvents.find(e => e.event === 'design:figma:synced');
      expect(figmaEvent).toBeDefined();
      expect(figmaEvent?.data.components.length).toBe(7);
      
      const componentEvent = designEvents.find(e => e.event === 'design:component:generated');
      expect(componentEvent).toBeDefined();
      
      const validationEvent = designEvents.find(e => e.event === 'design:validation:failed');
      expect(validationEvent).toBeDefined();
      expect(validationEvent?.data.errors.length).toBe(2);
      
      // Verify theme changes were propagated to UI
      const themeChangeEvents = eventHistory.filter(e => e.event === 'ui:theme:changed');
      expect(themeChangeEvents.length).toBeGreaterThanOrEqual(1);
      
      // Verify validation failure notification
      const validationNotifications = eventHistory.filter(e => 
        e.event === 'ui:notification:show' && 
        e.data.notification.title.includes('Design Validation Failed')
      );
      expect(validationNotifications.length).toBe(1);
    });
  });

  describe('Error Handling and Recovery Workflows', () => {
    it('should handle service errors and recovery across multiple services', async () => {
      // Simulate service errors
      const services = [
        'autonomous-investigation',
        'rag-intelligence',
        'visualization',
        'reporting'
      ];
      
      services.forEach(service => {
        eventBusManager.emit('service:error', {
          service,
          error: new Error(`${service} temporarily unavailable`)
        });
      });
      
      // Wait for error events
      await waitForEvents(services.length, 500);
      
      // Verify error events were recorded
      const errorEvents = eventHistory.filter(e => e.event === 'service:error');
      expect(errorEvents.length).toBe(services.length);
      
      // Verify error notifications were generated
      const errorNotifications = eventHistory.filter(e => 
        e.event === 'ui:notification:show' &&
        e.data.notification.type === 'error'
      );
      expect(errorNotifications.length).toBe(services.length);
      
      // Simulate service recovery
      services.forEach(service => {
        eventBusManager.emit('service:recovery', {
          service,
          timestamp: new Date()
        });
      });
      
      await waitForEvents(services.length * 3, 1000); // errors + notifications + recoveries
      
      const recoveryEvents = eventHistory.filter(e => e.event === 'service:recovery');
      expect(recoveryEvents.length).toBe(services.length);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume cross-service communication efficiently', async () => {
      const startTime = Date.now();
      const eventCount = 50;
      
      // Generate high volume of events across all services
      for (let i = 0; i < eventCount; i++) {
        const serviceIndex = i % 8;
        
        switch (serviceIndex) {
          case 0:
            ServiceAdapters.autonomousInvestigation().startInvestigation({
              id: `perf-auto-${i}`,
              userId: `user-${i}`,
              entityType: 'user_id',
              status: 'initializing',
              aiMode: 'balanced',
              created: new Date()
            });
            break;
          case 1:
            ServiceAdapters.agentAnalytics().updatePerformance(`agent-${i}`, {
              id: `metrics-${i}`,
              agentId: `agent-${i}`,
              averageExecutionTime: Math.random() * 1000 + 500,
              successRate: Math.random() * 20 + 80,
              errorRate: Math.random() * 10
            });
            break;
          case 2:
            ServiceAdapters.ragIntelligence().executeQuery(
              `query-${i}`,
              `SELECT * FROM patterns WHERE id = ${i}`,
              [{ pattern: `pattern-${i}`, score: Math.random() }]
            );
            break;
          case 3:
            ServiceAdapters.visualization().updateChart(`chart-${i}`, {
              data: [i, i * 2, i * 3],
              labels: [`Label ${i}`]
            });
            break;
          case 4:
            ServiceAdapters.reporting().generateReport(
              `report-${i}`,
              'performance_test',
              `/reports/perf-${i}.pdf`
            );
            break;
          case 5:
            ServiceAdapters.coreUI().showNotification({
              id: `notification-${i}`,
              type: 'info',
              title: `Performance Test ${i}`,
              message: `Test notification ${i}`,
              duration: 3000
            });
            break;
          case 6:
            ServiceAdapters.designSystem().updateTokens({
              colors: { test: { [i]: `#${i.toString(16).padStart(6, '0')}` } },
              typography: {},
              spacing: {},
              shadows: {}
            }, `performance-test-${i}`);
            break;
          case 7:
            eventBusManager.emit('service:health:check', {
              service: `service-${i}`,
              status: {
                service: `service-${i}`,
                status: 'healthy',
                latency: Math.random() * 100 + 50,
                errorRate: Math.random() * 5,
                lastCheck: new Date()
              }
            });
            break;
        }
      }
      
      // Wait for all events to propagate
      await waitForEvents(eventCount, 3000);
      
      const processingTime = Date.now() - startTime;
      
      // Verify all events were processed
      expect(eventHistory.length).toBeGreaterThanOrEqual(eventCount);
      expect(processingTime).toBeLessThan(2000); // Should process quickly
      
      // Verify WebSocket calls were made
      expect(mockWebSocketManager.send).toHaveBeenCalledTimes(eventCount);
      
      // Verify events are distributed across services
      const serviceDistribution = eventHistory.reduce((acc, event) => {
        const service = event.service || 'unknown';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(Object.keys(serviceDistribution).length).toBeGreaterThan(5);
    });
  });

  describe('Offline Persistence Workflow', () => {
    it('should persist critical events offline and synchronize on reconnection', async () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Generate critical events while offline
      const criticalEvents = [
        {
          event: 'auto:investigation:started',
          data: {
            investigation: {
              id: 'offline-inv-001',
              userId: 'user-offline',
              entityType: 'email',
              status: 'initializing',
              aiMode: 'balanced',
              created: new Date()
            }
          }
        },
        {
          event: 'manual:investigation:completed',
          data: {
            investigationId: 'offline-manual-001',
            result: { verdict: 'cleared', confidence: 0.95 }
          }
        },
        {
          event: 'report:generated',
          data: {
            reportId: 'offline-report-001',
            type: 'investigation_summary',
            url: '/reports/offline-001.pdf'
          }
        }
      ];
      
      criticalEvents.forEach(({ event, data }) => {
        eventBusManager.emit(event as any, data);
      });
      
      // Verify events were persisted
      const pendingEvents = persistenceManager.getPendingEvents();
      expect(pendingEvents.length).toBeGreaterThan(0);
      
      // Verify offline events are marked as high priority
      const highPriorityEvents = pendingEvents.filter(e => e.priority === 'high');
      expect(highPriorityEvents.length).toBeGreaterThan(0);
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      // Mock successful synchronization
      (persistenceManager as any).simulateEventSync = jest.fn().mockResolvedValue(undefined);
      
      const syncResult = await persistenceManager.synchronizeEvents();
      
      expect(syncResult.synchronized).toBeGreaterThan(0);
      expect(syncResult.failed).toBe(0);
      
      // Verify no pending events remain
      const remainingPendingEvents = persistenceManager.getPendingEvents();
      expect(remainingPendingEvents.length).toBe(0);
    });
  });
});
