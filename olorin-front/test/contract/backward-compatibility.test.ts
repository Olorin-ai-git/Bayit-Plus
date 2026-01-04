/**
 * Backward Compatibility Tests
 *
 * Validates that new API versions maintain backward compatibility with clients
 * expecting older API versions.
 *
 * Constitutional Compliance:
 * - Test data from environment variables (no hardcoded values)
 * - Real API integration (no mocks)
 * - Automated validation of compatibility rules
 * - Clear failure messages
 *
 * Usage:
 *   npm run test:backward-compatibility
 *   BACKEND_URL=http://localhost:8090 npm run test:backward-compatibility
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import {
  validateInvestigationRequest,
  validateInvestigationResponse
} from './validators/schema-validator';

/**
 * Test configuration from environment
 *
 * Constitutional Compliance:
 * - All values from environment variables
 * - No hardcoded test data
 */
const TEST_CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8090',
  apiVersion: process.env.API_VERSION || 'v1',
  testEntityId: process.env.TEST_ENTITY_ID || 'test@example.com',
  testEntityType: process.env.TEST_ENTITY_TYPE || 'email'
};

/**
 * Verify backend is available before running tests
 */
beforeAll(async () => {
  try {
    const response = await axios.get(`${TEST_CONFIG.backendUrl}/health`);
    expect(response.status).toBe(200);
  } catch (error) {
    throw new Error(
      `Backend not available at ${TEST_CONFIG.backendUrl}/health. ` +
      `Start backend: cd olorin-server && poetry run python -m app.local_server`
    );
  }
});

describe('Backward Compatibility - Investigation Endpoints', () => {
  /**
   * Test: Optional fields can be omitted (backward compatible)
   *
   * New optional fields must not break existing clients.
   * Clients sending old request format should still work.
   */
  test('should accept request without optional fields', async () => {
    // Request with minimal fields (old client behavior)
    const minimalRequest = {
      entity_id: TEST_CONFIG.testEntityId,
      entity_type: TEST_CONFIG.testEntityType
      // time_range omitted (optional field)
    };

    const response = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      minimalRequest,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('investigation_id');
    expect(response.data).toHaveProperty('status');

    // Validate response against schema
    const validation = validateInvestigationResponse(response.data);
    expect(validation.valid).toBe(true);
  });

  /**
   * Test: Response includes all fields from old version
   *
   * New API versions must include all non-deprecated fields from old versions.
   * Removing fields is a breaking change.
   */
  test('should return all required fields in response', async () => {
    const request = {
      entity_id: TEST_CONFIG.testEntityId,
      entity_type: TEST_CONFIG.testEntityType
    };

    const response = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      request
    );

    expect(response.status).toBe(201);

    // All v1 required fields must be present
    expect(response.data).toHaveProperty('investigation_id');
    expect(response.data).toHaveProperty('status');
    expect(response.data).toHaveProperty('created_at');
    expect(response.data).toHaveProperty('updated_at');

    // risk_score can be null (optional)
    expect(response.data).toHaveProperty('risk_score');
  });

  /**
   * Test: New optional response fields are additive
   *
   * Adding new optional fields to responses is backward compatible.
   * Old clients should ignore unknown fields.
   */
  test('should handle unknown response fields gracefully', async () => {
    const request = {
      entity_id: TEST_CONFIG.testEntityId,
      entity_type: TEST_CONFIG.testEntityType
    };

    const response = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      request
    );

    expect(response.status).toBe(201);

    // Validate that response is valid even if it contains additional fields
    const validation = validateInvestigationResponse(response.data);
    expect(validation.valid).toBe(true);

    // Old client would extract known fields and ignore rest
    const { investigation_id, status, risk_score } = response.data;
    expect(investigation_id).toBeDefined();
    expect(status).toBeDefined();
    expect(risk_score).toBeDefined();
  });

  /**
   * Test: Field types remain consistent
   *
   * Changing field types is a breaking change.
   * Field types must remain the same across versions.
   */
  test('should maintain consistent field types', async () => {
    const request = {
      entity_id: TEST_CONFIG.testEntityId,
      entity_type: TEST_CONFIG.testEntityType
    };

    const response = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      request
    );

    expect(response.status).toBe(201);

    // Verify field types match schema
    expect(typeof response.data.investigation_id).toBe('string');
    expect(typeof response.data.status).toBe('string');
    expect(
      response.data.risk_score === null || typeof response.data.risk_score === 'number'
    ).toBe(true);
    expect(typeof response.data.created_at).toBe('string');
    expect(typeof response.data.updated_at).toBe('string');
  });

  /**
   * Test: Enum values remain valid
   *
   * Removing enum values is a breaking change.
   * Old clients may send enum values that were valid in previous version.
   */
  test('should accept all valid entity types', async () => {
    const validEntityTypes = ['email', 'phone', 'device_id', 'ip_address', 'user_id'];

    for (const entityType of validEntityTypes) {
      const request = {
        entity_id: `test-${entityType}@example.com`,
        entity_type: entityType
      };

      const response = await axios.post(
        `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
        request
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('investigation_id');
    }
  });

  /**
   * Test: HTTP status codes remain consistent
   *
   * Changing success/error status codes is a breaking change.
   * Old clients expect specific status codes for specific scenarios.
   */
  test('should return correct HTTP status codes', async () => {
    // Success case: 201 Created
    const validRequest = {
      entity_id: TEST_CONFIG.testEntityId,
      entity_type: TEST_CONFIG.testEntityType
    };

    const successResponse = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      validRequest
    );

    expect(successResponse.status).toBe(201);

    // Invalid request: 400 Bad Request
    const invalidRequest = {
      entity_id: '',  // Invalid: empty string
      entity_type: TEST_CONFIG.testEntityType
    };

    try {
      await axios.post(
        `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
        invalidRequest
      );
      fail('Should have thrown 400 error');
    } catch (error: any) {
      expect(error.response?.status).toBe(400);
      expect(error.response?.data).toHaveProperty('error');
      expect(error.response?.data).toHaveProperty('message');
    }
  });

  /**
   * Test: Error response format remains consistent
   *
   * Error response structure must remain the same.
   * Old clients expect specific error format.
   */
  test('should maintain consistent error response format', async () => {
    const invalidRequest = {
      entity_id: '',
      entity_type: 'invalid_type'  // Invalid enum value
    };

    try {
      await axios.post(
        `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
        invalidRequest
      );
      fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.response?.status).toBe(400);

      // Error response must have consistent structure
      const errorData = error.response?.data;
      expect(errorData).toHaveProperty('error');
      expect(errorData).toHaveProperty('message');
      expect(typeof errorData.error).toBe('string');
      expect(typeof errorData.message).toBe('string');
    }
  });

  /**
   * Test: GET endpoint remains available
   *
   * Removing endpoints is a breaking change.
   * Old clients expect endpoints to remain available.
   */
  test('should maintain GET investigation endpoint', async () => {
    // First create an investigation
    const createResponse = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      {
        entity_id: TEST_CONFIG.testEntityId,
        entity_type: TEST_CONFIG.testEntityType
      }
    );

    const investigationId = createResponse.data.investigation_id;

    // Then retrieve it
    const getResponse = await axios.get(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/${investigationId}`
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.data).toHaveProperty('investigation_id');
    expect(getResponse.data.investigation_id).toBe(investigationId);
  });
});

describe('Backward Compatibility - Content Negotiation', () => {
  /**
   * Test: JSON content type support
   *
   * API must continue to support JSON content type.
   */
  test('should accept application/json content type', async () => {
    const response = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      {
        entity_id: TEST_CONFIG.testEntityId,
        entity_type: TEST_CONFIG.testEntityType
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('application/json');
  });
});

describe('Backward Compatibility - Deprecation Warnings', () => {
  /**
   * Test: Deprecation headers for deprecated versions
   *
   * Deprecated API versions should include Sunset and Deprecation headers.
   * This is non-breaking but important for client migration.
   */
  test('should include deprecation headers if API version deprecated', async () => {
    const response = await axios.post(
      `${TEST_CONFIG.backendUrl}/api/${TEST_CONFIG.apiVersion}/investigations/`,
      {
        entity_id: TEST_CONFIG.testEntityId,
        entity_type: TEST_CONFIG.testEntityType
      }
    );

    // If API is deprecated, should have these headers
    // (Currently v1 is not deprecated, so this will pass)
    if (response.headers['deprecation']) {
      expect(response.headers).toHaveProperty('sunset');
      expect(response.headers).toHaveProperty('link');
    }

    // Response should still succeed even if deprecated
    expect(response.status).toBe(201);
  });
});
