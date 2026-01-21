// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia - Configuration Constants
 * 
 * Default configuration values and settings for multimedia services.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export const SERVICE_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT: 60000, // 1 minute
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  METRICS_COLLECTION_INTERVAL: 10000, // 10 seconds
  LOG_LEVEL: 'info'
} as const;

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

export const STORAGE_CONFIG = {
  DEFAULT_BUCKET: 'cvplus-media',
  TEMP_BUCKET: 'cvplus-media-temp',
  CDN_DOMAIN: 'cdn.cvplus.app',
  MAX_CONCURRENT_UPLOADS: 5,
  CHUNK_SIZE: 1024 * 1024, // 1 MB
  MULTIPART_THRESHOLD: 10 * 1024 * 1024, // 10 MB
  SIGNED_URL_EXPIRY: 3600, // 1 hour
  CACHE_CONTROL: 'public, max-age=31536000', // 1 year
  METADATA_CACHE_TTL: 300 // 5 minutes
} as const;

// ============================================================================
// PROCESSING CONFIGURATION
// ============================================================================

export const PROCESSING_CONFIG = {
  DEFAULT_QUALITY: 0.8,
  MAX_CONCURRENT_JOBS: 10,
  JOB_TIMEOUT: 300000, // 5 minutes
  PROGRESS_UPDATE_INTERVAL: 1000, // 1 second
  TEMP_DIR_CLEANUP_INTERVAL: 3600000, // 1 hour
  MAX_TEMP_FILE_AGE: 7200000, // 2 hours
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_DETAILED_LOGGING: false
} as const;

// ============================================================================
// CDN CONFIGURATION
// ============================================================================

export const CDN_CONFIG = {
  ENABLE_CDN: true,
  CDN_BASE_URL: 'https://cdn.cvplus.app',
  CACHE_HEADERS: {
    'Cache-Control': 'public, max-age=31536000',
    'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
  },
  COMPRESSION_ENABLED: true,
  GZIP_COMPRESSION_LEVEL: 6,
  WEBP_SUPPORT_CHECK: true,
  RESPONSIVE_IMAGES: true
} as const;

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

export const SECURITY_CONFIG = {
  ENABLE_FILE_VALIDATION: true,
  SCAN_FOR_MALWARE: true,
  BLOCK_SUSPICIOUS_FILES: true,
  MAX_FILE_NAME_LENGTH: 255,
  ALLOWED_CHARACTERS: /^[a-zA-Z0-9._-]+$/,
  STRIP_METADATA: true,
  WATERMARK_PROTECTION: false,
  CONTENT_TYPE_VALIDATION: true
} as const;

// ============================================================================
// ANALYTICS CONFIGURATION
// ============================================================================

export const ANALYTICS_CONFIG = {
  ENABLE_ANALYTICS: true,
  TRACK_PROCESSING_METRICS: true,
  TRACK_USAGE_METRICS: true,
  TRACK_ERROR_METRICS: true,
  RETENTION_PERIOD_DAYS: 90,
  AGGREGATION_INTERVAL: 3600000, // 1 hour
  EXPORT_METRICS_FORMAT: 'json'
} as const;

// ============================================================================
// NOTIFICATION CONFIGURATION
// ============================================================================

export const NOTIFICATION_CONFIG = {
  ENABLE_NOTIFICATIONS: true,
  WEBHOOK_TIMEOUT: 10000, // 10 seconds
  MAX_WEBHOOK_RETRIES: 3,
  EMAIL_NOTIFICATIONS: false,
  SLACK_NOTIFICATIONS: false,
  DISCORD_NOTIFICATIONS: false,
  CUSTOM_WEBHOOKS: true
} as const;

// ============================================================================
// ENVIRONMENT-SPECIFIC OVERRIDES
// ============================================================================

export const ENVIRONMENT_CONFIG = {
  DEVELOPMENT: {
    LOG_LEVEL: 'debug',
    ENABLE_DETAILED_LOGGING: true,
    CIRCUIT_BREAKER_THRESHOLD: 10,
    ENABLE_ANALYTICS: false
  },
  STAGING: {
    LOG_LEVEL: 'info',
    ENABLE_DETAILED_LOGGING: false,
    CIRCUIT_BREAKER_THRESHOLD: 7,
    ENABLE_ANALYTICS: true
  },
  PRODUCTION: {
    LOG_LEVEL: 'warn',
    ENABLE_DETAILED_LOGGING: false,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    ENABLE_ANALYTICS: true
  }
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_BATCH_PROCESSING: true,
  ENABLE_AI_OPTIMIZATION: false,
  ENABLE_BACKGROUND_REMOVAL: false,
  ENABLE_VIDEO_TRANSCODING: true,
  ENABLE_AUDIO_ENHANCEMENT: false,
  ENABLE_SMART_CROPPING: false,
  ENABLE_DUPLICATE_DETECTION: true,
  ENABLE_AUTO_TAGGING: false
} as const;

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API_CONFIG = {
  BASE_URL: 'https://api.cvplus.app',
  API_VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
  MAX_REQUEST_SIZE: 50 * 1024 * 1024, // 50 MB
  ENABLE_COMPRESSION: true,
  ENABLE_CACHING: true,
  CACHE_TTL: 300, // 5 minutes
  CORS_ENABLED: true,
  CORS_ORIGINS: ['https://cvplus.app', 'https://www.cvplus.app']
} as const;

// ============================================================================
// DEFAULT MULTIMEDIA ENVIRONMENT SETTINGS
// ============================================================================

export const DEFAULT_MULTIMEDIA_ENVIRONMENT = 'production' as const;
export const SUPPORTED_ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export type MultimediaEnvironment = typeof SUPPORTED_ENVIRONMENTS[number];