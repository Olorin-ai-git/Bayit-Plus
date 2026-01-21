/**
 * Enhanced data models for CV enhancement features
  */

import { Job } from './job';
import type { ParsedCV } from './job';
export type { ParsedCV } from './job';

/**
 * Enhanced Job interface with all new features
  */
export interface EnhancedJob extends Job {
  // Industry information for ATS optimization
  industry?: string;
  
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
      personality?: 'professional' | 'friendly' | 'concise' | 'detailed';
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
  parsedCV: ParsedCV; // PII-masked CV data
  features: any; // Enhanced features
  template: string;
  isPublic: boolean;
  allowContactForm: boolean;
  showAnalytics?: boolean;
  qrCodeUrl: string;
  publicUrl: string;
  createdAt: Date | any; // Can be FieldValue
  updatedAt: Date | any; // Can be FieldValue
  expiresAt?: Date; // Optional expiration
  analytics: {
    views: number;
    qrScans: number;
    contactSubmissions: number;
    lastViewedAt: Date | null;
  };
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
 * Advanced Multi-Factor ATS Scoring System - Phase 1
  */
export interface AdvancedATSScore {
  overall: number; // 0-100 overall score
  confidence: number; // 0-1 confidence level
  breakdown: {
    parsing: number;        // How well ATS can read the CV (40% weight)
    keywords: number;       // Keyword match percentage (25% weight)
    formatting: number;     // ATS-friendly formatting (20% weight)
    content: number;        // Content quality and structure (10% weight)
    specificity: number;    // Job-specific optimization (5% weight)
  };
  atsSystemScores: {
    workday: number;
    greenhouse: number;
    lever: number;
    bamboohr: number;
    taleo: number;
    generic: number;
  };
  recommendations: PrioritizedRecommendation[];
  competitorBenchmark: CompetitorAnalysis;
  // System-specific scoring details
  systemSpecificScores?: Array<{
    systemName: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }>;
}

export interface PrioritizedRecommendation {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest priority
  category: 'parsing' | 'keywords' | 'formatting' | 'content' | 'specificity' | 'structure' | 'ats-compatibility' | 'competitive';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedScoreImprovement: number; // Points improvement expected
  actionRequired: 'add' | 'modify' | 'remove' | 'restructure';
  section: string;
  currentContent?: string;
  suggestedContent?: string;
  keywords?: string[];
  atsSystemsAffected: string[]; // Which ATS systems this affects
  // Additional properties used in services
  implementation?: string;
  issue?: string;
  expectedImpact?: number; // Used by RecommendationService
}

export interface CompetitorAnalysis {
  benchmarkScore: number;
  industryAverage: number;
  topPercentile: number;
  averageScore?: number; // Used by some services for calculations
  industryBenchmark?: any; // Used by CompetitorAnalysisService
  keyDifferentiators?: string[]; // Used by CompetitorAnalysisService  
  improvementRecommendations?: string[]; // Used by RecommendationService
  marketWeaknesses?: string[]; // Used by CompetitorAnalysisService
  competitiveAdvantages?: string[]; // Used by CompetitorAnalysisService
  positioningInsights?: string[]; // Used by CompetitorAnalysisService
  gapAnalysis: {
    missingKeywords: string[];
    weakAreas: string[];
    strengthAreas: string[];
  };
}

export interface SemanticKeywordAnalysis {
  primaryKeywords: KeywordMatch[];
  semanticMatches: KeywordMatch[];
  contextualRelevance: number; // 0-1 score
  densityOptimization: {
    current: number;
    recommended: number;
    sections: { [section: string]: number };
  };
  synonymMapping: { [original: string]: string[] };
  industrySpecificTerms: string[];
  semanticVariations?: string[]; // Used by KeywordAnalysisService
  // Additional properties for ATS optimization
  matchedKeywords?: KeywordMatch[];
  missingKeywords?: string[];
  recommendations?: string[];
  keywordDensity?: number; // Used by some services
  optimalDensity?: number; // Used by some services
}

export interface KeywordMatch {
  keyword: string;
  variations: string[];
  frequency: number;
  context: string[];
  relevanceScore: number; // 0-1
  atsImportance: number; // 0-1
  competitorUsage: number; // 0-1
}

export interface ATSSystemSimulation {
  system: 'workday' | 'greenhouse' | 'lever' | 'bamboohr' | 'taleo' | 'generic';
  systemName?: string; // Alternative name property used by some services
  parsingAccuracy: number; // 0-1
  keywordMatching: number; // 0-1
  formatCompatibility: number; // 0-1
  overallScore: number; // 0-100
  specificIssues: string[];
  optimizationTips: string[];
  compatibilityScore?: number; // Used by some services as alias for overallScore
}

/**
 * Enhanced ATS Optimization Results (Backward Compatible)
  */
export interface ATSOptimizationResult {
  score: number; // 0-100 (maps to AdvancedATSScore.overall)
  overall: number; // Alias for score
  overallScore?: number; // Additional alias for compatibility
  confidence?: number; // New field, optional for backward compatibility
  passes: boolean;
  issues: ATSIssue[];
  suggestions: ATSSuggestion[];
  recommendations: string[]; // List of recommendation strings
  optimizedContent?: Partial<ParsedCV>;
  breakdown?: {
    parsing: number;
    keywords: number;
    formatting: number;
    content: number;
    specificity: number;
  }; // Score breakdown by category
  keywords: {
    found: string[];
    missing: string[];
    recommended: string[];
    density?: number; // Keyword density score
    suggestions?: string[]; // Used by ContentOptimizationService
  };
  // New advanced fields (optional for backward compatibility)
  advancedScore?: AdvancedATSScore;
  semanticAnalysis?: SemanticKeywordAnalysis;
  systemSimulations?: ATSSystemSimulation[];
  competitorBenchmark?: CompetitorAnalysis; // Used by ATSOptimizationOrchestrator
  processingMetadata?: any; // Used by ContentOptimizationService
  verificationResults?: any; // Used by ATSOptimizationOrchestrator
};

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