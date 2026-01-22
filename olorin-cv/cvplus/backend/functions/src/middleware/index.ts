/**
 * Middleware exports
 * Central export point for all middleware
 */

// Authentication middleware
export {
  authenticate,
  requireRole,
  requirePermissions,
  optionalAuthenticate,
  generateToken,
  AuthRequest,
  AuthenticatedUser,
} from './auth.middleware';

// Session middleware
export {
  createSessionMiddleware,
  getRedisClient,
  requireSession,
  createUserSession,
  destroyUserSession,
  trackSessionActivity,
  sessionTimeoutCheck,
  SessionData,
} from './session.middleware';

// Security headers middleware
export {
  securityHeaders,
  corsHeaders,
  customSecurityHeaders,
  removeSensitiveHeaders,
  cacheControl,
  applyAllSecurityHeaders,
} from './security-headers.middleware';

// Rate limiting middleware
export {
  rateLimit,
  strictRateLimit,
  ipRateLimit,
  userRateLimit,
  apiRateLimit,
  slidingWindowRateLimit,
  RateLimitOptions,
} from './rate-limit.middleware';

// Validation middleware
export {
  validate,
  sanitizeBody,
  preventSqlInjection,
  preventXss,
  validateFileUpload,
  sanitizeHtml,
  sanitizeString,
  ValidationRule,
  ValidationError,
} from './validation.middleware';

// Error handling middleware
export {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  formatValidationError,
  initializeErrorHandlers,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from './error-handler.middleware';
