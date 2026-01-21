import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getUnifiedModuleRequirementsService } from '../../lib/index';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';

export const architectureRoutes = Router();
const service = getUnifiedModuleRequirementsService();

/**
 * POST /api/v1/architecture/analyze
 * Comprehensive architectural analysis of modules
 */
architectureRoutes.post('/analyze',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('modulePaths.*')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Each module path must be a non-empty string'),
    body('checks')
      .optional()
      .isArray()
      .withMessage('Checks must be an array'),
    body('checks.*')
      .optional()
      .isIn(['segregation', 'distribution', 'mocks', 'build', 'dependencies'])
      .withMessage('Invalid check type'),
    body('strictMode')
      .optional()
      .isBoolean()
      .withMessage('Strict mode must be a boolean'),
    body('generateReport')
      .optional()
      .isBoolean()
      .withMessage('Generate report must be a boolean'),
    body('reportFormat')
      .optional()
      .isIn(['html', 'json', 'markdown', 'csv', 'xml'])
      .withMessage('Invalid report format'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      checks = ['segregation', 'distribution', 'mocks', 'build', 'dependencies'],
      strictMode = false,
      generateReport = false,
      reportFormat = 'html'
    } = req.body;

    try {
      const analysisResult = await service.performCompleteAnalysis({
        modulePaths,
        includeCodeSegregation: checks.includes('segregation'),
        includeDistributionValidation: checks.includes('distribution'),
        includeMockDetection: checks.includes('mocks'),
        includeBuildValidation: checks.includes('build'),
        includeDependencyAnalysis: checks.includes('dependencies'),
        generateReport,
        reportFormat
      });

      res.json({
        success: true,
        data: analysisResult,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          analysisConfiguration: {
            totalModules: modulePaths.length,
            checksPerformed: checks,
            strictMode,
            reportGenerated: generateReport
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Architectural analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * POST /api/v1/architecture/segregation
 * Analyze code segregation compliance
 */
architectureRoutes.post('/segregation',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('strictMode')
      .optional()
      .isBoolean()
      .withMessage('Strict mode must be a boolean'),
    body('excludePatterns')
      .optional()
      .isArray()
      .withMessage('Exclude patterns must be an array'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      strictMode = false,
      excludePatterns = ['node_modules', 'dist', 'build', '.git']
    } = req.body;

    try {
      const segregationResult = await service.codeSegregationAnalyzer.analyzeCodeSegregation({
        modulePaths,
        strictMode,
        excludePatterns
      });

      res.json({
        success: true,
        data: segregationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'code_segregation',
          configuration: {
            strictMode,
            excludePatterns,
            modulesAnalyzed: modulePaths.length
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Code segregation analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/architecture/distribution
 * Validate distribution architecture
 */
architectureRoutes.post('/distribution',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('strictMode')
      .optional()
      .isBoolean()
      .withMessage('Strict mode must be a boolean'),
    body('checkPackageJson')
      .optional()
      .isBoolean()
      .withMessage('Check package.json must be a boolean'),
    body('validateArtifacts')
      .optional()
      .isBoolean()
      .withMessage('Validate artifacts must be a boolean'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      strictMode = false,
      checkPackageJson = true,
      validateArtifacts = true
    } = req.body;

    try {
      const distributionResults = await Promise.all(
        modulePaths.map(modulePath =>
          service.distributionValidator.validateDistribution({
            modulePath,
            strictMode,
            checkPackageJson,
            validateArtifacts
          })
        )
      );

      // Aggregate results
      const aggregatedResult = {
        totalModules: modulePaths.length,
        validModules: distributionResults.filter(r => r.hasValidDistribution).length,
        invalidModules: distributionResults.filter(r => !r.hasValidDistribution).length,
        results: distributionResults,
        summary: {
          totalViolations: distributionResults.reduce((sum, r) => sum + r.violations.length, 0),
          criticalViolations: distributionResults.reduce((sum, r) =>
            sum + r.violations.filter(v => v.severity === 'CRITICAL').length, 0
          )
        }
      };

      res.json({
        success: true,
        data: aggregatedResult,
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'distribution_validation',
          configuration: {
            strictMode,
            checkPackageJson,
            validateArtifacts
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Distribution validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/architecture/mocks
 * Detect mock implementations and placeholders
 */
architectureRoutes.post('/mocks',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('strictMode')
      .optional()
      .isBoolean()
      .withMessage('Strict mode must be a boolean'),
    body('scanPatterns')
      .optional()
      .isArray()
      .withMessage('Scan patterns must be an array'),
    body('excludePatterns')
      .optional()
      .isArray()
      .withMessage('Exclude patterns must be an array'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      strictMode = false,
      scanPatterns = ['*.ts', '*.tsx', '*.js', '*.jsx'],
      excludePatterns = ['node_modules', '*.test.*', '*.spec.*', 'dist']
    } = req.body;

    try {
      const mockDetectionResult = await service.mockDetector.detectMockImplementations({
        modulePaths,
        strictMode,
        scanPatterns,
        excludePatterns
      });

      res.json({
        success: true,
        data: mockDetectionResult,
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'mock_detection',
          configuration: {
            strictMode,
            scanPatterns,
            excludePatterns
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Mock detection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/architecture/build
 * Validate build configuration and execution
 */
architectureRoutes.post('/build',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('enableTypeCheck')
      .optional()
      .isBoolean()
      .withMessage('Enable type check must be a boolean'),
    body('enableBuild')
      .optional()
      .isBoolean()
      .withMessage('Enable build must be a boolean'),
    body('enableTests')
      .optional()
      .isBoolean()
      .withMessage('Enable tests must be a boolean'),
    body('parallel')
      .optional()
      .isBoolean()
      .withMessage('Parallel must be a boolean'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      enableTypeCheck = true,
      enableBuild = true,
      enableTests = false,
      parallel = true
    } = req.body;

    try {
      const buildResult = await service.buildValidator.validateBuild({
        modulePaths,
        enableTypeCheck,
        enableBuild,
        enableTests,
        parallel
      });

      res.json({
        success: true,
        data: buildResult,
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'build_validation',
          configuration: {
            enableTypeCheck,
            enableBuild,
            enableTests,
            parallel,
            modulesProcessed: modulePaths.length
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Build validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/architecture/dependencies
 * Analyze dependency relationships and detect circular dependencies
 */
architectureRoutes.post('/dependencies',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('includeFileTypes')
      .optional()
      .isArray()
      .withMessage('Include file types must be an array'),
    body('includeTestDependencies')
      .optional()
      .isBoolean()
      .withMessage('Include test dependencies must be a boolean'),
    body('excludePatterns')
      .optional()
      .isArray()
      .withMessage('Exclude patterns must be an array'),
    body('maxDependencyDepth')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Max dependency depth must be between 1 and 20'),
    body('generateVisualization')
      .optional()
      .isBoolean()
      .withMessage('Generate visualization must be a boolean'),
    body('visualizationFormat')
      .optional()
      .isIn(['mermaid', 'dot', 'json'])
      .withMessage('Invalid visualization format'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      includeFileTypes = ['ts', 'tsx', 'js', 'jsx'],
      includeTestDependencies = false,
      excludePatterns = ['node_modules', 'dist'],
      maxDependencyDepth = 10,
      generateVisualization = false,
      visualizationFormat = 'mermaid'
    } = req.body;

    try {
      const dependencyResult = await service.dependencyAnalyzer.analyzeDependencies({
        modulePaths,
        includeFileTypes,
        includeTestDependencies,
        excludePatterns,
        maxDependencyDepth
      });

      let visualization;
      if (generateVisualization) {
        visualization = await service.dependencyAnalyzer.generateDependencyVisualization(
          dependencyResult,
          visualizationFormat
        );
      }

      res.json({
        success: true,
        data: {
          analysis: dependencyResult,
          ...(visualization && { visualization })
        },
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'dependency_analysis',
          configuration: {
            includeFileTypes,
            includeTestDependencies,
            excludePatterns,
            maxDependencyDepth,
            visualizationGenerated: generateVisualization
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Dependency analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/v1/architecture/requirements
 * Get the 5 critical architectural requirements
 */
architectureRoutes.get('/requirements',
  asyncHandler(async (req: Request, res: Response) => {
    const requirements = [
      {
        id: 'code-segregation',
        name: 'Code Segregation Principle',
        description: 'Each module should NOT have any code not required by it',
        category: 'ARCHITECTURE',
        priority: 'CRITICAL',
        validation: {
          endpoint: 'POST /api/v1/architecture/segregation',
          automated: true
        }
      },
      {
        id: 'distribution-architecture',
        name: 'Distribution Architecture',
        description: 'Modules MUST have a proper dist/ folder with compiled, production-ready code',
        category: 'BUILD',
        priority: 'CRITICAL',
        validation: {
          endpoint: 'POST /api/v1/architecture/distribution',
          automated: true
        }
      },
      {
        id: 'real-implementation',
        name: 'Real Implementation Only',
        description: 'Modules must NOT contain mock implementations, stubs, or placeholders',
        category: 'QUALITY',
        priority: 'CRITICAL',
        validation: {
          endpoint: 'POST /api/v1/architecture/mocks',
          automated: true
        }
      },
      {
        id: 'build-test-standards',
        name: 'Build and Test Standards',
        description: 'All modules must build without errors and have a passing test suite',
        category: 'QUALITY',
        priority: 'CRITICAL',
        validation: {
          endpoint: 'POST /api/v1/architecture/build',
          automated: true
        }
      },
      {
        id: 'dependency-integrity',
        name: 'Dependency Chain Integrity',
        description: 'No circular dependencies between modules',
        category: 'ARCHITECTURE',
        priority: 'CRITICAL',
        validation: {
          endpoint: 'POST /api/v1/architecture/dependencies',
          automated: true
        }
      }
    ];

    res.json({
      success: true,
      data: {
        requirements,
        totalRequirements: requirements.length,
        categories: [...new Set(requirements.map(r => r.category))],
        comprehensiveAnalysis: {
          endpoint: 'POST /api/v1/architecture/analyze',
          description: 'Run all architectural validations in a single request'
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);