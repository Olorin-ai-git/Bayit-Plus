// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia - Error Constants
 * 
 * Error codes and messages for multimedia processing operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

export const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  STORAGE: 'storage',
  NETWORK: 'network',
  QUOTA: 'quota',
  SECURITY: 'security',
  SYSTEM: 'system'
} as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

// ============================================================================
// ERROR SEVERITIES
// ============================================================================

export const ERROR_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ERROR_SEVERITIES[keyof typeof ERROR_SEVERITIES];

// ============================================================================
// VALIDATION ERROR CODES
// ============================================================================

export const VALIDATION_ERRORS = {
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    message: 'File type not supported',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'File size exceeds maximum allowed limit',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  INVALID_DIMENSIONS: {
    code: 'INVALID_DIMENSIONS',
    message: 'Image dimensions are outside allowed range',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  CORRUPTED_FILE: {
    code: 'CORRUPTED_FILE',
    message: 'File appears to be corrupted or invalid',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITIES.HIGH
  },
  UNSUPPORTED_CODEC: {
    code: 'UNSUPPORTED_CODEC',
    message: 'Media codec not supported',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITIES.MEDIUM
  }
} as const;

// ============================================================================
// PROCESSING ERROR CODES
// ============================================================================

export const PROCESSING_ERRORS = {
  PROCESSING_FAILED: {
    code: 'PROCESSING_FAILED',
    message: 'Media processing operation failed',
    category: ERROR_CATEGORIES.PROCESSING,
    severity: ERROR_SEVERITIES.HIGH
  },
  TIMEOUT_ERROR: {
    code: 'TIMEOUT_ERROR',
    message: 'Processing operation timed out',
    category: ERROR_CATEGORIES.PROCESSING,
    severity: ERROR_SEVERITIES.HIGH
  },
  INSUFFICIENT_RESOURCES: {
    code: 'INSUFFICIENT_RESOURCES',
    message: 'Insufficient system resources for processing',
    category: ERROR_CATEGORIES.PROCESSING,
    severity: ERROR_SEVERITIES.CRITICAL
  },
  CONVERSION_ERROR: {
    code: 'CONVERSION_ERROR',
    message: 'Format conversion failed',
    category: ERROR_CATEGORIES.PROCESSING,
    severity: ERROR_SEVERITIES.HIGH
  },
  OPTIMIZATION_ERROR: {
    code: 'OPTIMIZATION_ERROR',
    message: 'Media optimization failed',
    category: ERROR_CATEGORIES.PROCESSING,
    severity: ERROR_SEVERITIES.MEDIUM
  }
} as const;

// ============================================================================
// STORAGE ERROR CODES
// ============================================================================

export const STORAGE_ERRORS = {
  UPLOAD_FAILED: {
    code: 'UPLOAD_FAILED',
    message: 'File upload failed',
    category: ERROR_CATEGORIES.STORAGE,
    severity: ERROR_SEVERITIES.HIGH
  },
  STORAGE_QUOTA_EXCEEDED: {
    code: 'STORAGE_QUOTA_EXCEEDED',
    message: 'Storage quota exceeded',
    category: ERROR_CATEGORIES.QUOTA,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  FILE_NOT_FOUND: {
    code: 'FILE_NOT_FOUND',
    message: 'Requested file not found',
    category: ERROR_CATEGORIES.STORAGE,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    message: 'Access denied to file or storage location',
    category: ERROR_CATEGORIES.SECURITY,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  STORAGE_SERVICE_UNAVAILABLE: {
    code: 'STORAGE_SERVICE_UNAVAILABLE',
    message: 'Storage service temporarily unavailable',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITIES.CRITICAL
  }
} as const;

// ============================================================================
// NETWORK ERROR CODES
// ============================================================================

export const NETWORK_ERRORS = {
  CONNECTION_FAILED: {
    code: 'CONNECTION_FAILED',
    message: 'Network connection failed',
    category: ERROR_CATEGORIES.NETWORK,
    severity: ERROR_SEVERITIES.HIGH
  },
  REQUEST_TIMEOUT: {
    code: 'REQUEST_TIMEOUT',
    message: 'Network request timed out',
    category: ERROR_CATEGORIES.NETWORK,
    severity: ERROR_SEVERITIES.MEDIUM
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'External service unavailable',
    category: ERROR_CATEGORIES.NETWORK,
    severity: ERROR_SEVERITIES.HIGH
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'API rate limit exceeded',
    category: ERROR_CATEGORIES.QUOTA,
    severity: ERROR_SEVERITIES.MEDIUM
  }
} as const;

// ============================================================================
// SYSTEM ERROR CODES
// ============================================================================

export const SYSTEM_ERRORS = {
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal system error occurred',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITIES.CRITICAL
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITIES.CRITICAL
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    message: 'System configuration error',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITIES.CRITICAL
  },
  DEPENDENCY_ERROR: {
    code: 'DEPENDENCY_ERROR',
    message: 'Required dependency unavailable',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITIES.HIGH
  }
} as const;

// ============================================================================
// ALL ERROR CODES COMBINED
// ============================================================================

export const ALL_ERROR_CODES = {
  ...VALIDATION_ERRORS,
  ...PROCESSING_ERRORS,
  ...STORAGE_ERRORS,
  ...NETWORK_ERRORS,
  ...SYSTEM_ERRORS
} as const;

// ============================================================================
// ERROR CODE MAPPINGS
// ============================================================================

export const ERROR_CODE_TO_HTTP_STATUS = {
  INVALID_FILE_TYPE: 400,
  FILE_TOO_LARGE: 413,
  INVALID_DIMENSIONS: 400,
  CORRUPTED_FILE: 400,
  UNSUPPORTED_CODEC: 415,
  PROCESSING_FAILED: 500,
  TIMEOUT_ERROR: 504,
  INSUFFICIENT_RESOURCES: 503,
  CONVERSION_ERROR: 500,
  OPTIMIZATION_ERROR: 500,
  UPLOAD_FAILED: 500,
  STORAGE_QUOTA_EXCEEDED: 507,
  FILE_NOT_FOUND: 404,
  ACCESS_DENIED: 403,
  STORAGE_SERVICE_UNAVAILABLE: 503,
  CONNECTION_FAILED: 503,
  REQUEST_TIMEOUT: 504,
  SERVICE_UNAVAILABLE: 503,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  CONFIGURATION_ERROR: 500,
  DEPENDENCY_ERROR: 503
} as const;

// ============================================================================
// RETRY CONFIGURATION FOR ERROR TYPES
// ============================================================================

export const ERROR_RETRY_CONFIG = {
  RETRYABLE: [
    'TIMEOUT_ERROR',
    'CONNECTION_FAILED',
    'REQUEST_TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'STORAGE_SERVICE_UNAVAILABLE',
    'INSUFFICIENT_RESOURCES'
  ],
  NON_RETRYABLE: [
    'INVALID_FILE_TYPE',
    'FILE_TOO_LARGE',
    'CORRUPTED_FILE',
    'ACCESS_DENIED',
    'STORAGE_QUOTA_EXCEEDED',
    'FILE_NOT_FOUND',
    'CONFIGURATION_ERROR'
  ]
} as const;