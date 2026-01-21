import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import TestSetup, { TestEnvironment } from '../TestSetup';

describe('Service Communication Integration', () => {
  let testSetup: TestSetup;
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testSetup = TestSetup.getInstance();
    testEnv = await testSetup.setupTestEnvironment();
  });

  afterEach(() => {
    testSetup.cleanupTestEnvironment();
  });

  describe('Inter-service messaging', () => {
    it('should send and receive messages between services', async () => {
      // Set up message handler for investigation service
      testEnv.services.investigation.onMessage('data-request', async (data) => {
        return { result: 'investigation-data', requestedBy: data.requestedBy };
      });

      // Send message from shell to investigation
      const response = await testEnv.services.shell.sendMessage(
        'investigation',
        'data-request',
        { requestedBy: 'shell', type: 'fraud-cases' }
      );

      expect(response).toEqual({
        result: 'investigation-data',
        requestedBy: 'shell'
      });
    });

    it('should handle message timeouts', async () => {
      // Don't set up any handler for the target service
      await expect(
        testEnv.services.shell.sendMessage(
          'nonexistent',
          'test-message',
          {},
          1000 // 1 second timeout
        )
      ).rejects.toThrow('Request timeout: nonexistent/test-message');
    });

    it('should broadcast messages to all services', async () => {
      const receivedMessages: any[] = [];

      // Set up listeners on multiple services
      testEnv.services.investigation.onMessage('broadcast-test', (data) => {
        receivedMessages.push({ service: 'investigation', data });
      });

      testEnv.services.agentAnalytics.onMessage('broadcast-test', (data) => {
        receivedMessages.push({ service: 'agentAnalytics', data });
      });

      // Wait a bit for listeners to be set up
      await new Promise(resolve => setTimeout(resolve, 50));

      // Broadcast message
      testEnv.services.shell.broadcast('broadcast-test', { message: 'hello-all' });

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages).toContainEqual({
        service: 'investigation',
        data: { message: 'hello-all' }
      });
      expect(receivedMessages).toContainEqual({
        service: 'agentAnalytics',
        data: { message: 'hello-all' }
      });
    });
  });

  describe('Service discovery integration', () => {
    it('should discover all microservices', async () => {
      const services = await testEnv.serviceDiscovery.discoverServices();

      expect(services).toHaveLength(8);
      expect(services.map(s => s.name)).toContain('shell');
      expect(services.map(s => s.name)).toContain('investigation');
      expect(services.map(s => s.name)).toContain('agentAnalytics');
      expect(services.map(s => s.name)).toContain('ragIntelligence');
      expect(services.map(s => s.name)).toContain('visualization');
      expect(services.map(s => s.name)).toContain('reporting');
      expect(services.map(s => s.name)).toContain('coreUi');
      expect(services.map(s => s.name)).toContain('designSystem');
    });

    it('should check service health', async () => {
      const shellService = testEnv.serviceDiscovery.getService('shell');
      expect(shellService).toBeDefined();
      expect(shellService!.status).toBe('ready');
    });
  });

  describe('Health monitoring integration', () => {
    it('should monitor service health', async () => {
      const services = await testEnv.serviceDiscovery.discoverServices();
      testEnv.healthMonitor.startMonitoring(services);

      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 100));

      const healthSummary = testEnv.healthMonitor.getHealthSummary();
      expect(healthSummary.totalServices).toBe(8);
      expect(healthSummary.healthyServices).toBeGreaterThan(0);
    });

    it('should handle service errors', async () => {
      const services = await testEnv.serviceDiscovery.discoverServices();
      testEnv.healthMonitor.startMonitoring(services);

      // Simulate service error
      testSetup.simulateServiceError('investigation', 'Test error');

      // Wait for error processing
      await testSetup.waitForEvent('health:service_error', 2000);

      const activeAlerts = testEnv.healthMonitor.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Error boundary integration', () => {
    it('should emit service error events', () => {
      const errorData = {
        service: 'investigation',
        error: 'Component error',
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('service:error', errorData, 'test');

      testSetup.assertEventEmitted('service:error', errorData);
    });

    it('should handle service ready events', () => {
      const readyData = {
        service: 'investigation',
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('service:ready', readyData, 'test');

      testSetup.assertEventEmitted('service:ready', readyData);
    });
  });

  describe('Module Federation simulation', () => {
    it('should simulate remote module loading', async () => {
      // Mock remote module loading
      const mockInvestigationModule = {
        InvestigationDashboard: () => 'Investigation Dashboard Component'
      };

      // Simulate successful module load
      testSetup.simulateServiceReady('investigation');

      await testSetup.waitForEvent('service:ready');

      // Verify service is ready
      expect(testEnv.serviceDiscovery.isServiceReady('investigation')).toBe(true);
    });

    it('should handle remote module loading failures', async () => {
      // Simulate module loading failure
      testSetup.simulateServiceError('investigation', 'Failed to load remote module');

      const errorEvent = await testSetup.waitForEvent('service:error');
      expect(errorEvent.service).toBe('investigation');
      expect(errorEvent.error).toBe('Failed to load remote module');
    });
  });

  describe('Performance monitoring', () => {
    it('should track event metrics', () => {
      // Emit several events
      testEnv.eventBus.emit('test:event1', {}, 'test');
      testEnv.eventBus.emit('test:event2', {}, 'test');
      testEnv.eventBus.emit('test:event1', {}, 'test'); // Duplicate

      const metrics = testEnv.eventBus.getMetrics();
      expect(metrics['test:event1']).toBe(2);
      expect(metrics['test:event2']).toBe(1);
    });

    it('should track service communication metrics', () => {
      const pendingCount = testEnv.services.shell.getPendingRequestsCount();
      expect(pendingCount).toBe(0);

      // Start a request (don't await to keep it pending)
      testEnv.services.shell.sendMessage('investigation', 'test', {}).catch(() => {
        // Ignore timeout error
      });

      expect(testEnv.services.shell.getPendingRequestsCount()).toBe(1);
    });
  });

  describe('Cross-service data flow', () => {
    it('should support investigation -> analytics -> visualization flow', async () => {
      // Set up handlers for data flow
      testEnv.services.agentAnalytics.onMessage('analyze-data', async (data) => {
        return {
          analysis: 'fraud-pattern-detected',
          confidence: 0.85,
          originalData: data
        };
      });

      testEnv.services.visualization.onMessage('create-chart', async (data) => {
        return {
          chartType: 'network-graph',
          chartData: data.analysis,
          config: { nodes: 10, edges: 15 }
        };
      });

      // Start investigation data flow
      const analysisResult = await testEnv.services.investigation.sendMessage(
        'agentAnalytics',
        'analyze-data',
        { investigationId: 'INV-001', type: 'fraud' }
      );

      expect(analysisResult.analysis).toBe('fraud-pattern-detected');

      // Continue to visualization
      const chartResult = await testEnv.services.investigation.sendMessage(
        'visualization',
        'create-chart',
        analysisResult
      );

      expect(chartResult.chartType).toBe('network-graph');
      expect(chartResult.chartData).toBe('fraud-pattern-detected');
    });
  });
});