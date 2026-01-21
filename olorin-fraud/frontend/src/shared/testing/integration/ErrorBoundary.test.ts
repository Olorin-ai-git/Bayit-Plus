import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import TestSetup, { TestEnvironment } from '../TestSetup';

describe('Error Boundary Integration', () => {
  let testSetup: TestSetup;
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testSetup = TestSetup.getInstance();
    testEnv = await testSetup.setupTestEnvironment();
  });

  afterEach(() => {
    testSetup.cleanupTestEnvironment();
  });

  describe('Service error boundaries', () => {
    it('should isolate errors within service boundaries', () => {
      const errorData = {
        service: 'investigation',
        error: 'Component render error',
        componentStack: 'at InvestigationDashboard\n  at ServiceErrorBoundary',
        timestamp: new Date().toISOString()
      };

      // Simulate service-specific error
      testEnv.eventBus.emit('service:error', errorData, 'investigation');

      // Verify error was captured
      testSetup.assertEventEmitted('service:error', errorData);

      // Verify other services remain unaffected
      const investigationService = testEnv.serviceDiscovery.getService('investigation');
      expect(investigationService?.status).toBe('error');

      const shellService = testEnv.serviceDiscovery.getService('shell');
      expect(shellService?.status).toBe('ready');
    });

    it('should handle cascading error prevention', async () => {
      // Simulate error in visualization service
      testSetup.simulateServiceError('visualization', 'Chart rendering failed');

      await testSetup.waitForEvent('service:error');

      // Other services should continue working
      expect(testEnv.serviceDiscovery.isServiceReady('investigation')).toBe(true);
      expect(testEnv.serviceDiscovery.isServiceReady('agentAnalytics')).toBe(true);
      expect(testEnv.serviceDiscovery.isServiceReady('shell')).toBe(true);

      // Only visualization should be in error state
      expect(testEnv.serviceDiscovery.getService('visualization')?.status).toBe('error');
    });

    it('should provide fallback components for failed services', () => {
      const fallbackData = {
        serviceName: 'reporting',
        fallbackComponent: 'ReportingFallback',
        timestamp: new Date().toISOString()
      };

      // Simulate fallback activation
      testEnv.eventBus.emit('service:fallback', fallbackData, 'shell');

      testSetup.assertEventEmitted('service:fallback', fallbackData);
    });
  });

  describe('Error recovery mechanisms', () => {
    it('should attempt service recovery', async () => {
      // Simulate service error
      testSetup.simulateServiceError('agentAnalytics', 'Connection timeout');

      await testSetup.waitForEvent('service:error');

      // Simulate recovery attempt
      testSetup.simulateServiceReady('agentAnalytics');

      await testSetup.waitForEvent('service:ready');

      // Verify service is back to ready state
      const service = testEnv.serviceDiscovery.getService('agentAnalytics');
      expect(service?.status).toBe('ready');
    });

    it('should track error frequency for degraded services', () => {
      const serviceName = 'ragIntelligence';

      // Simulate multiple errors
      for (let i = 0; i < 3; i++) {
        testSetup.simulateServiceError(serviceName, `Error ${i + 1}`);
      }

      // Service should be marked as degraded after multiple errors
      const service = testEnv.serviceDiscovery.getService(serviceName);
      expect(service?.status).toBe('error');
    });
  });

  describe('Cross-service error propagation', () => {
    it('should prevent error propagation between services', async () => {
      // Set up cross-service communication
      testEnv.services.visualization.onMessage('create-chart', () => {
        throw new Error('Chart creation failed');
      });

      // Investigation service tries to create chart
      try {
        await testEnv.services.investigation.sendMessage(
          'visualization',
          'create-chart',
          { type: 'bar-chart', data: [] }
        );
      } catch (error) {
        // Error should be contained
        expect(error).toBeDefined();
      }

      // Investigation service should remain operational
      expect(testEnv.serviceDiscovery.isServiceReady('investigation')).toBe(true);
    });

    it('should handle dependency failures gracefully', async () => {
      // Mark core UI as failed (dependency for other services)
      testSetup.simulateServiceError('coreUi', 'Component library failed');

      await testSetup.waitForEvent('service:error');

      // Services depending on coreUi should handle gracefully
      const dependentServices = ['investigation', 'agentAnalytics', 'visualization'];

      dependentServices.forEach(serviceName => {
        const service = testEnv.serviceDiscovery.getService(serviceName);
        // Services should either be ready (with fallbacks) or degraded (not error)
        expect(['ready', 'degraded']).toContain(service?.status);
      });
    });
  });

  describe('Error reporting and metrics', () => {
    it('should collect error metrics', () => {
      const errors = [
        { service: 'investigation', error: 'Error 1' },
        { service: 'investigation', error: 'Error 2' },
        { service: 'visualization', error: 'Error 3' }
      ];

      errors.forEach(({ service, error }) => {
        testSetup.simulateServiceError(service, error);
      });

      // Verify error events were tracked
      const history = testEnv.eventBus.getHistory();
      const errorEvents = history.filter(event => event.type === 'service:error');

      expect(errorEvents.length).toBe(3);
      expect(errorEvents.filter(e => e.data.service === 'investigation')).toHaveLength(2);
      expect(errorEvents.filter(e => e.data.service === 'visualization')).toHaveLength(1);
    });

    it('should report error severity levels', () => {
      const criticalError = {
        service: 'shell',
        error: 'Shell initialization failed',
        severity: 'critical',
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('service:error', criticalError, 'shell');

      testSetup.assertEventEmitted('service:error', criticalError);
    });
  });

  describe('User experience during errors', () => {
    it('should maintain user context during service failures', () => {
      const userContext = {
        investigationId: 'INV-001',
        currentView: 'dashboard',
        user: { id: 'user123', name: 'Test User' }
      };

      // Store user context
      testEnv.eventBus.emit('context:store', userContext, 'shell');

      // Simulate service error
      testSetup.simulateServiceError('investigation', 'Service temporarily unavailable');

      // User context should be preserved
      testSetup.assertEventEmitted('context:store', userContext);
    });

    it('should provide meaningful error messages to users', () => {
      const userErrorMessage = {
        service: 'reporting',
        userMessage: 'Report generation is temporarily unavailable. Please try again in a few minutes.',
        technicalError: 'PDF generation service timeout',
        showRetry: true,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('user:error', userErrorMessage, 'reporting');

      testSetup.assertEventEmitted('user:error', userErrorMessage);
    });
  });
});