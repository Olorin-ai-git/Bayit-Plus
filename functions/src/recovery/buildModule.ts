import { https } from 'firebase-functions';
import { ModuleRecoveryService } from './services/ModuleRecoveryService';
import { PhaseOrchestrationService } from './services/PhaseOrchestrationService';
import { logger } from '@cvplus/logging';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /modules/{moduleId}/build
 * Triggers build process for a specific module and updates recovery state
 *
 * @param moduleId - The module identifier
 * @param body - Build options (force, clean, etc.)
 * @returns Build results and updated module state
  */
export const buildModule = https.onRequest(async (req, res) => {
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const moduleId = req.params.moduleId || req.query.moduleId as string;

    if (!moduleId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'moduleId parameter is required'
      });
      return;
    }

    // Validate moduleId against allowed Level 2 modules
    const validModules = [
      'auth', 'i18n', 'processing', 'multimedia', 'analytics',
      'premium', 'public-profiles', 'recommendations', 'admin',
      'workflow', 'payments'
    ];

    if (!validModules.includes(moduleId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid module',
        message: `Module '${moduleId}' is not a valid Level 2 module`,
        validModules
      });
      return;
    }

    const buildOptions = req.body || {};
    const force = buildOptions.force || false;
    const clean = buildOptions.clean || false;

    logger.info(`buildModule: Starting build for module: ${moduleId}`, { buildOptions });

    const moduleService = new ModuleRecoveryService();
    const orchestrationService = new PhaseOrchestrationService();

    // Get current module state
    const currentState = await moduleService.getModuleState(moduleId);
    if (!currentState) {
      res.status(404).json({
        success: false,
        error: 'Module not found',
        message: `Module '${moduleId}' state not found`
      });
      return;
    }

    // Update state to building
    await moduleService.updateModuleState(moduleId, {
      status: 'building',
      buildStatus: 'in_progress',
      lastBuildTime: new Date().toISOString()
    });

    let buildResult;
    let buildSuccess = false;
    let errorCount = 0;
    let warningCount = 0;
    let buildOutput = '';

    try {
      // Determine build command based on module
      const modulePath = `packages/${moduleId}`;
      let buildCommand;

      if (clean) {
        buildCommand = `cd ${modulePath} && npm run clean && npm run build`;
      } else {
        buildCommand = `cd ${modulePath} && npm run build`;
      }

      logger.info(`buildModule: Executing build command: ${buildCommand}`);

      // Execute build with timeout
      const { stdout, stderr } = await execAsync(buildCommand, {
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      buildOutput = stdout + '\n' + stderr;
      buildSuccess = true;

      // Parse build output for errors and warnings
      const errorMatches = buildOutput.match(/error/gi) || [];
      const warningMatches = buildOutput.match(/warning/gi) || [];
      errorCount = errorMatches.length;
      warningCount = warningMatches.length;

      logger.info(`buildModule: Build completed successfully for module: ${moduleId}`, {
        errorCount,
        warningCount
      });

    } catch (buildError) {
      buildSuccess = false;
      buildOutput = buildError instanceof Error ? buildError.message : 'Unknown build error';
      errorCount = 1;

      logger.error(`buildModule: Build failed for module: ${moduleId}`, {
        error: buildError,
        buildOutput
      });
    }

    // Update module state with build results
    const updatedState = await moduleService.updateModuleState(moduleId, {
      status: buildSuccess ? 'healthy' : 'critical',
      buildStatus: buildSuccess ? 'success' : 'failed',
      errorCount,
      warningCount,
      lastBuildTime: new Date().toISOString(),
      healthScore: buildSuccess ? Math.max(90 - warningCount * 5, 50) : 20
    });

    // Update build metrics
    await orchestrationService.updateBuildMetrics(moduleId, {
      buildTime: new Date().toISOString(),
      duration: 0, // Could be calculated if needed
      success: buildSuccess,
      errorCount,
      warningCount,
      outputSize: buildOutput.length
    });

    buildResult = {
      success: buildSuccess,
      errorCount,
      warningCount,
      duration: 0, // Placeholder
      output: buildOutput.substring(0, 5000), // Truncate for response
      timestamp: new Date().toISOString()
    };

    res.status(buildSuccess ? 200 : 422).json({
      success: buildSuccess,
      data: {
        moduleState: updatedState,
        buildResult
      },
      timestamp: new Date().toISOString(),
      moduleId
    });

  } catch (error) {
    logger.error(`buildModule: Error in build process`, {
      error,
      moduleId: req.params.moduleId
    });

    // Update module state to reflect build error
    try {
      const moduleService = new ModuleRecoveryService();
      await moduleService.updateModuleState(req.params.moduleId || 'unknown', {
        status: 'critical',
        buildStatus: 'failed',
        errorCount: 1,
        lastBuildTime: new Date().toISOString()
      });
    } catch (updateError) {
      logger.error('buildModule: Failed to update module state after error', { updateError });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});