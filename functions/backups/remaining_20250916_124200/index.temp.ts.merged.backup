// @ts-ignore - Export conflicts/**
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
  description: 'CVPlus Multimedia - Essential types and utilities for Firebase Functions',
  author: 'Gil Klainert',
  license: 'PROPRIETARY'
} as const;

// ============================================================================
// FRONTEND COMPONENTS
// ============================================================================

export * from './components';

// ============================================================================
// BACKEND FUNCTIONS (Migrated and Ready)
// ============================================================================

// Re-export backend functions from the backend directory
export { generatePodcast } from './backend/functions/generatePodcast';
export { generateVideoIntroduction } from './backend/functions/generateVideoIntroduction';
export { podcastStatus } from './backend/functions/podcastStatus';
export { podcastStatusPublic } from './backend/functions/podcastStatusPublic';
export { heygenWebhook } from './backend/functions/heygen-webhook';
export { runwaymlStatusCheck } from './backend/functions/runwayml-status-check';

// Media generation functions (individual exports)
export {
  generateVideoIntro,
  generateAudioFromText,
  regenerateMedia,
  getMediaStatus,
  downloadMediaContent
} from './backend/functions/mediaGeneration';

// Portfolio gallery functions (individual exports)
export {
  generatePortfolioGallery,
  updatePortfolioItem,
  addPortfolioItem,
  deletePortfolioItem,
  uploadPortfolioMedia,
  generateShareablePortfolio
} from './backend/functions/portfolioGallery';

// Enhanced QR functions (individual exports)
export {
  generateQRCode,
  trackQRCodeScan,
  getQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRAnalytics,
  getQRTemplates
} from './backend/functions/enhancedQR';

// QR Code enhancement functions (individual exports)
export {
  enhanceQRCodes,
  getEnhancedQRCodes,
  trackQRCodeScanEnhanced,
  getQRCodeAnalytics as getQRAnalyticsEnhanced,
  autoEnhanceQRCodes,
  generateQRCodePreview
} from './backend/functions/qrCodeEnhancement';

// ============================================================================
// BACKEND SERVICES
// ============================================================================

export { mediaGenerationService } from './backend/services/media-generation.service';
export { enhancedVideoGenerationService } from './backend/services/enhanced-video-generation.service';
export { videoGenerationService } from './backend/services/video-generation.service';
export { podcastGenerationService } from './backend/services/podcast-generation.service';
export { portfolioGalleryService } from './backend/services/portfolio-gallery.service';
export { videoMonitoringHooksService } from './backend/services/video/monitoring/video-monitoring-hooks.service';
export { videoMonitoringIntegrationService } from './backend/services/video/monitoring/video-monitoring-integration.service';

// Video providers
export * from './backend/services/video-providers';

// ============================================================================
// FRONTEND SERVICES
// ============================================================================

export { MediaService } from './services/frontend/MediaService';