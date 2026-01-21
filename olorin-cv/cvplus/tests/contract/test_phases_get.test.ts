/**
 * Contract test: GET /phases
 * CVPlus Level 2 Recovery System - T023
 *
 * This test validates the recovery phases API endpoint contract
 * Following TDD approach - test must FAIL before implementation
 */

import request from 'supertest';
import { expect } from 'chai';
import { app } from '../../functions/src/recovery/api/app';

describe('Contract Test: GET /phases', () => {
  describe('GET /phases - Success Cases', () => {
    it('should return all recovery phases with metadata', async () => {
      const response = await request(app)
        .get('/phases')
        .expect(200);

      // Validate response structure
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('phases').that.is.an('array');
      expect(response.body).to.have.property('totalPhases').that.is.a('number');

      // Validate each phase structure
      const { phases } = response.body;
      expect(phases).to.have.length.at.least(4); // Minimum 4 phases as per spec

      phases.forEach(phase => {
        expect(phase).to.have.property('phaseId').that.is.a('string');
        expect(phase).to.have.property('name').that.is.a('string');
        expect(phase).to.have.property('description').that.is.a('string');
        expect(phase).to.have.property('order').that.is.a('number');
        expect(phase).to.have.property('status').that.is.oneOf(['pending', 'running', 'completed', 'failed']);
        expect(phase).to.have.property('dependencies').that.is.an('array');
        expect(phase).to.have.property('validationGates').that.is.an('array');
        expect(phase).to.have.property('estimatedDuration').that.is.a('number');
        expect(phase).to.have.property('startTime');
        expect(phase).to.have.property('endTime');
        expect(phase).to.have.property('progress').that.is.a('number').within(0, 100);
      });
    });

    it('should return phases in correct order', async () => {
      const response = await request(app)
        .get('/phases')
        .expect(200);

      const { phases } = response.body;
      const expectedPhases = [
        'emergency-stabilization',
        'build-infrastructure',
        'test-recovery',
        'architecture-compliance'
      ];

      // Verify core phases exist and are ordered correctly
      expectedPhases.forEach((expectedPhaseId, index) => {
        const phase = phases.find(p => p.phaseId === expectedPhaseId);
        expect(phase).to.exist;
        expect(phase.order).to.equal(index + 1);
      });
    });

    it('should include validation gate information', async () => {
      const response = await request(app)
        .get('/phases')
        .expect(200);

      const { phases } = response.body;
      const stabilizationPhase = phases.find(p => p.phaseId === 'emergency-stabilization');

      expect(stabilizationPhase).to.exist;
      expect(stabilizationPhase.validationGates).to.be.an('array').with.length.at.least(1);

      stabilizationPhase.validationGates.forEach(gate => {
        expect(gate).to.have.property('gateId').that.is.a('string');
        expect(gate).to.have.property('name').that.is.a('string');
        expect(gate).to.have.property('status').that.is.oneOf(['pending', 'passed', 'failed']);
        expect(gate).to.have.property('criteria').that.is.an('array');
      });
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/phases?status=pending')
        .expect(200);

      const { phases } = response.body;
      phases.forEach(phase => {
        expect(phase.status).to.equal('pending');
      });
    });

    it('should support filtering by phase category', async () => {
      const response = await request(app)
        .get('/phases?category=infrastructure')
        .expect(200);

      const { phases } = response.body;
      phases.forEach(phase => {
        expect(phase).to.have.property('category');
        expect(phase.category).to.include('infrastructure');
      });
    });
  });

  describe('GET /phases - Query Parameters', () => {
    it('should support detailed=true for expanded information', async () => {
      const response = await request(app)
        .get('/phases?detailed=true')
        .expect(200);

      const { phases } = response.body;
      phases.forEach(phase => {
        expect(phase).to.have.property('tasks').that.is.an('array');
        expect(phase).to.have.property('modules').that.is.an('array');
        expect(phase).to.have.property('metrics');

        if (phase.tasks.length > 0) {
          phase.tasks.forEach(task => {
            expect(task).to.have.property('taskId').that.is.a('string');
            expect(task).to.have.property('status').that.is.a('string');
            expect(task).to.have.property('assignedModule');
          });
        }
      });
    });

    it('should support including=dependencies for dependency graph', async () => {
      const response = await request(app)
        .get('/phases?including=dependencies')
        .expect(200);

      const { phases } = response.body;
      phases.forEach(phase => {
        if (phase.dependencies.length > 0) {
          phase.dependencies.forEach(dep => {
            expect(dep).to.have.property('phaseId').that.is.a('string');
            expect(dep).to.have.property('type').that.is.oneOf(['strict', 'soft', 'optional']);
            expect(dep).to.have.property('reason').that.is.a('string');
          });
        }
      });
    });

    it('should support limit and offset for pagination', async () => {
      const response = await request(app)
        .get('/phases?limit=2&offset=0')
        .expect(200);

      expect(response.body.phases).to.have.length.at.most(2);
      expect(response.body).to.have.property('pagination');
      expect(response.body.pagination).to.have.property('limit', 2);
      expect(response.body.pagination).to.have.property('offset', 0);
      expect(response.body.pagination).to.have.property('total').that.is.a('number');
    });
  });

  describe('GET /phases - Error Cases', () => {
    it('should return 400 for invalid status filter', async () => {
      const response = await request(app)
        .get('/phases?status=invalid-status')
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'INVALID_STATUS_FILTER');
      expect(response.body.error).to.have.property('validStatuses').that.is.an('array');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/phases?limit=invalid')
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'INVALID_PAGINATION_PARAMS');
    });

    it('should return 400 for invalid category filter', async () => {
      const response = await request(app)
        .get('/phases?category=invalid-category')
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'INVALID_CATEGORY_FILTER');
    });
  });

  describe('Phase Metadata Validation', () => {
    it('should include execution statistics', async () => {
      const response = await request(app)
        .get('/phases?including=stats')
        .expect(200);

      expect(response.body).to.have.property('statistics');
      const { statistics } = response.body;

      expect(statistics).to.have.property('totalPhases').that.is.a('number');
      expect(statistics).to.have.property('completedPhases').that.is.a('number');
      expect(statistics).to.have.property('failedPhases').that.is.a('number');
      expect(statistics).to.have.property('overallProgress').that.is.a('number').within(0, 100);
      expect(statistics).to.have.property('estimatedCompletion');
    });

    it('should include phase timing information', async () => {
      const response = await request(app)
        .get('/phases?including=timing')
        .expect(200);

      const { phases } = response.body;
      phases.forEach(phase => {
        expect(phase).to.have.property('timing');
        expect(phase.timing).to.have.property('estimatedDuration').that.is.a('number');
        expect(phase.timing).to.have.property('actualDuration');
        expect(phase.timing).to.have.property('efficiency');
      });
    });

    it('should include module mapping for each phase', async () => {
      const response = await request(app)
        .get('/phases?including=modules')
        .expect(200);

      const { phases } = response.body;
      phases.forEach(phase => {
        expect(phase).to.have.property('affectedModules').that.is.an('array');
        phase.affectedModules.forEach(moduleId => {
          expect(moduleId).to.be.oneOf([
            'auth', 'i18n', 'processing', 'multimedia', 'analytics',
            'premium', 'public-profiles', 'recommendations', 'admin', 'workflow', 'payments'
          ]);
        });
      });
    });
  });
});

/**
 * Expected API Contract:
 *
 * GET /phases
 *
 * Query Parameters:
 * - status?: 'pending' | 'running' | 'completed' | 'failed'
 * - category?: string
 * - detailed?: boolean
 * - including?: 'dependencies' | 'stats' | 'timing' | 'modules'
 * - limit?: number
 * - offset?: number
 *
 * Success Response (200):
 * {
 *   success: true,
 *   phases: Array<{
 *     phaseId: string,
 *     name: string,
 *     description: string,
 *     order: number,
 *     status: 'pending' | 'running' | 'completed' | 'failed',
 *     dependencies: string[],
 *     validationGates: Array<{
 *       gateId: string,
 *       name: string,
 *       status: 'pending' | 'passed' | 'failed',
 *       criteria: string[]
 *     }>,
 *     estimatedDuration: number,
 *     startTime?: string,
 *     endTime?: string,
 *     progress: number,
 *     tasks?: Array<{
 *       taskId: string,
 *       status: string,
 *       assignedModule?: string
 *     }>,
 *     modules?: string[],
 *     metrics?: object,
 *     timing?: {
 *       estimatedDuration: number,
 *       actualDuration?: number,
 *       efficiency?: number
 *     },
 *     affectedModules?: string[]
 *   }>,
 *   totalPhases: number,
 *   pagination?: {
 *     limit: number,
 *     offset: number,
 *     total: number
 *   },
 *   statistics?: {
 *     totalPhases: number,
 *     completedPhases: number,
 *     failedPhases: number,
 *     overallProgress: number,
 *     estimatedCompletion?: string
 *   }
 * }
 *
 * Error Responses:
 * 400: INVALID_STATUS_FILTER, INVALID_PAGINATION_PARAMS, INVALID_CATEGORY_FILTER
 */