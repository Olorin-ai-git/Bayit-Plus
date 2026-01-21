/**
 * CVPlus Admin Middleware
 * 
 * Middleware functions for admin operations including authentication,
 * authorization, rate limiting, and request validation.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// MIDDLEWARE EXPORTS
// ============================================================================

export * from './admin-auth.middleware';

// ============================================================================
// MIDDLEWARE METADATA
// ============================================================================

/**
 * Available admin middleware functions
  */
export const ADMIN_MIDDLEWARE = {
  authentication: {
    requireAuth: 'Basic authentication requirement',
    requireAdmin: 'Admin authentication with role-based access',
    requireAdminPermission: 'Specific admin permission requirement'
  },
  rateLimit: {
    withAdminRateLimit: 'Rate limiting for admin operations'
  },
  utils: {
    getUserInfo: 'Extract user information from authenticated request',
    isAdmin: 'Check if user has admin privileges (legacy)'
  }
} as const;

/**
 * Middleware categories
  */
export const MIDDLEWARE_CATEGORIES = {
  AUTHENTICATION: 'Authentication Middleware',
  AUTHORIZATION: 'Authorization Middleware',
  RATE_LIMITING: 'Rate Limiting Middleware',
  VALIDATION: 'Request Validation Middleware',
  LOGGING: 'Audit Logging Middleware'
} as const;