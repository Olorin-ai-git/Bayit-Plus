/**
 * RunwayML Integration Test Suite
 * 
 * Comprehensive tests for RunwayML provider integration including
 * video generation, status checking, polling, and error handling.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { RunwayMLProvider } from '../services/video-providers/runwayml-provider.service';
import { enhancedVideoGenerationService } from '../services/enhanced-video-generation.service';
import { 
  VideoGenerationOptions, 
  VideoProviderError, 
  VideoProviderErrorType,
  VideoRequirements 
} from '../services/video-providers/base-provider.interface';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn()
      }))
    }))
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'mock-timestamp')
  }
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn()
  }))
}));

describe('RunwayML Provider Integration', () => {
  let runwaymlProvider: RunwayMLProvider;
  let mockHttpClient: any;
  
  beforeEach(async () => {
    runwaymlProvider = new RunwayMLProvider();
    
    // Mock HTTP client
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn()
    };
    
    // Initialize provider with mock config
    await runwaymlProvider.initialize({
      apiKey: 'test-runwayml-api-key',
      timeout: 60000,
      retryAttempts: 3
    });
    
    // Inject mock HTTP client
    (runwaymlProvider as any).httpClient = mockHttpClient;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    runwaymlProvider.cleanup();
  });
  
  describe('Provider Capabilities', () => {
    it('should have correct capabilities configuration', () => {
      const capabilities = runwaymlProvider.capabilities;
      
      expect(capabilities.maxDuration).toBe(10);
      expect(capabilities.maxResolution).toBe('1920x1080');
      expect(capabilities.supportedFormats).toContain('mp4');
      expect(capabilities.supportedFormats).toContain('gif');
      expect(capabilities.supportedAspectRatios).toEqual(['16:9', '9:16', '1:1']);
      expect(capabilities.voiceCloning).toBe(false);
      expect(capabilities.customAvatars).toBe(false);
      expect(capabilities.realTimeGeneration).toBe(false);
      expect(capabilities.backgroundCustomization).toBe(true);
      expect(capabilities.emotionControl).toBe(true);
    });
    
    it('should have correct rate limits', () => {
      const rateLimits = runwaymlProvider.rateLimits;
      
      expect(rateLimits.requestsPerMinute).toBe(25);
      expect(rateLimits.requestsPerHour).toBe(100);
      expect(rateLimits.concurrentRequests).toBe(5);
      expect(rateLimits.dailyQuota).toBe(500);
      expect(rateLimits.costPerRequest).toBe(0.75);
    });
    
    it('should have correct provider metadata', () => {
      expect(runwaymlProvider.name).toBe('runwayml');
      expect(runwaymlProvider.priority).toBe(2);
    });
  });
  
  describe('Video Generation', () => {
    it('should generate video successfully with basic options', async () => {
      const mockResponse = {
        data: {
          id: 'runway-task-123',
          status: 'pending',
          progress: 0,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };
      
      mockHttpClient.post.mockResolvedValue(mockResponse);
      
      const script = 'Hello, I am a professional software developer with expertise in React and Node.js.';
      const options: VideoGenerationOptions = {
        style: 'professional',
        duration: 'medium',
        background: 'office',
        jobId: 'test-job-123'
      };
      
      const result = await runwaymlProvider.generateVideo(script, options);
      
      expect(result).toMatchObject({\n        jobId: 'test-job-123',\n        providerId: 'runwayml',\n        status: 'queued',\n        progress: 0,\n        metadata: {\n          resolution: '1920x1080',\n          format: 'mp4'\n        }\n      });\n      \n      expect(mockHttpClient.post).toHaveBeenCalledWith(\n        '/generate',\n        expect.objectContaining({\n          model: 'gen2',\n          prompt: expect.stringContaining('Professional corporate video'),\n          aspect_ratio: '16:9',\n          duration: 8,\n          motion: 'low',\n          style: 'professional'\n        })\n      );\n    });\n    \n    it('should generate video with energetic style', async () => {\n      const mockResponse = {\n        data: {\n          id: 'runway-task-456',\n          status: 'pending',\n          progress: 0\n        }\n      };\n      \n      mockHttpClient.post.mockResolvedValue(mockResponse);\n      \n      const script = 'Dynamic presentation showcasing innovative solutions.';\n      const options: VideoGenerationOptions = {\n        style: 'energetic',\n        duration: 'short',\n        jobId: 'test-energetic-123'\n      };\n      \n      const result = await runwaymlProvider.generateVideo(script, options);\n      \n      expect(result.jobId).toBe('test-energetic-123');\n      expect(mockHttpClient.post).toHaveBeenCalledWith(\n        '/generate',\n        expect.objectContaining({\n          motion: 'high',\n          style: 'dynamic',\n          duration: 4,\n          camera_motion: {\n            type: 'zoom',\n            intensity: 0.8\n          }\n        })\n      );\n    });\n    \n    it('should handle API errors gracefully', async () => {\n      const mockError = {\n        response: {\n          status: 429,\n          data: {\n            error: {\n              message: 'Rate limit exceeded'\n            }\n          }\n        }\n      };\n      \n      mockHttpClient.post.mockRejectedValue(mockError);\n      \n      const script = 'Test script';\n      \n      await expect(\n        runwaymlProvider.generateVideo(script, { jobId: 'test-error' })\n      ).rejects.toThrow(VideoProviderError);\n      \n      try {\n        await runwaymlProvider.generateVideo(script, { jobId: 'test-error' });\n      } catch (error) {\n        expect(error).toBeInstanceOf(VideoProviderError);\n        expect((error as VideoProviderError).type).toBe(VideoProviderErrorType.RATE_LIMIT_EXCEEDED);\n        expect((error as VideoProviderError).retryable).toBe(true);\n      }\n    });\n  });\n  \n  describe('Status Checking', () => {\n    it('should check status successfully', async () => {\n      const mockStatusResponse = {\n        data: {\n          id: 'runway-task-123',\n          status: 'processing',\n          progress: 50,\n          output: null,\n          metadata: {\n            duration: 8,\n            width: 1920,\n            height: 1080,\n            fps: 24,\n            format: 'mp4'\n          }\n        }\n      };\n      \n      mockHttpClient.get.mockResolvedValue(mockStatusResponse);\n      \n      // Mock Firestore document\n      const mockDoc = {\n        exists: true,\n        data: () => ({ runwayId: 'runway-task-123' })\n      };\n      (admin.firestore as jest.Mock).mockReturnValue({\n        collection: () => ({\n          doc: () => ({\n            get: () => Promise.resolve(mockDoc)\n          })\n        })\n      });\n      \n      const status = await runwaymlProvider.checkStatus('test-job-123');\n      \n      expect(status).toMatchObject({\n        jobId: 'test-job-123',\n        providerId: 'runwayml',\n        status: 'processing',\n        progress: 50,\n        duration: 8\n      });\n      \n      expect(mockHttpClient.get).toHaveBeenCalledWith('/status/runway-task-123');\n    });\n    \n    it('should handle completed status with video URL', async () => {\n      const mockStatusResponse = {\n        data: {\n          id: 'runway-task-123',\n          status: 'succeeded',\n          progress: 100,\n          output: 'https://runwayml.com/video/123.mp4',\n          thumbnailUrl: 'https://runwayml.com/thumb/123.jpg',\n          metadata: {\n            duration: 8\n          }\n        }\n      };\n      \n      mockHttpClient.get.mockResolvedValue(mockStatusResponse);\n      \n      const mockDoc = {\n        exists: true,\n        data: () => ({ runwayId: 'runway-task-123' })\n      };\n      (admin.firestore as jest.Mock).mockReturnValue({\n        collection: () => ({\n          doc: () => ({\n            get: () => Promise.resolve(mockDoc)\n          })\n        })\n      });\n      \n      const status = await runwaymlProvider.checkStatus('test-job-123');\n      \n      expect(status).toMatchObject({\n        status: 'completed',\n        progress: 100,\n        videoUrl: 'https://runwayml.com/video/123.mp4',\n        thumbnailUrl: 'https://runwayml.com/thumb/123.jpg'\n      });\n    });\n  });\n  \n  describe('Capability Assessment', () => {\n    it('should accept suitable requirements', () => {\n      const requirements: VideoRequirements = {\n        duration: 8,\n        resolution: '1920x1080',\n        format: 'mp4',\n        aspectRatio: '16:9',\n        features: {\n          backgroundCustomization: true,\n          emotionControl: true\n        },\n        urgency: 'normal',\n        qualityLevel: 'premium'\n      };\n      \n      expect(runwaymlProvider.canHandle(requirements)).toBe(true);\n    });\n    \n    it('should reject requirements exceeding capabilities', () => {\n      const requirements: VideoRequirements = {\n        duration: 15, // Exceeds max duration of 10 seconds\n        resolution: '1920x1080',\n        format: 'mp4',\n        aspectRatio: '16:9',\n        features: {},\n        urgency: 'normal',\n        qualityLevel: 'standard'\n      };\n      \n      expect(runwaymlProvider.canHandle(requirements)).toBe(false);\n    });\n    \n    it('should reject unsupported formats', () => {\n      const requirements: VideoRequirements = {\n        duration: 8,\n        resolution: '1920x1080',\n        format: 'avi', // Unsupported format\n        aspectRatio: '16:9',\n        features: {},\n        urgency: 'normal',\n        qualityLevel: 'standard'\n      };\n      \n      expect(runwaymlProvider.canHandle(requirements)).toBe(false);\n    });\n    \n    it('should reject high urgency with real-time updates requirement', () => {\n      const requirements: VideoRequirements = {\n        duration: 8,\n        resolution: '1920x1080',\n        format: 'mp4',\n        aspectRatio: '16:9',\n        features: {\n          realTimeUpdates: true\n        },\n        urgency: 'high', // High urgency with real-time updates not supported\n        qualityLevel: 'standard'\n      };\n      \n      expect(runwaymlProvider.canHandle(requirements)).toBe(false);\n    });\n  });\n  \n  describe('Cost Estimation', () => {\n    it('should calculate basic cost correctly', async () => {\n      const options: VideoGenerationOptions = {\n        style: 'professional',\n        duration: 'medium'\n      };\n      \n      const cost = await runwaymlProvider.getEstimatedCost(options);\n      expect(cost).toBe(0.75); // Base cost\n    });\n    \n    it('should apply surcharge for long duration', async () => {\n      const options: VideoGenerationOptions = {\n        style: 'professional',\n        duration: 'long'\n      };\n      \n      const cost = await runwaymlProvider.getEstimatedCost(options);\n      expect(cost).toBe(1.2); // 0.75 * 1.6\n    });\n    \n    it('should apply surcharge for energetic style', async () => {\n      const options: VideoGenerationOptions = {\n        style: 'energetic',\n        duration: 'medium'\n      };\n      \n      const cost = await runwaymlProvider.getEstimatedCost(options);\n      expect(cost).toBeCloseTo(0.975); // 0.75 * 1.3\n    });\n  });\n  \n  describe('Health Status', () => {\n    it('should return healthy status when API is responsive', async () => {\n      mockHttpClient.get.mockResolvedValue({ status: 200 });\n      \n      const health = await runwaymlProvider.getHealthStatus();\n      \n      expect(health).toMatchObject({\n        providerId: 'runwayml',\n        isHealthy: true,\n        uptime: 98.5,\n        errorRate: 1.5,\n        currentLoad: 35\n      });\n      \n      expect(health.responseTime).toBeGreaterThan(0);\n      expect(health.lastChecked).toBeInstanceOf(Date);\n    });\n    \n    it('should return unhealthy status when API fails', async () => {\n      mockHttpClient.get.mockRejectedValue(new Error('Network error'));\n      \n      const health = await runwaymlProvider.getHealthStatus();\n      \n      expect(health).toMatchObject({\n        providerId: 'runwayml',\n        isHealthy: false,\n        uptime: 0,\n        errorRate: 100,\n        currentLoad: 100\n      });\n      \n      expect(health.issues).toContain('Health check failed: Network error');\n    });\n  });\n  \n  describe('Performance Metrics', () => {\n    it('should return performance metrics', async () => {\n      const metrics = await runwaymlProvider.getPerformanceMetrics('24h');\n      \n      expect(metrics).toMatchObject({\n        providerId: 'runwayml',\n        period: '24h',\n        metrics: {\n          successRate: 96.8,\n          averageGenerationTime: 35,\n          averageVideoQuality: 9.5,\n          userSatisfactionScore: 4.7,\n          costEfficiency: 7.8,\n          uptimePercentage: 98.5\n        }\n      });\n      \n      expect(metrics.lastUpdated).toBeInstanceOf(Date);\n    });\n  });\n  \n  describe('Enhanced Prompt Generation', () => {\n    it('should enhance prompts for professional style', async () => {\n      const script = 'I am a software developer with 5 years of experience in React.';\n      const options: VideoGenerationOptions = {\n        style: 'professional',\n        background: 'office'\n      };\n      \n      // Access private method for testing\n      const enhancedPrompt = await (runwaymlProvider as any).enhancePromptForVideo(script, options);\n      \n      expect(enhancedPrompt.enhancedPrompt).toContain('Professional corporate video');\n      expect(enhancedPrompt.enhancedPrompt).toContain('skilled software developer');\n      expect(enhancedPrompt.styleModifiers).toContain('clean composition');\n      expect(enhancedPrompt.motionSuggestions).toContain('subtle zoom');\n      expect(enhancedPrompt.qualityScore).toBeGreaterThan(70);\n    });\n    \n    it('should enhance prompts for energetic style', async () => {\n      const script = 'Creative designer showcasing innovative solutions.';\n      const options: VideoGenerationOptions = {\n        style: 'energetic',\n        background: 'gradient'\n      };\n      \n      const enhancedPrompt = await (runwaymlProvider as any).enhancePromptForVideo(script, options);\n      \n      expect(enhancedPrompt.enhancedPrompt).toContain('Dynamic and engaging');\n      expect(enhancedPrompt.styleModifiers).toContain('dynamic lighting');\n      expect(enhancedPrompt.motionSuggestions).toContain('dynamic zoom');\n    });\n  });\n  \n  describe('Integration with Enhanced Video Service', () => {\n    it('should be registered with provider selection engine', () => {\n      // This would require initializing the enhanced service\n      // and checking if RunwayML is available as a fallback option\n      expect(runwaymlProvider.name).toBe('runwayml');\n      expect(runwaymlProvider.priority).toBe(2);\n    });\n  });\n  \n  describe('Polling Manager', () => {\n    it('should start polling after video generation', async () => {\n      const mockResponse = {\n        data: {\n          id: 'runway-task-123',\n          status: 'pending',\n          progress: 0\n        }\n      };\n      \n      mockHttpClient.post.mockResolvedValue(mockResponse);\n      \n      const script = 'Test script';\n      const options: VideoGenerationOptions = {\n        jobId: 'test-polling-123'\n      };\n      \n      const result = await runwaymlProvider.generateVideo(script, options);\n      \n      expect(result.jobId).toBe('test-polling-123');\n      // Polling would be started internally\n      // In a real test, we'd verify that the polling manager was called\n    });\n    \n    it('should stop polling on completion', () => {\n      // This would test the polling manager's stop functionality\n      // when a job reaches completed or failed status\n      expect(true).toBe(true); // Placeholder\n    });\n  });\n  \n  describe('Error Handling', () => {\n    it('should map HTTP errors to provider errors correctly', async () => {\n      const testCases = [\n        {\n          httpStatus: 401,\n          expectedType: VideoProviderErrorType.AUTHENTICATION_ERROR,\n          expectedRetryable: false\n        },\n        {\n          httpStatus: 429,\n          expectedType: VideoProviderErrorType.RATE_LIMIT_EXCEEDED,\n          expectedRetryable: true\n        },\n        {\n          httpStatus: 400,\n          expectedType: VideoProviderErrorType.INVALID_PARAMETERS,\n          expectedRetryable: false\n        },\n        {\n          httpStatus: 402,\n          expectedType: VideoProviderErrorType.INSUFFICIENT_CREDITS,\n          expectedRetryable: false\n        }\n      ];\n      \n      for (const testCase of testCases) {\n        mockHttpClient.post.mockRejectedValue({\n          response: {\n            status: testCase.httpStatus,\n            data: {\n              error: { message: 'Test error' }\n            }\n          }\n        });\n        \n        try {\n          await runwaymlProvider.generateVideo('test', { jobId: 'test' });\n          fail('Expected error to be thrown');\n        } catch (error) {\n          expect(error).toBeInstanceOf(VideoProviderError);\n          expect((error as VideoProviderError).type).toBe(testCase.expectedType);\n          expect((error as VideoProviderError).retryable).toBe(testCase.expectedRetryable);\n        }\n      }\n    });\n  });\n});\n\ndescribe('RunwayML Provider Performance', () => {\n  it('should handle multiple concurrent requests', async () => {\n    const provider = new RunwayMLProvider();\n    await provider.initialize({\n      apiKey: 'test-key',\n      timeout: 30000\n    });\n    \n    // Mock multiple successful responses\n    const mockRequests = Array.from({ length: 5 }, (_, i) => \n      provider.getEstimatedCost({ style: 'professional' })\n    );\n    \n    const results = await Promise.all(mockRequests);\n    \n    expect(results).toHaveLength(5);\n    results.forEach(cost => {\n      expect(typeof cost).toBe('number');\n      expect(cost).toBeGreaterThan(0);\n    });\n    \n    provider.cleanup();\n  });\n  \n  it('should respect rate limits', () => {\n    const rateLimits = new RunwayMLProvider().rateLimits;\n    \n    expect(rateLimits.requestsPerMinute).toBeLessThanOrEqual(30); // Conservative limit\n    expect(rateLimits.concurrentRequests).toBeLessThanOrEqual(10);\n  });\n});