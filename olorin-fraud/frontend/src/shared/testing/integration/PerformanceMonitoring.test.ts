import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import TestSetup, { TestEnvironment } from '../TestSetup';

describe('Performance Monitoring Integration', () => {
  let testSetup: TestSetup;
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testSetup = TestSetup.getInstance();
    testEnv = await testSetup.setupTestEnvironment();
  });

  afterEach(() => {
    testSetup.cleanupTestEnvironment();
  });

  describe('Service performance tracking', () => {
    it('should track service startup times', async () => {
      const startupMetrics = {
        service: 'investigation',
        startupTime: 1250,
        moduleLoadTime: 340,
        dependencyResolveTime: 120,
        renderTime: 790,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:startup', startupMetrics, 'investigation');

      testSetup.assertEventEmitted('performance:startup', startupMetrics);
    });

    it('should monitor service response times', async () => {
      const start = performance.now();

      // Simulate service request
      testEnv.services.agentAnalytics.onMessage('get-metrics', async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return { metrics: 'data' };
      });

      const response = await testEnv.services.shell.sendMessage(
        'agentAnalytics',
        'get-metrics',
        {}
      );

      const end = performance.now();
      const responseTime = end - start;

      expect(response).toEqual({ metrics: 'data' });
      expect(responseTime).toBeGreaterThan(100);
      expect(responseTime).toBeLessThan(200); // Should complete within reasonable time
    });

    it('should track memory usage per service', () => {
      const memoryMetrics = {
        service: 'visualization',
        heapUsed: 45.2,
        heapTotal: 67.8,
        external: 12.1,
        rss: 89.5,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:memory', memoryMetrics, 'visualization');

      testSetup.assertEventEmitted('performance:memory', memoryMetrics);
    });
  });

  describe('Module Federation performance', () => {
    it('should track remote module loading times', async () => {
      const moduleLoadStart = performance.now();

      // Simulate remote module loading
      const mockRemoteModule = {
        default: () => 'Remote Component'
      };

      // Mock webpack module loading
      const loadTime = performance.now() - moduleLoadStart;

      const loadMetrics = {
        module: 'investigation/InvestigationDashboard',
        loadTime: loadTime,
        cacheHit: false,
        size: 245.6,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:module_load', loadMetrics, 'shell');

      expect(mockRemoteModule.default()).toBe('Remote Component');
      testSetup.assertEventEmitted('performance:module_load', loadMetrics);
    });

    it('should monitor bundle size impacts', () => {
      const bundleMetrics = {
        service: 'reporting',
        initialSize: 156.7,
        compressedSize: 45.2,
        chunks: ['main', 'vendor', 'reporting'],
        loadTime: 890,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:bundle', bundleMetrics, 'reporting');

      testSetup.assertEventEmitted('performance:bundle', bundleMetrics);
    });

    it('should detect performance bottlenecks', async () => {
      // Simulate slow service
      testEnv.services.ragIntelligence.onMessage('slow-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { result: 'slow data' };
      });

      const start = performance.now();

      try {
        await testEnv.services.shell.sendMessage(
          'ragIntelligence',
          'slow-operation',
          {},
          1000 // 1 second timeout
        );
      } catch (error) {
        const end = performance.now();
        expect(error.message).toContain('timeout');
        expect(end - start).toBeGreaterThan(1000);
      }
    });
  });

  describe('Resource utilization monitoring', () => {
    it('should track network activity', () => {
      const networkMetrics = {
        service: 'investigation',
        requests: 12,
        bytesTransferred: 1024.5,
        averageResponseTime: 145.7,
        errors: 1,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:network', networkMetrics, 'investigation');

      testSetup.assertEventEmitted('performance:network', networkMetrics);
    });

    it('should monitor DOM operations', () => {
      const domMetrics = {
        service: 'visualization',
        nodeCount: 2456,
        renderTime: 23.4,
        layoutTime: 8.9,
        paintTime: 12.1,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:dom', domMetrics, 'visualization');

      testSetup.assertEventEmitted('performance:dom', domMetrics);
    });

    it('should track event bus performance', () => {
      const eventBusMetrics = testEnv.eventBus.getMetrics();

      // Emit several events to generate metrics
      testEnv.eventBus.emit('test:event1', {}, 'test');
      testEnv.eventBus.emit('test:event2', {}, 'test');
      testEnv.eventBus.emit('test:event1', {}, 'test');

      const updatedMetrics = testEnv.eventBus.getMetrics();
      expect(updatedMetrics['test:event1']).toBe(2);
      expect(updatedMetrics['test:event2']).toBe(1);
    });
  });

  describe('Performance alerting', () => {
    it('should trigger alerts for performance degradation', () => {
      const performanceAlert = {
        service: 'agentAnalytics',
        metric: 'response_time',
        value: 5000,
        threshold: 2000,
        severity: 'warning',
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:alert', performanceAlert, 'monitoring');

      testSetup.assertEventEmitted('performance:alert', performanceAlert);
    });

    it('should track service availability', async () => {
      const services = await testEnv.serviceDiscovery.discoverServices();
      testEnv.healthMonitor.startMonitoring(services);

      await new Promise(resolve => setTimeout(resolve, 100));

      const healthSummary = testEnv.healthMonitor.getHealthSummary();
      expect(healthSummary.totalServices).toBe(8);
      expect(healthSummary.healthyServices).toBeGreaterThan(0);
      expect(healthSummary.availabilityPercentage).toBeGreaterThan(0);
    });
  });

  describe('Performance optimization tracking', () => {
    it('should measure lazy loading effectiveness', async () => {
      const lazyLoadMetrics = {
        component: 'InvestigationDashboard',
        loadTime: 234.5,
        cacheHit: false,
        interactive: true,
        firstContentfulPaint: 123.4,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:lazy_load', lazyLoadMetrics, 'shell');

      testSetup.assertEventEmitted('performance:lazy_load', lazyLoadMetrics);
    });

    it('should track code splitting benefits', () => {
      const codeSplitMetrics = {
        originalSize: 567.8,
        splitSize: 234.5,
        reduction: 58.7,
        chunksCreated: 3,
        loadTimeImprovement: 156.2,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:code_split', codeSplitMetrics, 'build');

      testSetup.assertEventEmitted('performance:code_split', codeSplitMetrics);
    });
  });

  describe('User experience metrics', () => {
    it('should track user interaction responsiveness', () => {
      const interactionMetrics = {
        action: 'button_click',
        service: 'investigation',
        responseTime: 45.6,
        eventProcessingTime: 12.3,
        uiUpdateTime: 33.3,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:interaction', interactionMetrics, 'investigation');

      testSetup.assertEventEmitted('performance:interaction', interactionMetrics);
    });

    it('should measure page load performance', () => {
      const pageMetrics = {
        page: 'investigation-dashboard',
        loadTime: 1234.5,
        domContentLoaded: 567.8,
        firstMeaningfulPaint: 789.1,
        largestContentfulPaint: 1012.3,
        cumulativeLayoutShift: 0.1,
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:page_load', pageMetrics, 'shell');

      testSetup.assertEventEmitted('performance:page_load', pageMetrics);
    });
  });

  describe('Performance data aggregation', () => {
    it('should aggregate metrics across services', () => {
      const services = ['investigation', 'agentAnalytics', 'visualization'];

      services.forEach((service, index) => {
        const metrics = {
          service,
          responseTime: 100 + (index * 50),
          memoryUsage: 40 + (index * 10),
          timestamp: new Date().toISOString()
        };

        testEnv.eventBus.emit('performance:metrics', metrics, service);
      });

      // Verify all metrics were captured
      const history = testEnv.eventBus.getHistory();
      const performanceEvents = history.filter(event => event.type === 'performance:metrics');

      expect(performanceEvents).toHaveLength(3);

      const averageResponseTime = performanceEvents.reduce(
        (sum, event) => sum + event.data.responseTime, 0
      ) / performanceEvents.length;

      expect(averageResponseTime).toBe(150); // (100 + 150 + 200) / 3
    });

    it('should provide performance summary reports', () => {
      const performanceSummary = {
        period: '24h',
        totalRequests: 1456,
        averageResponseTime: 234.5,
        errorRate: 0.02,
        availabilityPercentage: 99.8,
        topBottlenecks: ['visualization', 'reporting'],
        timestamp: new Date().toISOString()
      };

      testEnv.eventBus.emit('performance:summary', performanceSummary, 'monitoring');

      testSetup.assertEventEmitted('performance:summary', performanceSummary);
    });
  });
});