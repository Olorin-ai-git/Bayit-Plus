import { https } from 'firebase-functions';
import { ModuleRecoveryService } from './services/ModuleRecoveryService';
import { logger } from '@cvplus/logging';

/**
 * GET /modules/{moduleId}
 * Retrieves detailed recovery state for a specific module
 *
 * @param moduleId - The module identifier (auth, i18n, cv-processing, etc.)
 * @returns Detailed module recovery state with metrics and history
  */
export const getModuleState = https.onRequest(async (req, res) => {
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
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

    logger.info(`getModuleState: Retrieving state for module: ${moduleId}`);

    const moduleService = new ModuleRecoveryService();
    const moduleState = await moduleService.getModuleState(moduleId);

    if (!moduleState) {
      res.status(404).json({
        success: false,
        error: 'Module not found',
        message: `Module '${moduleId}' state not found`
      });
      return;
    }

    logger.info(`getModuleState: Successfully retrieved state for module: ${moduleId}`);

    res.status(200).json({
      success: true,
      data: moduleState,
      timestamp: new Date().toISOString(),
      moduleId
    });

  } catch (error) {
    logger.error(`getModuleState: Error retrieving module state`, { error, moduleId: req.params.moduleId });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});