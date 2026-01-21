/**
 * Video Monitoring System Tests
 * 
 * Comprehensive test suite for the video generation monitoring and analytics system.
 * Tests performance monitoring, analytics engine, alert manager, and dashboard functionality.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { PerformanceMonitorService, VideoGenerationMetrics } from '../services/performance-monitor.service';
import { AnalyticsEngineService, BusinessMetrics } from '../services/analytics-engine.service';
import { AlertManagerService } from '../services/alert-manager.service';
import { VideoMonitoringHooks, VideoGenerationMonitor } from '../services/video-monitoring-hooks.service';
import { VideoGenerationOptions, VideoGenerationResult } from '../services/video-providers/base-provider.interface';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(() => ({ exists: true, data: () => ({}) })),
        update: jest.fn()
      })),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => ({ docs: [], empty: true }))
        })),
        get: jest.fn(() => ({ docs: [], empty: true }))
      })),
      add: jest.fn(),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(() => ({ docs: [] }))
        }))
      }))
    })),
    FieldValue: {
      arrayUnion: jest.fn(),
      serverTimestamp: jest.fn()
    }
  }),
  auth: () => ({
    verifyIdToken: jest.fn()
  })
}));

describe('Video Monitoring System', () => {
  let performanceMonitor: PerformanceMonitorService;
  let analyticsEngine: AnalyticsEngineService;
  let alertManager: AlertManagerService;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitorService();
    analyticsEngine = new AnalyticsEngineService();
    alertManager = new AlertManagerService();
  });

  describe('Performance Monitor Service', () => {
    test('should record video generation metrics', async () => {
      const generationId = 'test_gen_123';
      const userId = 'user_123';
      const jobId = 'job_123';
      const providerId = 'heygen';
      const options: VideoGenerationOptions = {
        duration: 60,
        resolution: '1920x1080',
        format: 'mp4',
        features: ['subtitles']
      };

      await expect(
        performanceMonitor.recordGenerationMetrics(
          generationId,
          userId,
          jobId,
          providerId,
          options
        )
      ).resolves.not.toThrow();
    });

    test('should update generation metrics with completion data', async () => {
      const generationId = 'test_gen_123';
      const result: VideoGenerationResult = {
        success: true,
        videoUrl: 'https://example.com/video.mp4',
        qualityScore: 8.5,
        metadata: {
          providerId: 'heygen',
          duration: 60,
          size: 1024000
        }
      };

      // First record the generation
      await performanceMonitor.recordGenerationMetrics(
        generationId,
        'user_123',
        'job_123',
        'heygen',
        { duration: 60 }
      );

      await expect(
        performanceMonitor.updateGenerationMetrics(generationId, result)
      ).resolves.not.toThrow();
    });

    test('should calculate system metrics', async () => {
      const metrics = await performanceMonitor.calculateSystemMetrics('1h');

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('period', '1h');
      expect(metrics).toHaveProperty('totalGenerations');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('averageGenerationTime');
      expect(metrics).toHaveProperty('providerMetrics');
    });

    test('should get performance trends', async () => {
      const trends = await performanceMonitor.getPerformanceTrends(24, '1h');
      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('Analytics Engine Service', () => {
    test('should generate business metrics', async () => {
      const businessMetrics = await analyticsEngine.generateBusinessMetrics('24h');

      expect(businessMetrics).toHaveProperty('timestamp');
      expect(businessMetrics).toHaveProperty('period', '24h');
      expect(businessMetrics).toHaveProperty('totalRevenue');
      expect(businessMetrics).toHaveProperty('conversionRates');
      expect(businessMetrics).toHaveProperty('userMetrics');
      expect(businessMetrics).toHaveProperty('videoMetrics');
    });

    test('should analyze trends', async () => {
      const trendAnalysis = await analyticsEngine.analyzeTrends('success_rate', '30d');

      expect(trendAnalysis).toHaveProperty('metric', 'success_rate');
      expect(trendAnalysis).toHaveProperty('period', '30d');
      expect(trendAnalysis).toHaveProperty('trend');
      expect(trendAnalysis).toHaveProperty('changePercentage');
      expect(trendAnalysis).toHaveProperty('forecast');
    });

    test('should generate user behavior insights', async () => {
      const userInsights = await analyticsEngine.generateUserBehaviorInsights();

      expect(userInsights).toHaveProperty('timestamp');
      expect(userInsights).toHaveProperty('sessionPatterns');
      expect(userInsights).toHaveProperty('engagement');
      expect(userInsights).toHaveProperty('predictions');
      expect(userInsights).toHaveProperty('segments');
    });

    test('should generate quality insights', async () => {
      const qualityInsights = await analyticsEngine.generateQualityInsights('24h');

      expect(qualityInsights).toHaveProperty('timestamp');
      expect(qualityInsights).toHaveProperty('period', '24h');
      expect(qualityInsights).toHaveProperty('overallQualityScore');
      expect(qualityInsights).toHaveProperty('qualityTrend');
      expect(qualityInsights).toHaveProperty('providerQuality');
    });

    test('should get analytics summary', async () => {
      const summary = await analyticsEngine.getAnalyticsSummary();

      expect(summary).toHaveProperty('performance');
      expect(summary).toHaveProperty('business');
      expect(summary).toHaveProperty('quality');
      expect(summary).toHaveProperty('userInsights');
    });
  });

  describe('Alert Manager Service', () => {
    test('should check alerts against metrics', async () => {
      const metrics = {
        performance: {
          successRate: 0.90, // Below 95% threshold
          averageGenerationTime: 95000, // Above 90s threshold
          errorRate: 0.08 // Above 5% threshold
        }
      };

      const triggeredAlerts = await alertManager.checkAlerts(metrics);
      expect(Array.isArray(triggeredAlerts)).toBe(true);
    });

    test('should process escalations', async () => {
      await expect(alertManager.processEscalations()).resolves.not.toThrow();
    });

    test('should acknowledge alerts', async () => {
      const alertId = 'test_alert_123';
      const acknowledgedBy = 'admin_user';

      await expect(
        alertManager.acknowledgeAlert(alertId, acknowledgedBy)
      ).resolves.not.toThrow();
    });

    test('should resolve alerts', async () => {
      const alertId = 'test_alert_123';
      const resolvedBy = 'admin_user';
      const resolution = 'Issue fixed by system optimization';

      await expect(
        alertManager.resolveAlert(alertId, resolvedBy, resolution)
      ).resolves.not.toThrow();
    });

    test('should get alert dashboard data', async () => {
      const dashboardData = await alertManager.getAlertDashboard();

      expect(dashboardData).toHaveProperty('activeAlerts');
      expect(dashboardData).toHaveProperty('alertSummary');
      expect(dashboardData).toHaveProperty('recentHistory');
      expect(Array.isArray(dashboardData.activeAlerts)).toBe(true);
    });
  });

  describe('Video Monitoring Hooks', () => {
    test('should handle generation start hook', async () => {
      const options: VideoGenerationOptions = {
        duration: 60,
        resolution: '1920x1080',
        format: 'mp4'
      };

      await expect(
        VideoMonitoringHooks.onGenerationStart(
          'gen_123',
          'user_123',
          'job_123',
          'heygen',
          options
        )
      ).resolves.not.toThrow();
    });

    test('should handle generation complete hook', async () => {
      const result: VideoGenerationResult = {
        success: true,
        videoUrl: 'https://example.com/video.mp4',
        qualityScore: 8.5
      };

      await expect(
        VideoMonitoringHooks.onGenerationComplete('gen_123', result)
      ).resolves.not.toThrow();
    });

    test('should handle provider switch hook', async () => {
      await expect(
        VideoMonitoringHooks.onProviderSwitch(
          'gen_123',
          'heygen',
          'runwayml',
          'heygen_failure'
        )
      ).resolves.not.toThrow();
    });

    test('should handle error hook', async () => {
      const error = {
        type: 'api_error',
        message: 'Provider API returned error'
      };

      await expect(
        VideoMonitoringHooks.onError('gen_123', error, 'heygen', 'retry_attempted')
      ).resolves.not.toThrow();
    });

    test('should handle quality assessment hook', async () => {
      const qualityFactors = {
        scriptQuality: 8.5,
        videoProduction: 9.0,
        audioQuality: 8.8
      };

      await expect(
        VideoMonitoringHooks.onQualityAssessment('gen_123', 8.7, qualityFactors)
      ).resolves.not.toThrow();
    });

    test('should handle user feedback hook', async () => {
      await expect(
        VideoMonitoringHooks.onUserFeedback(
          'gen_123',
          'user_123',
          4.5,
          'Great video quality!'
        )
      ).resolves.not.toThrow();
    });

    test('should get monitoring status', async () => {
      const status = await VideoMonitoringHooks.getStatus();

      expect(status).toHaveProperty('activeGenerations');
      expect(status).toHaveProperty('systemHealth');
      expect(status).toHaveProperty('recentAlerts');
      expect(typeof status.activeGenerations).toBe('number');
    });

    test('should generate unique generation IDs', () => {
      const id1 = VideoMonitoringHooks.generateGenerationId('user1', 'job1');
      const id2 = VideoMonitoringHooks.generateGenerationId('user1', 'job1');

      expect(id1).toMatch(/^video_gen_user1_job1_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^video_gen_user1_job1_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2); // Should be unique
    });
  });

  describe('Video Generation Monitor', () => {
    let monitor: VideoGenerationMonitor;

    beforeEach(() => {
      monitor = new VideoGenerationMonitor('user_123', 'job_123', 'heygen');
    });

    test('should create monitor with valid generation ID', () => {
      const generationId = monitor.getGenerationId();
      expect(generationId).toMatch(/^video_gen_user_123_job_123_\d+_[a-z0-9]+$/);
    });

    test('should start monitoring', async () => {
      const options: VideoGenerationOptions = {
        duration: 60,
        resolution: '1920x1080',
        format: 'mp4'
      };

      await expect(monitor.start(options)).resolves.not.toThrow();
    });

    test('should complete monitoring', async () => {
      const result: VideoGenerationResult = {
        success: true,
        videoUrl: 'https://example.com/video.mp4'
      };

      await expect(monitor.complete(result)).resolves.not.toThrow();
    });

    test('should record provider switch', async () => {
      await expect(
        monitor.switchProvider('runwayml', 'heygen_unavailable')
      ).resolves.not.toThrow();
    });

    test('should record error', async () => {
      const error = new Error('Test error');
      await expect(
        monitor.recordError(error, 'retry_scheduled')
      ).resolves.not.toThrow();
    });

    test('should record quality assessment', async () => {
      const qualityFactors = { scriptQuality: 8.5, videoQuality: 9.0 };
      await expect(
        monitor.recordQuality(8.7, qualityFactors)
      ).resolves.not.toThrow();
    });

    test('should calculate generation duration', () => {
      const duration = monitor.getDuration();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete video generation lifecycle', async () => {
      const monitor = new VideoGenerationMonitor('user_123', 'job_123', 'heygen');

      // Start monitoring
      const options: VideoGenerationOptions = {
        duration: 60,
        resolution: '1920x1080',
        format: 'mp4',
        features: ['subtitles', 'name_card']
      };

      await monitor.start(options);

      // Simulate provider switch
      await monitor.switchProvider('runwayml', 'heygen_timeout');

      // Record quality assessment
      await monitor.recordQuality(8.5, {
        scriptQuality: 8.0,
        videoProduction: 9.0
      });

      // Complete successfully
      const result: VideoGenerationResult = {
        success: true,
        videoUrl: 'https://example.com/video.mp4',
        qualityScore: 8.5,
        metadata: {
          providerId: 'runwayml',
          duration: 60,
          size: 2048000
        }
      };

      await monitor.complete(result);

      // Verify generation ID is valid
      expect(monitor.getGenerationId()).toMatch(/^video_gen_/);
      expect(monitor.getDuration()).toBeGreaterThanOrEqual(0);
    });

    test('should handle error scenarios gracefully', async () => {
      const monitor = new VideoGenerationMonitor('user_123', 'job_123', 'heygen');

      await monitor.start({ duration: 60 });

      // Record error
      const error = new Error('Provider API failure');
      await monitor.recordError(error, 'attempting_fallback');

      // Switch provider
      await monitor.switchProvider('runwayml', 'heygen_failure');

      // Complete with failure
      const result: VideoGenerationResult = {
        success: false,
        error: {
          type: 'api_error',
          message: 'All providers failed'
        }
      };

      await expect(monitor.complete(result)).resolves.not.toThrow();
    });

    test('should trigger manual metrics calculation', async () => {
      await expect(
        VideoMonitoringHooks.triggerMetricsCalculation()
      ).resolves.not.toThrow();
    });

    test('should trigger manual alert check', async () => {
      await expect(
        VideoMonitoringHooks.triggerAlertCheck()
      ).resolves.not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent generations', async () => {
      const monitors = Array.from({ length: 10 }, (_, i) =>
        new VideoGenerationMonitor(`user_${i}`, `job_${i}`, 'heygen')
      );

      const startPromises = monitors.map(monitor =>
        monitor.start({ duration: 60 })
      );

      await expect(Promise.all(startPromises)).resolves.not.toThrow();

      const completePromises = monitors.map(monitor =>
        monitor.complete({ success: true, videoUrl: 'https://example.com/video.mp4' })
      );

      await expect(Promise.all(completePromises)).resolves.not.toThrow();
    });

    test('should handle large metrics datasets', async () => {
      // Simulate calculating metrics for large dataset
      const metrics = await performanceMonitor.calculateSystemMetrics('24h');
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalGenerations).toBe('number');
    });
  });
});

/**
 * Test Configuration and Setup
 */
describe('Monitoring System Configuration', () => {
  test('should enable and disable monitoring', () => {
    VideoMonitoringHooks.setMonitoringEnabled(false);
    VideoMonitoringHooks.setMonitoringEnabled(true);
    // Should not throw errors
  });

  test('should collect resource usage safely', () => {
    const resourceUsage = VideoMonitoringHooks.collectResourceUsage();
    
    expect(resourceUsage).toHaveProperty('cpuUsage');
    expect(resourceUsage).toHaveProperty('memoryUsage');
    expect(resourceUsage).toHaveProperty('networkLatency');
    expect(resourceUsage).toHaveProperty('timestamp');
    expect(typeof resourceUsage.cpuUsage).toBe('number');
    expect(typeof resourceUsage.memoryUsage).toBe('number');
  });
});

/**
 * Performance Benchmarks
 */
describe('Performance Benchmarks', () => {
  test('should complete monitoring operations within time limits', async () => {
    const startTime = Date.now();
    
    const monitor = new VideoGenerationMonitor('user_123', 'job_123', 'heygen');
    await monitor.start({ duration: 60 });
    await monitor.complete({ success: true, videoUrl: 'test.mp4' });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  test('should handle monitoring operations under load', async () => {
    const operations = Array.from({ length: 100 }, async (_, i) => {
      const monitor = new VideoGenerationMonitor(`user_${i}`, `job_${i}`, 'heygen');
      await monitor.start({ duration: 60 });
      return monitor.complete({ success: true, videoUrl: 'test.mp4' });
    });

    const startTime = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // Should complete 100 operations within 5 seconds
  });
});