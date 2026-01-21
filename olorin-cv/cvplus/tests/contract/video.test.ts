/**
 * Contract Test: POST /multimedia/video
 *
 * Tests the AI video generation endpoint following TDD principles.
 * This test MUST FAIL initially (RED phase), then pass after implementation (GREEN phase).
 *
 * @fileoverview Contract test for AI video generation endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

// Test configuration
const API_BASE_URL = process.env.VITE_FIREBASE_FUNCTION_URL || 'http://localhost:5001';
const TEST_TIMEOUT = 120000; // 2 minutes for video generation operations

// Mock authentication token (in real implementation, would be Firebase Auth)
const authToken = 'mock-firebase-auth-token';

// Mock test data
const validJobId = '123e4567-e89b-12d3-a456-426614174000';
const invalidJobId = 'invalid-job-id';
const nonExistentJobId = '000e0000-e00b-00d0-a000-000000000000';

describe('Contract Test: POST /multimedia/video', () => {
  beforeAll(() => {
    // Configure axios defaults for tests
    axios.defaults.timeout = TEST_TIMEOUT;
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  });

  describe('Success Cases', () => {
    it('should return 201 with video generation job created', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male',
        style: 'formal',
        duration: 60,
        customizations: {
          background: 'office',
          outfit: 'business_suit',
          script_style: 'conversational',
          include_achievements: true,
          include_contact_info: true,
          transition_effects: true
        }
      };

      // This MUST fail initially (TDD Red phase)
      const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('videoJobId');
      expect(response.data).toHaveProperty('originalJobId');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('type');
      expect(response.data).toHaveProperty('estimatedDuration');
      expect(response.data).toHaveProperty('estimatedCompletionTime');
      expect(response.data).toHaveProperty('createdAt');

      // Validate response structure
      expect(typeof response.data.videoJobId).toBe('string');
      expect(response.data.videoJobId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(response.data.originalJobId).toBe(validJobId);
      expect(response.data.status).toBe('queued');
      expect(response.data.type).toBe('introduction');
      expect(typeof response.data.estimatedDuration).toBe('number');
      expect(typeof response.data.estimatedCompletionTime).toBe('string');
    }, TEST_TIMEOUT);

    it('should handle different video types', async () => {
      const videoTypes = ['introduction', 'elevator_pitch', 'skills_showcase', 'testimonial'];

      for (const type of videoTypes) {
        const requestData = {
          jobId: validJobId,
          type: type,
          avatar: 'professional_female',
          style: 'casual',
          duration: 45
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.videoJobId).toBeDefined();
        expect(response.data.type).toBe(type);
      }
    }, TEST_TIMEOUT);

    it('should handle different avatar options', async () => {
      const avatarOptions = [
        'professional_male',
        'professional_female',
        'casual_male',
        'casual_female',
        'diverse_male',
        'diverse_female'
      ];

      for (const avatar of avatarOptions) {
        const requestData = {
          jobId: validJobId,
          type: 'introduction',
          avatar: avatar,
          style: 'formal',
          duration: 30
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.videoJobId).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should handle different style options', async () => {
      const styleOptions = ['formal', 'casual', 'dynamic', 'creative', 'corporate'];

      for (const style of styleOptions) {
        const requestData = {
          jobId: validJobId,
          type: 'elevator_pitch',
          avatar: 'professional_male',
          style: style,
          duration: 60
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.videoJobId).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should handle custom duration within limits', async () => {
      const validDurations = [15, 30, 45, 60, 90, 120];

      for (const duration of validDurations) {
        const requestData = {
          jobId: validJobId,
          type: 'introduction',
          avatar: 'professional_female',
          style: 'formal',
          duration: duration
        };

        const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.estimatedDuration).toBe(duration);
      }
    }, TEST_TIMEOUT);

    it('should accept advanced customizations', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'skills_showcase',
        avatar: 'diverse_female',
        style: 'creative',
        duration: 90,
        customizations: {
          background: 'modern_office',
          outfit: 'business_casual',
          script_style: 'storytelling',
          voice_tone: 'confident',
          include_achievements: true,
          include_skills_animation: true,
          include_contact_info: true,
          transition_effects: true,
          call_to_action: 'Let\'s connect on LinkedIn',
          brand_colors: {
            primary: '#007bff',
            secondary: '#28a745'
          },
          logo_overlay: true,
          subtitles: true,
          language: 'en-US'
        }
      };

      const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.videoJobId).toBeDefined();
      expect(response.data.status).toBe('queued');
    }, TEST_TIMEOUT);

    it('should handle minimal request with defaults', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction'
      };

      const response = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.videoJobId).toBeDefined();
      // Should apply default values
      expect(response.data.status).toBe('queued');
      expect(response.data.type).toBe('introduction');
    }, TEST_TIMEOUT);
  });

  describe('Validation Error Cases', () => {
    it('should return 400 for missing jobId', async () => {
      const requestData = {
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
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

    it('should return 400 for missing type', async () => {
      const requestData = {
        jobId: validJobId,
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'MISSING_REQUIRED_FIELD',
            message: expect.stringContaining('type')
          }
        }
      });
    });

    it('should return 400 for invalid jobId format', async () => {
      const requestData = {
        jobId: invalidJobId,
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
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

    it('should return 400 for invalid video type', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'invalid_type',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_VIDEO_TYPE',
            message: expect.stringContaining('type')
          }
        }
      });
    });

    it('should return 400 for invalid avatar option', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'invalid_avatar'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_AVATAR_OPTION',
            message: expect.stringContaining('avatar')
          }
        }
      });
    });

    it('should return 400 for invalid style', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male',
        style: 'invalid_style'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
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

    it('should return 400 for invalid duration', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male',
        duration: 300 // Too long
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_DURATION',
            message: expect.stringContaining('duration')
          }
        }
      });
    });

    it('should return 400 for duration too short', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male',
        duration: 5 // Too short
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'DURATION_TOO_SHORT',
            message: expect.stringContaining('minimum')
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
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

    it('should return 409 if video already exists for job and type', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male'
      };

      // First request should succeed
      const firstResponse = await axios.post(`${API_BASE_URL}/multimedia/video`, requestData);
      expect(firstResponse.status).toBe(201);

      // Second request should fail (video already exists)
      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: 'VIDEO_ALREADY_EXISTS',
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData, {
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData, {
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData, {
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
        type: 'introduction',
        avatar: 'professional_male'
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData, {
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
        type: 'skills_showcase', // More expensive type
        avatar: 'professional_male',
        duration: 120 // Longer duration costs more
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'X-User-Credits': '2' // Insufficient credits
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
    it('should return 429 for too many concurrent video requests', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male'
      };

      // Make multiple concurrent requests (videos are resource-intensive)
      const requests = Array(3).fill(null).map(() =>
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
          .catch(err => err.response)
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited due to resource constraints
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
        axios.get(`${API_BASE_URL}/multimedia/video`)
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
      const response = await axios.options(`${API_BASE_URL}/multimedia/video`);

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Customization Validation', () => {
    it('should validate brand colors format', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male',
        customizations: {
          brand_colors: {
            primary: 'invalid-color', // Invalid hex color
            secondary: '#28a745'
          }
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_COLOR_FORMAT',
            message: expect.stringContaining('hex color')
          }
        }
      });
    });

    it('should validate call-to-action length', async () => {
      const requestData = {
        jobId: validJobId,
        type: 'introduction',
        avatar: 'professional_male',
        customizations: {
          call_to_action: 'A'.repeat(201) // Too long
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/multimedia/video`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'CALL_TO_ACTION_TOO_LONG',
            message: expect.stringContaining('200 characters')
          }
        }
      });
    });
  });
});