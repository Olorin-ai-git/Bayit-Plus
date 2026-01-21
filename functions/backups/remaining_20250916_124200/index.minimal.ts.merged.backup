// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia Module - Minimal Export for Functions Migration
 * 
 * This file provides minimal exports required for Firebase Functions integration
 * during the architectural violation fix migration.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @license PROPRIETARY
 */

// ============================================================================
// ESSENTIAL TYPES FOR FUNCTIONS
// ============================================================================

export type {
  MediaType,
  MediaFile,
  ProcessedMedia,
  QualityLevel,
  FileFormat
} from './types/media.types';

// ============================================================================
// BACKEND FUNCTIONS - MINIMAL IMPORTS
// ============================================================================

// Import the actual functions directly from local multimedia backend functions
// This maintains proper modular architecture and avoids external dependencies

// Podcast functions - using local multimedia backend functions
export { generatePodcast } from './backend/functions/generatePodcast';
export { podcastStatus } from './backend/functions/podcastStatus';
export { podcastStatusPublic } from './backend/functions/podcastStatusPublic';

// Video functions - using local multimedia backend functions  
export { generateVideoIntroduction } from './backend/functions/generateVideoIntroduction';
export { heygenWebhook } from './backend/functions/heygen-webhook';
export { runwaymlStatusCheck } from './backend/functions/runwayml-status-check';

// Media functions - using local multimedia backend functions
export {
  generateVideoIntro,
  generateAudioFromText,
  regenerateMedia,
  getMediaStatus,
  downloadMediaContent
} from './backend/functions/mediaGeneration';

// Portfolio functions - using local multimedia backend functions
export {
  generatePortfolioGallery,
  updatePortfolioItem,
  addPortfolioItem,
  deletePortfolioItem,
  uploadPortfolioMedia,
  generateShareablePortfolio
} from './backend/functions/portfolioGallery';

// QR Code functions - using local multimedia backend functions
export {
  generateQRCode,
  trackQRCodeScan,
  getQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRAnalytics,
  getQRTemplates
} from './backend/functions/enhancedQR';

// Enhanced QR functions - using local multimedia backend functions
export {
  enhanceQRCodes,
  getEnhancedQRCodes,
  trackQRCodeScanEnhanced,
  getQRCodeAnalytics,
  autoEnhanceQRCodes,
  generateQRCodePreview
} from './backend/functions/qrCodeEnhancement';

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = '1.0.0';
export const MODULE_NAME = '@cvplus/multimedia';

export const MODULE_INFO = {
  name: MODULE_NAME,
  version: VERSION,
  description: 'CVPlus Multimedia - Minimal exports for autonomous operation',
  author: 'Gil Klainert',
  license: 'PROPRIETARY'
} as const;