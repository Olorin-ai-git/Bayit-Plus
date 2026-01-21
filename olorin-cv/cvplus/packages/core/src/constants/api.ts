/**
 * API Constants
 * 
 * Constants for API endpoints, HTTP methods, and response codes.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// ============================================================================
// HTTP METHODS
// ============================================================================

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD'
} as const;

// ============================================================================
// CONTENT TYPES
// ============================================================================

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT_PLAIN: 'text/plain',
  HTML: 'text/html',
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  RTF: 'application/rtf',
  XML: 'application/xml',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  MP3: 'audio/mpeg',
  MP4: 'video/mp4',
  WEBM: 'video/webm'
} as const;

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password'
  },
  
  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    DELETE_ACCOUNT: '/users/delete',
    PREFERENCES: '/users/preferences',
    SUBSCRIPTION: '/users/subscription'
  },
  
  // CV Processing
  CV: {
    UPLOAD: '/cv/upload',
    PARSE: '/cv/parse',
    ANALYZE: '/cv/analyze',
    GENERATE: '/cv/generate',
    DOWNLOAD: '/cv/download',
    LIST: '/cv/list',
    DELETE: '/cv/delete',
    STATUS: '/cv/status'
  },
  
  // Templates
  TEMPLATES: {
    LIST: '/templates',
    GET: '/templates/{id}',
    PREVIEW: '/templates/{id}/preview',
    CUSTOMIZE: '/templates/{id}/customize'
  },
  
  // Features
  FEATURES: {
    LIST: '/features',
    ENABLE: '/features/{id}/enable',
    DISABLE: '/features/{id}/disable',
    STATUS: '/features/status'
  },
  
  // Files
  FILES: {
    UPLOAD: '/files/upload',
    DOWNLOAD: '/files/{id}',
    DELETE: '/files/{id}',
    LIST: '/files'
  },
  
  // Analytics
  ANALYTICS: {
    TRACK_EVENT: '/analytics/events',
    GET_METRICS: '/analytics/metrics',
    DASHBOARD: '/analytics/dashboard'
  },
  
  // Health Check
  HEALTH: {
    STATUS: '/health',
    READY: '/health/ready',
    LIVE: '/health/live'
  }
} as const;

// ============================================================================
// REQUEST HEADERS
// ============================================================================

export const REQUEST_HEADERS = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  ACCEPT: 'Accept',
  USER_AGENT: 'User-Agent',
  X_REQUEST_ID: 'X-Request-ID',
  X_CLIENT_VERSION: 'X-Client-Version',
  X_API_KEY: 'X-API-Key',
  X_CSRF_TOKEN: 'X-CSRF-Token',
  X_FORWARDED_FOR: 'X-Forwarded-For',
  X_REAL_IP: 'X-Real-IP'
} as const;

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

export const RESPONSE_HEADERS = {
  CACHE_CONTROL: 'Cache-Control',
  ETAG: 'ETag',
  LAST_MODIFIED: 'Last-Modified',
  CONTENT_DISPOSITION: 'Content-Disposition',
  X_RATE_LIMIT_REMAINING: 'X-Rate-Limit-Remaining',
  X_RATE_LIMIT_RESET: 'X-Rate-Limit-Reset',
  X_RESPONSE_TIME: 'X-Response-Time',
  X_REQUEST_ID: 'X-Request-ID'
} as const;

// ============================================================================
// API ERROR CODES
// ============================================================================

export const API_ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  
  // Resource Errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // File Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Processing Errors
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  PROCESSING_CANCELLED: 'PROCESSING_CANCELLED',
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

// ============================================================================
// PAGINATION DEFAULTS
// ============================================================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  SORT_ORDER: 'desc' as const,
  SORT_BY: 'createdAt'
} as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const CACHE_SETTINGS = {
  NO_CACHE: 'no-cache',
  NO_STORE: 'no-store',
  PRIVATE: 'private',
  PUBLIC: 'public',
  MAX_AGE_SHORT: 300, // 5 minutes
  MAX_AGE_MEDIUM: 1800, // 30 minutes
  MAX_AGE_LONG: 3600, // 1 hour
  MAX_AGE_VERY_LONG: 86400 // 24 hours
} as const;

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

export const WEBHOOK_CONFIG = {
  EVENTS: {
    JOB_COMPLETED: 'job.completed',
    JOB_FAILED: 'job.failed',
    USER_REGISTERED: 'user.registered',
    PAYMENT_PROCESSED: 'payment.processed',
    SUBSCRIPTION_UPDATED: 'subscription.updated'
  },
  
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
  TIMEOUT: 30000, // 30 seconds
  
  HEADERS: {
    SIGNATURE: 'X-CVPlus-Signature',
    TIMESTAMP: 'X-CVPlus-Timestamp',
    EVENT_TYPE: 'X-CVPlus-Event',
    DELIVERY_ID: 'X-CVPlus-Delivery-ID'
  }
} as const;

// ============================================================================
// API VERSIONING
// ============================================================================

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
  CURRENT: 'v1',
  SUPPORTED: ['v1'] as const
} as const;