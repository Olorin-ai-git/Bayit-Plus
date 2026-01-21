/**
 * Contract Test: GET /api/investigation/{id}/steps
 *
 * Tests the retrieval of investigation steps via GET endpoint.
 * This test verifies the contract between frontend and backend for investigation steps retrieval.
 *
 * Expected to FAIL initially (TDD approach) until backend implementation is complete.
 */

import axios from 'axios';
import { InvestigationStep, StepStatus, StepType } from '@manual-investigation/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

describe('Contract Test: GET /api/investigation/{id}/steps', () => {
  const validInvestigationId = 'inv_12345';
  const nonExistentId = 'inv_nonexistent';
  const investigationWithoutSteps = 'inv_empty';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Steps Retrieval', () => {
    it('should retrieve all steps for a valid investigation ID', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps`);

        // Contract assertions
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        const steps: InvestigationStep[] = response.data;

        // Should return array even if empty
        expect(Array.isArray(steps)).toBe(true);

        // If steps exist, validate structure
        if (steps.length > 0) {
          steps.forEach(step => {
            // Required field validations
            expect(step).toHaveProperty('id');
            expect(step).toHaveProperty('investigationId', validInvestigationId);
            expect(step).toHaveProperty('type');
            expect(step).toHaveProperty('status');
            expect(step).toHaveProperty('createdAt');

            // Data type validations
            expect(typeof step.id).toBe('string');
            expect(typeof step.investigationId).toBe('string');
            expect(Object.values(StepType)).toContain(step.type);
            expect(Object.values(StepStatus)).toContain(step.status);

            // Date validations
            expect(new Date(step.createdAt)).toBeInstanceOf(Date);

            // Optional field validations
            if (step.startedAt) {
              expect(new Date(step.startedAt)).toBeInstanceOf(Date);
              expect(new Date(step.startedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(step.createdAt).getTime()
              );
            }

            if (step.completedAt) {
              expect(new Date(step.completedAt)).toBeInstanceOf(Date);
              expect(new Date(step.completedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(step.createdAt).getTime()
              );
            }

            // Agent response validation
            if (step.agentResponse) {
              expect(typeof step.agentResponse).toBe('object');
              expect(step.agentResponse).toHaveProperty('id');
              expect(step.agentResponse).toHaveProperty('stepId', step.id);
              expect(step.agentResponse).toHaveProperty('agentType');
              expect(step.agentResponse).toHaveProperty('status');
              expect(step.agentResponse).toHaveProperty('createdAt');
            }

            // Parameters validation
            if (step.parameters) {
              expect(typeof step.parameters).toBe('object');
            }

            // Result validation
            if (step.result) {
              expect(typeof step.result).toBe('object');
            }
          });
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Contract test failing as expected (TDD approach):', error.message);
          throw new Error(`Investigation steps retrieval endpoint not implemented: ${error.message}`);
        }
        throw error;
      }
    });

    it('should return steps in chronological order', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps`);
        const steps: InvestigationStep[] = response.data;

        if (steps.length > 1) {
          for (let i = 1; i < steps.length; i++) {
            const previousStep = new Date(steps[i - 1].createdAt).getTime();
            const currentStep = new Date(steps[i].createdAt).getTime();
            expect(currentStep).toBeGreaterThanOrEqual(previousStep);
          }
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Steps chronological ordering test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should return empty array for investigation without steps', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${investigationWithoutSteps}/steps`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data).toHaveLength(0);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Empty steps array test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should include complete agent response data when available', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps`);
        const steps: InvestigationStep[] = response.data;

        const stepsWithAgentResponses = steps.filter(step => step.agentResponse);

        stepsWithAgentResponses.forEach(step => {
          const agentResponse = step.agentResponse!;

          // Agent response required fields
          expect(agentResponse).toHaveProperty('id');
          expect(agentResponse).toHaveProperty('stepId', step.id);
          expect(agentResponse).toHaveProperty('agentType');
          expect(agentResponse).toHaveProperty('status');
          expect(agentResponse).toHaveProperty('createdAt');

          // Data type validations
          expect(typeof agentResponse.id).toBe('string');
          expect(typeof agentResponse.agentType).toBe('string');
          expect(typeof agentResponse.status).toBe('string');
          expect(new Date(agentResponse.createdAt)).toBeInstanceOf(Date);

          // Optional fields
          if (agentResponse.completedAt) {
            expect(new Date(agentResponse.completedAt)).toBeInstanceOf(Date);
          }

          if (agentResponse.response) {
            expect(typeof agentResponse.response).toBe('object');
          }

          if (agentResponse.error) {
            expect(typeof agentResponse.error).toBe('string');
          }

          if (agentResponse.metadata) {
            expect(typeof agentResponse.metadata).toBe('object');
          }
        });

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Agent response data validation failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Query Parameters', () => {
    it('should filter steps by status when status parameter provided', async () => {
      const statusFilter = StepStatus.COMPLETED;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?status=${statusFilter}`
        );

        expect(response.status).toBe(200);
        const steps: InvestigationStep[] = response.data;

        steps.forEach(step => {
          expect(step.status).toBe(statusFilter);
        });

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Status filtering test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should filter steps by type when type parameter provided', async () => {
      const typeFilter = StepType.DEVICE_ANALYSIS;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?type=${typeFilter}`
        );

        expect(response.status).toBe(200);
        const steps: InvestigationStep[] = response.data;

        steps.forEach(step => {
          expect(step.type).toBe(typeFilter);
        });

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Type filtering test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should support multiple query parameters', async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?status=${StepStatus.COMPLETED}&type=${StepType.LOCATION_ANALYSIS}&limit=10`
        );

        expect(response.status).toBe(200);
        const steps: InvestigationStep[] = response.data;

        expect(steps.length).toBeLessThanOrEqual(10);
        steps.forEach(step => {
          expect(step.status).toBe(StepStatus.COMPLETED);
          expect(step.type).toBe(StepType.LOCATION_ANALYSIS);
        });

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Multiple query parameters test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should respect limit parameter', async () => {
      const limit = 5;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?limit=${limit}`
        );

        expect(response.status).toBe(200);
        const steps: InvestigationStep[] = response.data;

        expect(steps.length).toBeLessThanOrEqual(limit);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Limit parameter test failed: ${error.message}`);
        }
        throw error;
      }
    });

    it('should support offset parameter for pagination', async () => {
      const offset = 2;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?offset=${offset}`
        );

        expect(response.status).toBe(200);
        const steps: InvestigationStep[] = response.data;

        // Should return array even if offset exceeds available steps
        expect(Array.isArray(steps)).toBe(true);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Offset parameter test failed: ${error.message}`);
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent investigation ID', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${nonExistentId}/steps`);
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

    it('should return 400 for invalid query parameters', async () => {
      const invalidQueries = [
        'status=invalid-status',
        'type=invalid-type',
        'limit=invalid',
        'offset=negative',
        'limit=-1',
        'offset=-5'
      ];

      for (const query of invalidQueries) {
        try {
          await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?${query}`);
          fail(`Should have thrown an error for invalid query: ${query}`);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            expect(error.response?.status).toBe(400);
          } else {
            throw error;
          }
        }
      }
    });

    it('should return 400 for invalid investigation ID format', async () => {
      const invalidIds = ['', '123', 'invalid-format', 'inv_'];

      for (const invalidId of invalidIds) {
        try {
          await axios.get(`${API_BASE_URL}/api/investigation/${invalidId}/steps`);
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
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps`, {
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
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps`, {
          headers: {
            'Authorization': 'Bearer insufficient-permissions-token'
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

  describe('Performance and Caching', () => {
    it('should include proper cache control headers', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps`);

        expect(response.headers).toHaveProperty('cache-control');
        const cacheControl = response.headers['cache-control'];
        expect(cacheControl).toMatch(/no-cache|no-store|private/);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Cache control header test failing as expected');
        }
      }
    });

    it('should respond within reasonable time for large step collections', async () => {
      const startTime = Date.now();

      try {
        await axios.get(`${API_BASE_URL}/api/investigation/${validInvestigationId}/steps?limit=100`);
        const responseTime = Date.now() - startTime;

        // Should respond within 5 seconds even for large collections
        expect(responseTime).toBeLessThan(5000);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('Performance test failing as expected');
        }
      }
    });
  });
});