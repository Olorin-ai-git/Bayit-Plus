/**
 * Event Bus Integration Tests
 * Tests the core event bus functionality across all microservices
 */

import { EventBusManager, eventBus } from '../../eventBus';
import type { EventBusEvents, AutonomousInvestigation, ManualInvestigation, User, Notification } from '../../eventBus';

describe('EventBus Integration Tests', () => {
  let eventBusManager: EventBusManager;
  let eventHandlers: jest.Mock[];
  let unsubscribeFunctions: (() => void)[];

  beforeEach(() => {
    // Get clean event bus manager instance
    eventBusManager = EventBusManager.getInstance();
    eventHandlers = [];
    unsubscribeFunctions = [];

    // Clear any existing listeners
    (eventBus as any).all.clear();
  });

  afterEach(() => {
    // Clean up all subscriptions
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    eventHandlers.forEach(handler => handler.mockClear());
    
    // Clean up event bus
    eventBusManager.cleanup('test-component');
  });

  describe('Event Subscription and Emission', () => {
    it('should allow subscribing to and emitting events', () => {
      const handler = jest.fn();
      eventHandlers.push(handler);

      const unsubscribe = eventBusManager.subscribe('auto:investigation:started', handler, 'test-component');
      unsubscribeFunctions.push(unsubscribe);

      const investigation: AutonomousInvestigation = {
        id: 'test-investigation-1',
        userId: 'user-123',
        entityType: 'user_id',
        status: 'initializing',
        aiMode: 'balanced',
        created: new Date()
      };

      eventBusManager.emit('auto:investigation:started', { investigation });

      expect(handler).toHaveBeenCalledWith({ investigation });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      eventHandlers.push(handler1, handler2, handler3);

      const unsubscribe1 = eventBusManager.subscribe('ui:notification:show', handler1, 'component-1');
      const unsubscribe2 = eventBusManager.subscribe('ui:notification:show', handler2, 'component-2');
      const unsubscribe3 = eventBusManager.subscribe('ui:notification:show', handler3, 'component-3');
      unsubscribeFunctions.push(unsubscribe1, unsubscribe2, unsubscribe3);

      const notification: Notification = {
        id: 'notification-1',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
        duration: 5000
      };

      eventBusManager.emit('ui:notification:show', { notification });

      expect(handler1).toHaveBeenCalledWith({ notification });
      expect(handler2).toHaveBeenCalledWith({ notification });
      expect(handler3).toHaveBeenCalledWith({ notification });
    });

    it('should handle unsubscription correctly', () => {
      const handler = jest.fn();
      eventHandlers.push(handler);

      const unsubscribe = eventBusManager.subscribe('manual:investigation:started', handler, 'test-component');
      
      // First emission should trigger handler
      eventBusManager.emit('manual:investigation:started', { investigation: {} as ManualInvestigation });
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Second emission should not trigger handler
      eventBusManager.emit('manual:investigation:started', { investigation: {} as ManualInvestigation });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event handlers gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const failingHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });
      const workingHandler = jest.fn();
      eventHandlers.push(failingHandler, workingHandler);

      const unsubscribe1 = eventBusManager.subscribe('agent:execution:started', failingHandler, 'failing-component');
      const unsubscribe2 = eventBusManager.subscribe('agent:execution:started', workingHandler, 'working-component');
      unsubscribeFunctions.push(unsubscribe1, unsubscribe2);

      eventBusManager.emit('agent:execution:started', { agentId: 'agent-1', execution: {} as any });

      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for agent:execution:started'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should emit service error events when handlers fail', () => {
      const errorHandler = jest.fn();
      const failingHandler = jest.fn().mockImplementation(() => {
        throw new Error('Component error');
      });
      eventHandlers.push(errorHandler, failingHandler);

      const unsubscribe1 = eventBusManager.subscribe('service:error', errorHandler, 'error-listener');
      const unsubscribe2 = eventBusManager.subscribe('rag:query:executed', failingHandler, 'failing-rag-component');
      unsubscribeFunctions.push(unsubscribe1, unsubscribe2);

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBusManager.emit('rag:query:executed', { queryId: 'query-1', query: 'test', results: [] });

      expect(errorHandler).toHaveBeenCalledWith({
        service: 'failing-rag-component',
        error: expect.any(Error)
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup all listeners for a component', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      eventHandlers.push(handler1, handler2, handler3);

      eventBusManager.subscribe('auto:investigation:started', handler1, 'test-component');
      eventBusManager.subscribe('auto:investigation:completed', handler2, 'test-component');
      eventBusManager.subscribe('manual:investigation:started', handler3, 'other-component');

      // Cleanup specific component
      eventBusManager.cleanup('test-component');

      // Emit events
      eventBusManager.emit('auto:investigation:started', { investigation: {} as AutonomousInvestigation });
      eventBusManager.emit('auto:investigation:completed', { investigationId: 'inv-1', result: {} });
      eventBusManager.emit('manual:investigation:started', { investigation: {} as ManualInvestigation });

      // Only the other-component handler should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });
  });

  describe('Event Bus Statistics', () => {
    it('should track event bus statistics correctly', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      eventHandlers.push(handler1, handler2, handler3);

      eventBusManager.subscribe('viz:graph:updated', handler1, 'viz-component');
      eventBusManager.subscribe('viz:chart:data:updated', handler2, 'viz-component');
      eventBusManager.subscribe('report:generated', handler3, 'report-component');

      const stats = eventBusManager.getStats();
      
      expect(stats.components).toBe(2);
      expect(stats.listeners).toBe(3);
    });
  });

  describe('Cross-Service Event Flow', () => {
    it('should handle investigation workflow events correctly', () => {
      const autoStartHandler = jest.fn();
      const autoCompleteHandler = jest.fn();
      const reportHandler = jest.fn();
      eventHandlers.push(autoStartHandler, autoCompleteHandler, reportHandler);

      const unsubscribe1 = eventBusManager.subscribe('auto:investigation:started', autoStartHandler, 'auto-service');
      const unsubscribe2 = eventBusManager.subscribe('auto:investigation:completed', autoCompleteHandler, 'auto-service');
      const unsubscribe3 = eventBusManager.subscribe('report:generated', reportHandler, 'report-service');
      unsubscribeFunctions.push(unsubscribe1, unsubscribe2, unsubscribe3);

      // Simulate investigation workflow
      const investigation: AutonomousInvestigation = {
        id: 'workflow-test-1',
        userId: 'user-workflow',
        entityType: 'email',
        status: 'initializing',
        aiMode: 'aggressive',
        created: new Date()
      };

      // Start investigation
      eventBusManager.emit('auto:investigation:started', { investigation });
      expect(autoStartHandler).toHaveBeenCalledWith({ investigation });

      // Complete investigation
      eventBusManager.emit('auto:investigation:completed', {
        investigationId: investigation.id,
        result: { riskScore: 85, verdict: 'high_risk' }
      });
      expect(autoCompleteHandler).toHaveBeenCalledWith({
        investigationId: investigation.id,
        result: { riskScore: 85, verdict: 'high_risk' }
      });

      // Generate report
      eventBusManager.emit('report:generated', {
        reportId: 'report-1',
        type: 'investigation_summary',
        url: '/reports/report-1.pdf'
      });
      expect(reportHandler).toHaveBeenCalledWith({
        reportId: 'report-1',
        type: 'investigation_summary',
        url: '/reports/report-1.pdf'
      });
    });

    it('should handle design system updates across services', () => {
      const uiThemeHandler = jest.fn();
      const vizThemeHandler = jest.fn();
      const designTokenHandler = jest.fn();
      eventHandlers.push(uiThemeHandler, vizThemeHandler, designTokenHandler);

      const unsubscribe1 = eventBusManager.subscribe('ui:theme:changed', uiThemeHandler, 'core-ui');
      const unsubscribe2 = eventBusManager.subscribe('design:tokens:updated', designTokenHandler, 'design-system');
      unsubscribeFunctions.push(unsubscribe1, unsubscribe2);

      // Simulate design token update
      eventBusManager.emit('design:tokens:updated', {
        tokens: {
          colors: { primary: { 500: '#3b82f6' } },
          typography: { fontSize: { base: '1rem' } },
          spacing: { md: '1rem' },
          shadows: { md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
        },
        source: 'figma'
      });

      expect(designTokenHandler).toHaveBeenCalledWith({
        tokens: expect.objectContaining({
          colors: expect.any(Object),
          typography: expect.any(Object),
          spacing: expect.any(Object),
          shadows: expect.any(Object)
        }),
        source: 'figma'
      });

      // Simulate theme change
      eventBusManager.emit('ui:theme:changed', {
        theme: {
          mode: 'dark',
          primaryColor: '#3b82f6',
          customizations: { sidebar: 'collapsed' }
        }
      });

      expect(uiThemeHandler).toHaveBeenCalledWith({
        theme: {
          mode: 'dark',
          primaryColor: '#3b82f6',
          customizations: { sidebar: 'collapsed' }
        }
      });
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks with multiple subscriptions and unsubscriptions', () => {
      const handlers: jest.Mock[] = [];
      const unsubscribers: (() => void)[] = [];

      // Create many subscriptions
      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        
        const unsubscribe = eventBusManager.subscribe(
          'service:health:check',
          handler,
          `component-${i}`
        );
        unsubscribers.push(unsubscribe);
      }

      // Verify subscriptions are working
      eventBusManager.emit('service:health:check', {
        service: 'test-service',
        status: {
          service: 'test-service',
          status: 'healthy',
          latency: 150,
          errorRate: 0,
          lastCheck: new Date()
        }
      });

      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });

      // Unsubscribe all
      unsubscribers.forEach(unsubscribe => unsubscribe());

      // Emit again - no handlers should be called
      eventBusManager.emit('service:health:check', {
        service: 'test-service-2',
        status: {
          service: 'test-service-2',
          status: 'degraded',
          latency: 500,
          errorRate: 5,
          lastCheck: new Date()
        }
      });

      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1); // Still 1 from before
      });

      // Verify stats show no active listeners
      const stats = eventBusManager.getStats();
      expect(stats.listeners).toBe(0);
      expect(stats.components).toBe(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid event emission efficiently', async () => {
      const handler = jest.fn();
      eventHandlers.push(handler);

      const unsubscribe = eventBusManager.subscribe('agent:performance:updated', handler, 'performance-test');
      unsubscribeFunctions.push(unsubscribe);

      const startTime = Date.now();
      const eventCount = 1000;

      // Emit many events rapidly
      for (let i = 0; i < eventCount; i++) {
        eventBusManager.emit('agent:performance:updated', {
          agentId: `agent-${i}`,
          metrics: {
            id: `metrics-${i}`,
            agentId: `agent-${i}`,
            averageExecutionTime: Math.random() * 1000,
            successRate: Math.random() * 100,
            errorRate: Math.random() * 10
          }
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(handler).toHaveBeenCalledTimes(eventCount);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle many concurrent subscriptions efficiently', () => {
      const startTime = Date.now();
      const subscriptionCount = 500;
      const testUnsubscribers: (() => void)[] = [];

      // Create many subscriptions
      for (let i = 0; i < subscriptionCount; i++) {
        const handler = jest.fn();
        const unsubscribe = eventBusManager.subscribe(
          'websocket:message',
          handler,
          `subscription-test-${i}`
        );
        testUnsubscribers.push(unsubscribe);
      }

      const subscriptionTime = Date.now() - startTime;

      // Test emission performance
      const emissionStartTime = Date.now();
      eventBusManager.emit('websocket:message', {
        type: 'performance-test',
        data: { message: 'test message' }
      });
      const emissionTime = Date.now() - emissionStartTime;

      // Cleanup
      testUnsubscribers.forEach(unsubscribe => unsubscribe());

      expect(subscriptionTime).toBeLessThan(500); // Subscriptions should be fast
      expect(emissionTime).toBeLessThan(100); // Emission should be fast even with many listeners
    });
  });
});
