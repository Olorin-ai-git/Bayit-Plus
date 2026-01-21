import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getUnifiedModuleRequirementsService } from '../../lib/index';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';

export const templateRoutes = Router();
const service = getUnifiedModuleRequirementsService();

/**
 * GET /api/v1/templates
 * List available module templates
 */
templateRoutes.get('/',
  [
    query('category').optional().isString(),
    query('includeMetadata').optional().isBoolean(),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { category, includeMetadata = true } = req.query;

    try {
      const templates = await service.templateManager.listTemplates({
        category: category as string,
        includeMetadata: includeMetadata === 'true'
      });

      res.json({
        success: true,
        data: {
          templates,
          totalCount: templates.length,
          categories: [...new Set(templates.map(t => t.category))].filter(Boolean)
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to list templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/v1/templates/search
 * Search templates with filters
 */
templateRoutes.get('/search',
  [
    query('searchTerm').optional().isString(),
    query('moduleType').optional().isString(),
    query('tags').optional().isString(),
    query('sortBy').optional().isIn(['name', 'usage', 'updated']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      searchTerm,
      moduleType,
      tags,
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = req.query;

    try {
      const searchResult = await service.templateManager.searchTemplates({
        searchTerm: searchTerm as string,
        moduleType: moduleType as any,
        tags: tags ? (tags as string).split(',') : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: searchResult,
        metadata: {
          timestamp: new Date().toISOString(),
          searchCriteria: {
            searchTerm,
            moduleType,
            tags,
            sortBy,
            sortOrder,
            limit,
            offset
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Template search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/templates/generate
 * Generate a new module from a template
 */
templateRoutes.post('/generate',
  [
    body('moduleName')
      .isString()
      .isLength({ min: 2 })
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('Module name must be alphanumeric with dashes, underscores, or dots'),
    body('outputPath')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Output path is required'),
    body('templateName')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Template name is required'),
    body('customOptions')
      .optional()
      .isObject()
      .withMessage('Custom options must be an object'),
    body('validateAfterGeneration')
      .optional()
      .isBoolean()
      .withMessage('Validate after generation must be a boolean'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const {
      moduleName,
      outputPath,
      templateName,
      customOptions = {},
      validateAfterGeneration = true
    } = req.body;

    try {
      const generationResult = await service.createModule({
        moduleName,
        outputPath,
        templateName,
        customOptions,
        validateAfterGeneration
      });

      res.status(201).json({
        success: true,
        data: generationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          generationOptions: {
            templateName,
            validateAfterGeneration,
            customOptionsProvided: Object.keys(customOptions).length > 0
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Module generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/v1/templates/:templateName
 * Get detailed information about a specific template
 */
templateRoutes.get('/:templateName',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateName } = req.params;

    try {
      // Search for the specific template
      const searchResult = await service.templateManager.searchTemplates({
        searchTerm: templateName,
        exactMatch: true,
        limit: 1
      });

      if (!searchResult.templates || searchResult.templates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `Template '${templateName}' does not exist`
        });
      }

      const template = searchResult.templates[0];

      res.json({
        success: true,
        data: {
          template,
          usage: {
            description: 'Use this template to generate a new module',
            example: {
              endpoint: 'POST /api/v1/templates/generate',
              payload: {
                moduleName: 'my-new-module',
                outputPath: './packages/',
                templateName: template.name,
                customOptions: {}
              }
            }
          }
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get template details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/v1/templates/validate-config
 * Validate template configuration before generation
 */
templateRoutes.post('/validate-config',
  [
    body('templateName')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Template name is required'),
    body('customOptions')
      .optional()
      .isObject()
      .withMessage('Custom options must be an object'),
    validateRequest
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { templateName, customOptions = {} } = req.body;

    try {
      // Get template details to validate against
      const searchResult = await service.templateManager.searchTemplates({
        searchTerm: templateName,
        exactMatch: true,
        limit: 1
      });

      if (!searchResult.templates || searchResult.templates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `Template '${templateName}' does not exist`
        });
      }

      const template = searchResult.templates[0];
      const validationErrors: string[] = [];
      const warnings: string[] = [];

      // Validate required options
      if (template.configurableOptions) {
        for (const option of template.configurableOptions) {
          if (option.required && !customOptions.hasOwnProperty(option.name)) {
            validationErrors.push(`Required option '${option.name}' is missing`);
          }

          if (customOptions.hasOwnProperty(option.name)) {
            const value = customOptions[option.name];
            const expectedType = option.type;

            // Basic type validation
            if (expectedType === 'string' && typeof value !== 'string') {
              validationErrors.push(`Option '${option.name}' must be a string`);
            } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
              validationErrors.push(`Option '${option.name}' must be a boolean`);
            } else if (expectedType === 'number' && typeof value !== 'number') {
              validationErrors.push(`Option '${option.name}' must be a number`);
            } else if (expectedType === 'array' && !Array.isArray(value)) {
              validationErrors.push(`Option '${option.name}' must be an array`);
            }
          }
        }
      }

      // Check for unexpected options
      const validOptionNames = template.configurableOptions?.map(o => o.name) || [];
      for (const optionName of Object.keys(customOptions)) {
        if (!validOptionNames.includes(optionName)) {
          warnings.push(`Unknown option '${optionName}' will be ignored`);
        }
      }

      const isValid = validationErrors.length === 0;

      res.json({
        success: true,
        data: {
          isValid,
          template: template.name,
          validationErrors,
          warnings,
          configurationSummary: {
            providedOptions: Object.keys(customOptions).length,
            requiredOptions: template.configurableOptions?.filter(o => o.required).length || 0,
            totalAvailableOptions: template.configurableOptions?.length || 0
          }
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Configuration validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/v1/templates/categories
 * Get all available template categories
 */
templateRoutes.get('/meta/categories',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const templates = await service.templateManager.listTemplates({
        includeMetadata: true
      });

      const categories = [...new Set(templates.map(t => t.category))].filter(Boolean);
      const categoriesWithCounts = categories.map(category => ({
        name: category,
        count: templates.filter(t => t.category === category).length,
        templates: templates.filter(t => t.category === category).map(t => ({
          name: t.name,
          description: t.description
        }))
      }));

      res.json({
        success: true,
        data: {
          categories: categoriesWithCounts,
          totalCategories: categories.length,
          totalTemplates: templates.length
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);