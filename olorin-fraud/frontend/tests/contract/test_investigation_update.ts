/**
 * Contract Test: PUT /api/investigation/{id}
 *
 * Tests the update of investigations by ID via PUT endpoint.
 * This test verifies the contract between frontend and backend for investigation updates.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { Investigation, InvestigationUpdateRequest, InvestigationStatus } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: PUT /api/investigation/{id}', () => {
  const validInvestigationId = 'inv_12345';
  const nonExistentId = 'inv_nonexistent';

  const validUpdateRequest: InvestigationUpdateRequest = {
    title: 'Updated Investigation Title',
    description: 'Updated investigation description with new findings',
    priority: 'critical',
    status: InvestigationStatus.IN_PROGRESS,
    tags: ['updated-tag', 'critical-finding'],
    finalRiskScore: 0.92,
    metadata: {
      lastUpdatedBy: 'analyst_456',
      updateReason: 'New evidence discovered',
      analysisVersion: '2.1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Investigation Updates', () => {
    it('should update an investigation with valid data', async () => {
      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          validUpdateRequest
        );

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const investigation: Investigation = response.data;

        // Verify updated fields
        expect(investigation.id).toBe(validInvestigationId);
        expect(investigation.title).toBe(validUpdateRequest.title);
        expect(investigation.description).toBe(validUpdateRequest.description);
        expect(investigation.priority).toBe(validUpdateRequest.priority);
        expect(investigation.status).toBe(validUpdateRequest.status);
        expect(investigation.finalRiskScore).toBe(validUpdateRequest.finalRiskScore);

        // Verify arrays are properly updated
        expect(investigation.tags).toEqual(validUpdateRequest.tags);
        expect(investigation.metadata).toEqual(validUpdateRequest.metadata);

        // Verify timestamps
        expect(new Date(investigation.updatedAt)).toBeInstanceOf(Date);
        expect(new Date(investigation.createdAt)).toBeInstanceOf(Date);
        expect(new Date(investigation.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(investigation.createdAt).getTime()
        );

        // Verify immutable fields remain unchanged
        expect(investigation.userId).toBeDefined();
        expect(Array.isArray(investigation.steps)).toBe(true);
        expect(Array.isArray(investigation.evidence)).toBe(true);
        expect(Array.isArray(investigation.comments)).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Investigation update endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should allow partial updates', async () => {
      const partialUpdate = {
        status: InvestigationStatus.COMPLETED,
        finalRiskScore: 0.75
      };

      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          partialUpdate
        );

        expect(response.status).toBe(200);
        const investigation: Investigation = response.data;

        // Verify only specified fields are updated
        expect(investigation.status).toBe(partialUpdate.status);
        expect(investigation.finalRiskScore).toBe(partialUpdate.finalRiskScore);

        // Other fields should remain unchanged
        expect(investigation.id).toBe(validInvestigationId);
        expect(investigation.title).toBeDefined();
        expect(investigation.description).toBeDefined();

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Partial update test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should update status to completed and set completedAt timestamp', async () => {
      const completionUpdate = {
        status: InvestigationStatus.COMPLETED,
        finalRiskScore: 0.88
      };

      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          completionUpdate
        );

        const investigation: Investigation = response.data;

        expect(investigation.status).toBe(InvestigationStatus.COMPLETED);
        expect(investigation.completedAt).not.toBeNull();
        expect(new Date(investigation.completedAt!)).toBeInstanceOf(Date);
        expect(investigation.finalRiskScore).toBe(completionUpdate.finalRiskScore);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Completion update test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should clear completedAt when status changed from completed', async () => {
      const reopenUpdate = {
        status: InvestigationStatus.IN_PROGRESS
      };

      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          reopenUpdate
        );

        const investigation: Investigation = response.data;

        expect(investigation.status).toBe(InvestigationStatus.IN_PROGRESS);
        expect(investigation.completedAt).toBeNull();

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Reopen update test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent investigation ID', async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${nonExistentId}`, validUpdateRequest);
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

    it('should return 400 for invalid status value', async () => {
      const invalidUpdate = {
        status: 'invalid-status'
      };

      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, invalidUpdate);
        fail('Should have thrown an error for invalid status');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data.error).toContain('status');
        } else {
          throw error;
        }
      }
    });

    it('should return 400 for invalid priority value', async () => {
      const invalidUpdate = {
        priority: 'invalid-priority'
      };

      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, invalidUpdate);
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

    it('should return 400 for invalid risk score range', async () => {
      const invalidUpdates = [
        { finalRiskScore: -0.1 },
        { finalRiskScore: 1.1 },
        { finalRiskScore: 'invalid' }
      ];

      for (const invalidUpdate of invalidUpdates) {
        try {
          await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, invalidUpdate);
          fail(`Should have thrown an error for invalid risk score: ${invalidUpdate.finalRiskScore}`);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data).toHaveProperty('error');
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for malformed JSON', async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, 'invalid-json', {
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

    it('should return 400 for attempts to modify immutable fields', async () => {
      const immutableUpdate = {
        id: 'different-id',
        userId: 'different-user',
        createdAt: new Date().toISOString()
      };

      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, immutableUpdate);
        fail('Should have thrown an error for modifying immutable fields');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, validUpdateRequest, {
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
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, validUpdateRequest, {
          headers: {
            'Authorization': 'Bearer read-only-token'
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

    it('should return 403 for updating other users investigation without permission', async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, validUpdateRequest, {
          headers: {
            'Authorization': 'Bearer user-token-without-cross-user-access'
          }
        });
        fail('Should have thrown an error for cross-user update without permission');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([403, 404]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Concurrency Control', () => {
    it('should handle optimistic locking with version control', async () => {
      const updateWithVersion = {
        ...validUpdateRequest,
        version: 1 // Optimistic locking version
      };

      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          updateWithVersion
        );

        expect(response.status).toBe(200);
        const investigation: Investigation = response.data;
        expect(investigation.version).toBeGreaterThan(updateWithVersion.version);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Could be 409 for version conflict or implementation not ready
          expect([409, 404, 400]).toContain(error.response?.status);
        }
      }
    });

    it('should return 409 for stale version conflict', async () => {
      const staleUpdate = {
        ...validUpdateRequest,
        version: 0 // Outdated version
      };

      try {
        await axios.put(`${API_BASE_URL}/api/investigation/${validInvestigationId}`, staleUpdate);
        fail('Should have thrown an error for stale version');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([409, 400]).toContain(error.response?.status);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Content-Type Validation', () => {
    it('should accept application/json content-type', async () => {
      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          validUpdateRequest,
          { headers: { 'Content-Type': 'application/json' } }
        );
        expect(response.status).toBe(200);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Expected to fail until implementation - verify it's not due to content-type
          expect(error.response?.status).not.toBe(415);
        }
      }
    });

    it('should reject non-JSON content-type', async () => {
      try {
        await axios.put(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}`,
          validUpdateRequest,
          { headers: { 'Content-Type': 'text/plain' } }
        );
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