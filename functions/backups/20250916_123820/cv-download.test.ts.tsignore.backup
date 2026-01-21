// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Contract Test: GET /cv/download/{jobId}
 *
 * This test validates the API contract for CV file download endpoint.
 * It MUST FAIL initially (TDD Red phase) before implementation.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Import local constants and types
import { PROCESSING_CONFIG, ERROR_MESSAGES } from '../../shared/constants';
import { CVStatus, ProcessingType } from '../../shared/types';
import { JobStatus } from '../../types/processing.types';
import { createMockProcessingResponse } from '../../__tests__/setup';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/getmycv-ai/us-central1';

describe('Contract: GET /cv/download/{jobId}', () => {
  let authToken: string;
  let completedJobId: string;

  beforeAll(async () => {
    // Mock authentication token for testing
    authToken = 'test-bearer-token';
    // Mock completed job ID
    completedJobId = uuidv4();
  });

  afterAll(async () => {
    // Cleanup any test data if needed
  });

  describe('Success Cases - PDF Format', () => {
    it('should return 200 with PDF file for default format', async () => {
      // Act
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer' // Binary data
      });

      // Assert - Contract validation
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/^attachment; filename=".*\.pdf"$/);
      expect(Buffer.isBuffer(response.data) || response.data instanceof ArrayBuffer).toBe(true);
      expect(response.data.byteLength || response.data.length).toBeGreaterThan(0);
    });

    it('should return 200 with PDF file when format=pdf', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=pdf`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('.pdf');
    });
  });

  describe('Success Cases - DOCX Format', () => {
    it('should return 200 with DOCX file when format=docx', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=docx`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers['content-disposition']).toContain('.docx');
      expect(Buffer.isBuffer(response.data) || response.data instanceof ArrayBuffer).toBe(true);
      expect(response.data.byteLength || response.data.length).toBeGreaterThan(0);
    });
  });

  describe('Success Cases - HTML Format', () => {
    it('should return 200 with HTML file when format=html', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=html`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/html');
      expect(response.headers['content-disposition']).toContain('.html');
      expect(typeof response.data).toBe('string');
      expect(response.data.length).toBeGreaterThan(0);
      // Validate it's valid HTML
      expect(response.data).toMatch(/<html.*?>.*<\/html>/s);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent job ID', async () => {
      const nonExistentJobId = uuidv4();

      try {
        await axios.get(`${API_BASE_URL}/cv/download/${nonExistentJobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data).toHaveProperty('message');
        expect(error.response.data.error).toBe('JOB_NOT_FOUND');
        expect(error.response.data.message).toContain(nonExistentJobId);
      }
    });

    it('should return 401 for missing authorization', async () => {
      try {
        await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
          headers: {
            'Content-Type': 'application/json'
            // No Authorization header
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('UNAUTHORIZED');
      }
    });

    it('should return 401 for invalid authorization token', async () => {
      try {
        await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
          headers: {
            'Authorization': 'Bearer invalid-token'
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('INVALID_TOKEN');
      }
    });

    it('should return 400 for malformed job ID', async () => {
      const malformedJobId = 'not-a-valid-uuid';

      try {
        await axios.get(`${API_BASE_URL}/cv/download/${malformedJobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('INVALID_JOB_ID_FORMAT');
      }
    });

    it('should return 400 for unsupported format', async () => {
      try {
        await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=invalid`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('UNSUPPORTED_FORMAT');
        expect(error.response.data.message).toContain('pdf, docx, html');
      }
    });

    it('should return 409 for job not completed', async () => {
      const processingJobId = uuidv4(); // Job still in progress

      try {
        await axios.get(`${API_BASE_URL}/cv/download/${processingJobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error).toBe('JOB_NOT_COMPLETED');
        expect(error.response.data.message).toContain('processing');
      }
    });

    it('should return 403 when accessing another users job', async () => {
      const otherUserJobId = uuidv4();

      try {
        await axios.get(`${API_BASE_URL}/cv/download/${otherUserJobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('ACCESS_DENIED');
        expect(error.response.data.message).toContain('permission');
      }
    });

    it('should return 410 for expired job', async () => {
      const expiredJobId = uuidv4(); // Job that has expired

      try {
        await axios.get(`${API_BASE_URL}/cv/download/${expiredJobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(410);
        expect(error.response.data.error).toBe('JOB_EXPIRED');
        expect(error.response.data.message).toContain('expired');
      }
    });
  });

  describe('Format Parameter Validation', () => {
    const validFormats = ['pdf', 'docx', 'html'];

    validFormats.forEach(format => {
      it(`should accept format=${format}`, async () => {
        const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=${format}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          responseType: format === 'html' ? 'text' : 'arraybuffer'
        });

        expect(response.status).toBe(200);
      });
    });

    it('should ignore case for format parameter', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=PDF`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('Response Headers Validation', () => {
    it('should include proper cache headers', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers).toHaveProperty('etag');
      expect(response.headers['cache-control']).toContain('private');
    });

    it('should include content-length header', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('content-length');
      expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });

    it('should include proper filename in content-disposition', async () => {
      const response = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}?format=pdf`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toMatch(/^attachment; filename="enhanced-cv-[a-zA-Z0-9-]+\.pdf"$/);
    });
  });

  describe('Conditional Download Support', () => {
    it('should support If-None-Match header for caching', async () => {
      // First request to get ETag
      const firstResponse = await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      });

      expect(firstResponse.status).toBe(200);
      const etag = firstResponse.headers['etag'];

      // Second request with If-None-Match
      try {
        await axios.get(`${API_BASE_URL}/cv/download/${completedJobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'If-None-Match': etag
          }
        });
        fail('Expected 304 Not Modified');
      } catch (error: any) {
        expect(error.response.status).toBe(304);
      }
    });
  });
});