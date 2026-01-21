/**
 * Contract Test: POST /profile/public
 *
 * Tests the public profile creation endpoint following TDD principles.
 * This test MUST FAIL initially (RED phase), then pass after implementation (GREEN phase).
 *
 * @fileoverview Contract test for public profile creation endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

// Test configuration
const API_BASE_URL = process.env.VITE_FIREBASE_FUNCTION_URL || 'http://localhost:5001';
const TEST_TIMEOUT = 30000;

// Mock authentication token (in real implementation, would be Firebase Auth)
const authToken = 'mock-firebase-auth-token';

// Mock test data
const validJobId = '123e4567-e89b-12d3-a456-426614174000';
const invalidJobId = 'invalid-job-id';
const nonExistentJobId = '000e0000-e00b-00d0-a000-000000000000';

describe('Contract Test: POST /profile/public', () => {
  beforeAll(() => {
    // Configure axios defaults for tests
    axios.defaults.timeout = TEST_TIMEOUT;
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  });

  describe('Success Cases', () => {
    it('should return 201 with public profile created', async () => {
      const requestData = {
        jobId: validJobId,
        settings: {
          visibility: 'public',
          customUrl: 'john-doe-portfolio',
          theme: 'professional',
          includeContact: true,
          includeDownloadLinks: true,
          includeSocialMedia: true,
          includeTestimonials: false
        },
        personalInfo: {
          displayName: 'John Doe',
          tagline: 'Full Stack Developer & UI/UX Designer',
          bio: 'Passionate developer with 5+ years of experience building scalable web applications.',
          location: 'San Francisco, CA',
          timezone: 'America/Los_Angeles'
        },
        contactInfo: {
          email: 'john@example.com',
          phone: '+1 (555) 123-4567',
          website: 'https://johndoe.dev',
          linkedin: 'https://linkedin.com/in/johndoe',
          github: 'https://github.com/johndoe'
        }
      };

      // This MUST fail initially (TDD Red phase)
      const response = await axios.post(`${API_BASE_URL}/profile/public`, requestData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('profileId');
      expect(response.data).toHaveProperty('publicUrl');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('jobId');
      expect(response.data).toHaveProperty('createdAt');
      expect(response.data).toHaveProperty('settings');

      // Validate response structure
      expect(typeof response.data.profileId).toBe('string');
      expect(response.data.profileId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(response.data.jobId).toBe(validJobId);
      expect(response.data.status).toBe('active');
      expect(typeof response.data.publicUrl).toBe('string');
      expect(response.data.publicUrl).toContain('john-doe-portfolio');
    }, TEST_TIMEOUT);

    it('should handle different themes', async () => {
      const themes = ['professional', 'creative', 'minimal', 'modern', 'classic'];

      for (const theme of themes) {
        const requestData = {
          jobId: validJobId,
          settings: {
            visibility: 'public',
            customUrl: `test-${theme}-theme`,
            theme: theme
          },
          personalInfo: {
            displayName: 'Test User',
            tagline: 'Testing themes'
          }
        };

        const response = await axios.post(`${API_BASE_URL}/profile/public`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.profileId).toBeDefined();
        expect(response.data.settings.theme).toBe(theme);
      }
    }, TEST_TIMEOUT);

    it('should handle different visibility options', async () => {
      const visibilityOptions = ['public', 'unlisted', 'private'];

      for (const visibility of visibilityOptions) {
        const requestData = {
          jobId: validJobId,
          settings: {
            visibility: visibility,
            customUrl: `test-${visibility}-profile`
          },
          personalInfo: {
            displayName: 'Test User'
          }
        };

        const response = await axios.post(`${API_BASE_URL}/profile/public`, requestData);

        expect(response.status).toBe(201);
        expect(response.data.settings.visibility).toBe(visibility);
      }
    }, TEST_TIMEOUT);

    it('should generate custom URL when not provided', async () => {
      const requestData = {
        jobId: validJobId,
        settings: {
          visibility: 'public',
          theme: 'professional'
        },
        personalInfo: {
          displayName: 'Jane Smith',
          tagline: 'Data Scientist'
        }
      };

      const response = await axios.post(`${API_BASE_URL}/profile/public`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.publicUrl).toMatch(/jane-smith/);
    }, TEST_TIMEOUT);

    it('should accept minimal configuration', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'Minimal User'
        }
      };

      const response = await axios.post(`${API_BASE_URL}/profile/public`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.profileId).toBeDefined();
      // Should apply defaults
      expect(response.data.settings.visibility).toBe('public');
      expect(response.data.settings.theme).toBe('professional');
    }, TEST_TIMEOUT);

    it('should handle social media links', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'Social Media User'
        },
        contactInfo: {
          email: 'user@example.com',
          linkedin: 'https://linkedin.com/in/user',
          github: 'https://github.com/user',
          twitter: 'https://twitter.com/user',
          instagram: 'https://instagram.com/user',
          behance: 'https://behance.net/user',
          dribbble: 'https://dribbble.com/user'
        },
        settings: {
          includeSocialMedia: true
        }
      };

      const response = await axios.post(`${API_BASE_URL}/profile/public`, requestData);

      expect(response.status).toBe(201);
      expect(response.data.profileId).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Validation Error Cases', () => {
    it('should return 400 for missing jobId', async () => {
      const requestData = {
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
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

    it('should return 400 for missing displayName', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          tagline: 'Developer without a name'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'MISSING_REQUIRED_FIELD',
            message: expect.stringContaining('displayName')
          }
        }
      });
    });

    it('should return 400 for invalid jobId format', async () => {
      const requestData = {
        jobId: invalidJobId,
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
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
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
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

    it('should return 400 for invalid theme', async () => {
      const requestData = {
        jobId: validJobId,
        settings: {
          theme: 'invalid_theme'
        },
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_THEME',
            message: expect.stringContaining('theme')
          }
        }
      });
    });

    it('should return 400 for invalid visibility option', async () => {
      const requestData = {
        jobId: validJobId,
        settings: {
          visibility: 'invalid_visibility'
        },
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_VISIBILITY_OPTION',
            message: expect.stringContaining('visibility')
          }
        }
      });
    });

    it('should return 400 for invalid email format', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'John Doe'
        },
        contactInfo: {
          email: 'invalid-email-format'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_EMAIL_FORMAT',
            message: expect.stringContaining('email')
          }
        }
      });
    });

    it('should return 400 for invalid URL format', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'John Doe'
        },
        contactInfo: {
          website: 'not-a-valid-url'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_URL_FORMAT',
            message: expect.stringContaining('URL')
          }
        }
      });
    });

    it('should return 409 for duplicate customUrl', async () => {
      const requestData = {
        jobId: validJobId,
        settings: {
          customUrl: 'existing-profile-url'
        },
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      // First request should succeed
      const firstResponse = await axios.post(`${API_BASE_URL}/profile/public`, requestData);
      expect(firstResponse.status).toBe(201);

      // Second request with same URL should fail
      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, {
          ...requestData,
          jobId: '456e7890-e12b-34c5-d678-901234567890'
        })
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: 'CUSTOM_URL_ALREADY_EXISTS',
            message: expect.stringContaining('already taken')
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
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
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
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
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

    it('should return 409 if public profile already exists for job', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      // First request should succeed
      const firstResponse = await axios.post(`${API_BASE_URL}/profile/public`, requestData);
      expect(firstResponse.status).toBe(201);

      // Second request should fail (profile already exists)
      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: 'PROFILE_ALREADY_EXISTS',
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
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData, {
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
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData, {
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
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData, {
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

  describe('Method Validation', () => {
    it('should return 405 for unsupported methods', async () => {
      await expect(
        axios.get(`${API_BASE_URL}/profile/public`)
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
      const response = await axios.options(`${API_BASE_URL}/profile/public`);

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Content Validation', () => {
    it('should validate bio length', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'John Doe',
          bio: 'A'.repeat(1001) // Too long
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'BIO_TOO_LONG',
            message: expect.stringContaining('1000 characters')
          }
        }
      });
    });

    it('should validate tagline length', async () => {
      const requestData = {
        jobId: validJobId,
        personalInfo: {
          displayName: 'John Doe',
          tagline: 'A'.repeat(201) // Too long
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'TAGLINE_TOO_LONG',
            message: expect.stringContaining('200 characters')
          }
        }
      });
    });

    it('should validate customUrl format', async () => {
      const requestData = {
        jobId: validJobId,
        settings: {
          customUrl: 'invalid url with spaces!'
        },
        personalInfo: {
          displayName: 'John Doe'
        }
      };

      await expect(
        axios.post(`${API_BASE_URL}/profile/public`, requestData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'INVALID_CUSTOM_URL_FORMAT',
            message: expect.stringContaining('alphanumeric')
          }
        }
      });
    });
  });
});