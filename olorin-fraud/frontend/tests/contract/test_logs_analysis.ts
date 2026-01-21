/**
 * Contract Test: POST /api/logs
 *
 * Tests the logs analysis agent endpoint via POST.
 * This test verifies the contract between frontend and backend for logs analysis requests.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { LogsAnalysisRequest, LogsAnalysisResponse } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: POST /api/logs', () => {
  const validLogsRequest: LogsAnalysisRequest = {
    investigationId: 'inv_12345',
    stepId: 'step_logs_001',
    userId: 'user_789',
    timeRange: {
      startTime: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
      endTime: new Date().toISOString()
    },
    logSources: ['auth-service', 'api-gateway', 'user-service'],
    searchCriteria: {
      keywords: ['login', 'failed', 'suspicious'],
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      eventTypes: ['authentication', 'authorization', 'access'],
      severity: ['warning', 'error', 'critical']
    },
    analysisOptions: {
      includePatternAnalysis: true,
      includeAnomalyDetection: true,
      includeTimelineAnalysis: true,
      maxLogEntries: 10000
    },
    metadata: {
      requestedBy: 'analyst_456',
      priority: 'high',
      correlationId: 'corr_123abc'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Logs Analysis', () => {
    it('should analyze logs and return comprehensive results', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, validLogsRequest);

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const analysis: LogsAnalysisResponse = response.data;

        // Required field validations
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('investigationId', validLogsRequest.investigationId);
        expect(analysis).toHaveProperty('stepId', validLogsRequest.stepId);
        expect(analysis).toHaveProperty('agentType', 'logs');
        expect(analysis).toHaveProperty('status');
        expect(analysis).toHaveProperty('createdAt');

        // Analysis results validation
        expect(analysis).toHaveProperty('analysis');
        expect(typeof analysis.analysis).toBe('object');

        const logsAnalysis = analysis.analysis;

        // Summary statistics validation
        expect(logsAnalysis).toHaveProperty('summary');
        expect(typeof logsAnalysis.summary).toBe('object');

        const summary = logsAnalysis.summary;
        expect(summary).toHaveProperty('totalLogsProcessed');
        expect(typeof summary.totalLogsProcessed).toBe('number');
        expect(summary).toHaveProperty('timeRangeAnalyzed');
        expect(summary).toHaveProperty('sourcesAnalyzed');
        expect(Array.isArray(summary.sourcesAnalyzed)).toBe(true);

        // Pattern analysis validation
        expect(logsAnalysis).toHaveProperty('patternAnalysis');
        expect(typeof logsAnalysis.patternAnalysis).toBe('object');

        const patterns = logsAnalysis.patternAnalysis;
        expect(patterns).toHaveProperty('frequentPatterns');
        expect(Array.isArray(patterns.frequentPatterns)).toBe(true);
        expect(patterns).toHaveProperty('suspiciousPatterns');
        expect(Array.isArray(patterns.suspiciousPatterns)).toBe(true);

        if (patterns.frequentPatterns.length > 0) {
          patterns.frequentPatterns.forEach(pattern => {
            expect(pattern).toHaveProperty('pattern');
            expect(pattern).toHaveProperty('count');
            expect(pattern).toHaveProperty('frequency');
            expect(typeof pattern.count).toBe('number');
            expect(typeof pattern.frequency).toBe('number');
          });
        }

        // Anomaly detection validation
        expect(logsAnalysis).toHaveProperty('anomalyDetection');
        expect(typeof logsAnalysis.anomalyDetection).toBe('object');

        const anomalies = logsAnalysis.anomalyDetection;
        expect(anomalies).toHaveProperty('anomalies');
        expect(Array.isArray(anomalies.anomalies)).toBe(true);
        expect(anomalies).toHaveProperty('anomalyScore');
        expect(typeof anomalies.anomalyScore).toBe('number');
        expect(anomalies.anomalyScore).toBeGreaterThanOrEqual(0);
        expect(anomalies.anomalyScore).toBeLessThanOrEqual(1);

        // Timeline analysis validation
        expect(logsAnalysis).toHaveProperty('timelineAnalysis');
        expect(typeof logsAnalysis.timelineAnalysis).toBe('object');

        const timeline = logsAnalysis.timelineAnalysis;
        expect(timeline).toHaveProperty('events');
        expect(Array.isArray(timeline.events)).toBe(true);
        expect(timeline).toHaveProperty('timeDistribution');

        // Security insights validation
        expect(logsAnalysis).toHaveProperty('securityInsights');
        expect(typeof logsAnalysis.securityInsights).toBe('object');

        const security = logsAnalysis.securityInsights;
        expect(security).toHaveProperty('threatIndicators');
        expect(Array.isArray(security.threatIndicators)).toBe(true);
        expect(security).toHaveProperty('riskScore');
        expect(typeof security.riskScore).toBe('number');
        expect(security.riskScore).toBeGreaterThanOrEqual(0);
        expect(security.riskScore).toBeLessThanOrEqual(1);

        // Overall risk assessment
        expect(logsAnalysis).toHaveProperty('overallRiskScore');
        expect(typeof logsAnalysis.overallRiskScore).toBe('number');
        expect(logsAnalysis.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(logsAnalysis.overallRiskScore).toBeLessThanOrEqual(1);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Logs analysis endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should detect authentication failure patterns', async () => {
      const authFailureRequest = {
        ...validLogsRequest,
        searchCriteria: {
          ...validLogsRequest.searchCriteria,
          keywords: ['login failed', 'authentication error', 'invalid credentials'],
          eventTypes: ['authentication_failure']
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, authFailureRequest);

        expect(response.status).toBe(200);
        const analysis: LogsAnalysisResponse = response.data;

        // Should detect authentication-related patterns
        const patterns = analysis.analysis.patternAnalysis;
        const authPatterns = patterns.suspiciousPatterns.filter(pattern =>
          pattern.pattern.toLowerCase().includes('auth') ||
          pattern.pattern.toLowerCase().includes('login') ||
          pattern.pattern.toLowerCase().includes('fail')
        );

        expect(authPatterns.length).toBeGreaterThan(0);

        // Should flag as higher risk for auth failures
        expect(analysis.analysis.securityInsights.riskScore).toBeGreaterThan(0.3);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Authentication failure pattern detection failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should identify brute force attack patterns', async () => {
      const bruteForceRequest = {
        ...validLogsRequest,
        searchCriteria: {
          ...validLogsRequest.searchCriteria,
          keywords: ['repeated login attempts', 'rate limit', 'blocked'],
          ipAddress: '192.168.1.100'
        },
        analysisOptions: {
          ...validLogsRequest.analysisOptions,
          includeVelocityAnalysis: true
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, bruteForceRequest);

        expect(response.status).toBe(200);
        const analysis: LogsAnalysisResponse = response.data;

        // Should detect high-frequency patterns
        expect(analysis.analysis.anomalyDetection.anomalyScore).toBeGreaterThan(0.5);

        // Should identify brute force indicators
        const threatIndicators = analysis.analysis.securityInsights.threatIndicators;
        expect(threatIndicators.some(indicator =>
          indicator.toLowerCase().includes('brute') ||
          indicator.toLowerCase().includes('repeated') ||
          indicator.toLowerCase().includes('velocity')
        )).toBe(true);

        // Should assign high risk score
        expect(analysis.analysis.overallRiskScore).toBeGreaterThan(0.7);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Brute force detection test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should analyze temporal patterns in log data', async () => {
      const temporalRequest = {
        ...validLogsRequest,
        timeRange: {
          startTime: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
          endTime: new Date().toISOString()
        },
        analysisOptions: {
          ...validLogsRequest.analysisOptions,
          includeTimelineAnalysis: true,
          temporalGranularity: 'hourly'
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, temporalRequest);

        expect(response.status).toBe(200);
        const analysis: LogsAnalysisResponse = response.data;

        const timeline = analysis.analysis.timelineAnalysis;

        // Should have temporal distribution data
        expect(timeline.timeDistribution).toBeDefined();
        expect(typeof timeline.timeDistribution).toBe('object');

        // Should identify peak activity periods
        if (timeline.peakActivityPeriods) {
          expect(Array.isArray(timeline.peakActivityPeriods)).toBe(true);
        }

        // Events should be chronologically ordered
        if (timeline.events.length > 1) {
          for (let i = 1; i < timeline.events.length; i++) {
            const prevTime = new Date(timeline.events[i - 1].timestamp).getTime();
            const currTime = new Date(timeline.events[i].timestamp).getTime();
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Temporal pattern analysis test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should handle large log datasets efficiently', async () => {
      const largeDatasetRequest = {
        ...validLogsRequest,
        analysisOptions: {
          ...validLogsRequest.analysisOptions,
          maxLogEntries: 100000 // Large dataset
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, largeDatasetRequest);

        expect(response.status).toBe(200);
        const analysis: LogsAnalysisResponse = response.data;

        // Should still provide meaningful analysis for large datasets
        expect(analysis.analysis.summary.totalLogsProcessed).toBeGreaterThan(0);
        expect(analysis.analysis.patternAnalysis.frequentPatterns.length).toBeGreaterThan(0);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Large dataset handling test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        investigationId: validLogsRequest.investigationId
        // Missing required fields
      };

      try {
        await axios.post(`${API_BASE_URL}/api/logs`, invalidRequest);
        fail('Should have thrown an error for missing required fields');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data.error).toContain('required');
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for invalid time range', async () => {
      const invalidTimeRangeRequests = [
        {
          ...validLogsRequest,
          timeRange: {
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() - 86400000).toISOString() // End before start
          }
        },
        {
          ...validLogsRequest,
          timeRange: {
            startTime: 'invalid-date',
            endTime: new Date().toISOString()
          }
        },
        {
          ...validLogsRequest,
          timeRange: {
            startTime: new Date(Date.now() - 86400000 * 365).toISOString(), // Too far back
            endTime: new Date().toISOString()
          }
        }
      ];

      for (const invalidRequest of invalidTimeRangeRequests) {
        try {
          await axios.post(`${API_BASE_URL}/api/logs`, invalidRequest);
          fail('Should have thrown an error for invalid time range');
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect(error.response?.status).toBe(400);
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for invalid analysis options', async () => {
      const invalidOptionsRequest = {
        ...validLogsRequest,
        analysisOptions: {
          ...validLogsRequest.analysisOptions,
          maxLogEntries: -1 // Invalid negative value
        }
      };

      try {
        await axios.post(`${API_BASE_URL}/api/logs`, invalidOptionsRequest);
        fail('Should have thrown an error for invalid analysis options');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for empty log sources array', async () => {
      const emptySourcesRequest = {
        ...validLogsRequest,
        logSources: []
      };

      try {
        await axios.post(`${API_BASE_URL}/api/logs`, emptySourcesRequest);
        fail('Should have thrown an error for empty log sources');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/logs`, validLogsRequest, {
          headers: {} // No auth headers
        });
        fail('Should have thrown an error for missing authentication');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([401, 403]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });

    it('should return 403 for insufficient permissions to access log sources', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/logs`, validLogsRequest, {
          headers: {
            'Authorization': 'Bearer limited-access-token'
          }
        });
        fail('Should have thrown an error for insufficient log access permissions');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([401, 403]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should respond within reasonable time for log analysis', async () => {
      const startTime = Date.now();

      try {
        await axios.post(`${API_BASE_URL}/api/logs`, validLogsRequest);
        const responseTime = Date.now() - startTime;

        // Log analysis should complete within 60 seconds
        expect(responseTime).toBeLessThan(60000);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Performance test failing as expected');
        }
      }
    });

    it('should handle timeout for extremely large datasets', async () => {
      const extremelyLargeRequest = {
        ...validLogsRequest,
        timeRange: {
          startTime: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days
          endTime: new Date().toISOString()
        },
        analysisOptions: {
          ...validLogsRequest.analysisOptions,
          maxLogEntries: 1000000 // 1 million logs
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, extremelyLargeRequest, {
          timeout: 120000 // 2 minute timeout
        });

        // Should either complete or return partial results
        expect([200, 206]).toContain(response.status);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Should timeout gracefully or return 413 for too large request
          expect([408, 413, 503]).toContain(error.response?.status || error.code);
        }
      }
    });

    it('should provide progress updates for long-running analysis', async () => {
      const longRunningRequest = {
        ...validLogsRequest,
        analysisOptions: {
          ...validLogsRequest.analysisOptions,
          provideProgressUpdates: true,
          maxLogEntries: 50000
        }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/api/logs`, longRunningRequest);

        expect(response.status).toBe(200);
        const analysis: LogsAnalysisResponse = response.data;

        // Should include progress metadata
        if (analysis.metadata?.progress) {
          expect(typeof analysis.metadata.progress).toBe('object');
          expect(analysis.metadata.progress).toHaveProperty('completed');
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Progress updates test failing as expected');
        }
      }
    });
  });
});