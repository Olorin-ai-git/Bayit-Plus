import { https } from 'firebase-functions';
import { ModuleRecoveryService } from './services/ModuleRecoveryService';
import { ValidationService } from './services/ValidationService';
import { ModuleRecoveryState } from './models/ModuleRecoveryState';
import { logger } from '@cvplus/logging';

/**
 * PUT /modules/{moduleId}
 * Updates recovery state for a specific module
 *
 * @param moduleId - The module identifier
 * @param body - Partial module state update
 * @returns Updated module recovery state
 */
export const updateModuleState = https.onRequest(async (req, res) => {
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'PUT') {
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

    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Request body is required and must be a valid JSON object'
      });
      return;
    }

    logger.info(`updateModuleState: Updating state for module: ${moduleId}`, { updateData: req.body });

    // Validate the update data
    const validationService = new ValidationService();
    const isValidUpdate = await validationService.validateModuleStateUpdate(req.body);

    if (!isValidUpdate.isValid) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid module state update data',
        validationErrors: isValidUpdate.errors
      });
      return;
    }

    const moduleService = new ModuleRecoveryService();

    // Get current state
    const currentState = await moduleService.getModuleState(moduleId);
    if (!currentState) {
      res.status(404).json({
        success: false,
        error: 'Module not found',
        message: `Module '${moduleId}' state not found`
      });
      return;
    }

    // Update the module state
    const updatedState = await moduleService.updateModuleState(moduleId, req.body);

    // Log the state change
    logger.info(`updateModuleState: Successfully updated module: ${moduleId}`, {
      previousState: currentState.status,
      newState: updatedState.status,
      changes: req.body
    });

    res.status(200).json({
      success: true,
      data: updatedState,
      timestamp: new Date().toISOString(),
      moduleId,
      changes: req.body
    });

  } catch (error) {
    logger.error(`updateModuleState: Error updating module state`, {
      error,
      moduleId: req.params.moduleId,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});