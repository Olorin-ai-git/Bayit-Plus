/**
 * Utilities Index
 * 
 * Exports all utility functions and classes for the CVPlus Multimedia Module.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
  */

// ============================================================================
// FILE UTILITIES
// ============================================================================

export { FileUtils } from './FileUtils';

// ============================================================================
// MEDIA UTILITIES
// ============================================================================

export { MediaUtils } from './MediaUtils';
export type { 
  MediaMetadata, 
  MediaValidationRules 
} from './MediaUtils';

// ============================================================================
// UTILITY CONSTANTS
// ============================================================================

export const UTIL_CONSTANTS = {
  // File size limits
  MAX_FILE_SIZE: {
    IMAGE: 50 * 1024 * 1024, // 50MB
    VIDEO: 500 * 1024 * 1024, // 500MB
    AUDIO: 200 * 1024 * 1024, // 200MB
    DOCUMENT: 100 * 1024 * 1024, // 100MB
  },

  // Image dimensions
  MAX_DIMENSIONS: {
    WIDTH: 8000,
    HEIGHT: 8000,
  },

  MIN_DIMENSIONS: {
    WIDTH: 1,
    HEIGHT: 1,
  },

  // Video constraints
  MAX_VIDEO_DURATION: 7200, // 2 hours in seconds
  MIN_VIDEO_DURATION: 1, // 1 second

  // Audio constraints
  MAX_AUDIO_DURATION: 14400, // 4 hours in seconds
  MIN_AUDIO_DURATION: 1, // 1 second

  // Quality settings
  QUALITY_LEVELS: {
    LOW: 60,
    MEDIUM: 80,
    HIGH: 95,
    LOSSLESS: 100,
  },

  // Thumbnail settings
  THUMBNAIL_SIZES: {
    SMALL: { width: 150, height: 150 },
    MEDIUM: { width: 300, height: 300 },
    LARGE: { width: 600, height: 600 },
  },

  // Supported formats
  SUPPORTED_FORMATS: {
    IMAGE: ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff'],
    VIDEO: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'm4v', 'ogv'],
    AUDIO: ['mp3', 'aac', 'ogg', 'wav', 'flac', 'm4a', 'wma', 'opus'],
  },

  // Common aspect ratios
  ASPECT_RATIOS: {
    SQUARE: 1.0,
    FOUR_THREE: 4/3,
    SIXTEEN_NINE: 16/9,
    TWENTY_ONE_NINE: 21/9,
    THREE_FOUR: 3/4,
    NINE_SIXTEEN: 9/16,
  },

  // Bit rate recommendations (bps)
  BIT_RATES: {
    VIDEO: {
      LOW: 500000, // 500 kbps
      MEDIUM: 2000000, // 2 Mbps
      HIGH: 8000000, // 8 Mbps
      ULTRA: 25000000, // 25 Mbps
    },
    AUDIO: {
      LOW: 64000, // 64 kbps
      MEDIUM: 128000, // 128 kbps
      HIGH: 320000, // 320 kbps
      LOSSLESS: 1411200, // 1411 kbps (CD quality)
    },
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a comprehensive file validation configuration
  */
export function createValidationConfig(mediaType: 'image' | 'video' | 'audio') {
  const baseConfig = {
    maxSize: UTIL_CONSTANTS.MAX_FILE_SIZE.IMAGE,
    minSize: 1024, // 1KB minimum
    allowedExtensions: UTIL_CONSTANTS.SUPPORTED_FORMATS.IMAGE,
  };

  switch (mediaType) {
    case 'video':
      return {
        ...baseConfig,
        maxSize: UTIL_CONSTANTS.MAX_FILE_SIZE.VIDEO,
        allowedExtensions: UTIL_CONSTANTS.SUPPORTED_FORMATS.VIDEO,
        maxWidth: UTIL_CONSTANTS.MAX_DIMENSIONS.WIDTH,
        maxHeight: UTIL_CONSTANTS.MAX_DIMENSIONS.HEIGHT,
        maxDuration: UTIL_CONSTANTS.MAX_VIDEO_DURATION,
        minDuration: UTIL_CONSTANTS.MIN_VIDEO_DURATION,
      };

    case 'audio':
      return {
        ...baseConfig,
        maxSize: UTIL_CONSTANTS.MAX_FILE_SIZE.AUDIO,
        allowedExtensions: UTIL_CONSTANTS.SUPPORTED_FORMATS.AUDIO,
        maxDuration: UTIL_CONSTANTS.MAX_AUDIO_DURATION,
        minDuration: UTIL_CONSTANTS.MIN_AUDIO_DURATION,
      };

    default: // image
      return {
        ...baseConfig,
        maxWidth: UTIL_CONSTANTS.MAX_DIMENSIONS.WIDTH,
        maxHeight: UTIL_CONSTANTS.MAX_DIMENSIONS.HEIGHT,
        minWidth: UTIL_CONSTANTS.MIN_DIMENSIONS.WIDTH,
        minHeight: UTIL_CONSTANTS.MIN_DIMENSIONS.HEIGHT,
      };
  }
}

/**
 * Get recommended settings for media optimization
  */
export function getOptimizationSettings(
  mediaType: 'image' | 'video' | 'audio',
  quality: 'low' | 'medium' | 'high' | 'lossless' = 'medium'
) {
  const baseSettings = {
    quality: UTIL_CONSTANTS.QUALITY_LEVELS[quality.toUpperCase() as keyof typeof UTIL_CONSTANTS.QUALITY_LEVELS],
    stripMetadata: quality !== 'lossless',
    progressive: true,
  };

  switch (mediaType) {
    case 'video':
      return {
        ...baseSettings,
        targetBitRate: UTIL_CONSTANTS.BIT_RATES.VIDEO[quality.toUpperCase() as keyof typeof UTIL_CONSTANTS.BIT_RATES.VIDEO],
        format: 'mp4',
        codec: quality === 'high' ? 'h265' : 'h264',
        maxFrameRate: 60,
      };

    case 'audio':
      return {
        ...baseSettings,
        targetBitRate: UTIL_CONSTANTS.BIT_RATES.AUDIO[quality.toUpperCase() as keyof typeof UTIL_CONSTANTS.BIT_RATES.AUDIO],
        format: quality === 'lossless' ? 'flac' : 'aac',
        sampleRate: quality === 'lossless' ? 48000 : 44100,
        channels: 2, // stereo
      };

    default: // image
      return {
        ...baseSettings,
        format: 'webp',
        maxWidth: quality === 'lossless' ? undefined : 2048,
        maxHeight: quality === 'lossless' ? undefined : 2048,
        generateResponsive: quality !== 'lossless',
      };
  }
}

/**
 * Check if a file meets the requirements for a specific use case
  */
export function validateForUseCase(
  file: { name: string; size: number; type: string },
  useCase: 'avatar' | 'banner' | 'thumbnail' | 'document' | 'video-upload' | 'audio-upload'
) {
  // Import FileUtils locally to avoid circular dependency
  const { FileUtils: FileUtilsImport } = require('./FileUtils');
  
  switch (useCase) {
    case 'avatar':
      return FileUtilsImport.validateFile(file, {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        minSize: 1024, // 1KB
      });

    case 'banner':
      return FileUtilsImport.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        minSize: 1024, // 1KB
      });

    case 'thumbnail':
      return FileUtilsImport.validateFile(file, {
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        minSize: 512, // 512B
      });

    case 'document':
      return FileUtilsImport.validateFile(file, {
        maxSize: UTIL_CONSTANTS.MAX_FILE_SIZE.DOCUMENT,
        allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
        minSize: 100, // 100B
      });

    case 'video-upload':
      return FileUtilsImport.validateFile(file, {
        maxSize: UTIL_CONSTANTS.MAX_FILE_SIZE.VIDEO,
        allowedExtensions: UTIL_CONSTANTS.SUPPORTED_FORMATS.VIDEO,
        minSize: 1024, // 1KB
      });

    case 'audio-upload':
      return FileUtilsImport.validateFile(file, {
        maxSize: UTIL_CONSTANTS.MAX_FILE_SIZE.AUDIO,
        allowedExtensions: UTIL_CONSTANTS.SUPPORTED_FORMATS.AUDIO,
        minSize: 1024, // 1KB
      });

    default:
      return { valid: false, errors: ['Unknown use case'] };
  }
}

/**
 * Generate processing options based on target platform
  */
export function getProcessingOptionsForPlatform(
  platform: 'web' | 'mobile' | 'email' | 'social' | 'print',
  mediaType: 'image' | 'video' | 'audio'
) {
  const baseOptions = getOptimizationSettings(mediaType, 'medium');

  switch (platform) {
    case 'mobile':
      return {
        ...baseOptions,
        quality: UTIL_CONSTANTS.QUALITY_LEVELS.MEDIUM,
        maxWidth: mediaType === 'image' ? 1080 : undefined,
        maxHeight: mediaType === 'image' ? 1080 : undefined,
        targetBitRate: mediaType === 'video' ? UTIL_CONSTANTS.BIT_RATES.VIDEO.MEDIUM : undefined,
        format: mediaType === 'image' ? 'webp' : baseOptions.format,
      };

    case 'email':
      return {
        ...baseOptions,
        quality: UTIL_CONSTANTS.QUALITY_LEVELS.LOW,
        maxWidth: mediaType === 'image' ? 600 : undefined,
        maxHeight: mediaType === 'image' ? 400 : undefined,
        format: mediaType === 'image' ? 'jpeg' : baseOptions.format,
      };

    case 'social':
      return {
        ...baseOptions,
        quality: UTIL_CONSTANTS.QUALITY_LEVELS.HIGH,
        maxWidth: mediaType === 'image' ? 1200 : undefined,
        maxHeight: mediaType === 'image' ? 1200 : undefined,
        generateResponsive: true,
      };

    case 'print':
      return {
        ...baseOptions,
        quality: UTIL_CONSTANTS.QUALITY_LEVELS.LOSSLESS,
        format: mediaType === 'image' ? 'png' : baseOptions.format,
        stripMetadata: false,
      };

    default: // web
      return baseOptions;
  }
}