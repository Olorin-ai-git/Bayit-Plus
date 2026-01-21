import { https } from 'firebase-functions';
import { ModuleRecoveryService } from './services/ModuleRecoveryService';
import { logger } from '@cvplus/logging';

/**
 * GET /modules
 * Retrieves all Level 2 module recovery states
 *
 * @returns Array of module recovery states with health metrics
  */
export const getAllModules = https.onRequest(async (req, res) => {
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

    logger.info('getAllModules: Starting module retrieval');

    const moduleService = new ModuleRecoveryService();
    const modules = await moduleService.getAllModules();

    logger.info(`getAllModules: Retrieved ${modules.length} modules`);

    res.status(200).json({
      success: true,
      data: modules,
      timestamp: new Date().toISOString(),
      total: modules.length
    });

  } catch (error) {
    logger.error('getAllModules: Error retrieving modules', { error });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});