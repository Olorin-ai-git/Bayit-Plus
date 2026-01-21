/**
 * Contract test: POST /validation/{gateId}
 * CVPlus Level 2 Recovery System - T025
 *
 * This test validates the validation gate API endpoint contract
 * Following TDD approach - test must FAIL before implementation
 */

import request from 'supertest';
import { expect } from 'chai';
import { app } from '../../functions/src/recovery/api/app';

describe('Contract Test: POST /validation/{gateId}', () => {
  const validGateIds = [
    'workspace-health',
    'dependency-resolution',
    'build-success',
    'test-coverage',
    'architecture-compliance',
    'security-audit'
  ];

  describe('POST /validation/{gateId} - Success Cases', () => {
    validGateIds.forEach(gateId => {
      it(`should execute validation gate ${gateId} and return results`, async () => {
        const response = await request(app)
          .post(`/validation/${gateId}`)
          .send({
            validationOptions: {
              strict: true,
              timeout: 30000,
              modules: ['auth', 'i18n']
            }
          })
          .expect(200);

        // Validate response structure
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('gateId', gateId);
        expect(response.body).to.have.property('validationId').that.is.a('string');
        expect(response.body).to.have.property('status').that.is.oneOf(['passed', 'failed', 'warning']);
        expect(response.body).to.have.property('results').that.is.an('object');

        // Validate validation results
        const { results } = response.body;
        expect(results).to.have.property('score').that.is.a('number').within(0, 100);
        expect(results).to.have.property('startTime').that.is.a('string');
        expect(results).to.have.property('endTime').that.is.a('string');
        expect(results).to.have.property('duration').that.is.a('number');
        expect(results).to.have.property('criteria').that.is.an('array');
        expect(results).to.have.property('details').that.is.an('object');
      });
    });

    it('should support validation with minimal options', async () => {
      const response = await request(app)
        .post('/validation/workspace-health')
        .send({})
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.results).to.exist;
    });

    it('should support module-specific validation', async () => {
      const response = await request(app)
        .post('/validation/dependency-resolution')
        .send({
          validationOptions: {
            modules: ['premium', 'analytics']
          }
        })
        .expect(200);

      expect(response.body.results.details).to.have.property('moduleResults');
      expect(response.body.results.details.moduleResults).to.have.property('premium');
      expect(response.body.results.details.moduleResults).to.have.property('analytics');
    });

    it('should support async validation execution', async () => {
      const response = await request(app)
        .post('/validation/security-audit')
        .send({
          validationOptions: {
            async: true,
            comprehensive: true
          }
        })
        .expect(202); // Accepted for async processing

      expect(response.body).to.have.property('validationId').that.is.a('string');
      expect(response.body).to.have.property('status', 'initiated');
      expect(response.body).to.have.property('trackingUrl').that.is.a('string');
    });
  });

  describe('POST /validation/{gateId} - Error Cases', () => {
    it('should return 404 for invalid gate ID', async () => {
      const response = await request(app)
        .post('/validation/invalid-gate')
        .send({})
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'VALIDATION_GATE_NOT_FOUND');
      expect(response.body.error).to.have.property('message').that.includes('invalid-gate');
    });

    it('should return 400 for invalid validation options', async () => {
      const response = await request(app)
        .post('/validation/workspace-health')
        .send({
          validationOptions: {
            strict: 'not-boolean',
            timeout: 'invalid-number'
          }
        })
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'INVALID_VALIDATION_OPTIONS');
      expect(response.body.error).to.have.property('details').that.is.an('array');
    });

    it('should return 422 for validation timeout', async () => {
      const response = await request(app)
        .post('/validation/build-success')
        .send({
          validationOptions: {
            timeout: 1 // Very short timeout
          }
        })
        .expect(422);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'VALIDATION_TIMEOUT');
    });

    it('should return 422 for modules not ready for validation', async () => {
      const response = await request(app)
        .post('/validation/test-coverage')
        .send({
          validationOptions: {
            modules: ['broken-module']
          }
        })
        .expect(422);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'MODULES_NOT_READY');
      expect(response.body.error).to.have.property('unreadyModules').that.is.an('array');
    });
  });

  describe('Validation Criteria Testing', () => {
    it('should validate workspace-health criteria', async () => {
      const response = await request(app)
        .post('/validation/workspace-health')
        .send({})
        .expect(200);

      const { results } = response.body;
      expect(results.criteria).to.include.members([
        'package-json-valid',
        'tsconfig-valid',
        'git-status-clean',
        'node-modules-healthy'
      ]);

      results.criteria.forEach(criterion => {
        expect(results.details).to.have.property(criterion);
        expect(results.details[criterion]).to.have.property('status').that.is.oneOf(['passed', 'failed', 'warning']);
        expect(results.details[criterion]).to.have.property('score').that.is.a('number').within(0, 100);
      });
    });

    it('should validate dependency-resolution criteria', async () => {
      const response = await request(app)
        .post('/validation/dependency-resolution')
        .send({})
        .expect(200);

      const { results } = response.body;
      expect(results.criteria).to.include.members([
        'no-missing-dependencies',
        'no-circular-dependencies',
        'version-compatibility'
      ]);
    });

    it('should validate build-success criteria', async () => {
      const response = await request(app)
        .post('/validation/build-success')
        .send({})
        .expect(200);

      const { results } = response.body;
      expect(results.criteria).to.include.members([
        'typescript-compilation',
        'no-build-errors',
        'artifact-generation'
      ]);
    });

    it('should validate test-coverage criteria', async () => {
      const response = await request(app)
        .post('/validation/test-coverage')
        .send({})
        .expect(200);

      const { results } = response.body;
      expect(results.criteria).to.include.members([
        'minimum-coverage-threshold',
        'all-tests-passing',
        'no-skipped-tests'
      ]);

      expect(results.details).to.have.property('coverage');
      expect(results.details.coverage).to.have.property('lines').that.is.a('number');
      expect(results.details.coverage).to.have.property('functions').that.is.a('number');
      expect(results.details.coverage).to.have.property('branches').that.is.a('number');
    });
  });

  describe('Validation Options Testing', () => {
    it('should support strict validation mode', async () => {
      const response = await request(app)
        .post('/validation/architecture-compliance')
        .send({
          validationOptions: {
            strict: true
          }
        })
        .expect(200);

      expect(response.body.results.details).to.have.property('strictMode', true);
      // Strict mode should have higher threshold
      expect(response.body.results.details).to.have.property('passingThreshold').that.is.at.least(90);
    });

    it('should support custom timeout values', async () => {
      const response = await request(app)
        .post('/validation/security-audit')
        .send({
          validationOptions: {
            timeout: 60000
          }
        })
        .expect(200);

      expect(response.body.results.details).to.have.property('timeout', 60000);
    });

    it('should support validation scope filtering', async () => {
      const response = await request(app)
        .post('/validation/dependency-resolution')
        .send({
          validationOptions: {
            scope: ['dev-dependencies', 'peer-dependencies']
          }
        })
        .expect(200);

      expect(response.body.results.details).to.have.property('scope').that.includes('dev-dependencies');
    });
  });

  describe('Validation Results Structure', () => {
    it('should include detailed error information for failed validations', async () => {
      const response = await request(app)
        .post('/validation/build-success')
        .send({})
        .expect(200);

      const { results } = response.body;
      if (results.status === 'failed') {
        expect(results.details).to.have.property('errors').that.is.an('array');
        results.details.errors.forEach(error => {
          expect(error).to.have.property('code').that.is.a('string');
          expect(error).to.have.property('message').that.is.a('string');
          expect(error).to.have.property('severity').that.is.oneOf(['error', 'warning', 'info']);
        });
      }
    });

    it('should include recommendations for improvement', async () => {
      const response = await request(app)
        .post('/validation/test-coverage')
        .send({})
        .expect(200);

      const { results } = response.body;
      expect(results.details).to.have.property('recommendations').that.is.an('array');

      if (results.details.recommendations.length > 0) {
        results.details.recommendations.forEach(rec => {
          expect(rec).to.have.property('type').that.is.a('string');
          expect(rec).to.have.property('description').that.is.a('string');
          expect(rec).to.have.property('priority').that.is.oneOf(['high', 'medium', 'low']);
        });
      }
    });

    it('should include module-specific results when requested', async () => {
      const response = await request(app)
        .post('/validation/architecture-compliance')
        .send({
          validationOptions: {
            modules: ['premium', 'workflow']
          }
        })
        .expect(200);

      const { results } = response.body;
      expect(results.details).to.have.property('moduleResults');
      expect(results.details.moduleResults).to.have.property('premium');
      expect(results.details.moduleResults).to.have.property('workflow');

      Object.values(results.details.moduleResults).forEach(moduleResult => {
        expect(moduleResult).to.have.property('score').that.is.a('number');
        expect(moduleResult).to.have.property('status').that.is.a('string');
        expect(moduleResult).to.have.property('issues').that.is.an('array');
      });
    });
  });
});

/**
 * Expected API Contract:
 *
 * POST /validation/{gateId}
 *
 * Request Body:
 * {
 *   validationOptions?: {
 *     strict?: boolean
 *     timeout?: number
 *     modules?: string[]
 *     async?: boolean
 *     comprehensive?: boolean
 *     scope?: string[]
 *   }
 * }
 *
 * Success Response (200):
 * {
 *   success: true,
 *   gateId: string,
 *   validationId: string,
 *   status: 'passed' | 'failed' | 'warning',
 *   results: {
 *     score: number,
 *     startTime: string,
 *     endTime: string,
 *     duration: number,
 *     criteria: string[],
 *     details: {
 *       [criterion: string]: {
 *         status: 'passed' | 'failed' | 'warning',
 *         score: number,
 *         message?: string
 *       },
 *       strictMode?: boolean,
 *       passingThreshold?: number,
 *       timeout?: number,
 *       scope?: string[],
 *       errors?: Array<{
 *         code: string,
 *         message: string,
 *         severity: 'error' | 'warning' | 'info'
 *       }>,
 *       recommendations?: Array<{
 *         type: string,
 *         description: string,
 *         priority: 'high' | 'medium' | 'low'
 *       }>,
 *       moduleResults?: {
 *         [moduleId: string]: {
 *           score: number,
 *           status: string,
 *           issues: string[]
 *         }
 *       },
 *       coverage?: {
 *         lines: number,
 *         functions: number,
 *         branches: number
 *       }
 *     }
 *   }
 * }
 *
 * Async Response (202):
 * {
 *   validationId: string,
 *   status: 'initiated',
 *   trackingUrl: string
 * }
 *
 * Error Responses:
 * 404: VALIDATION_GATE_NOT_FOUND
 * 400: INVALID_VALIDATION_OPTIONS
 * 422: VALIDATION_TIMEOUT, MODULES_NOT_READY
 */