import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getUnifiedModuleRequirementsService } from '../../lib/index';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';

export const reportingRoutes = Router();
const service = getUnifiedModuleRequirementsService();

/**
 * POST /api/v1/reporting/generate
 * Generate comprehensive reports from validation data
 */
reportingRoutes.post('/generate',
  [
    body('title')
      .optional()
      .isString()
      .withMessage('Title must be a string'),
    body('format')
      .isIn(['html', 'json', 'markdown', 'csv', 'xml'])
      .withMessage('Format must be one of: html, json, markdown, csv, xml'),
    body('validationReport')
      .optional()
      .isObject()
      .withMessage('Validation report must be an object'),
    body('structureReport')
      .optional()
      .isObject()
      .withMessage('Structure report must be an object'),
    body('distributionReport')
      .optional()
      .isObject()
      .withMessage('Distribution report must be an object'),
    body('mockDetectionReport')
      .optional()
      .isObject()
      .withMessage('Mock detection report must be an object'),
    body('buildReport')
      .optional()
      .isObject()
      .withMessage('Build report must be an object'),
    body('dependencyReport')
      .optional()
      .isObject()
      .withMessage('Dependency report must be an object'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      title = 'CVPlus Module Requirements Report',
      format,
      validationReport,
      structureReport,
      distributionReport,
      mockDetectionReport,
      buildReport,
      dependencyReport
    } = req.body;

    try {
      const reportResult = await service.reportingService.generateReport({
        title,
        format,
        validationReport,
        structureReport,
        distributionReport,
        mockDetectionReport,
        buildReport,
        dependencyReport
      });

      // Set appropriate content type based on format
      const contentTypes = {
        html: 'text/html',
        json: 'application/json',
        markdown: 'text/markdown',
        csv: 'text/csv',
        xml: 'application/xml'
      };

      res.set('Content-Type', contentTypes[format]);

      if (format === 'json') {
        res.json({
          success: true,
          data: reportResult,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      } else {
        // For non-JSON formats, return the raw content
        res.send(reportResult.content);
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Report generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * GET /api/v1/reporting/formats
 * Get available report formats and their descriptions
 */
reportingRoutes.get('/formats',
  asyncHandler(async (req: Request, res: Response) => {
    const formats = [
      {
        format: 'html',
        name: 'HTML Report',
        description: 'Interactive HTML report with charts and responsive design',
        contentType: 'text/html',
        features: ['Interactive', 'Charts', 'Mobile-friendly', 'Professional styling']
      },
      {
        format: 'json',
        name: 'JSON Data',
        description: 'Structured JSON data for programmatic consumption',
        contentType: 'application/json',
        features: ['Machine-readable', 'API integration', 'Data processing']
      },
      {
        format: 'markdown',
        name: 'Markdown Report',
        description: 'Markdown formatted report for documentation',
        contentType: 'text/markdown',
        features: ['Human-readable', 'Version control friendly', 'Documentation integration']
      },
      {
        format: 'csv',
        name: 'CSV Data',
        description: 'Comma-separated values for spreadsheet analysis',
        contentType: 'text/csv',
        features: ['Spreadsheet compatible', 'Data analysis', 'Export friendly']
      },
      {
        format: 'xml',
        name: 'XML Report',
        description: 'XML structured report for enterprise systems',
        contentType: 'application/xml',
        features: ['Enterprise integration', 'Structured data', 'Schema validation']
      }
    ];

    res.json({
      success: true,
      data: {
        formats,
        totalFormats: formats.length,
        recommendedFormat: 'html',
        usage: {
          endpoint: 'POST /api/v1/reporting/generate',
          example: {
            format: 'html',
            title: 'My Module Analysis Report'
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * POST /api/v1/reporting/quick
 * Generate a quick summary report from module paths
 */
reportingRoutes.post('/quick',
  [
    body('modulePaths')
      .isArray({ min: 1 })
      .withMessage('Module paths array is required'),
    body('format')
      .optional()
      .isIn(['html', 'json', 'markdown'])
      .withMessage('Format must be one of: html, json, markdown'),
    body('includeDetails')
      .optional()
      .isBoolean()
      .withMessage('Include details must be a boolean'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modulePaths,
      format = 'html',
      includeDetails = false
    } = req.body;

    try {
      // Perform quick analysis
      const quickResult = await service.performQuickValidation({
        modulePaths,
        enableBuildCheck: true,
        enableMockDetection: true
      });

      // Generate report from quick results
      const reportResult = await service.reportingService.generateReport({
        title: 'Quick Module Analysis Report',
        format,
        validationReport: quickResult.validation?.[0],
        buildReport: quickResult.build,
        mockDetectionReport: quickResult.mockDetection
      });

      const contentTypes = {
        html: 'text/html',
        json: 'application/json',
        markdown: 'text/markdown'
      };

      res.set('Content-Type', contentTypes[format]);

      if (format === 'json') {
        res.json({
          success: true,
          data: {
            ...reportResult,
            quickAnalysis: quickResult
          },
          metadata: {
            timestamp: new Date().toISOString(),
            reportType: 'quick',
            modulesAnalyzed: modulePaths.length
          }
        });
      } else {
        res.send(reportResult.content);
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Quick report generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/v1/reporting/templates
 * Get available report templates
 */
reportingRoutes.get('/templates',
  asyncHandler(async (req: Request, res: Response) => {
    const templates = [
      {
        id: 'comprehensive',
        name: 'Comprehensive Analysis Report',
        description: 'Complete report with all analysis types',
        includes: ['validation', 'structure', 'distribution', 'mocks', 'build', 'dependencies'],
        recommendedFor: ['Production releases', 'Architecture reviews', 'Complete audits']
      },
      {
        id: 'quality-focused',
        name: 'Quality Assessment Report',
        description: 'Focus on code quality and implementation standards',
        includes: ['validation', 'mocks', 'build'],
        recommendedFor: ['Code reviews', 'Quality gates', 'CI/CD integration']
      },
      {
        id: 'architecture-focused',
        name: 'Architecture Compliance Report',
        description: 'Focus on architectural requirements and structure',
        includes: ['structure', 'distribution', 'dependencies'],
        recommendedFor: ['Architecture reviews', 'Compliance audits', 'Design validation']
      },
      {
        id: 'ci-cd',
        name: 'CI/CD Pipeline Report',
        description: 'Optimized for continuous integration workflows',
        includes: ['validation', 'build'],
        recommendedFor: ['Automated testing', 'Build pipelines', 'Quick feedback']
      }
    ];

    res.json({
      success: true,
      data: {
        templates,
        totalTemplates: templates.length,
        usage: {
          description: 'Use template IDs in the title field to apply predefined configurations',
          example: {
            title: 'quality-focused',
            format: 'html'
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  })
);