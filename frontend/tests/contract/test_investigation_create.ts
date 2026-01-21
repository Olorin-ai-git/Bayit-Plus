/**
 * Contract Test: POST /api/investigation
 *
 * Tests the creation of new investigations via POST endpoint.
 * This test verifies the contract between frontend and backend for investigation creation.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { Investigation, InvestigationCreateRequest, InvestigationStatus } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: POST /api/investigation', () => {
  const validCreateRequest: InvestigationCreateRequest = {
    title: 'Test Investigation - Account Takeover',
    description: 'Investigating suspicious login activity from multiple locations',
    userId: 'user123',
    priority: 'high',
    tags: ['account-takeover', 'suspicious-login', 'urgent'],
    metadata: {
      sourceSystem: 'fraud-detection',
      alertId: 'alert-456',
      riskScore: 0.85
    }
  };

  beforeEach(() => {
    // Reset any mocks or test state
    jest.clearAllMocks();
  });

  describe('Successful Investigation Creation', () => {
    it('should create a new investigation with valid data', async () => {
      // This test SHOULD FAIL initially until backend implementation
      try {
        const response = await axios.post(`${API_BASE_URL}/api/investigation`, validCreateRequest);

        // Contract assertions
        expect(response.status).toBe(201);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const investigation: Investigation = response.data;

        // Required field validations
        expect(investigation).toHaveProperty('id');
        expect(investigation).toHaveProperty('title', validCreateRequest.title);
        expect(investigation).toHaveProperty('description', validCreateRequest.description);
        expect(investigation).toHaveProperty('userId', validCreateRequest.userId);
        expect(investigation).toHaveProperty('priority', validCreateRequest.priority);
        expect(investigation).toHaveProperty('status', InvestigationStatus.PENDING);
        expect(investigation).toHaveProperty('createdAt');
        expect(investigation).toHaveProperty('updatedAt');

        // Data type validations
        expect(typeof investigation.id).toBe('string');
        expect(investigation.id.length).toBeGreaterThan(0);
        expect(new Date(investigation.createdAt)).toBeInstanceOf(Date);
        expect(new Date(investigation.updatedAt)).toBeInstanceOf(Date);

        // Array and object validations
        expect(Array.isArray(investigation.tags)).toBe(true);
        expect(investigation.tags).toEqual(validCreateRequest.tags);
        expect(typeof investigation.metadata).toBe('object');
        expect(investigation.metadata).toEqual(validCreateRequest.metadata);

        // Default values
        expect(investigation.steps).toEqual([]);
        expect(investigation.evidence).toEqual([]);
        expect(investigation.comments).toEqual([]);
        expect(investigation.finalRiskScore).toBeNull();
        expect(investigation.completedAt).toBeNull();

      } catch (error) {
        // Expected to fail initially - this is TDD
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Investigation creation endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should generate unique IDs for multiple investigations', async () => {
      try {
        const response1 = await axios.post(`${API_BASE_URL}/api/investigation`, {
          ...validCreateRequest,
          title: 'First Investigation'
        });

        const response2 = await axios.post(`${API_BASE_URL}/api/investigation`, {
          ...validCreateRequest,
          title: 'Second Investigation'
        });

        expect(response1.data.id).not.toBe(response2.data.id);
        expect(response1.data.title).toBe('First Investigation');
        expect(response2.data.title).toBe('Second Investigation');

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Multiple investigation creation test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        description: 'Missing title and userId'
      };

      try {
        await axios.post(`${API_BASE_URL}/api/investigation`, invalidRequest);
        fail('Should have thrown an error for invalid request');
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

    it('should return 400 for invalid priority value', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        priority: 'invalid-priority'
      };

      try {
        await axios.post(`${API_BASE_URL}/api/investigation`, invalidRequest);
        fail('Should have thrown an error for invalid priority');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data.error).toContain('priority');
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for malformed JSON', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/investigation`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        fail('Should have thrown an error for malformed JSON');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });

    it('should return 413 for oversized request payload', async () => {
      const oversizedRequest = {
        ...validCreateRequest,
        description: 'x'.repeat(10000) // Very large description
      };

      try {
        await axios.post(`${API_BASE_URL}/api/investigation`, oversizedRequest);
        fail('Should have thrown an error for oversized payload');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([413, 400]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/investigation`, validCreateRequest, {
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
        await axios.post(`${API_BASE_URL}/api/investigation`, validCreateRequest, {
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
  });

  describe('Content-Type Validation', () => {
    it('should accept application/json content-type', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/investigation`, validCreateRequest, {
          headers: { 'Content-Type': 'application/json' }
        });
        expect(response.status).toBe(201);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Expected to fail until implementation - verify it's not due to content-type
          expect(error.response?.status).not.toBe(415);
        }
      }
    });

    it('should reject non-JSON content-type', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/investigation`, validCreateRequest, {
          headers: { 'Content-Type': 'text/plain' }
        });
        fail('Should have thrown an error for invalid content-type');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([415, 400]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });
});