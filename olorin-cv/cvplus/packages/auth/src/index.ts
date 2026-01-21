/**
 * CVPlus Authentication Module
 * 
 * A comprehensive authentication and authorization module for the CVPlus platform.
 * Provides secure user management, session handling, premium features, and role-based access control.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export * from './types';

// ============================================================================
// CORE SERVICES
// ============================================================================
// NOTE: AuthService and TokenService use client-side firebase/auth and should be in frontend package
// export { AuthService } from './services/auth.service';
// export { TokenService } from './services/token.service';
export { SessionService } from './services/session.service';
export { PermissionsService } from './services/permissions.service';
// NOTE: PremiumService moved to @cvplus/premium submodule
// NOTE: CalendarService moved to @cvplus/core/integrations submodule

// ============================================================================
// CONSOLIDATED BACKEND SERVICES (Phase 4 Deduplication)
// ============================================================================
export {
  FirebaseAuthenticationService,
  firebaseAuth as firebaseAuthService,
  requireAuth as requireAuthService,
  requireAuthWithJobOwnership,
  requireAuthExpress
} from './services/authentication.service';

export {
  FirebaseAuthorizationService,
  firebaseAuth as firebaseAuthzService,
  hasPermission,
  requirePermission
} from './services/authorization.service';

// Note: requireRole, requireAdminAccess, requirePremiumAccess, requireEnterpriseAccess
// are exported from middleware to avoid duplication

export {
  MiddlewareFactory
} from './services/middleware-factory.service';

// Note: Factory functions are exported from middleware to avoid duplication

// ============================================================================
// CONSOLIDATED MIDDLEWARE (Phase 4 Deduplication)
// ============================================================================
export {
  // Auth middleware functions
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
} from './middleware';

// ============================================================================
// UTILITIES
// ============================================================================
export * from './utils/validation';
export * from './utils/encryption';
export * from './utils/storage';
export * from './utils/cache';
export * from './utils/errors';

// Auth helpers (specific exports to avoid conflicts)
export {
  extractBearerToken,
  validateIdToken,
  hasAnyRole,
  hasAllRoles,
  getUserRoles,
  isEmailVerified,
  getUserDisplayInfo,
  checkResourceOwnership,
  RateLimiter,
  logAuthEvent,
  addSecurityHeaders,
  sanitizeForLogging
} from './utils/auth-helpers';

// ============================================================================
// CONSTANTS
// ============================================================================
export * from './constants/auth.constants';
export * from './constants/permissions.constants';
// NOTE: Premium constants moved to @cvplus/premium submodule

// ============================================================================
// FRONTEND COMPONENTS & HOOKS (Client-side React)
// ============================================================================
// NOTE: Frontend components, hooks, and context are now in the main frontend package
// These exports are commented out as they should be imported from frontend package
// export { AuthProvider, useAuth } from './frontend';
// export type { UseAuthReturn } from './frontend';
// export { useAuthContext } from './frontend';
// export type { AuthContextState, AuthContextActions, AuthContextValue } from './frontend';
// export * from './hooks';
// export * from './components';
// export { useAuth as useLegacyAuth } from './hooks/useAuth';
// export { AuthProvider as LegacyAuthProvider } from './context/AuthContext';
// export { useGoogleAuth, type UseGoogleAuthReturn } from './hooks/useGoogleAuth';

// ============================================================================
// FIREBASE FUNCTIONS MIDDLEWARE (Migrated from Root Repository)
// ============================================================================
export {
  requireAuth as requireAuthFirebase,
  requireAdmin as requireAdminFirebase,
  createRateLimit,
  standardRateLimit,
  strictRateLimit,
  apiRateLimit,
  requireClaim,
  type AuthenticatedRequest
} from './middleware/firebase-auth.middleware';

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================
export {
  createLegacyAuthWrapper,
  importMappings,
  componentMappings,
  migrationChecklist,
  type LegacyAuthContextType
} from './migration/authMigration';

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================
// NOTE: initializeAuth is in auth.service which is client-side - commented out
// export { initializeAuth } from './services/auth.service';

// ============================================================================
// VERSION INFORMATION
// ============================================================================
export const VERSION = '1.0.0';
export const MODULE_NAME = '@cvplus/auth';

// Default configuration for easy setup
export { defaultAuthConfig } from './constants/auth.constants';export * from './services/session-checkpoint.service';
