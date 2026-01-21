/**
 * Service Adapters Integration Tests
 * Tests communication between all 8 microservice adapters
 */

import {
  ServiceAdapterRegistry,
  AutonomousInvestigationAdapter,
  ManualInvestigationAdapter,
  AgentAnalyticsAdapter,
  RAGIntelligenceAdapter,
  VisualizationAdapter,
  ReportingAdapter,
  CoreUIAdapter,
  DesignSystemAdapter,
  ServiceAdapters
} from '../../service-adapters';
import { EventBusManager } from '../../eventBus';
import { WebSocketManager } from '../../websocket-manager';
import type {
  AutonomousInvestigation,
  ManualInvestigation,
  AIDecision,
  RiskFactor,
  Evidence,
  Collaborator,
  AgentExecution,
  AgentPerformanceMetrics,
  AgentAnomaly,
  RAGInsight,
  Location,
  User,
  Notification,
  ThemeConfig,
  DesignTokens,
  ComponentDefinition,
  ValidationError
} from '../../eventBus';

// Mock WebSocket Manager
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

describe('Service Adapters Integration Tests', () => {
  let registry: ServiceAdapterRegistry;
  let eventBusManager: EventBusManager;
  let adapters: {
    autonomous: AutonomousInvestigationAdapter;
    manual: ManualInvestigationAdapter;
    agent: AgentAnalyticsAdapter;
    rag: RAGIntelligenceAdapter;
    viz: VisualizationAdapter;
    reporting: ReportingAdapter;
    ui: CoreUIAdapter;
    design: DesignSystemAdapter;
  };

  beforeEach(() => {
    // Clear singleton instances
    (ServiceAdapterRegistry as any).instance = null;
    
    // Create fresh instances
    registry = ServiceAdapterRegistry.getInstance();
    eventBusManager = EventBusManager.getInstance();
    
    // Get adapter instances
    adapters = {
      autonomous: ServiceAdapters.autonomousInvestigation(),
      manual: ServiceAdapters.manualInvestigation(),
      agent: ServiceAdapters.agentAnalytics(),
      rag: ServiceAdapters.ragIntelligence(),
      viz: ServiceAdapters.visualization(),
      reporting: ServiceAdapters.reporting(),
      ui: ServiceAdapters.coreUI(),
      design: ServiceAdapters.designSystem()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    registry.cleanup();
    eventBusManager.cleanup('test');
  });

  describe('Adapter Initialization', () => {
    it('should initialize all 8 service adapters', () => {
      const allAdapters = registry.getAllAdapters();
      
      expect(allAdapters.size).toBe(8);
      expect(allAdapters.has('autonomous-investigation')).toBe(true);
      expect(allAdapters.has('manual-investigation')).toBe(true);
      expect(allAdapters.has('agent-analytics')).toBe(true);
      expect(allAdapters.has('rag-intelligence')).toBe(true);
      expect(allAdapters.has('visualization')).toBe(true);
      expect(allAdapters.has('reporting')).toBe(true);
      expect(allAdapters.has('core-ui')).toBe(true);
      expect(allAdapters.has('design-system')).toBe(true);
    });

    it('should provide typed adapter access through factory functions', () => {
      expect(adapters.autonomous).toBeInstanceOf(AutonomousInvestigationAdapter);
      expect(adapters.manual).toBeInstanceOf(ManualInvestigationAdapter);
      expect(adapters.agent).toBeInstanceOf(AgentAnalyticsAdapter);
      expect(adapters.rag).toBeInstanceOf(RAGIntelligenceAdapter);
      expect(adapters.viz).toBeInstanceOf(VisualizationAdapter);
      expect(adapters.reporting).toBeInstanceOf(ReportingAdapter);
      expect(adapters.ui).toBeInstanceOf(CoreUIAdapter);
      expect(adapters.design).toBeInstanceOf(DesignSystemAdapter);
    });
  });

  describe('Cross-Service Communication Flows', () => {
    describe('Investigation Workflow: Autonomous to Manual to Reporting', () => {
      it('should handle autonomous investigation escalation to manual investigation', async () => {
        const investigationData: AutonomousInvestigation = {
          id: 'auto-inv-1',
          userId: 'user-123',
          entityType: 'email',
          status: 'analyzing',
          aiMode: 'balanced',
          created: new Date()
        };

        // Start autonomous investigation
        adapters.autonomous.startInvestigation(investigationData);
        
        // Verify WebSocket message sent
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'investigation-started',
          service: 'autonomous-investigation',
          target: undefined,
          payload: { investigation: investigationData }
        });

        // Simulate escalation (this should trigger manual investigation start)
        const escalationHandler = jest.fn();
        eventBusManager.subscribe('manual:investigation:started', escalationHandler, 'test');
        
        // Trigger escalation event which should be handled by the adapter
        eventBusManager.emit('auto:investigation:escalated', {
          id: 'auto-inv-1',
          reason: 'Complex case requires human review',
          targetService: 'manual' as const
        });

        // Wait for event processing
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify manual investigation was started
        expect(escalationHandler).toHaveBeenCalledWith({
          investigation: expect.objectContaining({
            id: 'auto-inv-1',
            investigatorId: 'system',
            status: 'draft'
          })
        });
      });

      it('should route completed investigations to reporting service', async () => {
        const reportHandler = jest.fn();
        eventBusManager.subscribe('report:generated', reportHandler, 'test');

        // Complete autonomous investigation
        adapters.autonomous.completeInvestigation('auto-inv-1', {
          verdict: 'high_risk',
          riskScore: 85,
          factors: ['unusual_login_pattern', 'suspicious_ip']
        });

        // Complete manual investigation
        const manualInvestigation: ManualInvestigation = {
          id: 'manual-inv-1',
          investigatorId: 'investigator-123',
          userId: 'user-456',
          entityType: 'user_id',
          status: 'completed',
          created: new Date()
        };

        eventBusManager.emit('manual:investigation:completed', {
          investigationId: 'manual-inv-1',
          result: {
            verdict: 'cleared',
            evidence: ['clean_transaction_history', 'verified_identity']
          }
        });

        // Verify both investigations triggered WebSocket messages
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'investigation-completed',
          service: 'autonomous-investigation',
          target: undefined,
          payload: {
            investigationId: 'auto-inv-1',
            result: expect.any(Object)
          }
        });

        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'investigation-completed',
          service: 'manual-investigation',
          target: undefined,
          payload: {
            investigationId: 'manual-inv-1',
            result: expect.any(Object)
          }
        });
      });
    });

    describe('Analytics Workflow: Agent Analytics to RAG Intelligence to Visualization', () => {
      it('should route agent performance data to RAG for analysis', async () {
        const ragQueryHandler = jest.fn();
        eventBusManager.subscribe('rag:query:executed', ragQueryHandler, 'test');

        const performanceMetrics: AgentPerformanceMetrics = {
          id: 'metrics-1',
          agentId: 'agent-fraud-detector',
          averageExecutionTime: 1200,
          successRate: 85.5,
          errorRate: 12.0 // High error rate should trigger RAG analysis
        };

        // Update agent performance (high error rate should trigger RAG query)
        adapters.agent.updatePerformance('agent-fraud-detector', performanceMetrics);

        // Wait for conditional event processing
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify performance update was sent via WebSocket
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'performance-updated',
          service: 'agent-analytics',
          target: undefined,
          payload: {
            agentId: 'agent-fraud-detector',
            metrics: performanceMetrics
          }
        });
      });

      it('should route RAG insights to visualization service', async () => {
        const vizUpdateHandler = jest.fn();
        eventBusManager.subscribe('viz:chart:data:updated', vizUpdateHandler, 'test');

        const insight: RAGInsight = {
          id: 'insight-1',
          content: 'Detected pattern of failed transactions during peak hours',
          confidence: 0.87,
          sources: ['transaction_logs', 'user_behavior_patterns', 'fraud_database']
        };

        // Generate RAG insight
        adapters.rag.generateInsight('investigation-123', insight);

        // Wait for event processing
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify insight was sent to visualization
        expect(vizUpdateHandler).toHaveBeenCalledWith({
          chartId: 'insight-investigation-123',
          data: {
            confidence: 0.87,
            sources: 3,
            content_length: insight.content.length
          }
        });
      });
    });

    describe('UI Workflow: Core UI with All Services', () => {
      it('should broadcast notifications to UI from various services', async () => {
        const notificationHandler = jest.fn();
        eventBusManager.subscribe('ui:notification:show', notificationHandler, 'test');

        // Agent anomaly should trigger notification
        const anomaly: AgentAnomaly = {
          id: 'anomaly-1',
          agentId: 'agent-fraud-detector',
          type: 'performance_degradation',
          severity: 'high',
          description: 'Agent response time increased by 300%'
        };

        adapters.agent.detectAnomaly('agent-fraud-detector', anomaly);

        // Manual investigation collaboration should trigger notification
        const collaborator: Collaborator = {
          id: 'collab-1',
          name: 'Senior Investigator Sarah',
          role: 'reviewer',
          permissions: ['read', 'comment', 'approve']
        };

        adapters.manual.inviteCollaborator('investigation-456', collaborator);

        // Report export completion should trigger notification
        adapters.reporting.completeExport('report-789', '/downloads/report-789.pdf');

        // Design validation failure should trigger notification
        const validationErrors: ValidationError[] = [
          {
            field: 'color_contrast',
            message: 'Insufficient color contrast ratio (3.2:1, minimum 4.5:1 required)',
            severity: 'error'
          }
        ];

        adapters.design.reportValidationFailure('component-button', validationErrors);

        // Wait for all event processing
        await new Promise(resolve => setTimeout(resolve, 20));

        // Verify all notifications were generated
        expect(notificationHandler).toHaveBeenCalledTimes(4);
        
        const notificationCalls = notificationHandler.mock.calls;
        expect(notificationCalls[0][0].notification.title).toContain('Agent Anomaly Detected');
        expect(notificationCalls[1][0].notification.title).toContain('New Collaborator');
        expect(notificationCalls[2][0].notification.title).toContain('Export Complete');
        expect(notificationCalls[3][0].notification.title).toContain('Design Validation Failed');
      });

      it('should handle navigation and theme changes', () => {
        const user: User = {
          id: 'user-123',
          name: 'John Investigator',
          email: 'john@company.com',
          role: 'senior_investigator'
        };

        // Test navigation
        adapters.ui.navigate('/investigations/456', user);
        
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'navigation-changed',
          service: 'core-ui',
          target: undefined,
          payload: {
            route: '/investigations/456',
            user
          }
        });

        // Test theme change
        const theme: ThemeConfig = {
          mode: 'dark',
          primaryColor: '#1e40af',
          customizations: {
            sidebarCollapsed: true,
            compactMode: false
          }
        };

        adapters.ui.changeTheme(theme);
        
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'theme-changed',
          service: 'core-ui',
          target: undefined,
          payload: { theme }
        });
      });
    });

    describe('Design System Workflow: Design System to All Services', () => {
      it('should broadcast design token updates to all services', () => {
        const uiThemeHandler = jest.fn();
        eventBusManager.subscribe('ui:theme:changed', uiThemeHandler, 'test');

        const designTokens: DesignTokens = {
          colors: {
            primary: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
            secondary: { 500: '#64748b', 600: '#475569' },
            success: { 500: '#22c55e' },
            warning: { 500: '#f59e0b' },
            error: { 500: '#ef4444' }
          },
          typography: {
            fontSize: {
              sm: '0.875rem',
              base: '1rem',
              lg: '1.125rem',
              xl: '1.25rem'
            },
            fontWeight: {
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
            xl: '2rem'
          },
          shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }
        };

        // Update design tokens
        adapters.design.updateTokens(designTokens, 'figma_sync');

        // Verify WebSocket message was sent
        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'tokens-updated',
          service: 'design-system',
          target: undefined,
          payload: {
            tokens: designTokens,
            source: 'figma_sync'
          }
        });
      });

      it('should handle Figma synchronization events', () => {
        const components = [
          'Button',
          'Input',
          'Modal',
          'Card',
          'Navigation'
        ];

        // Sync with Figma
        adapters.design.syncFigma(components);

        expect(mockWebSocketManager.send).toHaveBeenCalledWith({
          type: 'figma-synced',
          service: 'design-system',
          target: undefined,
          payload: {
            components,
            timestamp: expect.any(Date)
          }
        });
      });
    });
  });

  describe('Visualization Data Flow', () => {
    it('should handle risk factor visualization from autonomous investigations', async () => {
      const vizHandler = jest.fn();
      eventBusManager.subscribe('viz:graph:updated', vizHandler, 'test');

      const riskFactors: RiskFactor[] = [
        {
          id: 'risk-1',
          category: 'behavioral',
          score: 85,
          description: 'Unusual login times detected'
        },
        {
          id: 'risk-2',
          category: 'geographic',
          score: 70,
          description: 'Login from new geographic location'
        },
        {
          id: 'risk-3',
          category: 'device',
          score: 60,
          description: 'New device fingerprint'
        }
      ];

      // Update risk score (should trigger visualization update)
      adapters.autonomous.updateRiskScore('investigation-789', 78, riskFactors);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify visualization was updated
      expect(vizHandler).toHaveBeenCalledWith({
        investigationId: 'investigation-789',
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'risk-score',
            label: 'Risk Score: 78',
            type: 'score'
          }),
          expect.objectContaining({
            id: 'risk-1',
            label: 'Unusual login times detected',
            type: 'factor',
            score: 85
          })
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({
            source: 'risk-score',
            target: 'risk-1',
            weight: 85
          })
        ])
      });
    });

    it('should handle evidence visualization from manual investigations', async () => {
      const vizHandler = jest.fn();
      eventBusManager.subscribe('viz:graph:updated', vizHandler, 'test');

      const evidence: Evidence = {
        id: 'evidence-1',
        type: 'transaction_log',
        data: {
          transactionId: 'tx-456',
          amount: 1500.00,
          timestamp: new Date(),
          location: 'New York, NY'
        },
        timestamp: new Date()
      };

      // Add evidence (should trigger visualization update)
      adapters.manual.addEvidence('investigation-999', evidence);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify visualization node was added
      expect(vizHandler).toHaveBeenCalledWith({
        investigationId: 'investigation-999',
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'evidence-1',
            type: 'evidence'
          })
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({
            source: 'investigation-999',
            target: 'evidence-1'
          })
        ])
      });
    });

    it('should handle location updates and chart data updates', () => {
      const location: Location = {
        id: 'loc-1',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY, USA'
      };

      // Add location to map
      adapters.viz.addLocation('investigation-555', location);
      
      expect(mockWebSocketManager.send).toHaveBeenCalledWith({
        type: 'location-added',
        service: 'visualization',
        target: undefined,
        payload: {
          investigationId: 'investigation-555',
          location
        }
      });

      // Update chart data
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [{
          label: 'Fraud Cases',
          data: [12, 19, 8, 15]
        }]
      };

      adapters.viz.updateChart('fraud-trends-chart', chartData);
      
      expect(mockWebSocketManager.send).toHaveBeenCalledWith({
        type: 'chart-updated',
        service: 'visualization',
        target: undefined,
        payload: {
          chartId: 'fraud-trends-chart',
          data: chartData
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle adapter cleanup properly', () => {
      const cleanupSpy = jest.spyOn(adapters.autonomous, 'cleanup');
      
      registry.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle missing adapter gracefully', () => {
      const nonExistentAdapter = registry.getAdapter('non-existent-service');
      
      expect(nonExistentAdapter).toBeUndefined();
    });

    it('should handle WebSocket send failures gracefully', () => {
      mockWebSocketManager.send.mockImplementation(() => {
        throw new Error('WebSocket send failed');
      });

      // Should not throw error
      expect(() => {
        adapters.autonomous.startInvestigation({
          id: 'test-inv',
          userId: 'user-123',
          entityType: 'user_id',
          status: 'initializing',
          aiMode: 'balanced',
          created: new Date()
        });
      }).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple rapid events efficiently', () => {
      const startTime = Date.now();
      const eventCount = 100;

      // Generate many events rapidly
      for (let i = 0; i < eventCount; i++) {
        adapters.agent.updatePerformance(`agent-${i}`, {
          id: `metrics-${i}`,
          agentId: `agent-${i}`,
          averageExecutionTime: Math.random() * 1000,
          successRate: Math.random() * 100,
          errorRate: Math.random() * 10
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(mockWebSocketManager.send).toHaveBeenCalledTimes(eventCount);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle concurrent adapter operations', async () => {
      const promises = [
        // Concurrent operations across different services
        new Promise(resolve => {
          adapters.autonomous.startInvestigation({
            id: 'concurrent-inv-1',
            userId: 'user-1',
            entityType: 'email',
            status: 'initializing',
            aiMode: 'balanced',
            created: new Date()
          });
          resolve(void 0);
        }),
        new Promise(resolve => {
          adapters.rag.executeQuery('query-1', 'SELECT * FROM fraud_patterns', []);
          resolve(void 0);
        }),
        new Promise(resolve => {
          adapters.viz.updateChart('chart-1', { data: [1, 2, 3] });
          resolve(void 0);
        }),
        new Promise(resolve => {
          adapters.reporting.generateReport('report-1', 'summary', '/reports/report-1.pdf');
          resolve(void 0);
        })
      ];

      // All operations should complete without issues
      await expect(Promise.all(promises)).resolves.toBeDefined();
      
      expect(mockWebSocketManager.send).toHaveBeenCalledTimes(4);
    });
  });
});
