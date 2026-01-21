/**
 * Phases API Handler
 * Handles all phase-related recovery API endpoints
 */

import { Request, Response } from 'express';
import {
  PhaseExecutor,
  PhaseExecutionOptions,
  RecoveryServiceError,
  validateServiceOptions
} from '../../services';
import { createRecoverySession } from '../../models';

export class PhasesHandler {
  private phaseExecutor: PhaseExecutor;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.phaseExecutor = new PhaseExecutor(workspacePath);
  }

  /**
   * GET /api/recovery/phases
   * Retrieve all recovery phases with their current status and progress
   */
  async getAllPhases(req: Request, res: Response): Promise<void> {
    try {
      const includeProgress = req.query.includeProgress !== 'false';
      const includeMetrics = req.query.includeMetrics === 'true';

      const phasesData = await this.phaseExecutor.getPhases({
        includeProgress,
        includeMetrics
      });

      // Format response according to API contract
      const response = {
        phases: phasesData.phases.map(phase => ({
          phaseId: phase.phaseId,
          phaseName: phase.phaseName,
          status: phase.status,
          startTime: phase.startTime || null,
          endTime: phase.endTime || null,
          duration: phase.duration || null,
          tasksTotal: phase.tasksTotal,
          tasksCompleted: phase.tasksCompleted,
          tasksRemaining: phase.tasksRemaining,
          healthImprovement: phase.healthImprovement,
          errors: phase.errors
        })),
        currentPhase: phasesData.currentPhase,
        overallProgress: phasesData.overallProgress,
        totalHealthImprovement: phasesData.totalHealthImprovement,
        estimatedCompletion: phasesData.estimatedCompletion
      };

      // Set appropriate caching headers
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.setHeader('ETag', `"phases-${Date.now()}-${phasesData.overallProgress}"`);

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, 'getAllPhases');
    }
  }

  /**
   * POST /api/recovery/phases/:phaseId
   * Execute a specific recovery phase with optional configuration
   */
  async executePhase(req: Request, res: Response): Promise<void> {
    try {
      const phaseIdParam = req.params.phaseId;
      const executionOptions = req.body || {};

      // Validate phaseId parameter
      const phaseId = parseInt(phaseIdParam, 10);
      if (isNaN(phaseId) || phaseId < 1 || phaseId > 5) {
        res.status(400).json({
          code: 'INVALID_PHASE_ID',
          message: 'Phase ID must be a number between 1 and 5',
          details: {
            provided: phaseIdParam,
            validRange: { min: 1, max: 5 }
          }
        });
        return;
      }

      // Validate execution options
      const validationResult = this.validateExecutionOptions(executionOptions);
      if (!validationResult.valid) {
        res.status(400).json({
          code: 'INVALID_EXECUTION_OPTIONS',
          message: validationResult.message,
          details: validationResult.details
        });
        return;
      }

      // Build phase execution options
      const options: PhaseExecutionOptions = {
        phaseId,
        forceExecution: executionOptions.forceExecution || false,
        skipValidation: executionOptions.skipValidation || false,
        parallelExecution: executionOptions.parallelExecution || false,
        maxConcurrency: executionOptions.maxConcurrency || 3,
        timeout: executionOptions.timeout,
        dryRun: executionOptions.dryRun || false
      };

      // Validate options using service validator
      const serviceValidationErrors = validateServiceOptions.phaseExecution(options);
      if (serviceValidationErrors.length > 0) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Phase execution options validation failed',
          details: { errors: serviceValidationErrors }
        });
        return;
      }

      // Execute the phase
      const executionResult = await this.phaseExecutor.executePhase(options);

      // Format response according to API contract
      const response = {
        phaseId: executionResult.phaseId,
        phaseName: executionResult.phaseName,
        executionTriggered: executionResult.executionTriggered,
        executionId: executionResult.executionId,
        estimatedDuration: executionResult.estimatedDuration,
        executionStrategy: executionResult.executionStrategy,
        maxConcurrency: executionResult.maxConcurrency,
        startTime: executionResult.startTime,
        status: executionResult.status,
        tasksExecuted: executionResult.tasksExecuted,
        tasksSuccessful: executionResult.tasksSuccessful,
        tasksFailed: executionResult.tasksFailed,
        healthImprovement: executionResult.healthImprovement,
        errorsResolved: executionResult.errorsResolved,
        artifacts: executionResult.artifacts,
        logs: executionResult.logs
      };

      // Return 202 for asynchronous execution, 200 for completed execution
      const statusCode = executionResult.status === 'executing' ? 202 : 200;
      res.status(statusCode).json(response);
    } catch (error) {
      this.handleError(error, res, 'executePhase');
    }
  }

  /**
   * GET /api/recovery/phases/:phaseId/status
   * Get the current status of a specific phase execution
   */
  async getPhaseStatus(req: Request, res: Response): Promise<void> {
    try {
      const phaseIdParam = req.params.phaseId;
      const executionId = req.query.executionId as string;

      // Validate phaseId parameter
      const phaseId = parseInt(phaseIdParam, 10);
      if (isNaN(phaseId) || phaseId < 1 || phaseId > 5) {
        res.status(400).json({
          code: 'INVALID_PHASE_ID',
          message: 'Phase ID must be a number between 1 and 5',
          details: {
            provided: phaseIdParam,
            validRange: { min: 1, max: 5 }
          }
        });
        return;
      }

      // Get execution status if executionId provided
      if (executionId) {
        const executionStatus = this.phaseExecutor.getExecutionStatus(executionId);

        if (!executionStatus) {
          res.status(404).json({
            code: 'EXECUTION_NOT_FOUND',
            message: 'Phase execution not found',
            details: {
              executionId,
              phaseId
            }
          });
          return;
        }

        if (executionStatus.phaseId !== phaseId) {
          res.status(400).json({
            code: 'PHASE_MISMATCH',
            message: 'Execution ID does not match the specified phase',
            details: {
              requestedPhaseId: phaseId,
              executionPhaseId: executionStatus.phaseId,
              executionId
            }
          });
          return;
        }

        res.status(200).json({
          phaseId: executionStatus.phaseId,
          phaseName: executionStatus.phaseName,
          executionId: executionStatus.executionId,
          status: executionStatus.status,
          startTime: executionStatus.startTime,
          endTime: executionStatus.endTime,
          duration: executionStatus.duration,
          progress: {
            tasksExecuted: executionStatus.tasksExecuted,
            tasksSuccessful: executionStatus.tasksSuccessful,
            tasksFailed: executionStatus.tasksFailed,
            healthImprovement: executionStatus.healthImprovement,
            errorsResolved: executionStatus.errorsResolved
          },
          logs: executionStatus.logs.slice(-10) // Return last 10 log entries
        });
        return;
      }

      // Get general phase status
      const phasesData = await this.phaseExecutor.getPhases();
      const phase = phasesData.phases.find(p => p.phaseId === phaseId);

      if (!phase) {
        res.status(404).json({
          code: 'PHASE_NOT_FOUND',
          message: 'Phase not found',
          details: { phaseId }
        });
        return;
      }

      res.status(200).json({
        phaseId: phase.phaseId,
        phaseName: phase.phaseName,
        status: phase.status,
        startTime: phase.startTime,
        endTime: phase.endTime,
        duration: phase.duration,
        progress: {
          tasksTotal: phase.tasksTotal,
          tasksCompleted: phase.tasksCompleted,
          tasksRemaining: phase.tasksRemaining,
          healthImprovement: phase.healthImprovement
        },
        errors: phase.errors
      });
    } catch (error) {
      this.handleError(error, res, 'getPhaseStatus');
    }
  }

  /**
   * DELETE /api/recovery/phases/:phaseId/executions/:executionId
   * Cancel a running phase execution
   */
  async cancelPhaseExecution(req: Request, res: Response): Promise<void> {
    try {
      const phaseIdParam = req.params.phaseId;
      const executionId = req.params.executionId;

      // Validate phaseId parameter
      const phaseId = parseInt(phaseIdParam, 10);
      if (isNaN(phaseId) || phaseId < 1 || phaseId > 5) {
        res.status(400).json({
          code: 'INVALID_PHASE_ID',
          message: 'Phase ID must be a number between 1 and 5',
          details: {
            provided: phaseIdParam,
            validRange: { min: 1, max: 5 }
          }
        });
        return;
      }

      if (!executionId) {
        res.status(400).json({
          code: 'MISSING_EXECUTION_ID',
          message: 'Execution ID is required for cancellation',
          details: { phaseId }
        });
        return;
      }

      // Cancel the phase execution
      const cancellationResult = await this.phaseExecutor.cancelPhase(executionId);

      if (!cancellationResult.cancelled) {
        const statusCode = cancellationResult.reason.includes('not found') ? 404 : 409;
        res.status(statusCode).json({
          code: statusCode === 404 ? 'EXECUTION_NOT_FOUND' : 'CANCELLATION_FAILED',
          message: cancellationResult.reason,
          details: {
            executionId,
            phaseId,
            cleanupPerformed: cancellationResult.cleanupPerformed
          }
        });
        return;
      }

      res.status(200).json({
        executionId: cancellationResult.executionId,
        cancelled: cancellationResult.cancelled,
        reason: cancellationResult.reason,
        cleanupPerformed: cancellationResult.cleanupPerformed,
        cancelledAt: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res, 'cancelPhaseExecution');
    }
  }

  // Private helper methods

  private validateExecutionOptions(options: any): {
    valid: boolean;
    message?: string;
    details?: any;
  } {
    const validOptions = [
      'forceExecution',
      'skipValidation',
      'parallelExecution',
      'maxConcurrency',
      'timeout',
      'dryRun'
    ];

    const invalidOptions = Object.keys(options).filter(key => !validOptions.includes(key));

    if (invalidOptions.length > 0) {
      return {
        valid: false,
        message: 'Invalid execution options provided',
        details: {
          invalidOptions,
          validOptions
        }
      };
    }

    // Validate option types and values
    const typeErrors = [];

    if (options.forceExecution !== undefined && typeof options.forceExecution !== 'boolean') {
      typeErrors.push({
        option: 'forceExecution',
        expectedType: 'boolean',
        receivedType: typeof options.forceExecution
      });
    }

    if (options.skipValidation !== undefined && typeof options.skipValidation !== 'boolean') {
      typeErrors.push({
        option: 'skipValidation',
        expectedType: 'boolean',
        receivedType: typeof options.skipValidation
      });
    }

    if (options.parallelExecution !== undefined && typeof options.parallelExecution !== 'boolean') {
      typeErrors.push({
        option: 'parallelExecution',
        expectedType: 'boolean',
        receivedType: typeof options.parallelExecution
      });
    }

    if (options.maxConcurrency !== undefined) {
      if (typeof options.maxConcurrency !== 'number' || options.maxConcurrency < 1 || options.maxConcurrency > 10) {
        typeErrors.push({
          option: 'maxConcurrency',
          expectedType: 'number (1-10)',
          receivedValue: options.maxConcurrency
        });
      }
    }

    if (options.timeout !== undefined) {
      if (typeof options.timeout !== 'number' || options.timeout < 1) {
        typeErrors.push({
          option: 'timeout',
          expectedType: 'positive number',
          receivedValue: options.timeout
        });
      }
    }

    if (options.dryRun !== undefined && typeof options.dryRun !== 'boolean') {
      typeErrors.push({
        option: 'dryRun',
        expectedType: 'boolean',
        receivedType: typeof options.dryRun
      });
    }

    if (typeErrors.length > 0) {
      return {
        valid: false,
        message: 'Invalid option types or values',
        details: { typeErrors }
      };
    }

    return { valid: true };
  }

  private handleError(error: any, res: Response, operation: string): void {
    console.error(`PhasesHandler.${operation} error:`, error);

    // Handle authentication errors
    if (error.message && error.message.includes('authentication')) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token',
        details: {
          endpoint: req.originalUrl,
          method: req.method,
          requiredPermissions: ['recovery:phases:execute', 'recovery:phases:read']
        }
      });
      return;
    }

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

    // Handle phase execution errors
    if (error.message && error.message.includes('phase')) {
      res.status(409).json({
        code: 'PHASE_EXECUTION_ERROR',
        message: error.message,
        details: {
          operation,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      res.status(408).json({
        code: 'REQUEST_TIMEOUT',
        message: 'Phase execution timed out',
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
      message: 'An unexpected error occurred during phase execution',
      details: {
        operation,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

export default PhasesHandler;