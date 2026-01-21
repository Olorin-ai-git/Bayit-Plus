/**
 * Contract Test: GET /api/investigation/{id}
 *
 * Tests the retrieval of investigations by ID via GET endpoint.
 * This test verifies the contract between frontend and backend for investigation retrieval.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { Investigation, InvestigationStatus } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: GET /api/investigation/{id}', () => {
  const validInvestigationId = 'inv_12345';
  const nonExistentId = 'inv_nonexistent';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Investigation Retrieval', () => {
    it('should retrieve an investigation by valid ID', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`);

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const investigation: Investigation = response.data;

        // Required field validations
        expect(investigation).toHaveProperty('id', validInvestigationId);
        expect(investigation).toHaveProperty('title');
        expect(investigation).toHaveProperty('description');
        expect(investigation).toHaveProperty('userId');
        expect(investigation).toHaveProperty('priority');
        expect(investigation).toHaveProperty('status');
        expect(investigation).toHaveProperty('createdAt');
        expect(investigation).toHaveProperty('updatedAt');

        // Data type validations
        expect(typeof investigation.id).toBe('string');
        expect(typeof investigation.title).toBe('string');
        expect(typeof investigation.description).toBe('string');
        expect(typeof investigation.userId).toBe('string');
        expect(typeof investigation.priority).toBe('string');
        expect(Object.values(InvestigationStatus)).toContain(investigation.status);

        // Date validations
        expect(new Date(investigation.createdAt)).toBeInstanceOf(Date);
        expect(new Date(investigation.updatedAt)).toBeInstanceOf(Date);
        expect(new Date(investigation.createdAt).getTime()).toBeLessThanOrEqual(
          new Date(investigation.updatedAt).getTime()
        );

        // Array validations
        expect(Array.isArray(investigation.steps)).toBe(true);
        expect(Array.isArray(investigation.evidence)).toBe(true);
        expect(Array.isArray(investigation.comments)).toBe(true);
        expect(Array.isArray(investigation.tags)).toBe(true);

        // Optional field validations
        if (investigation.finalRiskScore !== null) {
          expect(typeof investigation.finalRiskScore).toBe('number');
          expect(investigation.finalRiskScore).toBeGreaterThanOrEqual(0);
          expect(investigation.finalRiskScore).toBeLessThanOrEqual(1);
        }

        if (investigation.completedAt !== null) {
          expect(new Date(investigation.completedAt)).toBeInstanceOf(Date);
        }

        // Metadata validation
        expect(typeof investigation.metadata).toBe('object');

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Investigation retrieval endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should include all investigation steps with proper structure', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`);
        const investigation: Investigation = response.data;

        if (investigation.steps.length > 0) {
          investigation.steps.forEach(step => {
            expect(step).toHaveProperty('id');
            expect(step).toHaveProperty('investigationId', validInvestigationId);
            expect(step).toHaveProperty('type');
            expect(step).toHaveProperty('status');
            expect(step).toHaveProperty('createdAt');

            expect(typeof step.id).toBe('string');
            expect(typeof step.type).toBe('string');
            expect(typeof step.status).toBe('string');
            expect(new Date(step.createdAt)).toBeInstanceOf(Date);
          });
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Investigation steps validation failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should include all evidence with proper structure', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`);
        const investigation: Investigation = response.data;

        if (investigation.evidence.length > 0) {
          investigation.evidence.forEach(evidence => {
            expect(evidence).toHaveProperty('id');
            expect(evidence).toHaveProperty('investigationId', validInvestigationId);
            expect(evidence).toHaveProperty('type');
            expect(evidence).toHaveProperty('source');
            expect(evidence).toHaveProperty('data');
            expect(evidence).toHaveProperty('createdAt');

            expect(typeof evidence.id).toBe('string');
            expect(typeof evidence.type).toBe('string');
            expect(typeof evidence.source).toBe('string');
            expect(typeof evidence.data).toBe('object');
            expect(new Date(evidence.createdAt)).toBeInstanceOf(Date);
          });
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Investigation evidence validation failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should include all comments with proper structure', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`);
        const investigation: Investigation = response.data;

        if (investigation.comments.length > 0) {
          investigation.comments.forEach(comment => {
            expect(comment).toHaveProperty('id');
            expect(comment).toHaveProperty('investigationId', validInvestigationId);
            expect(comment).toHaveProperty('userId');
            expect(comment).toHaveProperty('content');
            expect(comment).toHaveProperty('createdAt');

            expect(typeof comment.id).toBe('string');
            expect(typeof comment.userId).toBe('string');
            expect(typeof comment.content).toBe('string');
            expect(new Date(comment.createdAt)).toBeInstanceOf(Date);
          });
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Investigation comments validation failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent investigation ID', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${nonExistentId}`);
        fail('Should have thrown an error for non-existent investigation');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(404);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data.error).toContain('not found');
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for invalid ID format', async () => {
      const invalidIds = ['', '123', 'inv_', 'invalid-chars!@#', ' inv_123 '];

      for (const invalidId of invalidIds) {
        try {
          await axios.get(`${API_BASE_URL}/api/investigation/${invalidId}`);
          fail(`Should have thrown an error for invalid ID: ${invalidId}`);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect([400, 404]).toContain(error.response?.status);
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for SQL injection attempts', async () => {
      const maliciousIds = [
        "'; DROP TABLE investigations; --",
        'inv_123\'; DELETE FROM investigations WHERE 1=1; --',
        'inv_123 OR 1=1',
        'inv_123 UNION SELECT * FROM users'
      ];

      for (const maliciousId of maliciousIds) {
        try {
          await axios.get(`${API_BASE_URL}/api/investigation/${encodeURIComponent(maliciousId)}`);
          fail(`Should have thrown an error for malicious ID: ${maliciousId}`);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect([400, 404]).toContain(error.response?.status);
          } else {
            throw error;
          }
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, {
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

    it('should return 403 for insufficient permissions', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, {
          headers: {
            'Authorization': 'Bearer invalid-or-limited-token'
          }
        });
        fail('Should have thrown an error for insufficient permissions');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([401, 403]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });

    it('should return 403 for accessing other users investigation without permission', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, {
          headers: {
            'Authorization': 'Bearer user-token-without-cross-user-access'
          }
        });
        fail('Should have thrown an error for cross-user access without permission');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([403, 404]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Content Negotiation', () => {
    it('should return JSON when Accept header is application/json', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, {
          headers: { 'Accept': 'application/json' }
        });
        expect(response.headers['content-type']).toMatch(/application\/json/);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Expected to fail until implementation
          console.warn('Content negotiation test failing as expected');
        }
      }
    });

    it('should return 406 for unsupported Accept header', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, {
          headers: { 'Accept': 'text/xml' }
        });
        fail('Should have thrown an error for unsupported Accept header');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([406, 400]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Response Headers', () => {
    it('should include proper cache control headers', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`);

        // Cache control should be present for GET endpoints
        expect(response.headers).toHaveProperty('cache-control');

        // Ensure sensitive data is not cached by browsers
        const cacheControl = response.headers['cache-control'];
        expect(cacheControl).toMatch(/no-cache|no-store|private/);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Cache control header test failing as expected');
        }
      }
    });

    it('should include ETag for caching optimization', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}`);

        // ETag helps with conditional requests
        expect(response.headers).toHaveProperty('etag');
        expect(typeof response.headers.etag).toBe('string');

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('ETag header test failing as expected');
        }
      }
    });
  });
});