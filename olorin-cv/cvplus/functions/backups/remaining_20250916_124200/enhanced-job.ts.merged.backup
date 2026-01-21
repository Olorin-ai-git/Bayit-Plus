// @ts-ignore - Export conflicts/**
 * Enhanced Job Models - Main Interface
 * 
 * Core enhanced job interface and related models for CV enhancement features.
 * Properly modularized to maintain <200 line compliance through separation of concerns.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Import and re-export core enhanced job interface
export type { EnhancedJob } from './enhanced-job-core';

// Import and re-export media-related types
export type {
  PortfolioImage,
  CalendarSettings,
  Testimonial,
  PersonalityProfile
} from './enhanced-media';

// Import and re-export skills and certification types
export type {
  SkillsVisualization,
  SkillCategory,
  LanguageSkill,
  Certification
} from './enhanced-skills';

// Privacy settings type (kept here as it's small and job-specific)
export interface PrivacySettings {
  /** Show contact information publicly */
  showContactInfo: boolean;
  
  /** Show social media links */
  showSocialLinks: boolean;
  
  /** Allow CV download by visitors */
  allowCVDownload: boolean;
  
  /** Show analytics data to profile visitors */
  showAnalytics: boolean;
  
  /** Allow visitors to send chat messages */
  allowChatMessages: boolean;
  
  /** Make profile publicly accessible */
  publicProfile: boolean;
  
  /** Allow profile to be found in search engines */
  searchable: boolean;
  
  /** Display personality profile section */
  showPersonalityProfile: boolean;
  
  /** Display testimonials section */
  showTestimonials: boolean;
  
  /** Display portfolio section */
  showPortfolio: boolean;
  
  /** Privacy level enabled */
  enabled?: boolean;
  
  /** Masking rules for sensitive information */
  maskingRules?: {
    maskEmail?: boolean;
    maskPhone?: boolean;
    maskAddress?: boolean;
  };
  
  /** Whether to show public email */
  publicEmail?: boolean;
  
  /** Whether to show public phone */
  publicPhone?: boolean;
  
  /** Require contact form submission before allowing CV download */
  requireContactFormForCV: boolean;
}

// All enhanced job model interfaces are now properly modularized
// This provides a clean main interface while maintaining type safety
// and clear separation of concerns across logical boundaries