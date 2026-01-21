import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  ModuleRecoveryService,
  PhaseOrchestrationService,
  ValidationService
} from '../../recovery/services';

// Set global options for all functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '1GiB'
});

// Initialize services
const moduleRecoveryService = new ModuleRecoveryService();
const phaseOrchestrationService = new PhaseOrchestrationService(moduleRecoveryService);
const validationService = new ValidationService();

/**
 * Get workspace health status
 * GET /workspace/health
 */
export const getWorkspaceHealth = onCall(
  { cors: true },
  async (request) => {
    try {
      const { modules } = request.data || {};

      const targetModules = modules || [
        'auth', 'i18n', 'processing', 'multimedia', 'analytics',
        'premium', 'public-profiles', 'recommendations', 'admin',
        'workflow', 'payments'
      ];

      // Validate module IDs
      const validModuleIds = [
        'auth', 'i18n', 'processing', 'multimedia', 'analytics',
        'premium', 'public-profiles', 'recommendations', 'admin',
        'workflow', 'payments'
      ];

      const invalidModules = targetModules.filter((id: string) => !validModuleIds.includes(id));
      if (invalidModules.length > 0) {
        throw new HttpsError('invalid-argument', `Invalid module IDs: ${invalidModules.join(', ')}`);
      }

      // Get health checks for all modules
      const healthChecks = await Promise.all(
        targetModules.map(async (moduleId: string) => {
          return await moduleRecoveryService.performHealthCheck(moduleId);
        })
      );

      // Calculate overall workspace health
      const totalScore = healthChecks.reduce((sum, check) => sum + check.score, 0);
      const averageScore = healthChecks.length > 0 ? totalScore / healthChecks.length : 0;
      const healthyModules = healthChecks.filter(check => check.status === 'healthy').length;
      const degradedModules = healthChecks.filter(check => check.status === 'degraded').length;
      const criticalModules = healthChecks.filter(check => check.status === 'critical').length;
      const offlineModules = healthChecks.filter(check => check.status === 'offline').length;

      let overallStatus: 'healthy' | 'degraded' | 'critical' | 'offline';
      if (averageScore >= 90 && (healthyModules / healthChecks.length) >= 0.8) {
        overallStatus = 'healthy';
      } else if (averageScore >= 70 && (healthyModules / healthChecks.length) >= 0.6) {
        overallStatus = 'degraded';
      } else if (averageScore >= 30) {
        overallStatus = 'critical';
      } else {
        overallStatus = 'offline';
      }

      return {
        overallStatus,
        healthScore: averageScore,
        moduleHealthScores: Object.fromEntries(
          healthChecks.map(check => [check.moduleId, check.score])
        ),
        lastAssessment: new Date(),
        criticalIssues: healthChecks.flatMap(check => check.errors),
        recommendations: healthChecks.flatMap(check => check.warnings),
        systemMetrics: {
          totalModules: healthChecks.length,
          healthyModules,
          degradedModules,
          criticalModules,
          offlineModules
        },
        moduleDetails: healthChecks
      };

    } catch (error) {
      console.error('Error getting workspace health:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get workspace health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Initialize recovery session
 * POST /recovery/sessions
 */
export const initializeRecoverySession = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId, targetModules } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const session = await phaseOrchestrationService.initializeRecoverySession(
        sessionId,
        targetModules
      );

      return {
        sessionId: session.sessionId,
        status: session.status,
        currentPhase: session.currentPhase,
        totalPhases: session.totalPhases,
        targetModules: session.targetModules,
        startTime: session.startTime,
        workspaceHealth: session.workspaceHealth
      };

    } catch (error) {
      console.error('Error initializing recovery session:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to initialize recovery session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Execute recovery session
 * POST /recovery/sessions/{sessionId}/execute
 */
export const executeRecoverySession = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const session = await phaseOrchestrationService.executeRecoverySession(sessionId);

      return {
        sessionId: session.sessionId,
        status: session.status,
        currentPhase: session.currentPhase,
        totalPhases: session.totalPhases,
        startTime: session.startTime,
        endTime: session.endTime,
        phaseProgress: {
          phase1: session.phaseProgress.phase1,
          phase2: session.phaseProgress.phase2,
          phase3: session.phaseProgress.phase3,
          phase4: session.phaseProgress.phase4,
          phase5: session.phaseProgress.phase5
        },
        errors: session.errors,
        warnings: session.warnings,
        workspaceHealth: session.workspaceHealth
      };

    } catch (error) {
      console.error('Error executing recovery session:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to execute recovery session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get recovery session status
 * GET /recovery/sessions/{sessionId}
 */
export const getRecoverySession = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const session = phaseOrchestrationService.getRecoverySession(sessionId);

      if (!session) {
        throw new HttpsError('not-found', `Recovery session ${sessionId} not found`);
      }

      return {
        sessionId: session.sessionId,
        status: session.status,
        currentPhase: session.currentPhase,
        totalPhases: session.totalPhases,
        startTime: session.startTime,
        endTime: session.endTime,
        targetModules: session.targetModules,
        phaseProgress: {
          phase1: session.phaseProgress.phase1,
          phase2: session.phaseProgress.phase2,
          phase3: session.phaseProgress.phase3,
          phase4: session.phaseProgress.phase4,
          phase5: session.phaseProgress.phase5
        },
        errors: session.errors,
        warnings: session.warnings,
        workspaceHealth: session.workspaceHealth
      };

    } catch (error) {
      console.error('Error getting recovery session:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get recovery session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get recovery progress for a session
 * GET /recovery/sessions/{sessionId}/progress
 */
export const getRecoveryProgress = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const progress = phaseOrchestrationService.getRecoveryProgress(sessionId);

      if (!progress) {
        throw new HttpsError('not-found', `Recovery session ${sessionId} not found`);
      }

      return progress;

    } catch (error) {
      console.error('Error getting recovery progress:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get recovery progress: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Cancel recovery session
 * POST /recovery/sessions/{sessionId}/cancel
 */
export const cancelRecoverySession = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      await phaseOrchestrationService.cancelRecoverySession(sessionId);

      return {
        success: true,
        message: `Recovery session ${sessionId} cancelled successfully`
      };

    } catch (error) {
      console.error('Error cancelling recovery session:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to cancel recovery session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Validate module
 * POST /modules/{moduleId}/validate
 */
export const validateModule = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      const validationResult = await validationService.validateModule(moduleId);

      return validationResult;

    } catch (error) {
      console.error('Error validating module:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to validate module: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get validation summary for multiple modules
 * POST /modules/validate-batch
 */
export const validateModules = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleIds } = request.data || {};

      if (!moduleIds || !Array.isArray(moduleIds)) {
        throw new HttpsError('invalid-argument', 'moduleIds array is required');
      }

      if (moduleIds.length === 0) {
        throw new HttpsError('invalid-argument', 'moduleIds array cannot be empty');
      }

      const validationSummary = await validationService.getValidationSummary(moduleIds);

      return validationSummary;

    } catch (error) {
      console.error('Error validating modules:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to validate modules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get module health check
 * GET /modules/{moduleId}/health
 */
export const getModuleHealth = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      const healthCheck = await moduleRecoveryService.performHealthCheck(moduleId);

      return healthCheck;

    } catch (error) {
      console.error('Error getting module health:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get module health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Recover single module
 * POST /modules/{moduleId}/recover
 */
export const recoverModule = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      // Initialize module recovery if not already done
      await moduleRecoveryService.initializeModuleRecovery(moduleId);

      // Execute recovery
      const recoveryProgress = await moduleRecoveryService.executeRecovery(moduleId);

      return recoveryProgress;

    } catch (error) {
      console.error('Error recovering module:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to recover module: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get all active recovery sessions
 * GET /recovery/sessions
 */
export const getActiveSessions = onCall(
  { cors: true },
  async (request) => {
    try {
      const sessions = phaseOrchestrationService.getAllActiveSessions();

      return {
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          status: session.status,
          currentPhase: session.currentPhase,
          totalPhases: session.totalPhases,
          startTime: session.startTime,
          endTime: session.endTime,
          targetModules: session.targetModules,
          errors: session.errors,
          warnings: session.warnings
        }))
      };

    } catch (error) {
      console.error('Error getting active sessions:', error);

      throw new HttpsError(
        'internal',
        `Failed to get active sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);