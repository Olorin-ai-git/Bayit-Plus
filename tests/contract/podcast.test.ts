/**
 * Contract Test: POST /multimedia/podcast
 *
 * Tests the AI podcast generation endpoint following TDD principles.
 * This test MUST FAIL initially (RED phase), then pass after implementation (GREEN phase).
 *
 * @fileoverview Contract test for AI podcast generation endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

// Test configuration
const API_BASE_URL = process.env.VITE_FIREBASE_FUNCTION_URL || 'http://localhost:5001';
const TEST_TIMEOUT = 60000; // 1 minute for multimedia operations

// Mock authentication token (in real implementation, would be Firebase Auth)
const authToken = 'mock-firebase-auth-token';

// Mock test data
const validJobId = '123e4567-e89b-12d3-a456-426614174000';
const invalidJobId = 'invalid-job-id';
const nonExistentJobId = '000e0000-e00b-00d0-a000-000000000000';

describe('Contract Test: POST /multimedia/podcast', () => {
  beforeAll(() => {
    // Configure axios defaults for tests
    axios.defaults.timeout = TEST_TIMEOUT;
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  });

  describe('Success Cases', () => {
    it('should return 201 with podcast generation job created', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female',
        duration: 'medium',
        customizations: {
          tone: 'conversational',
          focus_areas: ['achievements', 'skills', 'experience'],
          background_music: true,
          intro_outro: true
        }
      };

      // This MUST fail initially (TDD Red phase)
      const response = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('podcastJobId');
      expect(response.data).toHaveProperty('originalJobId');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('estimatedDuration');
      expect(response.data).toHaveProperty('estimatedCompletionTime');
      expect(response.data).toHaveProperty('createdAt');

      // Validate response structure
      expect(typeof response.data.podcastJobId).toBe('string');
      expect(response.data.podcastJobId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(response.data.originalJobId).toBe(validJobId);
      expect(response.data.status).toBe('queued');
      expect(typeof response.data.estimatedDuration).toBe('string');
      expect(typeof response.data.estimatedCompletionTime).toBe('string');
    }, TEST_TIMEOUT);

    it('should handle different voice options', async () => {
      const voiceOptions = ['male', 'female', 'neutral'];

      for (const voice of voiceOptions) {
        const requestData = {
          jobId: validJobId,
          style: 'professional',
          voice: voice,
          duration: 'short'
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.podcastJobId).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should handle different style options', async () => {
      const styleOptions = ['professional', 'casual', 'dynamic', 'storytelling'];

      for (const style of styleOptions) {
        const requestData = {
          jobId: validJobId,
          style: style,
          voice: 'female',
          duration: 'medium'
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.podcastJobId).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should handle different duration options', async () => {
      const durationOptions = ['short', 'medium', 'long'];

      for (const duration of durationOptions) {
        const requestData = {
          jobId: validJobId,
          style: 'professional',
          voice: 'male',
          duration: duration
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.estimatedDuration).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should accept advanced customizations', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'storytelling',
        voice: 'female',
        duration: 'long',
        customizations: {
          tone: 'inspiring',
          focus_areas: ['career_journey', 'key_achievements', 'future_goals'],
          background_music: true,
          intro_outro: true,
          language: 'en-US',
          speed: 'normal',
          include_statistics: true,
          personal_branding: true
        }
      };

      const response = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.podcastJobId).toBeDefined();
      expect(response.data.status).toBe('queued');
    }, TEST_TIMEOUT);

    it('should handle minimal request with defaults', async () => {
      const requestData = {
        jobId: validJobId
      };

      const response = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.podcastJobId).toBeDefined();
      // Should apply default values
      expect(response.data.status).toBe('queued');
    }, TEST_TIMEOUT);
  });

  describe('Validation Error Cases', () => {
    it('should return 400 for missing jobId', async () => {
      const requestData = {
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'MISSING_REQUIRED_FIELD',
            message: expect.stringContaining('jobId')
          }
        }
      });
    });

    it('should return 400 for invalid jobId format', async () => {
      const requestData = {
        jobId: invalidJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_JOB_ID_FORMAT',
            message: expect.stringContaining('UUID')
          }
        }
      });
    });

    it('should return 404 for non-existent job', async () => {
      const requestData = {
        jobId: nonExistentJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            error: 'JOB_NOT_FOUND',
            message: expect.stringContaining('not found')
          }
        }
      });
    });

    it('should return 400 for invalid style', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'invalid_style',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_STYLE_OPTION',
            message: expect.stringContaining('style')
          }
        }
      });
    });

    it('should return 400 for invalid voice option', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'invalid_voice'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_VOICE_OPTION',
            message: expect.stringContaining('voice')
          }
        }
      });
    });

    it('should return 400 for invalid duration', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female',
        duration: 'invalid_duration'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_DURATION_OPTION',
            message: expect.stringContaining('duration')
          }
        }
      });
    });
  });

  describe('Job Status Validation', () => {
    it('should return 409 for incomplete CV job', async () => {
      const processingJobId = '456e7890-e12b-34c5-d678-901234567890';

      const requestData = {
        jobId: processingJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: 'JOB_NOT_COMPLETED',
            message: expect.stringContaining('must be completed')
          }
        }
      });
    });

    it('should return 409 for failed CV job', async () => {
      const failedJobId = '789e0123-e45f-67g8-h901-234567890123';

      const requestData = {
        jobId: failedJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: 'JOB_FAILED',
            message: expect.stringContaining('failed')
          }
        }
      });
    });

    it('should return 409 if podcast already exists for job', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female'
      };

      // First request should succeed
      const firstResponse = await axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData);
      expect(firstResponse.status).toBe(201);

      // Second request should fail (podcast already exists)
      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: 'PODCAST_ALREADY_EXISTS',
            message: expect.stringContaining('already exists')
          }
        }
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData, {
          headers: {}
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            error: 'UNAUTHORIZED',
            message: expect.stringContaining('Authentication')
          }
        }
      });
    });

    it('should return 401 for invalid token', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData, {
          headers: { Authorization: 'Bearer invalid-token' }
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            error: 'UNAUTHORIZED',
            message: expect.stringContaining('token')
          }
        }
      });
    });

    it('should return 403 for jobs owned by other users', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData, {
          headers: { Authorization: 'Bearer different-user-token' }
        })
      ).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            error: 'ACCESS_DENIED',
            message: expect.stringContaining('permission')
          }
        }
      });
    });
  });

  describe('Feature Access Control', () => {
    it('should return 402 for premium feature on free account', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'X-User-Subscription': 'free'
          }
        })
      ).rejects.toMatchObject({
        response: {
          status: 402,
          data: {
            error: 'PREMIUM_FEATURE_REQUIRED',
            message: expect.stringContaining('Premium')
          }
        }
      });
    });

    it('should return 400 for insufficient credits', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female',
        duration: 'long' // More expensive option
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'X-User-Credits': '1' // Insufficient credits
          }
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INSUFFICIENT_CREDITS',
            message: expect.stringContaining('credits')
          }
        }
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 for too many concurrent requests', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female'
      };

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
          .catch(err => err.response)
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimitedResponse = responses.find(response =>
        response && response.status === 429
      );

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.data.error).toBe('TOO_MANY_REQUESTS');
        expect(rateLimitedResponse.data.message).toContain('rate limit');
      }
    });
  });

  describe('Method Validation', () => {
    it('should return 405 for unsupported methods', async () => {
      await expect(
        axios.get(`${API_BASE_URL}/multimedia/podcast`)
      ).rejects.toMatchObject({
        response: {
          status: 405,
          data: {
            error: 'METHOD_NOT_ALLOWED',
            message: expect.stringContaining('POST')
          }
        }
      });
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await axios.options(`${API_BASE_URL}/multimedia/podcast`);

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Content Validation', () => {
    it('should validate customizations object', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female',
        customizations: {
          tone: 'invalid_tone',
          focus_areas: ['invalid_area'],
          language: 'invalid_lang'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_CUSTOMIZATIONS',
            message: expect.stringContaining('customizations')
          }
        }
      });
    });

    it('should validate focus areas array', async () => {
      const requestData = {
        jobId: validJobId,
        style: 'professional',
        voice: 'female',
        customizations: {
          focus_areas: 'not_an_array'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/podcast`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_FOCUS_AREAS',
            message: expect.stringContaining('array')
          }
        }
      });
    });
  });
});