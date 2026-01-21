/**
 * Multimedia Backend Functions Index
 * Exports all multimedia Firebase Functions
  */

// Podcast functions
export { generatePodcast } from './generatePodcast';
export { podcastStatus } from './podcastStatus';
export { podcastStatusPublic } from './podcastStatusPublic';

// Video functions
export { generateVideoIntroduction } from './generateVideoIntroduction';
export { heygenWebhook } from './heygen-webhook';
export { runwaymlStatusCheck } from './runwayml-status-check';

// Media functions  
export {
  generateVideoIntro,
  generateAudioFromText,
  regenerateMedia,
  getMediaStatus,
  downloadMediaContent
} from './mediaGeneration';

export {
  generatePortfolioGallery,
  updatePortfolioItem,
  addPortfolioItem,
  deletePortfolioItem,
  uploadPortfolioMedia,
  generateShareablePortfolio
} from './portfolioGallery';

// QR code functions
export {
  generateQRCode,
  trackQRCodeScan,
  getQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRAnalytics,
  getQRTemplates
} from './enhancedQR';

export {
  enhanceQRCodes,
  getEnhancedQRCodes,
  trackQRCodeScanEnhanced,
  getQRCodeAnalytics as getQRAnalyticsEnhanced,
  autoEnhanceQRCodes,
  generateQRCodePreview
} from './qrCodeEnhancement';