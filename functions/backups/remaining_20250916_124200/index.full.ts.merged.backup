// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia Module - Main Entry Point (Minimal Build)
 * 
 * Basic multimedia types and utilities for the CVPlus platform.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @license PROPRIETARY
 */

// ============================================================================
// CORE TYPES
// ============================================================================

// Media types - basic exports only
export type {
  MediaType,
  MediaFile,
  ProcessedMedia,
  QualityLevel,
  FileFormat,
  ImageFormat,
  VideoFormat,
  AudioFormat,
  ProcessingStatus
} from './types/media.types';

// Image types
export type {
  ProcessedImage,
  ImageProcessingOptions
} from './types/image.types';

// Video types
export type {
  ProcessedVideo,
  VideoProcessingOptions
} from './types/video.types';

// Audio types
export type {
  ProcessedAudio,
  AudioProcessingOptions
} from './types/audio.types';

// Storage types
export type {
  StorageProvider,
  CDNProvider,
} from './types/storage.types';

// Processing types
export type {
  ProcessingMode,
  ProcessingJobType,
  ProcessingStage,
  ProcessingPriority
} from './types/processing.types';

// ============================================================================
// CONSTANTS
// ============================================================================

export * from './constants';

// ============================================================================
// UTILITIES
// ============================================================================

export { FileUtils, MediaUtils } from './utils';
export type { MediaMetadata, MediaValidationRules } from './utils';

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = '1.0.0';
export const MODULE_NAME = '@cvplus/multimedia';

export const MODULE_INFO = {
  name: MODULE_NAME,
  version: VERSION,
  description: 'CVPlus Multimedia - Basic media types and utilities',
  author: 'Gil Klainert',
  license: 'PROPRIETARY'
} as const;

// ============================================================================
// BACKEND FUNCTIONS EXPORTS (Firebase Functions)
// ============================================================================

// Export all backend functions for Firebase Functions
export * from './backend/functions';

// Export backend services and middleware  
export * from './backend/services';
export { corsOptions } from './backend/config/cors';
export { withPremiumAccess } from './backend/middleware/premiumGuard';
export { sanitizeForFirestore, sanitizeErrorContext } from './backend/utils/firestore-sanitizer';