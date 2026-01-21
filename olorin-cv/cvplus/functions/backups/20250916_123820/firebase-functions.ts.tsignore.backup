// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Firebase Cloud Functions for Public Profiles
 * 
 * This file provides Firebase Cloud Function wrappers for public profile functionality.
 * These functions can be imported and used in the main Firebase Functions deployment.
 */

// Export function implementations that can be wrapped with onCall in the main functions directory
export * from './functions/profile.functions';
export * from './functions/portal.functions';
export * from './functions/social.functions';
export * from './functions/testimonials.functions';

// Re-export types for use in main functions
export type {
  CreatePublicProfileRequest,
  GetPublicProfileRequest,
  UpdateProfileSettingsRequest,
  SubmitContactFormRequest,
  TrackQRScanRequest
} from './functions/profile.functions';

export type {
  GenerateWebPortalRequest,
  PortalStatusRequest,
  UpdatePortalPreferencesRequest
} from './functions/portal.functions';

export type {
  GenerateSocialMediaIntegrationRequest,
  SocialProfileRequest,
  TrackSocialClickRequest,
  GetSocialAnalyticsRequest,
  UpdateSocialDisplaySettingsRequest
} from './functions/social.functions';

export type {
  GenerateTestimonialsCarouselRequest,
  TestimonialRequest,
  UpdateTestimonialRequest,
  RemoveTestimonialRequest,
  UpdateCarouselLayoutRequest
} from './functions/testimonials.functions';