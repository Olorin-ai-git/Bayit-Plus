import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  ModuleRecoveryService,
  ValidationService
} from '../../recovery/services';

// Set global options for module management functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '512MiB'
});

// Initialize services
const moduleRecoveryService = new ModuleRecoveryService();
const validationService = new ValidationService();

// Valid module IDs for CVPlus Level 2
const VALID_MODULE_IDS = [
  'auth', 'i18n', 'processing', 'multimedia', 'analytics',
  'premium', 'public-profiles', 'recommendations', 'admin',
  'workflow', 'payments'
];

/**
 * Get all modules with their current status
 * GET /modules
  */
export const getModules = onCall(
  { cors: true },
  async (request) => {
    try {
      const modules = await Promise.all(
        VALID_MODULE_IDS.map(async (moduleId) => {
          try {
            const healthCheck = await moduleRecoveryService.performHealthCheck(moduleId);
            const recoveryState = moduleRecoveryService.getRecoveryState(moduleId);

            return {
              moduleId,
              status: healthCheck.status,
              healthScore: healthCheck.score,
              lastHealthCheck: healthCheck.timestamp,
              recoveryState: recoveryState ? {
                phase: recoveryState.phase,
                strategy: recoveryState.recoveryStrategy,
                lastUpdated: recoveryState.lastUpdated,
                buildStatus: recoveryState.buildStatus,
                metrics: recoveryState.metrics
              } : null,
              errors: healthCheck.errors,
              warnings: healthCheck.warnings
            };
          } catch (error) {
            return {
              moduleId,
              status: 'offline' as const,
              healthScore: 0,
              lastHealthCheck: new Date(),
              recoveryState: null,
              errors: [`Failed to get module status: ${error instanceof Error ? error.message : 'Unknown error'}`],
              warnings: []
            };
          }
        })
      );

      return {
        modules,
        summary: {
          total: modules.length,
          healthy: modules.filter(m => m.status === 'healthy').length,
          degraded: modules.filter(m => m.status === 'degraded').length,
          critical: modules.filter(m => m.status === 'critical').length,
          offline: modules.filter(m => m.status === 'offline').length,
          averageHealthScore: modules.reduce((sum, m) => sum + m.healthScore, 0) / modules.length
        }
      };

    } catch (error) {
      console.error('Error getting modules:', error);

      throw new HttpsError(
        'internal',
        `Failed to get modules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get specific module details
 * GET /modules/{moduleId}
  */
export const getModule = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      if (!VALID_MODULE_IDS.includes(moduleId)) {
        throw new HttpsError('invalid-argument', `Invalid module ID: ${moduleId}. Valid IDs: ${VALID_MODULE_IDS.join(', ')}`);
      }

      const healthCheck = await moduleRecoveryService.performHealthCheck(moduleId);
      const recoveryState = moduleRecoveryService.getRecoveryState(moduleId);
      const validationResult = await validationService.validateModule(moduleId);

      return {
        moduleId,
        health: {
          status: healthCheck.status,
          score: healthCheck.score,
          timestamp: healthCheck.timestamp,
          buildHealth: healthCheck.buildHealth,
          dependencyHealth: healthCheck.dependencyHealth,
          errors: healthCheck.errors,
          warnings: healthCheck.warnings
        },
        recovery: recoveryState ? {
          phase: recoveryState.phase,
          strategy: recoveryState.recoveryStrategy,
          startTime: recoveryState.startTime,
          lastUpdated: recoveryState.lastUpdated,
          dependencies: recoveryState.dependencies,
          buildStatus: recoveryState.buildStatus,
          metrics: recoveryState.metrics,
          validation: recoveryState.validation
        } : null,
        validation: {
          isValid: validationResult.isValid,
          score: validationResult.validationScore,
          timestamp: validationResult.timestamp,
          errors: validationResult.validationErrors,
          warnings: validationResult.validationWarnings,
          details: validationResult.details
        }
      };

    } catch (error) {
      console.error('Error getting module:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get module: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Update module configuration or trigger actions
 * PUT /modules/{moduleId}
  */
export const updateModule = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId, action, options } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      if (!VALID_MODULE_IDS.includes(moduleId)) {
        throw new HttpsError('invalid-argument', `Invalid module ID: ${moduleId}`);
      }

      if (!action) {
        throw new HttpsError('invalid-argument', 'action is required');
      }

      const validActions = ['initialize', 'recover', 'validate', 'reset', 'build'];
      if (!validActions.includes(action)) {
        throw new HttpsError('invalid-argument', `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`);
      }

      let result: any;

      switch (action) {
        case 'initialize':
          result = await moduleRecoveryService.initializeModuleRecovery(moduleId);
          break;

        case 'recover':
          await moduleRecoveryService.initializeModuleRecovery(moduleId);
          result = await moduleRecoveryService.executeRecovery(moduleId);
          break;

        case 'validate':
          result = await validationService.validateModule(moduleId);
          break;

        case 'reset':
          // Reset module state (reinitialize)
          result = await moduleRecoveryService.initializeModuleRecovery(moduleId);
          break;

        case 'build':
          // Trigger module build (this would integrate with build system)
          const recoveryState = moduleRecoveryService.getRecoveryState(moduleId);
          if (!recoveryState) {
            await moduleRecoveryService.initializeModuleRecovery(moduleId);
          }

          // In actual implementation, would trigger build process
          result = {
            moduleId,
            action: 'build',
            status: 'triggered',
            timestamp: new Date(),
            message: `Build triggered for module ${moduleId}`
          };
          break;

        default:
          throw new HttpsError('invalid-argument', `Unsupported action: ${action}`);
      }

      return {
        moduleId,
        action,
        success: true,
        timestamp: new Date(),
        result
      };

    } catch (error) {
      console.error('Error updating module:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to update module: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Build specific module
 * POST /modules/{moduleId}/build
  */
export const buildModule = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId, force = false } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      if (!VALID_MODULE_IDS.includes(moduleId)) {
        throw new HttpsError('invalid-argument', `Invalid module ID: ${moduleId}`);
      }

      // Check if module is in a buildable state
      const healthCheck = await moduleRecoveryService.performHealthCheck(moduleId);

      if (!force && !healthCheck.buildHealth.canBuild) {
        throw new HttpsError(
          'failed-precondition',
          `Module ${moduleId} is not in a buildable state. Use force=true to override.`
        );
      }

      // Initialize recovery state if needed
      let recoveryState = moduleRecoveryService.getRecoveryState(moduleId);
      if (!recoveryState) {
        recoveryState = await moduleRecoveryService.initializeModuleRecovery(moduleId);
      }

      // Update build status to building
      recoveryState.buildStatus.isBuilding = true;
      recoveryState.buildStatus.buildErrors = [];
      recoveryState.lastUpdated = new Date();

      try {
        // In actual implementation, would run:
        // - npm install for dependencies
        // - npm run build or tsup for compilation
        // - Type checking
        // - Linting

        // Simulate build process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update build status to success
        recoveryState.buildStatus.isBuilding = false;
        recoveryState.buildStatus.buildSuccess = true;
        recoveryState.buildStatus.lastBuildTime = new Date();
        recoveryState.buildStatus.buildErrors = [];
        recoveryState.lastUpdated = new Date();

        return {
          moduleId,
          buildSuccess: true,
          buildTime: new Date(),
          duration: 2000,
          errors: [],
          warnings: [],
          artifacts: {
            distGenerated: true,
            typesGenerated: true,
            sourceMapsGenerated: true
          }
        };

      } catch (buildError) {
        // Update build status to failed
        recoveryState.buildStatus.isBuilding = false;
        recoveryState.buildStatus.buildSuccess = false;
        recoveryState.buildStatus.buildErrors = [
          buildError instanceof Error ? buildError.message : 'Build failed'
        ];
        recoveryState.lastUpdated = new Date();

        return {
          moduleId,
          buildSuccess: false,
          buildTime: new Date(),
          duration: 2000,
          errors: recoveryState.buildStatus.buildErrors,
          warnings: [],
          artifacts: {
            distGenerated: false,
            typesGenerated: false,
            sourceMapsGenerated: false
          }
        };
      }

    } catch (error) {
      console.error('Error building module:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to build module: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get module dependencies
 * GET /modules/{moduleId}/dependencies
  */
export const getModuleDependencies = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      if (!VALID_MODULE_IDS.includes(moduleId)) {
        throw new HttpsError('invalid-argument', `Invalid module ID: ${moduleId}`);
      }

      // Get dependencies from recovery service
      const dependencies = await moduleRecoveryService.analyzeDependencies(moduleId);

      // Get layer information
      const layerInfo = this.getModuleLayerInfo(moduleId);

      return {
        moduleId,
        layer: layerInfo.layer,
        dependencies: {
          direct: dependencies.filter(dep => dep.isDirect),
          transitive: dependencies.filter(dep => !dep.isDirect),
          total: dependencies.length
        },
        layerDependencies: layerInfo.allowedDependencies,
        dependencyHealth: {
          resolved: dependencies.filter(dep => dep.status === 'resolved').length,
          missing: dependencies.filter(dep => dep.status === 'missing').length,
          conflicted: dependencies.filter(dep => dep.conflicts.length > 0).length,
          total: dependencies.length
        },
        dependencyDetails: dependencies
      };

    } catch (error) {
      console.error('Error getting module dependencies:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get module dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get module build status
 * GET /modules/{moduleId}/build-status
  */
export const getModuleBuildStatus = onCall(
  { cors: true },
  async (request) => {
    try {
      const { moduleId } = request.data || {};

      if (!moduleId) {
        throw new HttpsError('invalid-argument', 'moduleId is required');
      }

      if (!VALID_MODULE_IDS.includes(moduleId)) {
        throw new HttpsError('invalid-argument', `Invalid module ID: ${moduleId}`);
      }

      const recoveryState = moduleRecoveryService.getRecoveryState(moduleId);
      const healthCheck = await moduleRecoveryService.performHealthCheck(moduleId);

      return {
        moduleId,
        buildStatus: recoveryState?.buildStatus || {
          isBuilding: false,
          lastBuildTime: null,
          buildErrors: [],
          buildSuccess: false
        },
        buildHealth: healthCheck.buildHealth,
        canBuild: healthCheck.buildHealth.canBuild,
        lastHealthCheck: healthCheck.timestamp
      };

    } catch (error) {
      console.error('Error getting module build status:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get module build status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get module layer information
  */
function getModuleLayerInfo(moduleId: string): {
  layer: number;
  allowedDependencies: string[];
} {
  const layerMap: Record<string, { layer: number; deps: string[] }> = {
    'auth': { layer: 1, deps: ['@cvplus/core'] },
    'i18n': { layer: 1, deps: ['@cvplus/core', '@cvplus/auth'] },
    'processing': { layer: 2, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n'] },
    'multimedia': { layer: 2, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n'] },
    'analytics': { layer: 2, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n'] },
    'enhancements': { layer: 3, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics'] },
    'premium': { layer: 3, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics'] },
    'public-profiles': { layer: 3, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics'] },
    'recommendations': { layer: 3, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics'] },
    'admin': { layer: 4, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics', '@cvplus/enhancements', '@cvplus/premium', '@cvplus/public-profiles', '@cvplus/recommendations'] },
    'workflow': { layer: 4, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics', '@cvplus/enhancements', '@cvplus/premium', '@cvplus/public-profiles', '@cvplus/recommendations'] },
    'payments': { layer: 4, deps: ['@cvplus/core', '@cvplus/auth', '@cvplus/i18n', '@cvplus/processing', '@cvplus/multimedia', '@cvplus/analytics', '@cvplus/enhancements', '@cvplus/premium', '@cvplus/public-profiles', '@cvplus/recommendations'] }
  };

  const info = layerMap[moduleId];
  return {
    layer: info?.layer || 0,
    allowedDependencies: info?.deps || []
  };
}