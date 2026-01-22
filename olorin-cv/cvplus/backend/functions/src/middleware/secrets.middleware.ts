/**
 * Secrets Middleware
 * Loads secrets from Google Secret Manager before request processing
 */

import { Request, Response, NextFunction } from 'express';
import { secretsService, SecretName } from '../services/secrets.service';

/**
 * Middleware to ensure secrets are loaded
 * Should be used early in the middleware chain
 */
export async function ensureSecretsLoaded(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if secrets are already loaded (cache check)
    const cacheStats = secretsService.getCacheStats();

    if (cacheStats.size === 0) {
      // No secrets in cache, load them
      await secretsService.loadApplicationSecrets();
    }

    next();
  } catch (error: any) {
    console.error('Failed to load secrets:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initialize application secrets',
    });
  }
}

/**
 * Middleware to load specific secret into request context
 */
export function loadSecret(secretName: SecretName, requestProperty: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const secretValue = await secretsService.accessSecret(secretName);
      (req as any)[requestProperty] = secretValue;
      next();
    } catch (error: any) {
      console.error(`Failed to load secret ${secretName}:`, error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to load required secret',
      });
    }
  };
}

/**
 * Middleware to refresh secrets cache
 */
export async function refreshSecretsCache(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    secretsService.clearCache();
    await secretsService.loadApplicationSecrets();
    next();
  } catch (error: any) {
    console.error('Failed to refresh secrets:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh secrets',
    });
  }
}
