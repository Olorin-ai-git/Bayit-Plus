import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getUnifiedModuleRequirementsService } from '../../lib/index';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';

export const validationRoutes = Router();
const service = getUnifiedModuleRequirementsService();

// Validation middleware for module validation requests
const validateModuleRequest = [
  body('modulePath')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Module path is required'),
  body('ruleIds')
    .optional()
    .isArray()
    .withMessage('Rule IDs must be an array'),
  body('strictMode')
    .optional()
    .isBoolean()
    .withMessage('Strict mode must be a boolean'),
  validateRequest
];

const validateBatchRequest = [
  body('validationRequests')
    .isArray({ min: 1 })
    .withMessage('Validation requests array is required'),
  body('validationRequests.*.modulePath')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Each request must have a valid module path'),
  body('parallel')
    .optional()
    .isBoolean()
    .withMessage('Parallel must be a boolean'),
  body('maxConcurrency')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max concurrency must be between 1 and 10'),
  body('continueOnError')
    .optional()
    .isBoolean()
    .withMessage('Continue on error must be a boolean'),
  validateRequest
];

/**
 * POST /api/v1/validation/module
 * Validate a single module against CVPlus requirements
 */
validationRoutes.post('/module',
  validateModuleRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { modulePath, ruleIds = [], strictMode = false } = req.body;

    try {
      const validationResult = await service.moduleValidator.validateModule({
        modulePath,
        ruleIds,
        strictMode
      });

      res.json({
        success: true,
        data: validationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          processingTime: res.get('X-Response-Time')
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * POST /api/v1/validation/batch
 * Validate multiple modules in batch with parallel processing
 */
validationRoutes.post('/batch',
  validateBatchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      validationRequests,
      parallel = true,
      maxConcurrency = 4,
      continueOnError = true
    } = req.body;

    try {
      const batchResult = await service.batchValidator.validateBatch({
        validationRequests,
        parallel,
        maxConcurrency,
        continueOnError
      });

      res.json({
        success: true,
        data: batchResult,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          totalModules: validationRequests.length,
          processingMode: parallel ? 'parallel' : 'sequential'
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Batch validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * GET /api/v1/validation/rules
 * Get available validation rules and their descriptions
 */
validationRoutes.get('/rules',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get available rules from the compliance rule engine
      const rules = [
        {
          id: 'required-files',
          name: 'Required Files',
          description: 'Ensures module has all required files (package.json, README, etc.)',
          category: 'STRUCTURE',
          severity: 'ERROR'
        },
        {
          id: 'package-json',
          name: 'Package.json Validation',
          description: 'Validates package.json structure and required fields',
          category: 'CONFIGURATION',
          severity: 'CRITICAL'
        },
        {
          id: 'typescript-config',
          name: 'TypeScript Configuration',
          description: 'Validates TypeScript configuration and compilation',
          category: 'CONFIGURATION',
          severity: 'ERROR'
        },
        {
          id: 'exports-validation',
          name: 'Module Exports',
          description: 'Ensures proper module exports and public API',
          category: 'ARCHITECTURE',
          severity: 'ERROR'
        },
        {
          id: 'dependency-validation',
          name: 'Dependency Validation',
          description: 'Validates dependencies and prevents circular references',
          category: 'ARCHITECTURE',
          severity: 'CRITICAL'
        }
      ];

      res.json({
        success: true,
        data: {
          rules,
          totalRules: rules.length,
          categories: [...new Set(rules.map(r => r.category))],
          severityLevels: [...new Set(rules.map(r => r.severity))]
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rules',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/validation/quick
 * Quick validation for CI/CD pipelines (essential checks only)
 */
validationRoutes.post('/quick',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('enableBuildCheck')
      .optional()
      .isBoolean()
      .withMessage('Enable build check must be a boolean'),
    body('enableMockDetection')
      .optional()
      .isBoolean()
      .withMessage('Enable mock detection must be a boolean'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { modulePaths, enableBuildCheck = true, enableMockDetection = false } = req.body;

    try {
      const quickResult = await service.performQuickValidation({
        modulePaths,
        enableBuildCheck,
        enableMockDetection
      });

      res.json({
        success: true,
        data: quickResult,
        metadata: {
          timestamp: new Date().toISOString(),
          validationType: 'quick',
          totalModules: modulePaths.length,
          checksEnabled: {
            buildCheck: enableBuildCheck,
            mockDetection: enableMockDetection
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Quick validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/v1/validation/status
 * Get validation service status and health
 */
validationRoutes.get('/status',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const serviceStatus = service.getServiceStatus();

      res.json({
        success: true,
        data: {
          status: 'operational',
          services: serviceStatus,
          version: '1.0.0',
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);