/**
 * Event Routing Integration Tests
 * Tests intelligent event routing rules and transformations between microservices
 */

import {
  EventRouter,
  RoutingRule,
  TargetEvent,
  RoutingCondition,
  EventTransform,
  RoutingContext,
  RoutingMetrics,
  RoutePriority,
  ConditionOperator,
  RoutingUtils
} from '../../event-routing';
import { EventBusManager } from '../../eventBus';
import { WebSocketManager } from '../../websocket-manager';

// Mock WebSocket Manager
const mockWebSocketManager = {
  send: jest.fn(),
  sendToService: jest.fn(),
  broadcast: jest.fn(),
  getConnectionState: jest.fn(() => 'connected')
};

jest.mock('../../websocket-manager', () => ({
  WebSocketManager: {
    getInstance: () => mockWebSocketManager
  }
}));

describe('Event Routing Integration Tests', () => {
  let eventRouter: EventRouter;
  let eventBusManager: EventBusManager;

  beforeEach(() => {
    // Clear singleton instances
    (EventRouter as any).instance = null;
    
    eventRouter = EventRouter.getInstance();
    eventBusManager = EventBusManager.getInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    eventBusManager.cleanup('routing-test');
  });

  describe('Routing Rule Management', () => {
    it('should initialize with default routing rules', () => {
      const rules = eventRouter.getAllRules();
      
      expect(rules.length).toBeGreaterThan(0);
      
      // Check for key default rules
      const escalationRule = rules.find(r => r.id === 'auto-to-manual-escalation');
      expect(escalationRule).toBeDefined();
      expect(escalationRule?.sourceEvent).toBe('auto:investigation:escalated');
      expect(escalationRule?.sourceService).toBe('autonomous-investigation');
      
      const errorRoutingRule = rules.find(r => r.id === 'error-notification-routing');
      expect(errorRoutingRule).toBeDefined();
      expect(errorRoutingRule?.priority).toBe('critical');
    });

    it('should add custom routing rules', () => {
      const customRule: RoutingRule = {
        id: 'test-custom-rule',
        name: 'Test Custom Rule',
        description: 'Custom rule for testing',
        sourceEvent: 'test:custom:event',
        sourceService: 'test-service',
        targetEvents: [{
          event: 'test:target:event',
          service: 'target-service',
          required: true
        }],
        priority: 'medium',
        enabled: true
      };
      
      eventRouter.addRule(customRule);
      
      const retrievedRule = eventRouter.getRule('test-custom-rule');
      expect(retrievedRule).toEqual(customRule);
    });

    it('should remove routing rules', () => {
      const testRule: RoutingRule = {
        id: 'removable-rule',
        name: 'Removable Rule',
        description: 'Rule to be removed',
        sourceEvent: 'test:removable',
        sourceService: 'test-service',
        targetEvents: [{
          event: 'test:target',
          service: 'target-service',
          required: true
        }],
        priority: 'low',
        enabled: true
      };
      
      eventRouter.addRule(testRule);
      expect(eventRouter.getRule('removable-rule')).toBeDefined();
      
      const removed = eventRouter.removeRule('removable-rule');
      expect(removed).toBe(true);
      expect(eventRouter.getRule('removable-rule')).toBeUndefined();
    });

    it('should enable and disable rules', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result1 = eventRouter.setRuleEnabled('auto-to-manual-escalation', false);
      expect(result1).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('disabled: Escalate Autonomous to Manual Investigation')
      );
      
      const result2 = eventRouter.setRuleEnabled('auto-to-manual-escalation', true);
      expect(result2).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('enabled: Escalate Autonomous to Manual Investigation')
      );
      
      const result3 = eventRouter.setRuleEnabled('non-existent-rule', true);
      expect(result3).toBe(false);
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Event Routing Execution', () => {
    it('should route autonomous investigation escalation to manual investigation', async () => {
      const manualStartHandler = jest.fn();
      const notificationHandler = jest.fn();
      
      eventBusManager.subscribe('manual:investigation:started', manualStartHandler, 'routing-test');
      eventBusManager.subscribe('ui:notification:show', notificationHandler, 'routing-test');
      
      // Trigger escalation event
      eventBusManager.emit('auto:investigation:escalated', {
        id: 'auto-inv-123',
        reason: 'Complex pattern requires human analysis',
        targetService: 'manual' as const
      });
      
      // Wait for routing to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify manual investigation was started
      expect(manualStartHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          investigationId: 'auto-inv-123',
          escalationReason: 'Complex pattern requires human analysis',
          _routing: expect.objectContaining({
            sourceEvent: 'auto:investigation:escalated',
            sourceService: 'autonomous-investigation',
            targetService: 'manual-investigation'
          })
        })
      );
      
      // Verify notification was sent
      expect(notificationHandler).toHaveBeenCalled();
      
      // Verify WebSocket message was sent
      expect(mockWebSocketManager.sendToService).toHaveBeenCalledWith(
        'manual-investigation',
        'manual:investigation:started',
        expect.any(Object)
      );
    });

    it('should route investigation completion to reporting with delay', async () => {
      const reportHandler = jest.fn();
      eventBusManager.subscribe('report:generated', reportHandler, 'routing-test');
      
      // Trigger investigation completion
      eventBusManager.emit('auto:investigation:completed', {
        investigationId: 'completed-inv-456',
        result: {
          verdict: 'high_risk',
          riskScore: 92,
          confidence: 0.95
        }
      });
      
      // Should not be called immediately due to delay
      expect(reportHandler).not.toHaveBeenCalled();
      
      // Wait for delay (1000ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Now should be called
      expect(reportHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          investigationId: 'completed-inv-456',
          result: expect.objectContaining({
            verdict: 'high_risk',
            riskScore: 92
          }),
          _routing: expect.objectContaining({
            sourceEvent: 'auto:investigation:completed',
            targetService: 'reporting'
          })
        })
      );
    });

    it('should route based on conditional logic', async () => {
      const ragQueryHandler = jest.fn();
      eventBusManager.subscribe('rag:query:executed', ragQueryHandler, 'routing-test');
      
      // Emit performance update with high error rate (should trigger routing)
      eventBusManager.emit('agent:performance:updated', {
        agentId: 'failing-agent',
        metrics: {
          id: 'metrics-1',
          agentId: 'failing-agent',
          averageExecutionTime: 2500,
          successRate: 75,
          errorRate: 15 // > 10, should trigger RAG query
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(ragQueryHandler).toHaveBeenCalled();
      
      // Clear and test with low error rate (should NOT trigger)
      ragQueryHandler.mockClear();
      
      eventBusManager.emit('agent:performance:updated', {
        agentId: 'healthy-agent',
        metrics: {
          id: 'metrics-2',
          agentId: 'healthy-agent',
          averageExecutionTime: 800,
          successRate: 98,
          errorRate: 2 // < 10, should NOT trigger RAG query
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(ragQueryHandler).not.toHaveBeenCalled();
    });

    it('should broadcast design token updates to multiple services', async () => {
      const uiThemeHandler = jest.fn();
      eventBusManager.subscribe('ui:theme:changed', uiThemeHandler, 'routing-test');
      
      // Trigger design tokens update
      eventBusManager.emit('design:tokens:updated', {
        tokens: {
          colors: { primary: { 500: '#3b82f6' } },
          typography: { fontSize: { base: '1rem' } },
          spacing: { md: '1rem' },
          shadows: { md: '0 4px 6px rgba(0,0,0,0.1)' }
        },
        source: 'figma'
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify UI theme change was triggered
      expect(uiThemeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: expect.objectContaining({
            colors: expect.any(Object)
          }),
          source: 'figma',
          _routing: expect.objectContaining({
            sourceEvent: 'design:tokens:updated',
            targetService: 'core-ui'
          })
        })
      );
      
      // Verify WebSocket messages were sent
      expect(mockWebSocketManager.sendToService).toHaveBeenCalledWith(
        'core-ui',
        'ui:theme:changed',
        expect.any(Object)
      );
      
      expect(mockWebSocketManager.sendToService).toHaveBeenCalledWith(
        'visualization',
        'viz:theme:updated',
        expect.any(Object)
      );
    });
  });

  describe('Event Transformations', () => {
    it('should apply field mapping transformations', async () => {
      const targetHandler = jest.fn();
      eventBusManager.subscribe('ui:notification:show', targetHandler, 'routing-test');
      
      // Trigger service error (should be transformed)
      eventBusManager.emit('service:error', {
        service: 'rag-intelligence',
        error: new Error('Query timeout after 30 seconds')
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verify transformation was applied
      expect(targetHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          errorSource: 'rag-intelligence',
          errorMessage: 'Query timeout after 30 seconds',
          _routing: expect.objectContaining({
            sourceEvent: 'service:error'
          })
        })
      );
    });

    it('should handle complex data transformations', () => {
      const testTransform: EventTransform = {
        type: 'map',
        mapping: {
          'investigation.id': 'investigationId',
          'investigation.status': 'currentStatus',
          'investigation.riskScore': 'risk.score'
        }
      };
      
      const originalData = {
        investigation: {
          id: 'inv-123',
          status: 'completed',
          riskScore: 85
        },
        timestamp: new Date()
      };
      
      const transformedData = (eventRouter as any).transformData(testTransform, originalData);
      
      expect(transformedData).toEqual({
        investigation: {
          id: 'inv-123',
          status: 'completed',
          riskScore: 85
        },
        timestamp: expect.any(Date),
        investigationId: 'inv-123',
        currentStatus: 'completed',
        risk: {
          score: 85
        }
      });
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate various condition operators correctly', () => {
      const testCases = [
        { operator: 'equals' as ConditionOperator, actual: 'test', expected: 'test', result: true },
        { operator: 'equals' as ConditionOperator, actual: 'test', expected: 'other', result: false },
        { operator: 'not_equals' as ConditionOperator, actual: 'test', expected: 'other', result: true },
        { operator: 'contains' as ConditionOperator, actual: 'test string', expected: 'test', result: true },
        { operator: 'not_contains' as ConditionOperator, actual: 'test string', expected: 'xyz', result: true },
        { operator: 'greater_than' as ConditionOperator, actual: 10, expected: 5, result: true },
        { operator: 'less_than' as ConditionOperator, actual: 5, expected: 10, result: true },
        { operator: 'exists' as ConditionOperator, actual: 'value', expected: null, result: true },
        { operator: 'not_exists' as ConditionOperator, actual: null, expected: null, result: true }
      ];
      
      testCases.forEach(({ operator, actual, expected, result }) => {
        const evaluation = (eventRouter as any).evaluateCondition(operator, actual, expected);
        expect(evaluation).toBe(result);
      });
    });

    it('should evaluate complex nested conditions', () => {
      const context: RoutingContext = {
        sourceEvent: 'test:event',
        sourceService: 'test-service',
        eventData: {
          investigation: {
            riskScore: 85,
            priority: 'high'
          },
          agent: {
            performance: {
              errorRate: 12
            }
          }
        },
        metadata: { source: 'automated' },
        timestamp: new Date(),
        correlationId: 'corr-123'
      };
      
      const conditions: RoutingCondition[] = [
        {
          field: 'investigation.riskScore',
          operator: 'greater_than',
          value: 80,
          type: 'data'
        },
        {
          field: 'investigation.priority',
          operator: 'equals',
          value: 'high',
          type: 'data'
        }
      ];
      
      const result = (eventRouter as any).evaluateConditions(conditions, context);
      expect(result).toBe(true);
    });
  });

  describe('Routing Metrics and Monitoring', () => {
    it('should track routing metrics for rules', async () => {
      // Clear existing metrics
      eventRouter.clearMetrics();
      
      // Trigger several events to generate metrics
      for (let i = 0; i < 5; i++) {
        eventBusManager.emit('auto:investigation:completed', {
          investigationId: `metrics-test-${i}`,
          result: { score: 80 + i }
        });
      }
      
      // Wait for routing
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const metrics = eventRouter.getMetrics('investigation-to-report') as RoutingMetrics;
      
      expect(metrics).toBeDefined();
      expect(metrics.executionCount).toBe(5);
      expect(metrics.successCount).toBe(5);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.lastExecuted).toBeInstanceOf(Date);
    });

    it('should track routing errors', async () => {
      // Add a rule that will fail
      const failingRule: RoutingRule = {
        id: 'failing-test-rule',
        name: 'Failing Test Rule',
        description: 'Rule designed to fail for testing',
        sourceEvent: 'test:failing:event',
        sourceService: 'test-service',
        targetEvents: [{
          event: 'test:target:event',
          service: 'target-service',
          required: true
        }],
        priority: 'medium',
        enabled: true
      };
      
      eventRouter.addRule(failingRule);
      
      // Mock the emitTargetEvent to fail
      const originalEmitTargetEvent = (eventRouter as any).emitTargetEvent;
      (eventRouter as any).emitTargetEvent = jest.fn().mockImplementation(() => {
        throw new Error('Simulated routing failure');
      });
      
      // Trigger the event
      eventBusManager.emit('test:failing:event', { data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const metrics = eventRouter.getMetrics('failing-test-rule') as RoutingMetrics;
      
      expect(metrics.executionCount).toBe(1);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0].error).toContain('Simulated routing failure');
      
      // Restore original method
      (eventRouter as any).emitTargetEvent = originalEmitTargetEvent;
    });

    it('should clear metrics selectively', () => {
      // Add some test metrics
      const rule1: RoutingRule = {
        id: 'metrics-rule-1',
        name: 'Metrics Rule 1',
        description: 'Test rule 1',
        sourceEvent: 'test:metrics:1',
        sourceService: 'test-service',
        targetEvents: [{ event: 'test:target:1', service: 'target-service', required: true }],
        priority: 'medium',
        enabled: true
      };
      
      const rule2: RoutingRule = {
        id: 'metrics-rule-2',
        name: 'Metrics Rule 2',
        description: 'Test rule 2',
        sourceEvent: 'test:metrics:2',
        sourceService: 'test-service',
        targetEvents: [{ event: 'test:target:2', service: 'target-service', required: true }],
        priority: 'medium',
        enabled: true
      };
      
      eventRouter.addRule(rule1);
      eventRouter.addRule(rule2);
      
      // Simulate some executions
      (eventRouter as any).metrics.get('metrics-rule-1').executionCount = 5;
      (eventRouter as any).metrics.get('metrics-rule-2').executionCount = 3;
      
      // Clear metrics for rule 1 only
      eventRouter.clearMetrics('metrics-rule-1');
      
      const metrics1 = eventRouter.getMetrics('metrics-rule-1') as RoutingMetrics;
      const metrics2 = eventRouter.getMetrics('metrics-rule-2') as RoutingMetrics;
      
      expect(metrics1.executionCount).toBe(0);
      expect(metrics2.executionCount).toBe(3);
    });
  });

  describe('Routing Utilities', () => {
    it('should create simple routing rules', () => {
      const rule = RoutingUtils.createSimpleRule(
        'util-simple-rule',
        'Simple Utility Rule',
        'test:source:event',
        'source-service',
        'test:target:event',
        'target-service'
      );
      
      expect(rule).toEqual({
        id: 'util-simple-rule',
        name: 'Simple Utility Rule',
        description: 'Route test:source:event to test:target:event',
        sourceEvent: 'test:source:event',
        sourceService: 'source-service',
        targetEvents: [{
          event: 'test:target:event',
          service: 'target-service',
          required: true
        }],
        priority: 'medium',
        enabled: true
      });
    });

    it('should create conditional routing rules', () => {
      const conditions: RoutingCondition[] = [
        {
          field: 'priority',
          operator: 'equals',
          value: 'high',
          type: 'data'
        }
      ];
      
      const rule = RoutingUtils.createConditionalRule(
        'util-conditional-rule',
        'Conditional Utility Rule',
        'test:conditional:event',
        'source-service',
        'test:conditional:target',
        'target-service',
        conditions
      );
      
      expect(rule.conditions).toEqual(conditions);
      expect(rule.description).toContain('Conditionally route');
    });

    it('should validate routing rules', () => {
      const validRule: RoutingRule = {
        id: 'valid-rule',
        name: 'Valid Rule',
        description: 'A valid routing rule',
        sourceEvent: 'test:event',
        sourceService: 'test-service',
        targetEvents: [{
          event: 'target:event',
          service: 'target-service',
          required: true
        }],
        priority: 'medium',
        enabled: true
      };
      
      const validationResult = RoutingUtils.validateRule(validRule);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      
      const invalidRule: RoutingRule = {
        id: '',
        name: '',
        description: 'Invalid rule',
        sourceEvent: '',
        sourceService: '',
        targetEvents: [],
        priority: 'medium',
        enabled: true
      };
      
      const invalidValidationResult = RoutingUtils.validateRule(invalidRule);
      expect(invalidValidationResult.valid).toBe(false);
      expect(invalidValidationResult.errors.length).toBeGreaterThan(0);
      expect(invalidValidationResult.errors).toContain('Rule ID is required');
      expect(invalidValidationResult.errors).toContain('Rule name is required');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle many routing rules efficiently', () => {
      const ruleCount = 100;
      const startTime = Date.now();
      
      // Add many rules
      for (let i = 0; i < ruleCount; i++) {
        const rule: RoutingRule = {
          id: `perf-rule-${i}`,
          name: `Performance Rule ${i}`,
          description: `Rule ${i} for performance testing`,
          sourceEvent: `perf:event:${i}`,
          sourceService: 'perf-service',
          targetEvents: [{
            event: `perf:target:${i}`,
            service: 'target-service',
            required: true
          }],
          priority: 'medium',
          enabled: true
        };
        
        eventRouter.addRule(rule);
      }
      
      const addRulesTime = Date.now() - startTime;
      
      // Test rule lookup performance
      const lookupStartTime = Date.now();
      for (let i = 0; i < ruleCount; i++) {
        eventRouter.getRule(`perf-rule-${i}`);
      }
      const lookupTime = Date.now() - lookupStartTime;
      
      expect(addRulesTime).toBeLessThan(500); // Should add 100 rules quickly
      expect(lookupTime).toBeLessThan(100); // Should lookup quickly
      
      const allRules = eventRouter.getAllRules();
      expect(allRules.length).toBeGreaterThanOrEqual(ruleCount);
    });

    it('should handle rapid event routing efficiently', async () => {
      const eventCount = 50;
      const startTime = Date.now();
      
      const targetHandler = jest.fn();
      eventBusManager.subscribe('report:generated', targetHandler, 'routing-test');
      
      // Emit many events rapidly
      for (let i = 0; i < eventCount; i++) {
        eventBusManager.emit('auto:investigation:completed', {
          investigationId: `rapid-test-${i}`,
          result: { score: 80 + (i % 20) }
        });
      }
      
      // Wait for all routing to complete
      await new Promise(resolve => setTimeout(resolve, 1200)); // Account for 1s delay
      
      const routingTime = Date.now() - startTime;
      
      expect(targetHandler).toHaveBeenCalledTimes(eventCount);
      expect(routingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle disabled rules gracefully', async () => {
      const targetHandler = jest.fn();
      eventBusManager.subscribe('manual:investigation:started', targetHandler, 'routing-test');
      
      // Disable the escalation rule
      eventRouter.setRuleEnabled('auto-to-manual-escalation', false);
      
      // Trigger escalation event
      eventBusManager.emit('auto:investigation:escalated', {
        id: 'disabled-test',
        reason: 'Test with disabled rule',
        targetService: 'manual' as const
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should not have triggered the target event
      expect(targetHandler).not.toHaveBeenCalled();
    });

    it('should handle missing routing rules gracefully', () => {
      const nonExistentRule = eventRouter.getRule('non-existent-rule');
      expect(nonExistentRule).toBeUndefined();
      
      const removeResult = eventRouter.removeRule('non-existent-rule');
      expect(removeResult).toBe(false);
      
      const enableResult = eventRouter.setRuleEnabled('non-existent-rule', true);
      expect(enableResult).toBe(false);
    });

    it('should handle optional target events gracefully', async () => {
      const rule: RoutingRule = {
        id: 'optional-target-rule',
        name: 'Optional Target Rule',
        description: 'Rule with optional and required targets',
        sourceEvent: 'test:optional:event',
        sourceService: 'test-service',
        targetEvents: [
          {
            event: 'test:required:target',
            service: 'target-service',
            required: true
          },
          {
            event: 'test:optional:target',
            service: 'optional-service',
            required: false
          }
        ],
        priority: 'medium',
        enabled: true
      };
      
      eventRouter.addRule(rule);
      
      const requiredHandler = jest.fn();
      const optionalHandler = jest.fn();
      
      eventBusManager.subscribe('test:required:target', requiredHandler, 'routing-test');
      eventBusManager.subscribe('test:optional:target', optionalHandler, 'routing-test');
      
      // Mock optional target to fail
      const originalEmitTargetEvent = (eventRouter as any).emitTargetEvent;
      (eventRouter as any).emitTargetEvent = jest.fn().mockImplementation((target: TargetEvent, data: any, context: RoutingContext) => {
        if (target.service === 'optional-service') {
          throw new Error('Optional service unavailable');
        }
        return originalEmitTargetEvent.call(eventRouter, target, data, context);
      });
      
      // Trigger event
      eventBusManager.emit('test:optional:event', { data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Required target should have been called
      expect(requiredHandler).toHaveBeenCalled();
      
      // Optional target failure should not prevent rule execution
      const metrics = eventRouter.getMetrics('optional-target-rule') as RoutingMetrics;
      expect(metrics.successCount).toBe(1);
      
      // Restore original method
      (eventRouter as any).emitTargetEvent = originalEmitTargetEvent;
    });
  });
});
