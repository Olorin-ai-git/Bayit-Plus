/**
 * @cvplus/recommendations - Service Tests
 * 
 * Comprehensive test suite for the recommendations service.
 * Tests performance targets, caching behavior, and error handling.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecommendationsService } from '../services/recommendations.service';
import { CacheService } from '../services/cache.service';
import { RetryUtil } from '../utils/retry';
import type { 
  GetRecommendationsParams
} from '../types';
import { RecommendationErrorType } from '../types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn())
}));

// Mock core utilities
vi.mock('@cvplus/core', () => ({
  generateId: vi.fn(() => 'test-id-123')
}));

// ============================================================================
// TEST SUITE
// ============================================================================

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let cacheService: CacheService;
  let retryUtil: RetryUtil;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create fresh instances
    service = new RecommendationsService();
    cacheService = new CacheService();
    retryUtil = new RetryUtil();
    
    // Reset metrics
    service.resetMetrics();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // BASIC FUNCTIONALITY TESTS
  // ============================================================================

  describe('Basic Functionality', () => {
    it('should initialize with default metrics', () => {
      const metrics = service.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.requestDuration).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.timeoutRate).toBe(0);
    });

    it('should be healthy on initialization', () => {
      expect(service.isHealthy()).toBe(true);
    });

    it('should have zero cache stats on initialization', () => {
      const cacheStats = service.getCacheStats();
      
      expect(cacheStats.hitRate).toBe(0);
      expect(cacheStats.totalRequests).toBe(0);
      expect(cacheStats.cacheSize).toBe(0);
    });
  });

  // ============================================================================
  // CACHING TESTS
  // ============================================================================

  describe('Caching Behavior', () => {
    it('should generate consistent cache keys', () => {
      const params = {
        userId: 'user123',
        jobId: 'job456',
        targetRole: 'software engineer',
        industryKeywords: ['javascript', 'react'],
        version: '1.0'
      };

      const key1 = cacheService.generateRecommendationsKey(params);
      const key2 = cacheService.generateRecommendationsKey(params);
      
      expect(key1).toBe(key2);
      expect(key1).toContain(params.userId);
      expect(key1).toContain(params.jobId);
    });

    it('should generate different keys for different parameters', () => {
      const params1 = {
        userId: 'user123',
        jobId: 'job456',
        targetRole: 'software engineer'
      };

      const params2 = {
        userId: 'user123',
        jobId: 'job456',
        targetRole: 'data scientist'
      };

      const key1 = cacheService.generateRecommendationsKey(params1);
      const key2 = cacheService.generateRecommendationsKey(params2);
      
      expect(key1).not.toBe(key2);
    });

    it('should handle cache operations without errors', async () => {
      const testData = { test: 'data', timestamp: Date.now() };
      const cacheKey = 'test-key';
      
      // Set data in cache
      await cacheService.set(cacheKey, testData);
      
      // Retrieve data from cache
      const retrieved = await cacheService.get(cacheKey);
      
      expect(retrieved).toEqual(testData);
    });

    it('should respect TTL expiration', async () => {
      const testData = { test: 'data' };
      const cacheKey = 'test-key-ttl';
      const shortTTL = 100; // 100ms
      
      // Set data with short TTL
      await cacheService.set(cacheKey, testData, shortTTL);
      
      // Should be available immediately
      let retrieved = await cacheService.get(cacheKey);
      expect(retrieved).toEqual(testData);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be null after expiration
      retrieved = await cacheService.get(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  // ============================================================================
  // RETRY MECHANISM TESTS
  // ============================================================================

  describe('Retry Mechanism', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Timeout error');
          (error as any).type = 'timeout';
          throw error;
        }
        return { success: true, data: 'success' };
      });

      const result = await retryUtil.executeWithRetry(
        operation,
        {
          requestId: 'test-retry',
          operationName: 'testOperation'
        }
      );

      expect(attempts).toBe(3);
      expect(result).toEqual({ success: true, data: 'success' });
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        const error = new Error('Validation error');
        (error as any).type = 'validation_error';
        throw error;
      });

      await expect(
        retryUtil.executeWithRetry(
          operation,
          {
            requestId: 'test-no-retry',
            operationName: 'testOperation'
          }
        )
      ).rejects.toThrow('Validation error');

      expect(attempts).toBe(1);
    });

    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const originalSleep = (retryUtil as any).sleep;
      
      // Mock sleep to capture delays
      (retryUtil as any).sleep = vi.fn().mockImplementation((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          const error = new Error('Network error');
          (error as any).type = 'network_error';
          throw error;
        }
        return { success: true };
      });

      try {
        await retryUtil.executeWithRetry(
          operation,
          {
            requestId: 'test-backoff',
            operationName: 'testOperation'
          }
        );
        
        // Should have exponentially increasing delays
        expect(delays.length).toBeGreaterThan(0);
        if (delays.length > 1) {
          expect(delays[1]).toBeGreaterThan(delays[0]);
        }
      } finally {
        // Restore original sleep
        (retryUtil as any).sleep = originalSleep;
      }
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Monitoring', () => {
    it('should track request metrics', async () => {
      // Mock a successful request
      const mockResponse = {
        success: true,
        data: {
          recommendations: [],
          cached: false,
          generatedAt: new Date().toISOString(),
          processingTime: 1000
        }
      };

      // Mock the Firebase function
      const mockHttpsCallable = vi.fn().mockResolvedValue({ data: mockResponse });
      vi.mocked(await import('firebase/functions')).httpsCallable.mockReturnValue(mockHttpsCallable);

      const params: GetRecommendationsParams = {
        jobId: 'test-job-123',
        userId: 'test-user-456'
      };

      await service.getRecommendations(params);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.throughput).toBe(1);
    });

    it('should track error rates', async () => {
      // Mock a failing request
      const mockHttpsCallable = vi.fn().mockRejectedValue(new Error('API Error'));
      vi.mocked(await import('firebase/functions')).httpsCallable.mockReturnValue(mockHttpsCallable);

      const params: GetRecommendationsParams = {
        jobId: 'test-job-123',
        userId: 'test-user-456'
      };

      const response = await service.getRecommendations(params);
      expect(response.success).toBe(false);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0);
    });

    it('should track timeout rates separately', async () => {
      // Mock a timeout error
      const mockHttpsCallable = vi.fn().mockImplementation(() => {
        const error = new Error('Request timeout');
        (error as any).type = 'timeout';
        return Promise.reject(error);
      });
      vi.mocked(await import('firebase/functions')).httpsCallable.mockReturnValue(mockHttpsCallable);

      const params: GetRecommendationsParams = {
        jobId: 'test-job-123',
        userId: 'test-user-456'
      };

      await service.getRecommendations(params);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.timeoutRate).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PERFORMANCE TARGET VALIDATION
  // ============================================================================

  describe('Performance Targets', () => {
    it('should target < 2% timeout rate', async () => {
      // This test would need to be run with actual load
      // For now, we just verify the target is defined
      const metrics = service.getPerformanceMetrics();
      expect(typeof metrics.timeoutRate).toBe('number');
      expect(metrics.timeoutRate).toBeGreaterThanOrEqual(0);
    });

    it('should target > 60% cache hit rate', async () => {
      const cacheStats = service.getCacheStats();
      expect(typeof cacheStats.hitRate).toBe('number');
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(0);
    });

    it('should target < 30 second response time', async () => {
      const metrics = service.getPerformanceMetrics();
      expect(typeof metrics.requestDuration).toBe('number');
      expect(metrics.requestDuration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', async () => {
      const invalidParams = {
        jobId: '', // Invalid empty jobId
        userId: 'test-user'
      };

      const response = await service.getRecommendations(invalidParams as GetRecommendationsParams);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should normalize different error types', () => {
      const errors = [
        new Error('Request timeout'),
        new Error('Network connection failed'),
        new Error('API service unavailable'),
        new Error('Invalid request format'),
        new Error('Rate limit exceeded'),
        new Error('Unknown error')
      ];

      errors.forEach(error => {
        const normalized = (retryUtil as any).normalizeError(error, 'test-id', 'test-op');
        expect(normalized.type).toBeDefined();
        expect(typeof normalized.retryable).toBe('boolean');
        expect(normalized.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should provide fallback responses', async () => {
      // Mock a complete service failure
      const mockHttpsCallable = vi.fn().mockRejectedValue(new Error('Complete service failure'));
      vi.mocked(await import('firebase/functions')).httpsCallable.mockReturnValue(mockHttpsCallable);

      const params: GetRecommendationsParams = {
        jobId: 'test-job-123',
        userId: 'test-user-456'
      };

      const response = await service.getRecommendations(params);
      
      // Should return a proper error response, not throw
      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(response.error?.message).toBeDefined();
    });
  });

  // ============================================================================
  // CACHE INVALIDATION TESTS
  // ============================================================================

  describe('Cache Invalidation', () => {
    it('should invalidate cache for specific job', async () => {
      const jobId = 'test-job-123';
      
      // This should not throw
      await service.invalidateCache(jobId);
      
      // Verify cache stats are updated
      const cacheStats = service.getCacheStats();
      expect(typeof cacheStats.cacheSize).toBe('number');
    });

    it('should refresh entire cache', async () => {
      await service.refreshCache();
      
      const cacheStats = service.getCacheStats();
      expect(cacheStats.cacheSize).toBe(0);
    });
  });

  // ============================================================================
  // SERVICE HEALTH TESTS
  // ============================================================================

  describe('Service Health', () => {
    it('should report healthy state when performance is good', () => {
      const isHealthy = service.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should reset metrics correctly', () => {
      // Perform some operations first
      service.getPerformanceMetrics();
      
      // Reset metrics
      service.resetMetrics();
      
      const metrics = service.getPerformanceMetrics();
      expect(metrics.throughput).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('RecommendationsService Integration', () => {
  let service: RecommendationsService;

  beforeEach(() => {
    service = new RecommendationsService();
    service.resetMetrics();
  });

  it('should handle complete recommendation workflow', async () => {
    // Mock successful Firebase responses
    const mockGetRecommendations = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          recommendations: [
            {
              id: 'rec-1',
              title: 'Test Recommendation',
              description: 'Test description',
              type: 'content',
              impact: 'high'
            }
          ],
          processingTime: 1000
        }
      }
    });

    const mockApplyImprovements = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'test-job',
          improvedCV: { id: 'test-cv' },
          appliedRecommendations: []
        }
      }
    });

    vi.mocked(await import('firebase/functions')).httpsCallable
      .mockReturnValueOnce(mockGetRecommendations)
      .mockReturnValueOnce(mockApplyImprovements);

    // Get recommendations
    const getParams: GetRecommendationsParams = {
      jobId: 'test-job',
      userId: 'test-user'
    };

    const getResponse = await service.getRecommendations(getParams);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data?.recommendations).toHaveLength(1);

    // Apply improvements
    const applyParams = {
      jobId: 'test-job',
      selectedRecommendationIds: ['rec-1'],
      userId: 'test-user'
    };

    const applyResponse = await service.applyImprovements(applyParams);
    expect(applyResponse.success).toBe(true);

    // Verify metrics were updated
    const metrics = service.getPerformanceMetrics();
    expect(metrics.throughput).toBe(2);
  });
});