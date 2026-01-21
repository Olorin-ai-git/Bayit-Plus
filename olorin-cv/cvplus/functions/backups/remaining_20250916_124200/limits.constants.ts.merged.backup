// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia - Limits Constants
 * 
 * File size limits, dimensions, and other constraints for multimedia processing.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// SIZE UNITS
// ============================================================================

export const SIZE_UNITS = {
  bytes: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024
} as const;

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

export const FILE_SIZE_LIMITS = {
  IMAGE: {
    FREE_TIER: 5 * SIZE_UNITS.mb,     // 5 MB
    PREMIUM: 50 * SIZE_UNITS.mb,      // 50 MB
    ENTERPRISE: 200 * SIZE_UNITS.mb   // 200 MB
  },
  VIDEO: {
    FREE_TIER: 100 * SIZE_UNITS.mb,   // 100 MB
    PREMIUM: 1 * SIZE_UNITS.gb,       // 1 GB
    ENTERPRISE: 5 * SIZE_UNITS.gb     // 5 GB
  },
  AUDIO: {
    FREE_TIER: 25 * SIZE_UNITS.mb,    // 25 MB
    PREMIUM: 100 * SIZE_UNITS.mb,     // 100 MB
    ENTERPRISE: 500 * SIZE_UNITS.mb   // 500 MB
  }
} as const;

// ============================================================================
// DIMENSION LIMITS
// ============================================================================

export const DIMENSION_LIMITS = {
  IMAGE: {
    MIN_WIDTH: 50,
    MIN_HEIGHT: 50,
    MAX_WIDTH_FREE: 4096,
    MAX_HEIGHT_FREE: 4096,
    MAX_WIDTH_PREMIUM: 8192,
    MAX_HEIGHT_PREMIUM: 8192,
    MAX_WIDTH_ENTERPRISE: 16384,
    MAX_HEIGHT_ENTERPRISE: 16384
  },
  VIDEO: {
    MIN_WIDTH: 240,
    MIN_HEIGHT: 180,
    MAX_WIDTH_FREE: 1920,
    MAX_HEIGHT_FREE: 1080,
    MAX_WIDTH_PREMIUM: 3840,
    MAX_HEIGHT_PREMIUM: 2160,
    MAX_WIDTH_ENTERPRISE: 7680,
    MAX_HEIGHT_ENTERPRISE: 4320
  }
} as const;

// ============================================================================
// DURATION LIMITS (in seconds)
// ============================================================================

export const DURATION_LIMITS = {
  VIDEO: {
    MIN_DURATION: 1,
    MAX_DURATION_FREE: 300,      // 5 minutes
    MAX_DURATION_PREMIUM: 1800,  // 30 minutes
    MAX_DURATION_ENTERPRISE: 7200 // 2 hours
  },
  AUDIO: {
    MIN_DURATION: 1,
    MAX_DURATION_FREE: 600,      // 10 minutes
    MAX_DURATION_PREMIUM: 3600,  // 1 hour
    MAX_DURATION_ENTERPRISE: 14400 // 4 hours
  }
} as const;

// ============================================================================
// PROCESSING LIMITS
// ============================================================================

export const PROCESSING_LIMITS = {
  CONCURRENT_JOBS: {
    FREE_TIER: 2,
    PREMIUM: 5,
    ENTERPRISE: 20
  },
  DAILY_PROCESSING: {
    FREE_TIER: 50,
    PREMIUM: 500,
    ENTERPRISE: 10000
  },
  MONTHLY_STORAGE: {
    FREE_TIER: 1 * SIZE_UNITS.gb,     // 1 GB
    PREMIUM: 100 * SIZE_UNITS.gb,     // 100 GB
    ENTERPRISE: 1 * SIZE_UNITS.tb     // 1 TB
  }
} as const;

// ============================================================================
// RATE LIMITS
// ============================================================================

export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: {
    FREE_TIER: 30,
    PREMIUM: 120,
    ENTERPRISE: 600
  },
  REQUESTS_PER_HOUR: {
    FREE_TIER: 300,
    PREMIUM: 2000,
    ENTERPRISE: 20000
  },
  REQUESTS_PER_DAY: {
    FREE_TIER: 1000,
    PREMIUM: 10000,
    ENTERPRISE: 100000
  }
} as const;

// ============================================================================
// BATCH PROCESSING LIMITS
// ============================================================================

export const BATCH_LIMITS = {
  MAX_BATCH_SIZE: {
    FREE_TIER: 10,
    PREMIUM: 50,
    ENTERPRISE: 500
  },
  MAX_BATCH_SIZE_MB: {
    FREE_TIER: 100 * SIZE_UNITS.mb,
    PREMIUM: 1 * SIZE_UNITS.gb,
    ENTERPRISE: 10 * SIZE_UNITS.gb
  }
} as const;

// ============================================================================
// QUALITY PROCESSING LIMITS
// ============================================================================

export const QUALITY_LIMITS = {
  MAX_UPSCALE_FACTOR: {
    FREE_TIER: 2.0,
    PREMIUM: 4.0,
    ENTERPRISE: 8.0
  },
  MIN_QUALITY_SETTING: 0.1,
  MAX_QUALITY_SETTING: 1.0,
  DEFAULT_QUALITY_SETTING: 0.8
} as const;

// ============================================================================
// VALIDATION THRESHOLDS
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  MIN_IMAGE_PIXELS: 2500, // 50x50
  MAX_ASPECT_RATIO: 20.0,
  MIN_ASPECT_RATIO: 0.05,
  MAX_COLOR_DEPTH: 16,
  MIN_COLOR_DEPTH: 1,
  MAX_FRAME_RATE: 120,
  MIN_FRAME_RATE: 1
} as const;