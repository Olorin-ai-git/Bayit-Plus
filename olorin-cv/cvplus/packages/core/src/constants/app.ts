/**
 * Application Constants
 * 
 * Core application configuration and constants.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// APPLICATION METADATA
// ============================================================================

export const APP_NAME = 'CVPlus';
export const APP_DESCRIPTION = 'AI-Powered CV Transformation Platform';
export const APP_VERSION = '1.0.0';
export const APP_AUTHOR = 'Gil Klainert';
export const APP_WEBSITE = 'https://cvplus.com';

// ============================================================================
// ENVIRONMENT CONSTANTS
// ============================================================================

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type Environment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS];

// ============================================================================
// API VERSION AND ENDPOINTS
// ============================================================================

export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

export const DEFAULT_API_TIMEOUT = 30000; // 30 seconds
export const LONG_API_TIMEOUT = 300000; // 5 minutes for processing operations

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

export const FILE_SIZE_LIMITS = {
  CV_UPLOAD: 10 * 1024 * 1024, // 10MB
  PROFILE_IMAGE: 5 * 1024 * 1024, // 5MB
  PORTFOLIO_FILE: 50 * 1024 * 1024, // 50MB
  BATCH_UPLOAD: 100 * 1024 * 1024, // 100MB
} as const;

// ============================================================================
// SUPPORTED FILE TYPES
// ============================================================================

export const SUPPORTED_CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
] as const;

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const SUPPORTED_MEDIA_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
] as const;

// ============================================================================
// PAGINATION DEFAULTS
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// ============================================================================
// CACHE DURATIONS (in milliseconds)
// ============================================================================

export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================

export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  CV_GENERATIONS_PER_HOUR: 10,
  FILE_UPLOADS_PER_HOUR: 20,
  AUTH_ATTEMPTS_PER_MINUTE: 5,
} as const;

// ============================================================================
// SESSION AND AUTHENTICATION
// ============================================================================

export const AUTH = {
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_TOKEN_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_UPPERCASE: true,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_DEBUG_LOGGING: false,
  ENABLE_EXPERIMENTAL_FEATURES: false,
} as const;

// ============================================================================
// PROCESSING TIMEOUTS
// ============================================================================

export const PROCESSING_TIMEOUTS = {
  CV_PARSING: 60000, // 1 minute
  CV_GENERATION: 300000, // 5 minutes
  MEDIA_GENERATION: 600000, // 10 minutes
  BATCH_PROCESSING: 1800000, // 30 minutes
} as const;

// ============================================================================
// RETRY CONFIGURATIONS
// ============================================================================

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  EXPONENTIAL_BASE: 2,
  JITTER: true,
} as const;

// ============================================================================
// WEBHOOK CONFIGURATIONS
// ============================================================================

export const WEBHOOK = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
  SIGNATURE_HEADER: 'X-CVPlus-Signature',
  TIMESTAMP_HEADER: 'X-CVPlus-Timestamp',
} as const;

// ============================================================================
// CORS SETTINGS
// ============================================================================

export const CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://cvplus.com',
  'https://www.cvplus.com',
  'https://app.cvplus.com',
] as const;