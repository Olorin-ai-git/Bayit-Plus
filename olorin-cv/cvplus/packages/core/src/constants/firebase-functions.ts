/**
 * Firebase Functions Constants
 * 
 * Centralized constants for Firebase Functions configuration and common values.
 * Consolidates constants scattered across function files.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

/**
 * Function timeout configurations (in seconds)
  */
export const FUNCTION_TIMEOUTS = {
  SHORT: 60,        // 1 minute - for quick operations
  MEDIUM: 300,      // 5 minutes - for moderate processing
  LONG: 540,        // 9 minutes - for complex operations
  MAX: 540          // Maximum allowed timeout
} as const;

/**
 * Memory allocation configurations
  */
export const MEMORY_ALLOCATIONS = {
  SMALL: '256MB',   // For lightweight operations
  MEDIUM: '512MB',  // For moderate processing
  LARGE: '1GB',     // For heavy processing
  XLARGE: '2GB',    // For very heavy operations
  XXLARGE: '4GB'    // For extremely heavy operations
} as const;

/**
 * Firebase regions
  */
export const REGIONS = {
  US_CENTRAL: 'us-central1',
  US_EAST: 'us-east1',
  US_WEST: 'us-west1',
  EUROPE_WEST: 'europe-west1',
  ASIA_NORTHEAST: 'asia-northeast1'
} as const;

/**
 * Default CORS origins for different environments
  */
export const FIREBASE_CORS_ORIGINS = {
  DEVELOPMENT: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  STAGING: [
    'https://staging.cvplus.app',
    'https://cvplus-staging.web.app',
    'https://cvplus-staging.firebaseapp.com'
  ],
  PRODUCTION: [
    'https://cvplus.app',
    'https://www.cvplus.app',
    'https://cvplus-prod.web.app',
    'https://cvplus-prod.firebaseapp.com'
  ]
} as const;

/**
 * Premium feature definitions and requirements
  */
export const PREMIUM_FEATURES = {
  ADVANCED_ANALYTICS: {
    key: 'advanced-analytics',
    name: 'Advanced Analytics',
    minimumTier: 'pro',
    description: 'Detailed analytics and insights'
  },
  WHITE_LABEL_REPORTS: {
    key: 'white-label-reports',
    name: 'White Label Reports',
    minimumTier: 'enterprise',
    description: 'Custom branded reports'
  },
  CUSTOM_BRANDING: {
    key: 'custom-branding',
    name: 'Custom Branding',
    minimumTier: 'pro',
    description: 'Customize appearance with your branding'
  },
  PRIORITY_SUPPORT: {
    key: 'priority-support',
    name: 'Priority Support',
    minimumTier: 'pro',
    description: 'Priority customer support'
  },
  BULK_PROCESSING: {
    key: 'bulk-processing',
    name: 'Bulk Processing',
    minimumTier: 'pro',
    description: 'Process multiple files at once'
  },
  API_ACCESS: {
    key: 'api-access',
    name: 'API Access',
    minimumTier: 'pro',
    description: 'Programmatic access via API'
  }
} as const;

/**
 * Subscription tiers hierarchy
  */
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'free',
    level: 0,
    features: []
  },
  BASIC: {
    name: 'basic',
    level: 1,
    features: ['basic-analytics', 'standard-templates']
  },
  PRO: {
    name: 'pro',
    level: 2,
    features: [
      'basic-analytics', 
      'standard-templates',
      'advanced-analytics',
      'custom-branding',
      'priority-support',
      'bulk-processing',
      'api-access'
    ]
  },
  ENTERPRISE: {
    name: 'enterprise',
    level: 3,
    features: [
      'basic-analytics', 
      'standard-templates',
      'advanced-analytics',
      'custom-branding',
      'priority-support',
      'bulk-processing',
      'api-access',
      'white-label-reports',
      'custom-integrations',
      'dedicated-support'
    ]
  }
} as const;

/**
 * Rate limiting configurations
  */
export const FIREBASE_RATE_LIMITS = {
  FREE_TIER: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 500
  },
  BASIC_TIER: {
    requestsPerMinute: 50,
    requestsPerHour: 1000,
    requestsPerDay: 5000
  },
  PRO_TIER: {
    requestsPerMinute: 200,
    requestsPerHour: 5000,
    requestsPerDay: 50000
  },
  ENTERPRISE_TIER: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 1000000
  }
} as const;

/**
 * File upload limits
  */
export const FILE_LIMITS = {
  MAX_SIZE_MB: {
    FREE: 5,
    BASIC: 10,
    PRO: 50,
    ENTERPRISE: 100
  },
  ALLOWED_TYPES: {
    CV: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  }
} as const;

/**
 * Cache TTL values (in seconds)
  */
export const CACHE_TTL = {
  SHORT: 300,       // 5 minutes
  MEDIUM: 1800,     // 30 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400  // 24 hours
} as const;

/**
 * Common error messages
  */
export const FIREBASE_ERROR_MESSAGES = {
  AUTHENTICATION: {
    REQUIRED: 'User must be authenticated',
    INVALID_TOKEN: 'Invalid authentication token',
    TOKEN_EXPIRED: 'Authentication token has expired',
    USER_MISMATCH: 'User ID mismatch - access denied'
  },
  AUTHORIZATION: {
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    PREMIUM_REQUIRED: 'Premium subscription required',
    FEATURE_NOT_AVAILABLE: 'Feature not available for current subscription'
  },
  VALIDATION: {
    INVALID_INPUT: 'Invalid input data',
    MISSING_REQUIRED_FIELD: 'Missing required field',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds limit'
  },
  PROCESSING: {
    OPERATION_FAILED: 'Operation failed',
    TIMEOUT: 'Operation timed out',
    RESOURCE_NOT_FOUND: 'Requested resource not found',
    INTERNAL_ERROR: 'Internal server error'
  }
} as const;

/**
 * HTTP status codes commonly used in Firebase Functions
  */
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * Default pagination settings
  */
export const FIREBASE_PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;

/**
 * Processing status constants
  */
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  ANALYZING: 'analyzing',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

/**
 * Supported languages for i18n
  */
export const SUPPORTED_LANGUAGES = {
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de',
  PORTUGUESE: 'pt',
  ITALIAN: 'it'
} as const;

/**
 * Analytics event categories
  */
export const ANALYTICS_CATEGORIES = {
  USER: 'user',
  CV: 'cv',
  PAYMENT: 'payment',
  FEATURE: 'feature',
  ERROR: 'error',
  PERFORMANCE: 'performance'
} as const;

/**
 * Queue priorities for background tasks
  */
export const QUEUE_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20
} as const;

/**
 * External API timeouts (in milliseconds)
  */
export const EXTERNAL_API_TIMEOUTS = {
  CLAUDE: 30000,
  OPENAI: 30000,
  GOOGLE: 10000,
  STRIPE: 10000,
  PAYPAL: 15000,
  DEFAULT: 10000
} as const;

/**
 * Security constants
  */
export const SECURITY = {
  TOKEN_EXPIRY_BUFFER: 300, // 5 minutes buffer for token expiry
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  SALT_ROUNDS: 12
} as const;