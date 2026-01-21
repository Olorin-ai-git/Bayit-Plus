export * from './profile.constants';

// SEO Constants  
export * from './seo.constants';

// Analytics Constants
export * from './analytics.constants';

// Networking Constants
export const NETWORKING_CONSTANTS = {
  // Connection Limits
  MAX_CONNECTIONS: 5000,
  MAX_PENDING_REQUESTS: 100,
  MAX_SENT_REQUESTS_PER_DAY: 20,
  CONNECTION_REQUEST_EXPIRY_DAYS: 30,

  // Message Limits
  MAX_MESSAGES_PER_DAY: 50,
  MAX_MESSAGES_PER_CONVERSATION: 1000,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_SUBJECT_LENGTH: 200,
  MESSAGE_RETENTION_DAYS: 365,

  // Endorsement Limits
  MAX_ENDORSEMENTS_PER_SKILL: 99,
  MAX_SKILLS_FOR_ENDORSEMENT: 50,
  ENDORSEMENT_WEIGHT_MULTIPLIERS: {
    COLLEAGUE: 1.0,
    MANAGER: 1.5,
    CLIENT: 1.2,
    EMPLOYEE: 0.8,
    OTHER: 0.5
  },

  // Recommendation Limits
  MAX_RECOMMENDATIONS_DISPLAY: 10,
  MAX_RECOMMENDATION_LENGTH: 2000,
  RECOMMENDATION_APPROVAL_TIMEOUT_DAYS: 14,

  // Networking Features
  FEATURES: {
    DIRECT_CONNECTIONS: 'direct_connections',
    MESSAGING: 'messaging',
    ENDORSEMENTS: 'endorsements', 
    RECOMMENDATIONS: 'recommendations',
    AUTO_ACCEPTANCE: 'auto_acceptance',
    SMART_SUGGESTIONS: 'smart_suggestions'
  },

  // Connection Types
  CONNECTION_TYPES: {
    PROFESSIONAL: 'professional',
    PERSONAL: 'personal', 
    BUSINESS: 'business',
    ACADEMIC: 'academic',
    INDUSTRY: 'industry'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    CONNECTION_REQUEST: 'connection_request',
    CONNECTION_ACCEPTED: 'connection_accepted',
    MESSAGE_RECEIVED: 'message_received',
    ENDORSEMENT_RECEIVED: 'endorsement_received',
    RECOMMENDATION_RECEIVED: 'recommendation_received',
    PROFILE_VIEWED: 'profile_viewed'
  }
} as const;

// Social Media Constants
export const SOCIAL_CONSTANTS = {
  // Platform Integration
  PLATFORMS: {
    LINKEDIN: 'linkedin',
    TWITTER: 'twitter',
    FACEBOOK: 'facebook', 
    INSTAGRAM: 'instagram',
    GITHUB: 'github',
    YOUTUBE: 'youtube',
    BEHANCE: 'behance',
    DRIBBBLE: 'dribbble'
  },

  // Sharing Options
  SHARE_TYPES: {
    PROFILE: 'profile',
    PORTFOLIO_ITEM: 'portfolio_item',
    ACHIEVEMENT: 'achievement',
    TESTIMONIAL: 'testimonial',
    CUSTOM: 'custom'
  },

  // Content Types
  CONTENT_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    LINK: 'link',
    ARTICLE: 'article'
  },

  // Optimal Content Lengths
  CONTENT_LIMITS: {
    TWITTER: {
      TEXT: 280,
      IMAGE_COUNT: 4,
      VIDEO_DURATION: 140 // seconds
    },
    LINKEDIN: {
      TEXT: 3000,
      ARTICLE: 125000,
      IMAGE_COUNT: 20
    },
    FACEBOOK: {
      TEXT: 63206,
      IMAGE_COUNT: 10,
      VIDEO_DURATION: 7200 // seconds
    },
    INSTAGRAM: {
      TEXT: 2200,
      IMAGE_COUNT: 10,
      VIDEO_DURATION: 3600,
      STORY_DURATION: 15
    }
  }
} as const;

// Template Constants
export const TEMPLATE_CONSTANTS = {
  // Available Templates
  TEMPLATES: {
    PROFESSIONAL: {
      id: 'professional',
      name: 'Professional',
      description: 'Clean and professional layout for corporate profiles',
      category: 'business',
      features: ['header', 'about', 'experience', 'education', 'skills', 'contact']
    },
    CREATIVE: {
      id: 'creative',
      name: 'Creative',
      description: 'Vibrant and artistic layout for creative professionals',
      category: 'design',
      features: ['header', 'portfolio', 'about', 'experience', 'skills', 'testimonials']
    },
    TECH: {
      id: 'tech',
      name: 'Tech Professional',
      description: 'Modern layout optimized for technology professionals',
      category: 'technology',
      features: ['header', 'about', 'projects', 'skills', 'experience', 'education']
    },
    EXECUTIVE: {
      id: 'executive',
      name: 'Executive',
      description: 'Sophisticated layout for senior executives',
      category: 'leadership',
      features: ['header', 'about', 'leadership', 'achievements', 'board-positions']
    }
  },

  // Template Categories
  CATEGORIES: {
    BUSINESS: 'business',
    DESIGN: 'design', 
    TECHNOLOGY: 'technology',
    HEALTHCARE: 'healthcare',
    EDUCATION: 'education',
    CONSULTING: 'consulting',
    LEADERSHIP: 'leadership'
  },

  // Section Types
  SECTION_TYPES: {
    HEADER: 'header',
    ABOUT: 'about',
    EXPERIENCE: 'experience',
    EDUCATION: 'education',
    SKILLS: 'skills',
    PORTFOLIO: 'portfolio',
    CERTIFICATIONS: 'certifications',
    TESTIMONIALS: 'testimonials',
    CONTACT: 'contact',
    CUSTOM: 'custom'
  }
} as const;

// Export Configuration
export const EXPORT_CONSTANTS = {
  // Export Formats
  FORMATS: {
    PDF: 'pdf',
    JSON: 'json',
    HTML: 'html',
    VCARD: 'vcard'
  },

  // PDF Configuration
  PDF: {
    PAGE_SIZE: 'A4',
    ORIENTATION: 'portrait',
    MARGIN: 20,
    DPI: 300,
    QUALITY: 0.9,
    MAX_SIZE_MB: 10
  },

  // QR Code Configuration  
  QR_CODE: {
    SIZE: 256,
    MARGIN: 4,
    ERROR_CORRECTION: 'M',
    FORMAT: 'PNG',
    COLOR_DARK: '#000000',
    COLOR_LIGHT: '#FFFFFF'
  }
} as const;

// API Constants
export const API_CONSTANTS = {
  // Rate Limiting
  RATE_LIMITS: {
    PUBLIC_PROFILES: 100, // requests per minute
    ANALYTICS: 50,
    SEO_TOOLS: 25,
    NETWORKING: 75,
    EXPORTS: 10
  },

  // Response Codes
  RESPONSE_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // API Versions
  VERSIONS: {
    V1: 'v1',
    V2: 'v2',
    CURRENT: 'v2'
  }
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  // Public Profiles Features
  CUSTOM_DOMAINS: 'custom_domains',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  SOCIAL_INTEGRATION: 'social_integration',
  NETWORKING_FEATURES: 'networking_features',
  AI_OPTIMIZATION: 'ai_optimization',
  MULTI_LANGUAGE: 'multi_language',
  DARK_MODE: 'dark_mode',
  MOBILE_APP: 'mobile_app',

  // Premium Features
  PREMIUM_TEMPLATES: 'premium_templates',
  ADVANCED_SEO: 'advanced_seo',
  PRIORITY_SUPPORT: 'priority_support',
  WHITE_LABEL: 'white_label',
  API_ACCESS: 'api_access',
  BULK_OPERATIONS: 'bulk_operations'
} as const;

export type NetworkingFeature = typeof NETWORKING_CONSTANTS.FEATURES[keyof typeof NETWORKING_CONSTANTS.FEATURES];
export type SocialPlatform = typeof SOCIAL_CONSTANTS.PLATFORMS[keyof typeof SOCIAL_CONSTANTS.PLATFORMS];
export type TemplateCategory = typeof TEMPLATE_CONSTANTS.CATEGORIES[keyof typeof TEMPLATE_CONSTANTS.CATEGORIES];
export type ExportFormat = typeof EXPORT_CONSTANTS.FORMATS[keyof typeof EXPORT_CONSTANTS.FORMATS];
export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];