/**
 * Modules API Handler
 * Handles all module-related recovery API endpoints
 */

import { Request, Response } from 'express';
import {
  WorkspaceAnalyzer,
  ModuleRecovery,
  AnalysisOptions,
  RecoveryOptions,
  RecoveryServiceError,
  validateServiceOptions
} from '../../services';
import {
  isValidModuleStatus,
  isValidBuildStatus,
  isValidTestStatus,
  isValidDependencyHealth
} from '../../models';

export class ModulesHandler {
  private workspaceAnalyzer: WorkspaceAnalyzer;
  private moduleRecovery: ModuleRecovery;
  private readonly validModuleIds = [
    'auth', 'i18n', 'cv-processing', 'multimedia', 'analytics',
    'premium', 'public-profiles', 'recommendations', 'admin',
    'workflow', 'payments'
  ];

  constructor(workspacePath: string) {
    this.workspaceAnalyzer = new WorkspaceAnalyzer(workspacePath);
    this.moduleRecovery = new ModuleRecovery(workspacePath);
  }

  /**
   * GET /api/recovery/modules
   * Retrieve all module states with health metrics and summary
   */
  async getAllModules(req: Request, res: Response): Promise<void> {
    try {
      const options: AnalysisOptions = {
        includeHealthMetrics: true,
        includeDependencyGraph: req.query.includeDependencyGraph === 'true',
        includeErrorDetails: req.query.includeErrorDetails === 'true',
        analysisDepth: (req.query.analysisDepth as 'basic' | 'detailed' | 'comprehensive') || 'detailed'
      };

      // Validate options
      const validationErrors = validateServiceOptions.analysis(options);
      if (validationErrors.length > 0) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid analysis options',
          details: { errors: validationErrors }
        });
        return;
      }

      const analysisResult = await this.workspaceAnalyzer.analyzeWorkspace(options);
      const workspaceHealth = analysisResult.workspaceHealth;

      // Format response according to API contract
      const response = {
        modules: Object.values(workspaceHealth.moduleStates).map(moduleState => ({
          moduleId: moduleState.moduleId,
          status: moduleState.status,
          buildStatus: moduleState.buildStatus,
          testStatus: moduleState.testStatus,
          dependencyHealth: moduleState.dependencyHealth,
          lastBuildTime: moduleState.lastBuildTime || null,
          lastTestRun: moduleState.lastTestRun || null,
          errorCount: moduleState.errorCount,
          warningCount: moduleState.warningCount,
          healthScore: moduleState.healthScore
        })),
        summary: {
          totalModules: workspaceHealth.moduleSummary.totalModules,
          healthyModules: workspaceHealth.moduleSummary.healthyModules,
          criticalModules: workspaceHealth.moduleSummary.criticalModules,
          recoveringModules: workspaceHealth.moduleSummary.recoveringModules,
          overallHealthScore: workspaceHealth.overallHealthScore
        }
      };

      // Set caching headers
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('ETag', `"${Date.now()}-${workspaceHealth.overallHealthScore}"`);

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, 'getAllModules');
    }
  }

  /**
   * GET /api/recovery/modules/:moduleId
   * Retrieve specific module state and detailed information
   */
  async getModule(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;

      // Validate moduleId
      if (!this.isValidModuleId(moduleId)) {
        res.status(404).json({
          code: 'MODULE_NOT_FOUND',
          message: `Module '${moduleId}' not found`,
          details: {
            moduleId,
            validModuleIds: this.validModuleIds
          }
        });
        return;
      }

      // Check for special characters that could indicate path traversal
      if (this.containsSpecialCharacters(moduleId)) {
        res.status(400).json({
          code: 'INVALID_MODULE_ID',
          message: 'Invalid characters in module ID',
          details: {
            moduleId,
            reason: 'Invalid characters detected - only alphanumeric characters and hyphens allowed'
          }
        });
        return;
      }

      const moduleState = await this.workspaceAnalyzer.analyzeModule(moduleId);

      // Format response according to API contract
      const response = {
        moduleId: moduleState.moduleId,
        status: moduleState.status,
        buildStatus: moduleState.buildStatus,
        testStatus: moduleState.testStatus,
        dependencyHealth: moduleState.dependencyHealth,
        lastBuildTime: moduleState.lastBuildTime || null,
        lastTestRun: moduleState.lastTestRun || null,
        errorCount: moduleState.errorCount,
        warningCount: moduleState.warningCount,
        healthScore: moduleState.healthScore
      };

      // Validate timestamp formats if present
      if (response.lastBuildTime && !this.isValidISOTimestamp(response.lastBuildTime)) {
        response.lastBuildTime = new Date().toISOString();
      }
      if (response.lastTestRun && !this.isValidISOTimestamp(response.lastTestRun)) {
        response.lastTestRun = new Date().toISOString();
      }

      // Set caching headers
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.setHeader('ETag', `"${moduleId}-${Date.now()}-${moduleState.healthScore}"`);

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, 'getModule');
    }
  }

  /**
   * PUT /api/recovery/modules/:moduleId
   * Update module state and trigger recovery actions
   */
  async updateModule(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const updateData = req.body;

      // Validate moduleId
      if (!this.isValidModuleId(moduleId)) {
        res.status(404).json({
          code: 'MODULE_NOT_FOUND',
          message: `Module '${moduleId}' not found`,
          details: {
            moduleId,
            validModuleIds: this.validModuleIds
          }
        });
        return;
      }

      // Validate update data
      const validationResult = this.validateUpdateData(updateData);
      if (!validationResult.valid) {
        res.status(400).json({
          code: validationResult.errorCode,
          message: validationResult.message,
          details: validationResult.details
        });
        return;
      }

      // Check if at least one field is provided for update
      const allowedFields = ['status', 'notes'];
      const providedFields = Object.keys(updateData).filter(key => allowedFields.includes(key));

      if (providedFields.length === 0) {
        res.status(400).json({
          code: 'EMPTY_UPDATE',
          message: 'At least one field must be provided for update',
          details: { allowedFields }
        });
        return;
      }

      // Check for unknown fields
      const unknownFields = Object.keys(updateData).filter(key => !allowedFields.includes(key));
      if (unknownFields.length > 0) {
        res.status(400).json({
          code: 'UNKNOWN_FIELDS',
          message: 'Unknown fields provided',
          details: {
            unknownFields,
            allowedFields
          }
        });
        return;
      }

      // Trigger recovery if status is being updated to 'recovering'
      let moduleState;
      if (updateData.status === 'recovering') {
        const recoveryOptions: RecoveryOptions = {
          moduleId,
          workspacePath: this.workspaceAnalyzer['workspacePath'], // Access private property
          recoveryStrategy: 'repair',
          dryRun: false
        };

        const recoveryResult = await this.moduleRecovery.recoverModule(recoveryOptions);

        // Get updated module state after recovery
        moduleState = await this.workspaceAnalyzer.analyzeModule(moduleId);

        // Update status based on recovery result
        if (recoveryResult.recoveryStatus === 'completed') {
          moduleState.status = 'healthy';
        } else if (recoveryResult.recoveryStatus === 'failed') {
          moduleState.status = 'failed';
        } else {
          moduleState.status = 'critical';
        }
      } else {
        // Just analyze current state for other status updates
        moduleState = await this.workspaceAnalyzer.analyzeModule(moduleId);

        // Update status if provided
        if (updateData.status && isValidModuleStatus(updateData.status)) {
          moduleState.status = updateData.status;
        }
      }

      // Update metadata
      moduleState.lastModified = new Date().toISOString();
      moduleState.modifiedBy = 'recovery-system';

      // Add notes if provided
      if (updateData.notes) {
        moduleState.notes = updateData.notes;
      }

      // Format response
      const response = {
        moduleId: moduleState.moduleId,
        status: moduleState.status,
        buildStatus: moduleState.buildStatus,
        testStatus: moduleState.testStatus,
        dependencyHealth: moduleState.dependencyHealth,
        lastBuildTime: moduleState.lastBuildTime || null,
        lastTestRun: moduleState.lastTestRun || null,
        errorCount: moduleState.errorCount,
        warningCount: moduleState.warningCount,
        healthScore: moduleState.healthScore,
        lastModified: moduleState.lastModified,
        modifiedBy: moduleState.modifiedBy
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, 'updateModule');
    }
  }

  /**
   * POST /api/recovery/modules/:moduleId/build
   * Trigger build process for specific module
   */
  async buildModule(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const buildOptions = req.body;

      // Validate moduleId
      if (!this.isValidModuleId(moduleId)) {
        res.status(404).json({
          code: 'MODULE_NOT_FOUND',
          message: `Module '${moduleId}' not found`,
          details: {
            moduleId,
            validModuleIds: this.validModuleIds
          }
        });
        return;
      }

      // Validate build options
      const validationResult = this.validateBuildOptions(buildOptions);
      if (!validationResult.valid) {
        res.status(400).json({
          code: 'INVALID_BUILD_OPTIONS',
          message: validationResult.message,
          details: validationResult.details
        });
        return;
      }

      // Trigger module recovery with build focus
      const recoveryOptions: RecoveryOptions = {
        moduleId,
        workspacePath: this.workspaceAnalyzer['workspacePath'],
        recoveryStrategy: 'rebuild',
        phases: ['dependency-resolution', 'build-fix'],
        dryRun: false,
        ...buildOptions
      };

      const recoveryResult = await this.moduleRecovery.recoverModule(recoveryOptions);

      // Format build-specific response
      const response = {
        moduleId,
        buildTriggered: true,
        buildId: `build-${moduleId}-${Date.now()}`,
        estimatedDuration: 180, // 3 minutes estimated
        buildPhases: ['dependency-resolution', 'compilation', 'type-checking', 'bundling'],
        buildStatus: 'building',
        startTime: new Date().toISOString(),
        recoveryResult: {
          status: recoveryResult.recoveryStatus,
          healthImprovement: recoveryResult.healthImprovement,
          errorsResolved: recoveryResult.errorsResolved
        }
      };

      res.status(202).json(response);
    } catch (error) {
      this.handleError(error, res, 'buildModule');
    }
  }

  /**
   * POST /api/recovery/modules/:moduleId/test
   * Trigger test execution for specific module
   */
  async testModule(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const testOptions = req.body;

      // Validate moduleId
      if (!this.isValidModuleId(moduleId)) {
        res.status(404).json({
          code: 'MODULE_NOT_FOUND',
          message: `Module '${moduleId}' not found`,
          details: {
            moduleId,
            validModuleIds: this.validModuleIds
          }
        });
        return;
      }

      // Validate test options
      const validationResult = this.validateTestOptions(testOptions);
      if (!validationResult.valid) {
        res.status(400).json({
          code: 'INVALID_TEST_OPTIONS',
          message: validationResult.message,
          details: validationResult.details
        });
        return;
      }

      // Trigger module recovery with test focus
      const recoveryOptions: RecoveryOptions = {
        moduleId,
        workspacePath: this.workspaceAnalyzer['workspacePath'],
        recoveryStrategy: 'repair',
        phases: ['test-fix'],
        dryRun: false,
        ...testOptions
      };

      const recoveryResult = await this.moduleRecovery.recoverModule(recoveryOptions);

      // Format test-specific response
      const response = {
        moduleId,
        testTriggered: true,
        testId: `test-${moduleId}-${Date.now()}`,
        estimatedDuration: 120, // 2 minutes estimated
        testPhases: ['unit-tests', 'integration-tests', 'coverage-analysis'],
        testStatus: 'running',
        startTime: new Date().toISOString(),
        recoveryResult: {
          status: recoveryResult.recoveryStatus,
          healthImprovement: recoveryResult.healthImprovement,
          errorsResolved: recoveryResult.errorsResolved
        }
      };

      res.status(202).json(response);
    } catch (error) {
      this.handleError(error, res, 'testModule');
    }
  }

  // Private helper methods

  private isValidModuleId(moduleId: string): boolean {
    return this.validModuleIds.includes(moduleId);
  }

  private containsSpecialCharacters(moduleId: string): boolean {
    // Only allow alphanumeric characters and hyphens
    return !/^[a-zA-Z0-9-]+$/.test(moduleId);
  }

  private isValidISOTimestamp(timestamp: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoRegex.test(timestamp);
  }

  private validateUpdateData(data: any): {
    valid: boolean;
    errorCode?: string;
    message?: string;
    details?: any;
  } {
    const fieldErrors = [];

    // Validate status field
    if (data.status !== undefined) {
      const validStatuses = ['healthy', 'critical', 'recovering', 'recovered', 'failed'];
      if (!validStatuses.includes(data.status)) {
        fieldErrors.push({
          field: 'status',
          error: 'Invalid status value',
          allowedValues: validStatuses
        });
      }
    }

    // Validate notes field
    if (data.notes !== undefined) {
      if (typeof data.notes !== 'string') {
        fieldErrors.push({
          field: 'notes',
          error: 'Expected string, received ' + typeof data.notes,
          expectedType: 'string',
          receivedType: typeof data.notes
        });
      }
    }

    if (fieldErrors.length > 0) {
      return {
        valid: false,
        errorCode: fieldErrors.some(e => e.field === 'status') ? 'INVALID_STATUS' : 'INVALID_FIELD_TYPE',
        message: 'Request validation failed',
        details: { fieldErrors }
      };
    }

    return { valid: true };
  }

  private validateBuildOptions(options: any): {
    valid: boolean;
    message?: string;
    details?: any;
  } {
    const validOptions = ['cleanBuild', 'skipTests', 'dependencyResolution', 'timeout'];
    const invalidOptions = Object.keys(options || {}).filter(key => !validOptions.includes(key));

    if (invalidOptions.length > 0) {
      return {
        valid: false,
        message: 'Invalid build options',
        details: {
          invalidOptions,
          validOptions
        }
      };
    }

    return { valid: true };
  }

  private validateTestOptions(options: any): {
    valid: boolean;
    message?: string;
    details?: any;
  } {
    const validOptions = ['testSuite', 'coverage', 'generateReport', 'fixFailures', 'timeout'];
    const invalidOptions = Object.keys(options || {}).filter(key => !validOptions.includes(key));

    if (invalidOptions.length > 0) {
      return {
        valid: false,
        message: 'Invalid test options',
        details: {
          invalidOptions,
          validOptions
        }
      };
    }

    return { valid: true };
  }

  private handleError(error: any, res: Response, operation: string): void {
    console.error(`ModulesHandler.${operation} error:`, error);

    if (error instanceof RecoveryServiceError) {
      res.status(500).json({
        code: 'SERVICE_ERROR',
        message: error.message,
        details: {
          service: error.service,
          operation: error.operation,
          originalError: error.message,
          timestamp: new Date().toISOString(),
          requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });
      return;
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      res.status(408).json({
        code: 'REQUEST_TIMEOUT',
        message: 'Operation timed out',
        details: {
          operation,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Generic error handling
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: {
        operation,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

export default ModulesHandler;