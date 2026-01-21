/**
 * Auth Guard Middleware - Public Profiles Backend
 * Re-exports canonical implementation from @cvplus/auth
 */

export {
  requireAuth,
  requireAuthWithJobOwnership,
  getUserInfo,
  requireAdmin,
  requireAdminPermission,
  isAdmin,
  withRateLimit,
  requireAuthHTTP,
  getUserIdHTTP,
  requireAdminHTTP,
  authGuard,
  type AuthenticatedRequest,
  type AdminAuthenticatedRequest,
  type AuthenticatedHTTPRequest
} from '@cvplus/auth';
