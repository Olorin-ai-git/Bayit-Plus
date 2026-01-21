import { logger } from 'firebase-functions';

/**
 * Auth Module Backend Exports
 *
 * This file provides all Firebase Functions exports for the Auth module.
 * These functions handle server-side authentication, session management, and security.
 *
 * @author Gil Klainert
  */

// ============================================================================
// SESSION MANAGEMENT FUNCTIONS
// ============================================================================
// Enhanced session checkpoint and state synchronization functions
export {
  createSessionCheckpoint,
  executeCheckpoint,
  resumeFromCheckpoint,
  getSessionCheckpoints,
  processSessionActionQueue,
  processQueuedActions,
  retryFailedCheckpoints,
  syncSessionState,
  enhanceSessionWithCheckpoints,
  sessionHealthCheck
} from './functions/enhancedSessionManager';

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================
// Core authentication functions (re-export from services)
export {
  // Authentication middleware
  requireAuth,
  requireEmailVerification,
  requireAdmin,
  requirePremium,
  requireEnterprise,
  requireRole,

  // Firebase Functions validators
  validateAuth,
  validateAuthWithEmail,
  validateAdmin,
  validatePremium,
  validatePremiumFeature,
  validateRole,

  // Utility middleware
  createComposite,
  authErrorHandler,
  authLogger,

  // Factory exports
  middlewareFactory,
  createAuthMiddleware,
  createRoleMiddleware,
  createPremiumMiddleware,
  createCallableAuth,
  createCallableRole,
  createCallableAdmin,
  createCallablePremium,
  createResourceOwnership,

  // Migration helpers
  migrationHelpers,
  authMiddleware
} from '../middleware';

// ============================================================================
// FIREBASE FUNCTIONS MIDDLEWARE
// ============================================================================
// Firebase-specific authentication middleware
export {
  requireAuth as requireAuthFirebase,
  requireAdmin as requireAdminFirebase,
  createRateLimit,
  standardRateLimit,
  strictRateLimit,
  apiRateLimit,
  requireClaim,
  type AuthenticatedRequest
} from '../middleware/firebase-auth.middleware';

// ============================================================================
// CORE SERVICES
// ============================================================================
// Re-export core auth services for backend consumption
export {
  FirebaseAuthenticationService,
  firebaseAuth as firebaseAuthService,
  requireAuth as requireAuthService,
  requireAuthWithJobOwnership,
  requireAuthExpress
} from '../services/authentication.service';

export {
  FirebaseAuthorizationService,
  firebaseAuth as firebaseAuthzService,
  hasPermission,
  requirePermission
} from '../services/authorization.service';

export {
  MiddlewareFactory
} from '../services/middleware-factory.service';

// ============================================================================
// USER LANGUAGE MANAGEMENT FUNCTIONS (moved from i18n)
// ============================================================================
// User language preference management functions removed - moved to @cvplus/i18n module

// ============================================================================
// HEALTH CHECK FUNCTION
// ============================================================================
// Simple auth health check for deployment validation
import { onRequest } from 'firebase-functions/v2/https';

export const testAuth = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: true
  },
  async (req, res) => {
    try {
      // CORS handling
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(200).send('');
        return;
      }

      // Simple health check response
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json({
        status: 'healthy',
        message: 'Auth module is operational',
        timestamp: new Date().toISOString(),
        module: '@cvplus/auth',
        version: '1.0.0',
        functions: {
          sessionManagement: 10,
          authentication: 15,
          middleware: 12
        }
      });
    } catch (error) {
      logger.error('Auth health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Auth health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);