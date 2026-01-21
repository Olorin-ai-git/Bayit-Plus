// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Contract Test: POST /cv/upload
 *
 * This test validates the API contract for CV file upload endpoint.
 * It MUST FAIL initially (TDD Red phase) before implementation.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import FormData from 'form-data';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import local constants and types
import { PROCESSING_CONFIG, ERROR_MESSAGES } from '../../shared/constants';
import { CVStatus, ProcessingType } from '../../shared/types';
import { JobStatus } from '../../types/processing.types';
import { createMockProcessingRequest } from '../../__tests__/setup';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/getmycv-ai/us-central1';
const TEST_CV_PATH = join(__dirname, '../../test-data/sample-cv.pdf');

describe('Contract: POST /cv/upload', () => {
  let authToken: string;

  beforeAll(async () => {
    // Mock authentication token for testing
    authToken = 'test-bearer-token';
  });

  afterAll(async () => {
    // Cleanup any test data if needed
  });

  describe('Success Cases', () => {
    it('should return 201 with valid CV file upload', async () => {
      // Arrange
      const formData = new FormData();

      // Create a mock PDF buffer for testing
      const mockPdfBuffer = Buffer.from('%PDF-1.4\nMock CV content for testing');
      formData.append('file', mockPdfBuffer, {
        filename: 'test-cv.pdf',
        contentType: 'application/pdf'
      });

      formData.append('features', JSON.stringify(['ats_optimization', 'personality_insights']));
      formData.append('customizations', JSON.stringify({
        ats_optimization: { target_keywords: ['software', 'engineer'] },
        personality_insights: { analysis_depth: 'detailed' }
      }));

      // Act & Assert
      const response = await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      });

      // Contract assertions
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('userId');
      expect(response.data).toHaveProperty('features');
      expect(response.data).toHaveProperty('createdAt');
      expect(response.data).toHaveProperty('estimatedCompletionTime');

      // Data type validations
      expect(typeof response.data.jobId).toBe('string');
      expect(typeof response.data.status).toBe('string');
      expect(typeof response.data.userId).toBe('string');
      expect(Array.isArray(response.data.features)).toBe(true);
      expect(typeof response.data.createdAt).toBe('string');
      expect(typeof response.data.estimatedCompletionTime).toBe('string');

      // Status should be 'running' or 'queued'
      expect([JobStatus.RUNNING, JobStatus.QUEUED]).toContain(response.data.status);
    });

    it('should accept PDF files', async () => {
      const formData = new FormData();
      const mockPdfBuffer = Buffer.from('%PDF-1.4\nMock CV content');

      formData.append('file', mockPdfBuffer, {
        filename: 'cv.pdf',
        contentType: 'application/pdf'
      });

      const response = await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      });

      expect(response.status).toBe(201);
    });

    it('should accept DOCX files', async () => {
      const formData = new FormData();
      const mockDocxBuffer = Buffer.from('Mock DOCX content');

      formData.append('file', mockDocxBuffer, {
        filename: 'cv.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const response = await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      });

      expect(response.status).toBe(201);
    });

    it('should accept TXT files', async () => {
      const formData = new FormData();

      formData.append('file', Buffer.from('Mock CV text content'), {
        filename: 'cv.txt',
        contentType: 'text/plain'
      });

      const response = await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for missing file', async () => {
      const formData = new FormData();
      // No file attached

      try {
        await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            ...formData.getHeaders()
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data).toHaveProperty('message');
        expect(error.response.data.error).toBe('MISSING_REQUIRED_FIELD');
      }
    });

    it('should return 401 for missing authorization', async () => {
      const formData = new FormData();

      formData.append('file', Buffer.from('Mock content'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf'
      });

      try {
        await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
          headers: {
            ...formData.getHeaders()
            // No Authorization header
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toBe('UNAUTHORIZED');
      }
    });

    it('should return 413 for file size exceeding 10MB', async () => {
      const formData = new FormData();

      // Create a mock file larger than the configured max size
      const largeBuffer = Buffer.alloc(PROCESSING_CONFIG.MAX_FILE_SIZE + 1024, 'a'); // Exceed max size by 1KB
      formData.append('file', largeBuffer, {
        filename: 'large-cv.pdf',
        contentType: 'application/pdf'
      });

      try {
        await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            ...formData.getHeaders()
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(413);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toBe('PAYLOAD_TOO_LARGE');
      }
    });

    it('should return 400 for unsupported file format', async () => {
      const formData = new FormData();

      formData.append('file', Buffer.from('Mock content'), {
        filename: 'cv.xyz',
        contentType: 'application/unsupported'
      });

      try {
        await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            ...formData.getHeaders()
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toBe('UNSUPPORTED_FILE_FORMAT');
      }
    });
  });

  describe('Feature Validation', () => {
    it('should accept valid feature selection', async () => {
      const formData = new FormData();

      formData.append('file', Buffer.from('%PDF-1.4\nMock content'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf'
      });

      const validFeatures = [
        'ats_optimization',
        'personality_insights',
        'ai_podcast',
        'video_introduction',
        'interactive_timeline',
        'portfolio_gallery'
      ];

      formData.append('features', JSON.stringify(validFeatures));

      const response = await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.features).toEqual(expect.arrayContaining(validFeatures));
    });

    it('should return 400 for invalid feature selection', async () => {
      const formData = new FormData();

      formData.append('file', Buffer.from('%PDF-1.4\nMock content'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf'
      });

      formData.append('features', JSON.stringify(['invalid_feature']));

      try {
        await axios.post(`${API_BASE_URL}/cv/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            ...formData.getHeaders()
          }
        });
        fail('Expected request to fail');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('INVALID_FEATURE_SELECTION');
      }
    });
  });
});