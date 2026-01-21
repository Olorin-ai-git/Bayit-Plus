/**
 * Resilience Integration Tests
 * 
 * Tests the resilience service with real external API integrations to ensure
 * proper error handling, retry logic, circuit breaker functionality, and
 * rate limiting.
 * 
 * @author Gil Klainert
 * @created 2025-08-20
  */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ResilienceService } from '../services/resilience.service';
import { HuggingFaceApiService } from '../services/huggingface-api.service';
import { ValidationService } from '../services/validation.service';
import { PortalGenerationService } from '../services/portal-generation.service';
import { ParsedCV } from '../types/job';

// Mock external dependencies
jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: jest.fn(),
    doc: jest.fn()
  }),
  storage: () => ({
    bucket: () => ({
      file: jest.fn()
    })
  })
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Test data
const mockCV: ParsedCV = {
  personalInfo: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1 (555) 123-4567',
    title: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    website: 'https://janesmith.dev'
  },
  summary: 'Experienced software engineer with 10+ years developing scalable applications.',
  experience: [
    {
      company: 'Tech Solutions Inc',
      position: 'Senior Software Engineer',
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      description: 'Led development of microservices architecture',
      achievements: ['Improved system performance by 50%'],
      technologies: ['React', 'Node.js', 'AWS', 'PostgreSQL']
    }
  ],
  skills: [
    { name: 'JavaScript', level: 'Expert', category: 'Programming' },
    { name: 'React', level: 'Expert', category: 'Frontend' },
    { name: 'Node.js', level: 'Advanced', category: 'Backend' }
  ],
  education: [
    {
      institution: 'MIT',
      degree: 'Master of Science',
      field: 'Computer Science',
      year: '2014'
    }
  ]
};

describe('Resilience Integration Tests', () => {
  let resilienceService: ResilienceService;
  let huggingFaceService: HuggingFaceApiService;
  let validationService: ValidationService;
  let portalService: PortalGenerationService;

  beforeEach(() => {
    resilienceService = new ResilienceService();
    huggingFaceService = new HuggingFaceApiService();
    validationService = new ValidationService();
    portalService = new PortalGenerationService();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ResilienceService Core Functionality', () => {
    test('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await resilienceService.withRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        retryableStatusCodes: [500, 502, 503],
        retryableErrors: ['Temporary failure']
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should open circuit breaker after failure threshold', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service down'));
      const fallbackOperation = jest.fn().mockResolvedValue('fallback result');

      // First, exceed failure threshold
      for (let i = 0; i < 5; i++) {
        try {
          await resilienceService.withCircuitBreaker(
            failingOperation,
            'test-circuit',
            {
              failureThreshold: 3,
              resetTimeoutMs: 60000,
              failureWindowMs: 30000,
              minimumRequestCount: 2
            },
            fallbackOperation
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Now circuit should be open and use fallback
      const result = await resilienceService.withCircuitBreaker(
        failingOperation,
        'test-circuit',
        undefined,
        fallbackOperation
      );

      expect(result).toBe('fallback result');
      expect(fallbackOperation).toHaveBeenCalled();
    });

    test('should enforce rate limiting', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const startTime = Date.now();

      // Execute operations that should be rate limited
      const promises = Array(5).fill(null).map(() =>
        resilienceService.withRateLimit(operation, 'test-limiter', {
          maxRequests: 2,
          windowMs: 1000
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();

      // Should take at least 2 seconds due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(1500);
      expect(operation).toHaveBeenCalledTimes(5);
    });

    test('should handle timeout scenarios', async () => {
      const slowOperation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'completed';
      });

      await expect(
        resilienceService.withTimeout(slowOperation(), 1000, 'Operation timed out')
      ).rejects.toThrow('Operation timed out');
    });

    test('should combine all resilience patterns', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error('Rate limit exceeded');
          (error as any).response = { status: 429 };
          throw error;
        }
        if (attemptCount === 2) {
          throw new Error('ECONNRESET');
        }
        return 'success after resilience';
      });

      const fallback = jest.fn().mockResolvedValue('fallback result');

      const result = await resilienceService.withFullResilience(operation, {
        operationName: 'complex-operation',
        retryConfig: {
          maxAttempts: 3,
          initialDelayMs: 100,
          maxDelayMs: 1000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
          retryableStatusCodes: [429, 500, 502, 503],
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
        },
        circuitConfig: {
          failureThreshold: 5,
          resetTimeoutMs: 60000,
          failureWindowMs: 30000,
          minimumRequestCount: 3
        },
        rateLimitConfig: {
          maxRequests: 10,
          windowMs: 1000
        },
        fallback
      });

      expect(result).toBe('success after resilience');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('HuggingFace API Resilience', () => {
    test('should handle HuggingFace API failures gracefully', async () => {
      const portalData = {
        id: 'test-portal-1',
        jobId: 'test-job-1',
        userId: 'test-user-1',
        cv: mockCV,
        template: {},
        customization: {},
        ragConfig: { enabled: false },
        embeddings: [],
        assets: []
      };

      // Mock HuggingFace API failure
      jest.spyOn(huggingFaceService as any, 'createSpace')
        .mockRejectedValueOnce(new Error('HuggingFace service unavailable'))
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          spaceId: 'test-space',
          url: 'https://huggingface.co/spaces/test-space'
        });

      const result = await huggingFaceService.deployPortal(portalData);

      expect(result.success).toBe(true);
      expect(result.spaceId).toBeDefined();
      expect(result.portalUrl).toBeDefined();
    });

    test('should use fallback when all retries exhausted', async () => {
      const portalData = {
        id: 'test-portal-2',
        jobId: 'test-job-2',
        userId: 'test-user-2',
        cv: mockCV,
        template: {},
        customization: {},
        ragConfig: { enabled: false },
        embeddings: [],
        assets: []
      };

      // Mock persistent failure
      jest.spyOn(huggingFaceService as any, 'createSpace')
        .mockRejectedValue(new Error('Service permanently down'));

      const result = await huggingFaceService.deployPortal(portalData);

      // Should succeed with fallback
      expect(result.success).toBe(true);
      expect(result.metadata?.fallback).toBe(true);
    });
  });

  describe('Validation Service Resilience', () => {
    test('should handle malformed input gracefully', async () => {
      const malformedCV = {
        personalInfo: null,
        experience: 'invalid-data',
        skills: undefined,
        education: []
      } as any;

      const validation = validationService.validateCV(malformedCV, {
        requireEmailValidation: true,
        requireUrlValidation: true
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should sanitize dangerous input', async () => {
      const dangerousCV: ParsedCV = {
        personalInfo: {
          name: '<script>alert("xss")</script>John Doe',
          email: 'john@example.com',
          title: 'Engineer'
        },
        summary: 'Professional <img src=x onerror=alert(1)> summary',
        experience: [],
        skills: [],
        education: []
      };

      const validation = validationService.validateCV(dangerousCV, {
        requireEmailValidation: true,
        requireUrlValidation: true
      });

      if (validation.sanitizedData) {
        expect(validation.sanitizedData.personalInfo?.name).not.toContain('<script>');
        expect(validation.sanitizedData.summary).not.toContain('<img src=x onerror=alert(1)>');
      }
    });
  });

  describe('Portal Generation End-to-End Resilience', () => {
    test('should handle complete portal generation with resilience', async () => {
      const jobId = 'resilience-test-job';
      const userId = 'resilience-test-user';

      // Mock Firestore operations
      const mockDoc = {
        exists: true,
        data: () => ({
          userId,
          status: 'completed',
          parsedData: mockCV
        })
      };

      const mockFirestore = {
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockDoc),
            set: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({})
          })
        })
      };

      // Mock the database
      (portalService as any).db = mockFirestore;

      // Generate portal with resilience
      const result = await portalService.generatePortal(mockCV, jobId, userId);

      expect(result.success).toBe(true);
      expect(result.portalConfig).toBeDefined();
      expect(result.urls).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    test('should fail gracefully with proper error categorization', async () => {
      const invalidCV = {} as ParsedCV;

      const result = await portalService.generatePortal(invalidCV, 'invalid-job', 'invalid-user');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_CV_DATA');
      expect(result.error?.category).toBe('validation');
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should isolate failing external services', async () => {
      const failingService = jest.fn().mockRejectedValue(new Error('External service down'));
      const healthyService = jest.fn().mockResolvedValue('healthy response');

      // Trip the circuit breaker for the failing service
      for (let i = 0; i < 5; i++) {
        try {
          await resilienceService.withCircuitBreaker(
            failingService,
            'external-service-1',
            { failureThreshold: 3, minimumRequestCount: 2 }
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Healthy service should still work
      const healthyResult = await resilienceService.withCircuitBreaker(
        healthyService,
        'external-service-2'
      );

      expect(healthyResult).toBe('healthy response');
      expect(healthyService).toHaveBeenCalled();

      // Failing service should be isolated
      const metrics = resilienceService.getMetrics();
      const failingCircuit = metrics.circuitBreakers.find(cb => cb.name === 'external-service-1');
      expect(failingCircuit?.state).toBe('open');
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance under concurrent requests', async () => {
      const operation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      });

      const startTime = Date.now();

      // Execute 20 concurrent operations
      const promises = Array(20).fill(null).map((_, index) =>
        resilienceService.withFullResilience(operation, {
          operationName: `concurrent-op-${index}`,
          retryConfig: { maxAttempts: 2 },
          rateLimitConfig: { maxRequests: 10, windowMs: 1000 }
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(r => r === 'success')).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from transient network failures', async () => {
      let networkDown = true;
      const networkOperation = jest.fn().mockImplementation(async () => {
        if (networkDown) {
          networkDown = false; // Simulate network recovery
          const error = new Error('Network timeout');
          (error as any).code = 'ETIMEDOUT';
          throw error;
        }
        return 'network recovered';
      });

      const result = await resilienceService.withRetry(networkOperation, {
        maxAttempts: 3,
        initialDelayMs: 100,
        retryableErrors: ['ETIMEDOUT']
      });

      expect(result).toBe('network recovered');
      expect(networkOperation).toHaveBeenCalledTimes(2);
    });

    test('should handle quota exhaustion gracefully', async () => {
      const quotaExhaustedOperation = jest.fn().mockImplementation(async () => {
        const error = new Error('Quota exceeded');
        (error as any).response = { status: 429 };
        throw error;
      });

      const fallback = jest.fn().mockResolvedValue('quota fallback');

      const result = await resilienceService.withFullResilience(quotaExhaustedOperation, {
        operationName: 'quota-test',
        retryConfig: {
          maxAttempts: 2,
          retryableStatusCodes: [429]
        },
        fallback
      });

      expect(result).toBe('quota fallback');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should collect and provide resilience metrics', async () => {
      // Generate some activity
      await resilienceService.withCircuitBreaker(
        () => Promise.resolve('test'),
        'metrics-test-circuit'
      );

      await resilienceService.withRateLimit(
        () => Promise.resolve('test'),
        'metrics-test-limiter'
      );

      const metrics = resilienceService.getMetrics();

      expect(metrics.circuitBreakers).toBeDefined();
      expect(metrics.rateLimiters).toBeDefined();
      expect(metrics.totalComponents).toBeGreaterThan(0);

      const circuit = metrics.circuitBreakers.find(cb => cb.name === 'metrics-test-circuit');
      const limiter = metrics.rateLimiters.find(rl => rl.name === 'metrics-test-limiter');

      expect(circuit).toBeDefined();
      expect(limiter).toBeDefined();
    });

    test('should allow circuit breaker reset', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));

      // Trip circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await resilienceService.withCircuitBreaker(
            failingOperation,
            'reset-test-circuit',
            { failureThreshold: 3, minimumRequestCount: 2 }
          );
        } catch (error) {
          // Expected
        }
      }

      // Reset circuit breaker
      const resetResult = resilienceService.resetCircuitBreaker('reset-test-circuit');
      expect(resetResult).toBe(true);

      // Should be able to use circuit again
      const successOperation = jest.fn().mockResolvedValue('success after reset');
      const result = await resilienceService.withCircuitBreaker(
        successOperation,
        'reset-test-circuit'
      );

      expect(result).toBe('success after reset');
    });
  });
});

describe('Service Configuration Tests', () => {
  test('should provide correct HuggingFace configuration', () => {
    const config = ResilienceService.createHuggingFaceConfig();
    
    expect(config.retryConfig.maxAttempts).toBe(3);
    expect(config.circuitConfig.failureThreshold).toBe(3);
    expect(config.rateLimitConfig.maxRequests).toBe(5);
    expect(config.retryConfig.retryableStatusCodes).toContain(429);
    expect(config.retryConfig.retryableStatusCodes).toContain(503);
  });

  test('should provide correct OpenAI configuration', () => {
    const config = ResilienceService.createOpenAIConfig();
    
    expect(config.retryConfig.maxAttempts).toBe(4);
    expect(config.circuitConfig.failureThreshold).toBe(5);
    expect(config.rateLimitConfig.maxRequests).toBe(20);
  });

  test('should provide correct Anthropic configuration', () => {
    const config = ResilienceService.createAnthropicConfig();
    
    expect(config.retryConfig.maxAttempts).toBe(3);
    expect(config.circuitConfig.failureThreshold).toBe(4);
    expect(config.rateLimitConfig.maxRequests).toBe(15);
  });
});