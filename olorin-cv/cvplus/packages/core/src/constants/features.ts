/**
 * Feature Constants
 * 
 * Constants for CV features and capabilities.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// FEATURE CATEGORIES
// ============================================================================

export const FEATURE_CATEGORIES = {
  BASIC: 'basic',
  ENHANCED: 'enhanced', 
  PREMIUM: 'premium',
  MULTIMEDIA: 'multimedia',
  INTERACTIVE: 'interactive'
} as const;

export type FeatureCategory = typeof FEATURE_CATEGORIES[keyof typeof FEATURE_CATEGORIES];

// ============================================================================
// CV FEATURES
// ============================================================================

export const CV_FEATURES = {
  // Basic Features (Free)
  CONTACT_INFO: 'contact-info',
  WORK_EXPERIENCE: 'work-experience',
  EDUCATION: 'education',
  SKILLS: 'skills',
  BASIC_FORMATTING: 'basic-formatting',
  
  // Enhanced Features 
  PROFILE_SUMMARY: 'profile-summary',
  ACHIEVEMENTS: 'achievements',
  CERTIFICATIONS: 'certifications', 
  PROJECTS: 'projects',
  LANGUAGES: 'languages',
  REFERENCES: 'references',
  CUSTOM_SECTIONS: 'custom-sections',
  
  // Premium Features
  VIDEO_INTRODUCTION: 'video-introduction',
  PORTFOLIO_GALLERY: 'portfolio-gallery',
  TESTIMONIALS: 'testimonials',
  QR_CODE: 'qr-code',
  SOCIAL_LINKS: 'social-links',
  ANALYTICS_TRACKING: 'analytics-tracking',
  INTERACTIVE_ELEMENTS: 'interactive-elements',
  
  // Multimedia Features
  PROFILE_PHOTO: 'profile-photo',
  AUDIO_INTRODUCTION: 'audio-introduction',
  PODCAST_GENERATION: 'podcast-generation',
  VIDEO_PORTFOLIO: 'video-portfolio',
  INFOGRAPHICS: 'infographics',
  
  // AI-Powered Features
  ATS_OPTIMIZATION: 'ats-optimization',
  KEYWORD_OPTIMIZATION: 'keyword-optimization',
  CONTENT_SUGGESTIONS: 'content-suggestions',
  SKILL_RECOMMENDATIONS: 'skill-recommendations',
  INDUSTRY_INSIGHTS: 'industry-insights'
} as const;

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

export const FEATURE_DEFINITIONS = {
  [CV_FEATURES.CONTACT_INFO]: {
    name: 'Contact Information',
    description: 'Essential contact details including email, phone, and location',
    category: FEATURE_CATEGORIES.BASIC,
    isPremium: false,
    dependencies: []
  },
  
  [CV_FEATURES.WORK_EXPERIENCE]: {
    name: 'Work Experience',
    description: 'Professional work history with roles and achievements',
    category: FEATURE_CATEGORIES.BASIC,
    isPremium: false,
    dependencies: []
  },
  
  [CV_FEATURES.EDUCATION]: {
    name: 'Education',
    description: 'Educational background and qualifications',
    category: FEATURE_CATEGORIES.BASIC,
    isPremium: false,
    dependencies: []
  },
  
  [CV_FEATURES.SKILLS]: {
    name: 'Skills',
    description: 'Technical and soft skills with proficiency levels',
    category: FEATURE_CATEGORIES.BASIC,
    isPremium: false,
    dependencies: []
  },
  
  [CV_FEATURES.PROFILE_SUMMARY]: {
    name: 'Profile Summary',
    description: 'Professional summary highlighting key qualifications',
    category: FEATURE_CATEGORIES.ENHANCED,
    isPremium: false,
    dependencies: []
  },
  
  [CV_FEATURES.VIDEO_INTRODUCTION]: {
    name: 'Video Introduction',
    description: 'AI-generated video introduction with professional avatar',
    category: FEATURE_CATEGORIES.PREMIUM,
    isPremium: true,
    dependencies: [CV_FEATURES.PROFILE_SUMMARY]
  },
  
  [CV_FEATURES.PORTFOLIO_GALLERY]: {
    name: 'Portfolio Gallery',
    description: 'Visual showcase of work samples and projects',
    category: FEATURE_CATEGORIES.PREMIUM,
    isPremium: true,
    dependencies: [CV_FEATURES.PROJECTS]
  },
  
  [CV_FEATURES.QR_CODE]: {
    name: 'QR Code',
    description: 'QR code linking to online CV version',
    category: FEATURE_CATEGORIES.PREMIUM,
    isPremium: true,
    dependencies: []
  },
  
  [CV_FEATURES.ANALYTICS_TRACKING]: {
    name: 'Analytics Tracking',
    description: 'Track CV views and engagement metrics',
    category: FEATURE_CATEGORIES.PREMIUM,
    isPremium: true,
    dependencies: []
  },
  
  [CV_FEATURES.ATS_OPTIMIZATION]: {
    name: 'ATS Optimization',
    description: 'AI-powered optimization for Applicant Tracking Systems',
    category: FEATURE_CATEGORIES.PREMIUM,
    isPremium: true,
    dependencies: []
  },
  
  [CV_FEATURES.PODCAST_GENERATION]: {
    name: 'Podcast Generation',
    description: 'AI-generated podcast discussing professional background',
    category: FEATURE_CATEGORIES.MULTIMEDIA,
    isPremium: true,
    dependencies: [CV_FEATURES.WORK_EXPERIENCE, CV_FEATURES.PROFILE_SUMMARY]
  }
} as const;

// ============================================================================
// FEATURE GROUPS
// ============================================================================

export const FEATURE_GROUPS = {
  ESSENTIALS: [
    CV_FEATURES.CONTACT_INFO,
    CV_FEATURES.WORK_EXPERIENCE,
    CV_FEATURES.EDUCATION,
    CV_FEATURES.SKILLS
  ],
  
  ENHANCED: [
    CV_FEATURES.PROFILE_SUMMARY,
    CV_FEATURES.ACHIEVEMENTS,
    CV_FEATURES.CERTIFICATIONS,
    CV_FEATURES.PROJECTS,
    CV_FEATURES.LANGUAGES
  ],
  
  MULTIMEDIA: [
    CV_FEATURES.PROFILE_PHOTO,
    CV_FEATURES.VIDEO_INTRODUCTION,
    CV_FEATURES.AUDIO_INTRODUCTION,
    CV_FEATURES.PORTFOLIO_GALLERY,
    CV_FEATURES.PODCAST_GENERATION
  ],
  
  INTERACTIVE: [
    CV_FEATURES.QR_CODE,
    CV_FEATURES.SOCIAL_LINKS,
    CV_FEATURES.ANALYTICS_TRACKING,
    CV_FEATURES.INTERACTIVE_ELEMENTS
  ],
  
  AI_POWERED: [
    CV_FEATURES.ATS_OPTIMIZATION,
    CV_FEATURES.KEYWORD_OPTIMIZATION,
    CV_FEATURES.CONTENT_SUGGESTIONS,
    CV_FEATURES.SKILL_RECOMMENDATIONS,
    CV_FEATURES.INDUSTRY_INSIGHTS
  ]
} as const;

// ============================================================================
// FEATURE LIMITS
// ============================================================================

export const FEATURE_LIMITS = {
  FREE_TIER: {
    templates: 3,
    features: FEATURE_GROUPS.ESSENTIALS.length,
    cvGenerations: 5,
    storage: 10 * 1024 * 1024 // 10MB
  },
  
  PREMIUM_TIER: {
    templates: -1, // Unlimited
    features: -1, // All features
    cvGenerations: -1, // Unlimited
    storage: 1024 * 1024 * 1024 // 1GB
  }
} as const;

// ============================================================================
// FEATURE AVAILABILITY
// ============================================================================

export const FEATURE_AVAILABILITY = {
  ALWAYS_AVAILABLE: [
    CV_FEATURES.CONTACT_INFO,
    CV_FEATURES.WORK_EXPERIENCE,
    CV_FEATURES.EDUCATION,
    CV_FEATURES.SKILLS
  ],
  
  PREMIUM_ONLY: [
    CV_FEATURES.VIDEO_INTRODUCTION,
    CV_FEATURES.PORTFOLIO_GALLERY,
    CV_FEATURES.ANALYTICS_TRACKING,
    CV_FEATURES.ATS_OPTIMIZATION,
    CV_FEATURES.PODCAST_GENERATION
  ],
  
  BETA_FEATURES: [
    CV_FEATURES.INTERACTIVE_ELEMENTS,
    CV_FEATURES.INDUSTRY_INSIGHTS
  ]
} as const;

// ============================================================================
// PROCESSING REQUIREMENTS
// ============================================================================

export const PROCESSING_REQUIREMENTS = {
  [CV_FEATURES.VIDEO_INTRODUCTION]: {
    estimatedTime: 120, // seconds
    resources: ['ai-video-service', 'storage'],
    dependencies: ['profile-photo', 'voice-synthesis']
  },
  
  [CV_FEATURES.PODCAST_GENERATION]: {
    estimatedTime: 90, // seconds
    resources: ['ai-audio-service', 'storage'],
    dependencies: ['text-to-speech']
  },
  
  [CV_FEATURES.ATS_OPTIMIZATION]: {
    estimatedTime: 30, // seconds
    resources: ['ai-analysis-service'],
    dependencies: ['keyword-extraction']
  },
  
  [CV_FEATURES.PORTFOLIO_GALLERY]: {
    estimatedTime: 15, // seconds
    resources: ['image-processing', 'storage'],
    dependencies: ['image-optimization']
  }
} as const;

// ============================================================================
// FEATURE SETTINGS
// ============================================================================

export const FEATURE_SETTINGS = {
  [CV_FEATURES.VIDEO_INTRODUCTION]: {
    duration: { min: 30, max: 120, default: 60 }, // seconds
    resolution: { options: ['720p', '1080p'], default: '1080p' },
    style: { options: ['professional', 'casual', 'creative'], default: 'professional' }
  },
  
  [CV_FEATURES.PORTFOLIO_GALLERY]: {
    maxItems: { free: 3, premium: 20 },
    imageSize: { max: 5 * 1024 * 1024 }, // 5MB
    formats: ['jpg', 'png', 'gif', 'webp']
  },
  
  [CV_FEATURES.QR_CODE]: {
    size: { options: ['small', 'medium', 'large'], default: 'medium' },
    color: { customizable: true, default: '#000000' },
    format: { options: ['png', 'svg'], default: 'png' }
  }
} as const;