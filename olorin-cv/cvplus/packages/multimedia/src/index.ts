/**
 * CVPlus Multimedia Module - Minimal Export for Functions Integration
 * 
 * This file provides minimal exports required for Firebase Functions integration
 * while avoiding complex dependencies that cause build issues.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @license PROPRIETARY
  */

// ============================================================================
// CORE TYPES (Essential for Firebase Functions)
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

// Portal and QR types
export type {
  PortalUrls,
  PortalConfig,
  QRCodeType,
  QRCodeConfig,
  QRCodeTemplate,
  QRCodeStyling,
  QRCodeAnalytics,
  VideoScene,
  PortfolioGallery,
  PortfolioItem
} from './backend/types/portal';

// ============================================================================
// EXPLICIT TYPE EXPORTS (for core module compatibility)
// ============================================================================

// Explicit exports for types previously imported by core module
export type {
  MultimediaGenerationResult
  // ApiMultimediaResponse - disabled, requires api module
} from './types/multimedia-api';

export type {
  PortfolioImage,
  CalendarSettings,
  Testimonial,
  PersonalityProfile
} from './types/enhanced-media';

// ============================================================================
// CONSTANTS
// ============================================================================

export * from './constants';

// ============================================================================
// UTILITIES (temporarily disabled)
// ============================================================================

// export { FileUtils, MediaUtils } from './utils';
// export type { MediaMetadata, MediaValidationRules } from './utils';

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = '1.0.0';
export const MODULE_NAME = '@cvplus/multimedia';

export const MODULE_INFO = {
  name: MODULE_NAME,
  version: VERSION,
  description: 'CVPlus Multimedia - Essential types and utilities for Firebase Functions',
  author: 'Gil Klainert',
  license: 'PROPRIETARY'
} as const;

// ============================================================================
// BACKEND FUNCTIONS (temporarily disabled - require refactoring)
// ============================================================================

// NOTE: Backend functions disabled during build - require dependency fixes
// export { generatePodcast } from './backend/functions/generatePodcast';
// export { generateVideoIntroduction } from './backend/functions/generateVideoIntroduction';
// export { podcastStatus } from './backend/functions/podcastStatus';
// export { podcastStatusPublic } from './backend/functions/podcastStatusPublic';

// Media functions
// export {
//   generateVideoIntro,
//   generateAudioFromText,
//   regenerateMedia,
//   getMediaStatus,
//   downloadMediaContent
// } from './backend/functions/mediaGeneration';

// Portfolio functions
// export {
//   generatePortfolioGallery,
//   updatePortfolioItem,
//   addPortfolioItem,
//   deletePortfolioItem,
//   uploadPortfolioMedia,
//   generateShareablePortfolio
// } from './backend/functions/portfolioGallery';

// QR Code functions
// export {
//   generateQRCode,
//   trackQRCodeScan,
//   getQRCodes,
//   updateQRCode,
//   deleteQRCode,
//   getQRAnalytics,
//   getQRTemplates
// } from './backend/functions/enhancedQR';

// Enhanced QR functions
// export {
//   enhanceQRCodes,
//   getEnhancedQRCodes,
//   trackQRCodeScanEnhanced,
//   getQRCodeAnalytics as getQRAnalyticsEnhanced,
//   autoEnhanceQRCodes,
//   generateQRCodePreview
// } from './backend/functions/qrCodeEnhancement';

// Webhook functions
// export { heygenWebhook } from './backend/functions/heygen-webhook';
// export { runwaymlStatusCheck } from './backend/functions/runwayml-status-check';

// ============================================================================
// ADMIN TESTING SERVICES (temporarily disabled)
// ============================================================================

// export { PodcastGenerationService } from './admin/testing/podcast-generation.service';
// export { VideoGenerationService } from './admin/testing/video-generation.service';

// ============================================================================
// SERVICE EXPORTS (temporarily disabled)
// ============================================================================

// export * from './services/enhanced-qr.service';
// export * from './providers/video-providers/base-provider.interface';
