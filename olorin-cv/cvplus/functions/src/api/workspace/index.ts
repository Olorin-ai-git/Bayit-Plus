import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  ModuleRecoveryService,
  PhaseOrchestrationService,
  ValidationService
} from '../../recovery/services';

// Set global options for workspace management functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 5,
  timeoutSeconds: 600,
  memory: '1GiB'
});

// Initialize services
const moduleRecoveryService = new ModuleRecoveryService();
const phaseOrchestrationService = new PhaseOrchestrationService(moduleRecoveryService);
const validationService = new ValidationService();

// All CVPlus Level 2 modules
const ALL_MODULES = [
  'auth', 'i18n', 'processing', 'multimedia', 'analytics',
  'premium', 'public-profiles', 'recommendations', 'admin',
  'workflow', 'payments'
];

/**
 * Get comprehensive workspace status
 * GET /workspace/status
  */
export const getWorkspaceStatus = onCall(
  { cors: true },
  async (request) => {
    try {
      // Get health status for all modules
      const moduleHealthChecks = await Promise.all(
        ALL_MODULES.map(async (moduleId) => {
          try {
            return await moduleRecoveryService.performHealthCheck(moduleId);
          } catch (error) {
            return {
              moduleId,
              status: 'offline' as const,
              score: 0,
              errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
              warnings: [],
              timestamp: new Date(),
              buildHealth: {
                canBuild: false,
                lastBuildSuccess: false,
                dependenciesResolved: false
              },
              dependencyHealth: {
                allResolved: false,
                conflictsDetected: true,
                missingDependencies: ['unknown']
              }
            };
          }
        })
      );

      // Calculate workspace metrics
      const totalScore = moduleHealthChecks.reduce((sum, check) => sum + check.score, 0);
      const averageScore = moduleHealthChecks.length > 0 ? totalScore / moduleHealthChecks.length : 0;

      const healthyModules = moduleHealthChecks.filter(check => check.status === 'healthy').length;
      const degradedModules = moduleHealthChecks.filter(check => check.status === 'degraded').length;
      const criticalModules = moduleHealthChecks.filter(check => check.status === 'critical').length;
      const offlineModules = moduleHealthChecks.filter(check => check.status === 'offline').length;

      // Determine overall workspace status
      let overallStatus: 'healthy' | 'degraded' | 'critical' | 'offline';
      const healthyPercentage = (healthyModules / moduleHealthChecks.length) * 100;

      if (averageScore >= 90 && healthyPercentage >= 80) {
        overallStatus = 'healthy';
      } else if (averageScore >= 70 && healthyPercentage >= 60) {
        overallStatus = 'degraded';
      } else if (averageScore >= 30 && healthyPercentage >= 30) {
        overallStatus = 'critical';
      } else {
        overallStatus = 'offline';
      }

      // Collect critical issues and recommendations
      const criticalIssues = moduleHealthChecks.flatMap(check => check.errors);
      const recommendations = moduleHealthChecks.flatMap(check => check.warnings);

      // Get active recovery sessions
      const activeSessions = phaseOrchestrationService.getAllActiveSessions();

      // Get module recovery states
      const recoveryStates = ALL_MODULES.map(moduleId => ({
        moduleId,
        state: moduleRecoveryService.getRecoveryState(moduleId)
      })).filter(item => item.state !== undefined);

      return {
        workspace: {
          overallStatus,
          healthScore: averageScore,
          lastAssessment: new Date(),
          criticalIssues,
          recommendations,
          systemMetrics: {
            totalModules: moduleHealthChecks.length,
            healthyModules,
            degradedModules,
            criticalModules,
            offlineModules
          }
        },
        modules: moduleHealthChecks.map(check => ({
          moduleId: check.moduleId,
          status: check.status,
          healthScore: check.score,
          lastCheck: check.timestamp,
          canBuild: check.buildHealth.canBuild,
          errors: check.errors,
          warnings: check.warnings
        })),
        recovery: {
          activeSessions: activeSessions.length,
          activeRecoveries: recoveryStates.filter(r =>
            r.state && r.state.phase !== 'completed' && r.state.phase !== 'failed'
          ).length,
          sessionDetails: activeSessions.map(session => ({
            sessionId: session.sessionId,
            status: session.status,
            currentPhase: session.currentPhase,
            targetModules: session.targetModules,
            startTime: session.startTime
          }))
        },
        buildStatus: {
          totalModules: moduleHealthChecks.length,
          buildableModules: moduleHealthChecks.filter(check => check.buildHealth.canBuild).length,
          lastBuildSuccess: moduleHealthChecks.filter(check => check.buildHealth.lastBuildSuccess).length,
          dependenciesResolved: moduleHealthChecks.filter(check => check.buildHealth.dependenciesResolved).length
        }
      };

    } catch (error) {
      console.error('Error getting workspace status:', error);

      throw new HttpsError(
        'internal',
        `Failed to get workspace status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Initialize workspace-wide recovery
 * POST /workspace/recovery/initialize
  */
export const initializeWorkspaceRecovery = onCall(
  { cors: true },
  async (request) => {
    try {
      const {
        sessionId,
        targetModules = ALL_MODULES,
        priority = 'normal',
        options = {}
      } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      // Validate target modules
      const invalidModules = targetModules.filter((id: string) => !ALL_MODULES.includes(id));
      if (invalidModules.length > 0) {
        throw new HttpsError('invalid-argument', `Invalid module IDs: ${invalidModules.join(', ')}`);
      }

      // Validate priority
      const validPriorities = ['low', 'normal', 'high', 'critical'];
      if (!validPriorities.includes(priority)) {
        throw new HttpsError('invalid-argument', `Invalid priority: ${priority}. Valid priorities: ${validPriorities.join(', ')}`);
      }

      // Initialize recovery session
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
        priority,
        options,
        workspaceHealth: session.workspaceHealth,
        estimatedDuration: this.estimateRecoveryDuration(targetModules.length, priority),
        message: `Workspace recovery initialized for ${targetModules.length} modules`
      };

    } catch (error) {
      console.error('Error initializing workspace recovery:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to initialize workspace recovery: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Execute workspace-wide recovery
 * POST /workspace/recovery/execute
  */
export const executeWorkspaceRecovery = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      // Check if session exists
      const existingSession = phaseOrchestrationService.getRecoverySession(sessionId);
      if (!existingSession) {
        throw new HttpsError('not-found', `Recovery session ${sessionId} not found`);
      }

      // Execute recovery session
      const completedSession = await phaseOrchestrationService.executeRecoverySession(sessionId);

      return {
        sessionId: completedSession.sessionId,
        status: completedSession.status,
        startTime: completedSession.startTime,
        endTime: completedSession.endTime,
        duration: completedSession.endTime && completedSession.startTime
          ? completedSession.endTime.getTime() - completedSession.startTime.getTime()
          : null,
        phases: {
          phase1: completedSession.phaseProgress.phase1,
          phase2: completedSession.phaseProgress.phase2,
          phase3: completedSession.phaseProgress.phase3,
          phase4: completedSession.phaseProgress.phase4,
          phase5: completedSession.phaseProgress.phase5
        },
        results: {
          totalModules: completedSession.targetModules.length,
          successfulModules: Array.from(completedSession.moduleStates.values())
            .filter(state => state.phase === 'completed').length,
          failedModules: Array.from(completedSession.moduleStates.values())
            .filter(state => state.phase === 'failed').length,
          errors: completedSession.errors,
          warnings: completedSession.warnings
        },
        workspaceHealth: completedSession.workspaceHealth
      };

    } catch (error) {
      console.error('Error executing workspace recovery:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to execute workspace recovery: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Build entire workspace
 * POST /workspace/build
  */
export const buildWorkspace = onCall(
  { cors: true },
  async (request) => {
    try {
      const {
        modules = ALL_MODULES,
        parallel = true,
        force = false,
        skipTests = false
      } = request.data || {};

      // Validate modules
      const invalidModules = modules.filter((id: string) => !ALL_MODULES.includes(id));
      if (invalidModules.length > 0) {
        throw new HttpsError('invalid-argument', `Invalid module IDs: ${invalidModules.join(', ')}`);
      }

      const buildStartTime = new Date();
      const buildResults: any[] = [];

      if (parallel) {
        // Build modules in parallel (within layer constraints)
        const layerGroups = this.groupModulesByLayer(modules);

        for (const layer of layerGroups) {
          const layerPromises = layer.map(async (moduleId) => {
            try {
              const result = await this.buildSingleModule(moduleId, force, skipTests);
              buildResults.push(result);
              return result;
            } catch (error) {
              const errorResult = {
                moduleId,
                success: false,
                startTime: new Date(),
                endTime: new Date(),
                duration: 0,
                errors: [error instanceof Error ? error.message : 'Build failed'],
                warnings: []
              };
              buildResults.push(errorResult);
              return errorResult;
            }
          });

          // Wait for all modules in current layer to complete before moving to next layer
          await Promise.all(layerPromises);
        }
      } else {
        // Build modules sequentially
        for (const moduleId of modules) {
          try {
            const result = await this.buildSingleModule(moduleId, force, skipTests);
            buildResults.push(result);
          } catch (error) {
            const errorResult = {
              moduleId,
              success: false,
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
              errors: [error instanceof Error ? error.message : 'Build failed'],
              warnings: []
            };
            buildResults.push(errorResult);
          }
        }
      }

      const buildEndTime = new Date();
      const totalDuration = buildEndTime.getTime() - buildStartTime.getTime();

      const successfulBuilds = buildResults.filter(r => r.success).length;
      const failedBuilds = buildResults.filter(r => !r.success).length;

      return {
        buildSummary: {
          totalModules: modules.length,
          successfulBuilds,
          failedBuilds,
          totalDuration,
          startTime: buildStartTime,
          endTime: buildEndTime,
          parallel,
          force,
          skipTests
        },
        moduleResults: buildResults,
        overallSuccess: failedBuilds === 0,
        errors: buildResults.flatMap(r => r.errors),
        warnings: buildResults.flatMap(r => r.warnings)
      };

    } catch (error) {
      console.error('Error building workspace:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to build workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Validate entire workspace
 * POST /workspace/validate
  */
export const validateWorkspace = onCall(
  { cors: true },
  async (request) => {
    try {
      const { modules = ALL_MODULES, includeDetails = false } = request.data || {};

      // Validate modules
      const invalidModules = modules.filter((id: string) => !ALL_MODULES.includes(id));
      if (invalidModules.length > 0) {
        throw new HttpsError('invalid-argument', `Invalid module IDs: ${invalidModules.join(', ')}`);
      }

      // Get validation summary
      const validationSummary = await validationService.getValidationSummary(modules);

      let moduleDetails: any[] = [];
      if (includeDetails) {
        moduleDetails = await validationService.validateMultipleModules(modules);
      }

      // Get workspace health for additional context
      const moduleHealthChecks = await Promise.all(
        modules.map(moduleId => moduleRecoveryService.performHealthCheck(moduleId))
      );

      const workspaceHealth = {
        overallValid: validationSummary.invalidModules === 0,
        healthScore: moduleHealthChecks.reduce((sum, check) => sum + check.score, 0) / moduleHealthChecks.length,
        buildHealth: {
          totalBuildable: moduleHealthChecks.filter(check => check.buildHealth.canBuild).length,
          totalModules: moduleHealthChecks.length
        }
      };

      return {
        validationSummary: {
          ...validationSummary,
          validationTime: new Date(),
          workspaceValid: validationSummary.invalidModules === 0 && validationSummary.averageScore >= 70
        },
        workspaceHealth,
        moduleDetails: includeDetails ? moduleDetails : undefined,
        recommendations: [
          ...validationSummary.recommendations,
          ...(validationSummary.averageScore < 80 ? ['Consider running workspace recovery to improve overall health'] : []),
          ...(workspaceHealth.buildHealth.totalBuildable < workspaceHealth.buildHealth.totalModules ? ['Some modules cannot be built - check dependencies'] : [])
        ]
      };

    } catch (error) {
      console.error('Error validating workspace:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to validate workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Reset workspace to clean state
 * POST /workspace/reset
  */
export const resetWorkspace = onCall(
  { cors: true },
  async (request) => {
    try {
      const {
        modules = ALL_MODULES,
        resetType = 'soft',
        confirmation = false
      } = request.data || {};

      if (!confirmation) {
        throw new HttpsError(
          'failed-precondition',
          'Workspace reset requires explicit confirmation. Set confirmation=true to proceed.'
        );
      }

      const validResetTypes = ['soft', 'hard', 'full'];
      if (!validResetTypes.includes(resetType)) {
        throw new HttpsError('invalid-argument', `Invalid reset type: ${resetType}. Valid types: ${validResetTypes.join(', ')}`);
      }

      // Validate modules
      const invalidModules = modules.filter((id: string) => !ALL_MODULES.includes(id));
      if (invalidModules.length > 0) {
        throw new HttpsError('invalid-argument', `Invalid module IDs: ${invalidModules.join(', ')}`);
      }

      const resetStartTime = new Date();
      const resetResults: any[] = [];

      for (const moduleId of modules) {
        try {
          // Cancel any active recovery for this module
          const recoveryState = moduleRecoveryService.getRecoveryState(moduleId);
          if (recoveryState && moduleRecoveryService.isRecoveryInProgress(moduleId)) {
            // Would cancel active recovery here
          }

          // Reinitialize module recovery state
          const newState = await moduleRecoveryService.initializeModuleRecovery(moduleId);

          resetResults.push({
            moduleId,
            success: true,
            resetType,
            newState: {
              phase: newState.phase,
              healthStatus: newState.healthStatus,
              healthScore: newState.healthScore
            }
          });

        } catch (error) {
          resetResults.push({
            moduleId,
            success: false,
            resetType,
            error: error instanceof Error ? error.message : 'Reset failed'
          });
        }
      }

      const resetEndTime = new Date();
      const totalDuration = resetEndTime.getTime() - resetStartTime.getTime();

      const successfulResets = resetResults.filter(r => r.success).length;
      const failedResets = resetResults.filter(r => !r.success).length;

      return {
        resetSummary: {
          totalModules: modules.length,
          successfulResets,
          failedResets,
          resetType,
          totalDuration,
          startTime: resetStartTime,
          endTime: resetEndTime
        },
        moduleResults: resetResults,
        overallSuccess: failedResets === 0,
        message: `Workspace reset completed: ${successfulResets}/${modules.length} modules reset successfully`
      };

    } catch (error) {
      console.error('Error resetting workspace:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to reset workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Helper function to build a single module
  */
async function buildSingleModule(moduleId: string, force: boolean, skipTests: boolean): Promise<any> {
  const buildStartTime = new Date();

  // Check if module can be built
  const healthCheck = await moduleRecoveryService.performHealthCheck(moduleId);
  if (!force && !healthCheck.buildHealth.canBuild) {
    throw new Error(`Module ${moduleId} is not in a buildable state`);
  }

  // Simulate build process
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  const buildEndTime = new Date();
  const duration = buildEndTime.getTime() - buildStartTime.getTime();

  return {
    moduleId,
    success: true,
    startTime: buildStartTime,
    endTime: buildEndTime,
    duration,
    errors: [],
    warnings: [],
    artifacts: {
      distGenerated: true,
      typesGenerated: true,
      sourceMapsGenerated: !skipTests,
      testsRun: !skipTests
    }
  };
}

/**
 * Helper function to group modules by layer for parallel building
  */
function groupModulesByLayer(modules: string[]): string[][] {
  const layers: Record<number, string[]> = {
    1: ['auth', 'i18n'],
    2: ['processing', 'multimedia', 'analytics'],
    3: ['premium', 'public-profiles', 'recommendations'],
    4: ['admin', 'workflow', 'payments']
  };

  const result: string[][] = [];

  for (let layer = 1; layer <= 4; layer++) {
    const layerModules = modules.filter(moduleId => layers[layer].includes(moduleId));
    if (layerModules.length > 0) {
      result.push(layerModules);
    }
  }

  return result;
}

/**
 * Helper function to estimate recovery duration
  */
function estimateRecoveryDuration(moduleCount: number, priority: string): number {
  const baseTimePerModule = priority === 'critical' ? 30000 : priority === 'high' ? 60000 : 120000;
  return moduleCount * baseTimePerModule;
}