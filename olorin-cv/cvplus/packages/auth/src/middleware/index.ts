import { logger } from 'firebase-functions';

/**
 * Auth Middleware Module Index
 * 
 * Consolidated exports for all authentication and authorization middleware.
 * Replaces scattered middleware patterns across Firebase Functions.
 * 
 * Author: Gil Klainert
 * Date: August 28, 2025
  */

// Import middleware functions
import {
  requireAuth,
  requireEmailVerification,
  requireAdmin,
  requirePremium,
  requireEnterprise,
  requireRole,
  validateAuth,
  validateAuthWithEmail,
  validateAdmin,
  validatePremium,
  validatePremiumFeature,
  validateRole,
  createComposite,
  authErrorHandler,
  authLogger,
  default as authDefault
} from './auth.middleware';

// Re-export types
export type {
  BasicAuthMiddlewareConfig,
  RoleMiddlewareConfig,
  PremiumMiddlewareConfig
} from './auth.middleware';

// Re-export all middleware
export {
  requireAuth,
  requireEmailVerification,
  requireAdmin,
  requirePremium,
  requireEnterprise,
  requireRole,
  validateAuth,
  validateAuthWithEmail,
  validateAdmin,
  validatePremium,
  validatePremiumFeature,
  validateRole,
  createComposite,
  authErrorHandler,
  authLogger,
  authDefault as default
};

// Import factory services
import {
  middlewareFactory,
  createAuthMiddleware,
  createRoleMiddleware,
  createPremiumMiddleware,
  createCallableAuth,
  createCallableRole,
  createCallableAdmin,
  createCallablePremium,
  createResourceOwnership
} from '../services/middleware-factory.service';

// Re-export factory services for advanced usage
export {
  middlewareFactory,
  createAuthMiddleware,
  createRoleMiddleware,
  createPremiumMiddleware,
  createCallableAuth,
  createCallableRole,
  createCallableAdmin,
  createCallablePremium,
  createResourceOwnership
};

// Convenience exports for common patterns
export const authMiddleware = {
  // Express patterns
  basic: requireAuth,
  emailVerified: requireEmailVerification,
  admin: requireAdmin,
  premium: requirePremium,
  enterprise: requireEnterprise,
  role: requireRole,
  
  // Firebase Functions patterns
  validateBasic: validateAuth,
  validateEmail: validateAuthWithEmail,
  validateAdmin,
  validatePremium,
  validateRole
};

/**
 * Authenticate user from Firebase Functions request
 * Compatibility function for CV Processing and other submodules
  */
export async function authenticateUser(req: any): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const authHeader = req.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    const idToken = authHeader.substring(7);
    const admin = await import('firebase-admin');
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return {
      success: true,
      userId: decodedToken.uid
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return {
      success: false,
      error: 'Invalid token'
    };
  }
}

/**
 * Migration helpers for replacing old middleware patterns
 *
 * These functions help migrate from old scattered patterns to consolidated middleware
  */
export const migrationHelpers = {
  /**
   * Replace old authGuard.requireAuth pattern
   * 
   * Old: import { requireAuth } from '../middleware/authGuard';
   * New: import { validateAuth } from '@cvplus/auth/middleware';
    */
  replaceRequireAuth: validateAuth,
  
  /**
   * Replace old enhancedPremiumGuard pattern
   * 
   * Old: import { enhancedPremiumGuard } from '../middleware/enhancedPremiumGuard';
   * New: import { requirePremium } from '@cvplus/auth/middleware';
    */
  replaceEnhancedPremiumGuard: requirePremium,
  
  /**
   * Replace scattered admin checking patterns
    */
  replaceAdminCheck: validateAdmin,
  
  /**
   * Replace job ownership patterns
   * 
   * Usage:
   * const validator = createJobOwnershipValidator('cvJobs', 'userId');
   * await validator(request, jobId);
    */
  createJobOwnershipValidator: (collection: string, userField: string = 'userId') =>
    createResourceOwnership({
      collectionPath: collection,
      userIdField: userField,
      logOwnershipChecks: true
    })
};