/**
 * T017: Log aggregation test in packages/logging/src/backend/__tests__/log-aggregation.integration.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { LogAggregator } from '../aggregation/LogAggregator';
import { LogLevel, LogDomain } from '../types';

describe('LogAggregator Integration', () => {
  let logAggregator: LogAggregator;

  beforeEach(() => {
    logAggregator = new LogAggregator({
      aggregationInterval: 1000, // 1 second for testing
      batchSize: 10,
      enableMetrics: true,
      enableAlerts: true,
      retentionPeriod: 86400000, // 24 hours
      storageBackend: 'memory' // For testing
    });
  });

  afterEach(() => {
    logAggregator.destroy();
  });

  describe('Log Collection and Aggregation', () => {
    it('should aggregate logs from multiple sources', async () => {
      const mockLogsFromFrontend = [
        {
          id: 'frontend-log-1',
          level: LogLevel.INFO,
          domain: LogDomain.BUSINESS,
          message: 'User action performed',
          context: {
            event: 'USER_ACTION',
            action: 'cv_upload_started',
            userId: 'user-aggregation-test-1',
            component: 'CVUploadDialog'
          },
          source: 'frontend',
          service: 'cvplus-frontend',
          timestamp: Date.now(),
          correlationId: 'correlation-frontend-123'
        },
        {
          id: 'frontend-log-2',
          level: LogLevel.ERROR,
          domain: LogDomain.SYSTEM,
          message: 'API call failed',
          context: {
            event: 'API_ERROR',
            endpoint: '/api/cv/analyze',
            statusCode: 500,
            userId: 'user-aggregation-test-1'
          },
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          },
          source: 'frontend',
          service: 'cvplus-frontend',
          timestamp: Date.now(),
          correlationId: 'correlation-frontend-123'
        }
      ];

      const mockLogsFromBackend = [
        {
          id: 'backend-log-1',
          level: LogLevel.INFO,
          domain: LogDomain.SYSTEM,
          message: 'Firebase Function invoked',
          context: {
            event: 'FUNCTION_INVOKED',
            functionName: 'analyzeCV',
            userId: 'user-aggregation-test-1',
            requestId: 'req-backend-456'
          },
          source: 'firebase_functions',
          service: 'cvplus-functions',
          timestamp: Date.now(),
          correlationId: 'correlation-frontend-123'
        },
        {
          id: 'backend-log-2',
          level: LogLevel.INFO,
          domain: LogDomain.PERFORMANCE,
          message: 'AI service call completed',
          context: {
            event: 'AI_SERVICE_CALL',
            service: 'Anthropic Claude API',
            tokens: 2300,
            cost: 0.115
          },
          performance: {
            duration: 2500
          },
          source: 'firebase_functions',
          service: 'cvplus-functions',
          timestamp: Date.now(),
          correlationId: 'correlation-frontend-123'
        }
      ];

      // Ingest logs from multiple sources
      await logAggregator.ingestLogs('frontend', mockLogsFromFrontend);
      await logAggregator.ingestLogs('firebase_functions', mockLogsFromBackend);

      // Wait for aggregation processing
      await new Promise(resolve => setTimeout(resolve, 1100));

      const aggregatedData = await logAggregator.getAggregatedData({
        timeRange: { start: Date.now() - 60000, end: Date.now() },
        correlationId: 'correlation-frontend-123'
      });

      expect(aggregatedData).toMatchObject({
        totalLogs: 4,
        logsByLevel: {
          [LogLevel.INFO]: 3,
          [LogLevel.ERROR]: 1
        },
        logsByDomain: {
          [LogDomain.BUSINESS]: 1,
          [LogDomain.SYSTEM]: 2,
          [LogDomain.PERFORMANCE]: 1
        },
        logsBySource: {
          'frontend': 2,
          'firebase_functions': 2
        },
        correlationChains: [
          {
            correlationId: 'correlation-frontend-123',
            logCount: 4,
            sources: ['frontend', 'firebase_functions'],
            duration: expect.any(Number)
          }
        ]
      });
    });

    it('should build correlation chains across distributed services', async () => {
      const baseTimestamp = Date.now();
      const correlationId = 'distributed-correlation-456';

      const distributedLogs = [
        {
          id: 'step-1-frontend',
          level: LogLevel.INFO,
          message: 'CV upload initiated',
          context: { event: 'CV_UPLOAD_STARTED', step: 1 },
          source: 'frontend',
          timestamp: baseTimestamp,
          correlationId
        },
        {
          id: 'step-2-functions',
          level: LogLevel.INFO,
          message: 'CV processing started',
          context: { event: 'CV_PROCESSING_STARTED', step: 2 },
          source: 'firebase_functions',
          timestamp: baseTimestamp + 500,
          correlationId
        },
        {
          id: 'step-3-ai-service',
          level: LogLevel.INFO,
          message: 'AI analysis initiated',
          context: { event: 'AI_ANALYSIS_STARTED', step: 3 },
          source: 'ai_service',
          timestamp: baseTimestamp + 1000,
          correlationId
        },
        {
          id: 'step-4-functions',
          level: LogLevel.INFO,
          message: 'CV processing completed',
          context: { event: 'CV_PROCESSING_COMPLETED', step: 4 },
          source: 'firebase_functions',
          timestamp: baseTimestamp + 3500,
          correlationId
        },
        {
          id: 'step-5-frontend',
          level: LogLevel.INFO,
          message: 'CV preview rendered',
          context: { event: 'CV_PREVIEW_RENDERED', step: 5 },
          source: 'frontend',
          timestamp: baseTimestamp + 4000,
          correlationId
        }
      ];

      // Ingest logs from different services with timing
      for (const log of distributedLogs) {
        await logAggregator.ingestLogs(log.source, [log]);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to simulate timing
      }

      await new Promise(resolve => setTimeout(resolve, 1100));

      const correlationChain = await logAggregator.getCorrelationChain(correlationId);

      expect(correlationChain).toMatchObject({
        correlationId,
        totalDuration: 4000,
        logCount: 5,
        services: ['frontend', 'firebase_functions', 'ai_service'],
        timeline: [
          {
            timestamp: baseTimestamp,
            source: 'frontend',
            event: 'CV_UPLOAD_STARTED',
            step: 1
          },
          {
            timestamp: baseTimestamp + 500,
            source: 'firebase_functions',
            event: 'CV_PROCESSING_STARTED',
            step: 2
          },
          {
            timestamp: baseTimestamp + 1000,
            source: 'ai_service',
            event: 'AI_ANALYSIS_STARTED',
            step: 3
          },
          {
            timestamp: baseTimestamp + 3500,
            source: 'firebase_functions',
            event: 'CV_PROCESSING_COMPLETED',
            step: 4
          },
          {
            timestamp: baseTimestamp + 4000,
            source: 'frontend',
            event: 'CV_PREVIEW_RENDERED',
            step: 5
          }
        ]
      });
    });
  });

  describe('Performance Metrics Aggregation', () => {
    it('should calculate performance metrics across services', async () => {
      const performanceLogs = [
        {
          id: 'perf-1',
          level: LogLevel.INFO,
          domain: LogDomain.PERFORMANCE,
          message: 'Frontend page load',
          performance: { duration: 1200 },
          context: { metric: 'page_load_time' },
          source: 'frontend',
          timestamp: Date.now()
        },
        {
          id: 'perf-2',
          level: LogLevel.INFO,
          domain: LogDomain.PERFORMANCE,
          message: 'API response time',
          performance: { duration: 350 },
          context: { metric: 'api_response_time' },
          source: 'firebase_functions',
          timestamp: Date.now()
        },
        {
          id: 'perf-3',
          level: LogLevel.INFO,
          domain: LogDomain.PERFORMANCE,
          message: 'Database query',
          performance: { duration: 85 },
          context: { metric: 'database_query_time' },
          source: 'firebase_functions',
          timestamp: Date.now()
        },
        {
          id: 'perf-4',
          level: LogLevel.WARN,
          domain: LogDomain.PERFORMANCE,
          message: 'Slow AI processing',
          performance: { duration: 8500 },
          context: { metric: 'ai_processing_time' },
          source: 'ai_service',
          timestamp: Date.now()
        }
      ];

      await logAggregator.ingestLogs('mixed', performanceLogs);
      await new Promise(resolve => setTimeout(resolve, 1100));

      const performanceMetrics = await logAggregator.getPerformanceMetrics({
        timeRange: { start: Date.now() - 60000, end: Date.now() }
      });

      expect(performanceMetrics).toMatchObject({
        averageResponseTimes: {
          frontend: expect.closeTo(1200, 10),
          firebase_functions: expect.closeTo(217.5, 10), // (350 + 85) / 2
          ai_service: expect.closeTo(8500, 10)
        },
        responseTimePercentiles: {
          p50: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number)
        },
        slowOperations: [
          {
            source: 'ai_service',
            duration: 8500,
            message: 'Slow AI processing'
          }
        ],
        performanceAlerts: expect.arrayContaining([
          expect.objectContaining({
            type: 'slow_operation',
            threshold: expect.any(Number),
            actualValue: 8500
          })
        ])
      });
    });

    it('should detect performance anomalies and trends', async () => {
      // Generate baseline performance data
      const baselineLogs = Array.from({ length: 20 }, (_, i) => ({
        id: `baseline-${i}`,
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'Normal operation',
        performance: { duration: 200 + Math.random() * 50 }, // 200-250ms baseline
        context: { operation: 'cv_analysis' },
        source: 'firebase_functions',
        timestamp: Date.now() - (20 - i) * 60000 // Spread over 20 minutes
      }));

      // Generate anomaly data
      const anomalyLogs = [
        {
          id: 'anomaly-1',
          level: LogLevel.WARN,
          domain: LogDomain.PERFORMANCE,
          message: 'Performance degradation detected',
          performance: { duration: 2500 }, // 10x slower than baseline
          context: { operation: 'cv_analysis' },
          source: 'firebase_functions',
          timestamp: Date.now()
        }
      ];

      await logAggregator.ingestLogs('baseline', baselineLogs);
      await logAggregator.ingestLogs('anomaly', anomalyLogs);
      await new Promise(resolve => setTimeout(resolve, 1100));

      const anomalyDetection = await logAggregator.detectAnomalies({
        operation: 'cv_analysis',
        source: 'firebase_functions',
        timeRange: { start: Date.now() - 3600000, end: Date.now() }
      });

      expect(anomalyDetection).toMatchObject({
        anomaliesDetected: true,
        baselinePerformance: {
          average: expect.closeTo(225, 25), // Around 200-250ms
          standardDeviation: expect.any(Number)
        },
        anomalies: [
          {
            timestamp: expect.any(Number),
            duration: 2500,
            deviationFromBaseline: expect.any(Number),
            severity: 'high'
          }
        ],
        recommendation: 'investigate_performance_regression'
      });
    });
  });

  describe('Error Tracking and Analysis', () => {
    it('should aggregate and categorize errors across services', async () => {
      const errorLogs = [
        {
          id: 'error-1',
          level: LogLevel.ERROR,
          domain: LogDomain.SYSTEM,
          message: 'Database connection failed',
          error: {
            message: 'Connection timeout',
            code: 'DB_CONNECTION_TIMEOUT',
            stack: 'Error at database.connect()'
          },
          context: { errorCategory: 'database_error' },
          source: 'firebase_functions',
          timestamp: Date.now()
        },
        {
          id: 'error-2',
          level: LogLevel.ERROR,
          domain: LogDomain.SYSTEM,
          message: 'AI service rate limited',
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED'
          },
          context: { errorCategory: 'external_service_error' },
          source: 'ai_service',
          timestamp: Date.now()
        },
        {
          id: 'error-3',
          level: LogLevel.ERROR,
          domain: LogDomain.SYSTEM,
          message: 'Component render failed',
          error: {
            message: 'Cannot read property of undefined',
            code: 'RUNTIME_ERROR',
            stack: 'Error at CVPreview.render()'
          },
          context: { errorCategory: 'frontend_error' },
          source: 'frontend',
          timestamp: Date.now()
        }
      ];

      await logAggregator.ingestLogs('errors', errorLogs);
      await new Promise(resolve => setTimeout(resolve, 1100));

      const errorAnalysis = await logAggregator.getErrorAnalysis({
        timeRange: { start: Date.now() - 60000, end: Date.now() }
      });

      expect(errorAnalysis).toMatchObject({
        totalErrors: 3,
        errorsByCategory: {
          'database_error': 1,
          'external_service_error': 1,
          'frontend_error': 1
        },
        errorsBySource: {
          'firebase_functions': 1,
          'ai_service': 1,
          'frontend': 1
        },
        topErrors: [
          {
            code: 'DB_CONNECTION_TIMEOUT',
            count: 1,
            message: 'Database connection failed',
            lastOccurrence: expect.any(Number)
          },
          {
            code: 'RATE_LIMIT_EXCEEDED',
            count: 1,
            message: 'AI service rate limited',
            lastOccurrence: expect.any(Number)
          },
          {
            code: 'RUNTIME_ERROR',
            count: 1,
            message: 'Component render failed',
            lastOccurrence: expect.any(Number)
          }
        ],
        errorRate: expect.any(Number)
      });
    });

    it('should track error patterns and suggest remediation', async () => {
      // Generate recurring error pattern
      const recurringErrors = Array.from({ length: 5 }, (_, i) => ({
        id: `recurring-error-${i}`,
        level: LogLevel.ERROR,
        domain: LogDomain.SYSTEM,
        message: 'AI service temporarily unavailable',
        error: {
          message: 'Service timeout',
          code: 'AI_SERVICE_TIMEOUT'
        },
        context: {
          errorCategory: 'external_service_error',
          retryAttempt: i + 1
        },
        source: 'ai_service',
        timestamp: Date.now() - (5 - i) * 300000 // Every 5 minutes over 25 minutes
      }));

      await logAggregator.ingestLogs('recurring', recurringErrors);
      await new Promise(resolve => setTimeout(resolve, 1100));

      const errorPatterns = await logAggregator.analyzeErrorPatterns({
        timeRange: { start: Date.now() - 3600000, end: Date.now() },
        minOccurrences: 3
      });

      expect(errorPatterns).toMatchObject({
        patterns: [
          {
            errorCode: 'AI_SERVICE_TIMEOUT',
            occurrences: 5,
            frequency: 'high',
            pattern: 'recurring',
            timeSpan: expect.any(Number),
            affectedServices: ['ai_service'],
            remediation: {
              priority: 'high',
              suggestions: [
                'implement_circuit_breaker',
                'increase_timeout_threshold',
                'add_service_health_check',
                'implement_fallback_strategy'
              ]
            }
          }
        ],
        overallHealthScore: expect.any(Number)
      });
    });
  });

  describe('Real-time Monitoring and Alerts', () => {
    it('should trigger alerts for critical system events', async () => {
      const alertCallbacks: any[] = [];
      logAggregator.onAlert((alert) => {
        alertCallbacks.push(alert);
      });

      const criticalLogs = [
        {
          id: 'critical-1',
          level: LogLevel.ERROR,
          domain: LogDomain.SECURITY,
          message: 'Multiple failed login attempts detected',
          context: {
            event: 'SECURITY_THREAT',
            threatType: 'brute_force_attack',
            severity: 'critical',
            ipAddress: '192.168.1.200',
            attemptCount: 15
          },
          source: 'auth_service',
          timestamp: Date.now()
        },
        {
          id: 'critical-2',
          level: LogLevel.ERROR,
          domain: LogDomain.SYSTEM,
          message: 'System memory usage critical',
          context: {
            event: 'RESOURCE_CRITICAL',
            resourceType: 'memory',
            currentUsage: 0.95, // 95%
            threshold: 0.85 // 85%
          },
          source: 'firebase_functions',
          timestamp: Date.now()
        }
      ];

      await logAggregator.ingestLogs('critical', criticalLogs);
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(alertCallbacks).toHaveLength(2);
      expect(alertCallbacks[0]).toMatchObject({
        type: 'security_threat',
        severity: 'critical',
        message: 'Multiple failed login attempts detected',
        source: 'auth_service',
        metadata: {
          threatType: 'brute_force_attack',
          attemptCount: 15
        }
      });

      expect(alertCallbacks[1]).toMatchObject({
        type: 'resource_critical',
        severity: 'critical',
        message: 'System memory usage critical',
        source: 'firebase_functions',
        metadata: {
          resourceType: 'memory',
          currentUsage: 0.95,
          threshold: 0.85
        }
      });
    });
  });

  describe('Data Retention and Cleanup', () => {
    it('should automatically clean up old logs based on retention policy', async () => {
      const currentTime = Date.now();
      const oldLogs = [
        {
          id: 'old-log-1',
          level: LogLevel.INFO,
          message: 'Old log entry',
          context: { test: 'retention' },
          source: 'test',
          timestamp: currentTime - 172800000 // 48 hours ago (beyond 24h retention)
        }
      ];

      const recentLogs = [
        {
          id: 'recent-log-1',
          level: LogLevel.INFO,
          message: 'Recent log entry',
          context: { test: 'retention' },
          source: 'test',
          timestamp: currentTime - 3600000 // 1 hour ago (within 24h retention)
        }
      ];

      await logAggregator.ingestLogs('retention_test', [...oldLogs, ...recentLogs]);
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Manually trigger cleanup for testing
      await logAggregator.runRetentionCleanup();

      const remainingLogs = await logAggregator.getAggregatedData({
        timeRange: { start: currentTime - 604800000, end: currentTime } // Last week
      });

      expect(remainingLogs.totalLogs).toBe(1);
      expect(remainingLogs.logs?.[0]?.id).toBe('recent-log-1');
    });
  });
});