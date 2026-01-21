/**
 * CVPlus Public Profiles Backend Functions
 * 
 * This module exports Firebase Cloud Functions for public profile functionality.
  */

// Public Profile Functions
export {
  createPublicProfile,
  getPublicProfile,
  updatePublicProfileSettings,
  submitContactForm,
  trackQRScan,
  testEmailConfiguration
} from './functions/profile.functions';

// Web Portal Functions
export {
  generateWebPortal,
  getPortalStatus,
  updatePortalPreferences,
  retryPortalGeneration,
  getUserPortalPreferences,
  listUserPortals,
  // One Click Portal Functions
  generateOneClickPortal,
  processPortalChat,
  initializePortalChatSession,
  getPortalAnalytics,
  updatePortalContent,
  validatePremiumPortalAccess
} from './functions/portal.functions';

// Social Media Integration Functions
export {
  generateSocialMediaIntegration,
  addSocialProfile,
  updateSocialProfile,
  removeSocialProfile,
  trackSocialClick,
  getSocialAnalytics,
  updateSocialDisplaySettings
} from './functions/social.functions';

// Testimonials Functions
export {
  generateTestimonialsCarousel,
  addTestimonial,
  updateTestimonial,
  removeTestimonial,
  updateCarouselLayout
} from './functions/testimonials.functions';

// Portal Chat Functions
export {
  portalChat,
  portalChatPublic,
  initPortalChat
} from './functions/portals/portalChat';

// QR Code Functions
export {
  generateQRCode,
  trackQRCodeScan,
  getQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRAnalytics,
  getQRTemplates
} from './functions/qr/enhancedQR';

// QR Code Enhancement Functions
export {
  enhanceQRCode,
  generateQRCodePreview,
  getEnhancedQRCodes,
  updateQRCodeStyling,
  generateBulkQRCodes,
  exportQRCodeData,
  getQRCodeInsights
} from './functions/qr/qrCodeEnhancement';