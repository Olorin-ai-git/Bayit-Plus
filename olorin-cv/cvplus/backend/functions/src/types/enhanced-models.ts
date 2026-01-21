/**
 * Enhanced data models for CV enhancement features
 */

import { Job, ParsedCV } from './job';

/**
 * Enhanced Job interface with all new features
 */
export interface EnhancedJob extends Job {
  // Enhancement features status and data
  enhancedFeatures?: {
    [featureId: string]: {
      enabled: boolean;
      data?: any;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      error?: string;
      processedAt?: Date;
    };
  };
  
  // Analytics data
  analytics?: {
    qrCodeScans: number;
    profileViews: number;
    contactFormSubmissions: number;
    socialLinkClicks: Record<string, number>;
    chatSessions: number;
    chatMessages: number;
    lastViewedAt?: Date;
  };
  
  // Media assets
  mediaAssets?: {
    videoIntroUrl?: string;
    videoThumbnailUrl?: string;
    podcastUrl?: string;
    podcastTranscript?: string;
    portfolioImages?: PortfolioImage[];
  };
  
  // Interactive data
  interactiveData?: {
    availabilityCalendar?: CalendarSettings;
    testimonials?: Testimonial[];
    personalityInsights?: PersonalityProfile;
    contactFormEnabled: boolean;
    contactEmail?: string; // Where to forward contact form submissions
  };
  
  // Public profile settings
  publicProfile?: {
    isPublic: boolean;
    slug: string; // Custom URL slug
    privacyMode: boolean;
    allowedFeatures: string[]; // Which features to show publicly
    customBranding?: {
      primaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
    };
  };
  
  // RAG Chat settings
  ragChat?: {
    enabled: boolean;
    vectorNamespace?: string;
    lastIndexed?: Date;
    settings: {
      temperature: number;
      maxTokens: number;
      systemPrompt?: string;
      allowedTopics: string[];
      language: string;
    };
  };
}

/**
 * Personality profile from AI analysis
 */
export interface PersonalityProfile {
  traits: {
    leadership: number;
    communication: number;
    innovation: number;
    teamwork: number;
    problemSolving: number;
    attention_to_detail: number;
    adaptability: number;
    strategic_thinking: number;
  };
  workStyle: string[];
  teamCompatibility: string;
  leadershipPotential: number;
  cultureFit: {
    startup: number;
    corporate: number;
    remote: number;
    hybrid: number;
  };
  summary: string;
  generatedAt: Date;
}

/**
 * Testimonial/Recommendation
 */
export interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  relationship: string; // e.g., "Direct Manager", "Colleague", "Client"
  content: string;
  imageUrl?: string;
  linkedinUrl?: string;
  verified: boolean;
  date: Date;
}

/**
 * Portfolio image/project
 */
export interface PortfolioImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  projectUrl?: string;
  technologies: string[];
  category: string;
  order: number;
}

/**
 * Calendar availability settings
 */
export interface CalendarSettings {
  calendarId?: string; // Google Calendar ID
  provider: 'google' | 'calendly' | 'custom';
  calendlyUrl?: string;
  timezone: string;
  workingHours: {
    [day: string]: { start: string; end: string; available: boolean };
  };
  bufferTime: number; // Minutes between meetings
  slotDuration: number; // Default meeting duration
}

/**
 * Public CV Profile
 */
export interface PublicCVProfile {
  jobId: string;
  userId: string;
  slug: string;
  publicData: any; // PII-masked CV data
  settings: {
    showContactForm: boolean;
    showCalendar: boolean;
    showChat: boolean;
    customBranding: boolean;
    analytics: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // Optional expiration
}

/**
 * Feature analytics tracking
 */
export interface FeatureAnalytics {
  jobId: string;
  featureId: string;
  userId?: string; // Visitor ID if available
  interactions: FeatureInteraction[];
  aggregates: {
    totalInteractions: number;
    uniqueUsers: number;
    averageEngagementTime: number;
    lastInteraction: Date;
  };
}

export interface FeatureInteraction {
  type: string; // 'view', 'click', 'submit', etc.
  timestamp: Date;
  duration?: number; // For time-based interactions
  metadata?: Record<string, any>;
  userAgent?: string;
  ipHash?: string; // Hashed IP for privacy
}

/**
 * RAG Chat Models
 */
export interface UserRAGProfile {
  userId: string;
  jobId: string;
  vectorNamespace: string;
  embeddingModel: 'openai' | 'cohere' | 'sentence-transformers';
  chunks: CVChunk[];
  lastIndexed: Date;
  chatSessions: string[];
  settings: {
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
    allowedTopics: string[];
    personality?: 'professional' | 'friendly' | 'concise' | 'detailed';
  };
  statistics: {
    totalQueries: number;
    averageResponseTime: number;
    satisfactionScore?: number;
  };
}

export interface CVChunk {
  id: string;
  content: string;
  metadata: {
    section: 'personal' | 'experience' | 'education' | 'skills' | 'achievements' | 'projects' | 'publications' | 'interests';
    subsection?: string;
    dateRange?: { start: Date; end: Date };
    technologies?: string[];
    companies?: string[];
    importance: number; // 1-10 scale
    keywords: string[];
  };
  embedding?: number[];
  tokens?: number;
}

export interface ChatSession {
  sessionId: string;
  userId?: string; // CV owner
  visitorId?: string; // Anonymous visitor ID
  jobId: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
  metadata: {
    source?: 'public' | 'private' | 'shared';
    referrer?: string;
    userAgent?: string;
    language?: string;
  };
  satisfaction?: {
    rating?: number;
    feedback?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    retrievedChunks?: string[]; // IDs of chunks used
    confidence?: number;
  };
}

/**
 * ATS Optimization Results
 */
export interface ATSOptimizationResult {
  score: number; // 0-100
  passes: boolean;
  issues: ATSIssue[];
  suggestions: ATSSuggestion[];
  optimizedContent?: Partial<ParsedCV>;
  keywords: {
    found: string[];
    missing: string[];
    recommended: string[];
  };
}

export interface ATSIssue {
  type: 'format' | 'content' | 'keyword' | 'structure';
  severity: 'error' | 'warning' | 'info';
  message: string;
  section?: string;
  fix?: string;
}

export interface ATSSuggestion {
  section: string;
  original: string;
  suggested: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Privacy Mode Settings
 */
export interface PrivacySettings {
  enabled: boolean;
  level: 'basic' | 'moderate' | 'strict';
  maskingRules: {
    name: boolean;
    email: boolean;
    phone: boolean;
    address: boolean;
    companies: boolean;
    dates: boolean;
    customRules?: Array<{
      pattern: string;
      replacement: string;
    }>;
  };
  publicEmail?: string; // Forwarding email for public version
  publicPhone?: string; // Public contact number
}

/**
 * Skills visualization data
 */
export interface SkillsVisualization {
  technical: SkillCategory[];
  soft: SkillCategory[];
  languages: LanguageSkill[];
  certifications: Certification[];
}

export interface SkillCategory {
  name: string;
  skills: Array<{
    name: string;
    level: number; // 1-10
    yearsOfExperience?: number;
    lastUsed?: Date;
    endorsed?: boolean;
  }>;
}

export interface LanguageSkill {
  language: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'conversational' | 'basic';
  certifications?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: Date;
  expiryDate?: Date;
  credentialId?: string;
  verificationUrl?: string;
  badge?: string; // Badge image URL
}

/**
 * Contact form submission
 */
export interface ContactFormSubmission {
  id: string;
  jobId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  company?: string;
  message: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed';
  metadata: {
    ipHash?: string;
    userAgent?: string;
    source?: string;
  };
}

/**
 * QR Code tracking
 */
export interface QRCodeScan {
  jobId: string;
  scanId: string;
  timestamp: Date;
  location?: {
    country?: string;
    city?: string;
  };
  device?: {
    type?: 'mobile' | 'tablet' | 'desktop';
    os?: string;
  };
  referrer?: string;
}