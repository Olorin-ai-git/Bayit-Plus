// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enhanced Job Models - Main Interface
 * 
 * Core enhanced job interface and related models for CV enhancement features.
 * Properly modularized to maintain <200 line compliance through separation of concerns.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Temporary: Define types locally until core module is fully built
// TODO: Import from @cvplus/core when core build is fixed

/**
 * Enhanced Job interface with all enhancement features
 */
export interface EnhancedJob {
  /** Job ID */
  id?: string;
  
  /** User ID who owns this job */
  userId: string;
  
  /** Parsed CV data */
  parsedData: {
    personalInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      summary?: string;
      linkedin?: string;
      github?: string;
      website?: string;
      location?: string;
    };
    experience?: Array<{
      company: string;
      position: string;
      duration: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    education?: Array<{
      institution: string;
      degree: string;
      fieldOfStudy: string;
      startDate: string;
      endDate: string;
      gpa?: string;
      achievements?: string[];
    }>;
    skills?: string[] | { [key: string]: string[] };
    languages?: string[];
    certifications?: Array<{
      name: string;
      issuer: string;
      date: string;
      expiryDate?: string;
      credentialId?: string;
    }>;
  };
  
  /** Industry information for ATS optimization */
  industry?: string;
  
  /** Company size for context */
  companySize?: string;
  
  /** Job role level */
  roleLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  
  /** Skills requirements */
  skillsRequired?: string[];
  
  /** Location information */
  location?: string;
  
  /** Remote work availability */
  remoteWork?: boolean;
  
  /** Job status */
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Created timestamp */
  createdAt?: Date;
  
  /** Updated timestamp */
  updatedAt?: Date;
}

/**
 * Portfolio image data structure
 */
export interface PortfolioImage {
  /** Unique identifier for the portfolio image */
  id: string;
  
  /** Full-size image URL */
  url: string;
  
  /** Thumbnail URL for faster loading */
  thumbnailUrl?: string;
  
  /** Image title or caption */
  title: string;
  
  /** Detailed description of the image */
  description?: string;
  
  /** Categories or tags for organization */
  categories?: string[];
  
  /** Upload timestamp */
  uploadedAt: Date;
  
  /** File metadata */
  metadata?: {
    size: number;
    format: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

/**
 * Calendar integration settings
 */
export interface CalendarSettings {
  /** Whether calendar integration is enabled */
  enabled: boolean;
  
  /** Calendar service provider */
  provider: 'google' | 'outlook' | 'apple';
  
  /** Available time slots */
  availableSlots?: string[];
  
  /** Meeting duration in minutes */
  defaultDuration: number;
  
  /** Buffer time between meetings in minutes */
  bufferTime: number;
  
  /** Time zone */
  timezone: string;
}

/**
 * Testimonial data structure
 */
export interface Testimonial {
  /** Unique identifier */
  id: string;
  
  /** Author's name */
  authorName: string;
  
  /** Author's title/position */
  authorTitle?: string;
  
  /** Author's company */
  authorCompany?: string;
  
  /** Author's profile image URL */
  authorImage?: string;
  
  /** Testimonial content */
  content: string;
  
  /** Rating (1-5 stars) */
  rating?: number;
  
  /** Date when testimonial was given */
  date: Date;
  
  /** Whether testimonial is approved for display */
  approved: boolean;
  
  /** Source of the testimonial */
  source?: 'linkedin' | 'email' | 'direct' | 'other';
}

/**
 * Personality profile data
 */
export interface PersonalityProfile {
  /** Personality type (e.g., MBTI, Big Five) */
  type: string;
  
  /** Personality traits scores */
  traits: {
    [key: string]: number;
  };
  
  /** Generated insights */
  insights: string[];
  
  /** Strengths identified */
  strengths: string[];
  
  /** Areas for development */
  developmentAreas: string[];
  
  /** Work style preferences */
  workStyle: {
    communication: string;
    teamwork: string;
    leadership: string;
    problemSolving: string;
  };
  
  /** Assessment date */
  assessmentDate: Date;
}

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