// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enhanced Job Core Types
 * 
 * Core enhanced job interface for CV enhancement features.
 * Separated from other modules to maintain clear boundaries and <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { Job } from './job';

/**
 * Enhanced Job interface with all new features
 * Main interface that extends the base Job with enhancement capabilities
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
  
  /** Analytics data tracking */
  analytics?: {
    qrCodeScans: number;
    profileViews: number;
    contactFormSubmissions: number;
    socialLinkClicks: Record<string, number>;
    chatSessions: number;
    chatMessages: number;
    lastViewedAt?: Date;
  };
  
  /** Media assets generated for this CV */
  mediaAssets?: {
    videoIntroUrl?: string;
    videoThumbnailUrl?: string;
    podcastUrl?: string;
    podcastTranscript?: string;
    portfolioImages?: Array<{
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
    }>;
  };
  
  /** Interactive features data */
  interactiveData?: {
    availabilityCalendar?: any; // Will reference CalendarSettings from another module
    testimonials?: any[]; // Will reference Testimonial[] from another module
    personalityProfile?: any; // Will reference PersonalityProfile from another module
    skillsVisualization?: any; // Will reference SkillsVisualization from another module
    certifications?: any[]; // Will reference Certification[] from another module
  };
  
  /** Privacy and sharing settings */
  privacySettings?: {
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
  };
  
  /** AI-generated content and insights */
  aiGeneratedContent?: {
    personalityInsights?: string;
    careerGuidance?: string;
    improvementSuggestions?: string[];
    predictiveCareerPath?: string[];
    skillGapAnalysis?: string;
  };
  
  /** RAG system data for AI chat functionality */
  ragProfile?: any; // Will reference UserRAGProfile from enhanced-rag module
  
  /** RAG chat data and settings */
  ragChat?: {
    enabled: boolean;
    config?: any;
    sessionHistory?: any[];
    lastInteraction?: Date;
    vectorNamespace?: string;
    settings?: {
      maxTokens?: number;
      temperature?: number;
      responseFormat?: 'concise' | 'detailed' | 'conversational';
      language?: string;
      enablePersonalization?: boolean;
    };
  };
  
  /** ATS optimization data and results */
  atsOptimization?: any; // Will reference ATSOptimizationResult from enhanced-ats module
  
  /** Feature interaction tracking for analytics */
  featureInteractions?: Array<{
    featureId: string;
    userId: string;
    jobId: string;
    interactionType: 'view' | 'click' | 'download' | 'share' | 'contact';
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}