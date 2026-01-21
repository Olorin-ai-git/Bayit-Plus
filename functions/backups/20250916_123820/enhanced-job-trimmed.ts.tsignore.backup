// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enhanced Job Models
 * Core enhanced job interface and related models for CV enhancement features.
 * @author Gil Klainert
 * @version 1.0.0
 */

import { Job } from './job';
import { UserRAGProfile } from './enhanced-rag';
import { FeatureInteraction } from '@cvplus/analytics';
import { ATSOptimizationResult } from './enhanced-ats';

/**
 * Enhanced Job interface with all new features
 */
export interface EnhancedJob extends Job {
  /** Industry information for ATS optimization */
  industry?: string;
  
  /** Enhancement features status and data */
  enhancedFeatures?: {
    [featureId: string]: {
      enabled: boolean;
      data?: any;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      error?: string;
      processedAt?: Date;
    };
  };
  
  /** Analytics data */
  analytics?: {
    qrCodeScans: number;
    profileViews: number;
    contactFormSubmissions: number;
    socialLinkClicks: Record<string, number>;
    chatSessions: number;
    chatMessages: number;
    lastViewedAt?: Date;
  };
  
  /** Media assets */
  mediaAssets?: {
    videoIntroUrl?: string;
    videoThumbnailUrl?: string;
    podcastUrl?: string;
    podcastTranscript?: string;
    portfolioImages?: PortfolioImage[];
  };
  
  /** Interactive data */
  interactiveData?: {
    availabilityCalendar?: CalendarSettings;
    testimonials?: Testimonial[];
    personalityProfile?: PersonalityProfile;
    skillsVisualization?: SkillsVisualization;
    certifications?: Certification[];
  };
  
  /** Privacy and sharing settings */
  privacySettings?: PrivacySettings;
  
  /** AI-generated content */
  aiGeneratedContent?: {
    personalityInsights?: string;
    careerGuidance?: string;
    improvementSuggestions?: string[];
    predictiveCareerPath?: string[];
    skillGapAnalysis?: string;
  };
  
  /** RAG system data for AI chat */
  ragProfile?: UserRAGProfile;
  
  /** ATS optimization data */
  atsOptimization?: ATSOptimizationResult;
  
  /** Feature interaction tracking */
  featureInteractions?: FeatureInteraction[];
}

export interface PortfolioImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  projectUrl?: string;
  uploadedAt: Date;
  order: number;
}

export interface CalendarSettings {
  enabled: boolean;
  provider: 'calendly' | 'google' | 'outlook';
  calendarUrl?: string;
  availableSlots?: string[];
  timeZone: string;
  meetingTypes: Array<{
    type: string;
    duration: number;
    description: string;
  }>;
}

export interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  content: string;
  rating?: number;
  imageUrl?: string;
  linkedinUrl?: string;
  isVerified: boolean;
  createdAt: Date;
  order: number;
}

export interface PersonalityProfile {
  workingStyle: string;
  strengths: string[];
  motivations: string[];
  communicationPreferences: string[];
  teamRole: string;
  leadershipStyle?: string;
  problemSolvingApproach: string;
  adaptability: string;
  stressManagement: string;
  careerAspirations: string[];
  values: string[];
}

export interface PrivacySettings {
  showContactInfo: boolean;
  showSocialLinks: boolean;
  allowCVDownload: boolean;
  showAnalytics: boolean;
  allowChatMessages: boolean;
  publicProfile: boolean;
  searchable: boolean;
  showPersonalityProfile: boolean;
  showTestimonials: boolean;
  showPortfolio: boolean;
  requireContactFormForCV: boolean;
}

export interface SkillsVisualization {
  categories: SkillCategory[];
  layout: 'radar' | 'bar' | 'bubble' | 'tree';
  colorScheme: string;
  animations: boolean;
}

export interface SkillCategory {
  name: string;
  skills: Array<{
    name: string;
    level: number;
    yearsOfExperience?: number;
    certified?: boolean;
  }>;
  color: string;
  icon?: string;
}

export interface LanguageSkill {
  language: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
  certified?: boolean;
  certificationName?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expirationDate?: Date;
  credentialId?: string;
  verificationUrl?: string;
  badgeUrl?: string;
  isVerified: boolean;
  category: string;
}