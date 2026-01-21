// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Role Profile System Type Definitions
 * 
 * Comprehensive type definitions for the CVPlus role profile system
 * Supports role detection, CV enhancement, and personalized transformations
 */

export interface RoleProfile {
  id: string;
  name: string;
  category: RoleCategory;
  description: string;
  keywords: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: ExperienceLevel;
  industryFocus: string[];
  
  // Profile matching criteria
  matchingCriteria: {
    titleKeywords: string[];
    skillKeywords: string[];
    industryKeywords: string[];
    experienceKeywords: string[];
    educationKeywords?: string[];
  };
  
  // CV Enhancement templates
  enhancementTemplates: {
    professionalSummary: string;
    skillsStructure: SkillsStructureTemplate;
    experienceEnhancements: ExperienceEnhancementTemplate[];
    achievementTemplates: string[];
    keywordOptimization: string[];
  };
  
  // Role-specific validation rules
  validationRules: {
    requiredSections: CVSection[];
    optionalSections: CVSection[];
    minExperienceYears?: number;
    criticalSkills: string[];
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: string;
  isActive: boolean;
}

export interface RoleMatchResult {
  roleId: string;
  roleName: string;
  confidence: number;
  matchingFactors: MatchingFactor[];
  enhancementPotential: number;
  recommendations: RoleBasedRecommendation[];
  scoringReasoning: string;
  fitAnalysis: {
    strengths: string[];
    gaps: string[];
    overallAssessment: string;
  };
}

export interface MatchingFactor {
  type: 'title' | 'skills' | 'experience' | 'industry' | 'education';
  matchedKeywords: string[];
  weight: number;
  score: number;
  details?: string;
  reasoning: MatchingReasoning;
}

export interface MatchingReasoning {
  contributionExplanation: string;
  keywordMatches: KeywordMatch[];
  strengthAssessment: 'excellent' | 'good' | 'moderate' | 'weak';
  improvementSuggestions: string[];
  confidenceFactors: string[];
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'abbreviation';
  relevance: number;
  context?: string;
}

export interface RoleBasedRecommendation {
  id: string;
  type: 'content' | 'structure' | 'keyword' | 'section';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  template: string;
  targetSection: CVSection;
  expectedImpact: number;
}

export interface SkillsStructureTemplate {
  categories: {
    name: string;
    skills: string[];
    priority: number;
  }[];
  displayFormat: 'categorized' | 'flat' | 'hybrid';
  maxSkillsPerCategory: number;
}

export interface ExperienceEnhancementTemplate {
  roleLevel: 'junior' | 'mid' | 'senior' | 'executive';
  bulletPointTemplate: string;
  achievementTemplate: string;
  quantificationGuide: string;
  actionVerbs: string[];
}

export interface RoleDetectionConfig {
  confidenceThreshold: number;
  maxResults: number;
  minResults: number; // Guarantee minimum results
  enableMultiRoleDetection: boolean;
  enableDynamicThreshold: boolean; // Auto-adjust threshold for multiple results
  weightingFactors: {
    title: number;
    skills: number;
    experience: number;
    industry: number;
    education: number;
  };
  dynamicThresholdConfig: {
    initialThreshold: number;
    minimumThreshold: number;
    decrementStep: number;
    maxIterations: number;
  };
}

export interface RoleProfileAnalysis {
  primaryRole: RoleMatchResult;
  alternativeRoles: RoleMatchResult[];
  overallConfidence: number;
  enhancementSuggestions: {
    immediate: RoleBasedRecommendation[];
    strategic: RoleBasedRecommendation[];
  };
  gapAnalysis: {
    missingSkills: string[];
    weakAreas: string[];
    strengthAreas: string[];
  };
  scoringBreakdown: ScoringBreakdown;
  detectionMetadata: DetectionMetadata;
}

export interface ScoringBreakdown {
  totalRolesAnalyzed: number;
  adjustedThreshold: number;
  originalThreshold: number;
  averageConfidence: number;
  topFactors: Array<{
    factor: string;
    contribution: number;
    explanation: string;
  }>;
}

export interface DetectionMetadata {
  processingTime: number;
  algorithmVersion: string;
  adjustmentsMade: string[];
  confidenceDistribution: Array<{
    range: string;
    count: number;
  }>;
}

// Enums and constants
export enum RoleCategory {
  ENGINEERING = 'engineering',
  MANAGEMENT = 'management',
  BUSINESS = 'business',
  DESIGN = 'design',
  DATA = 'data',
  OPERATIONS = 'operations',
  MARKETING = 'marketing',
  SALES = 'sales',
  HR = 'hr',
  CONSULTING = 'consulting'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  PRINCIPAL = 'principal',
  EXECUTIVE = 'executive'
}

export enum CVSection {
  PERSONAL_INFO = 'personalInfo',
  PROFESSIONAL_SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  SKILLS = 'skills',
  EDUCATION = 'education',
  ACHIEVEMENTS = 'achievements',
  CERTIFICATIONS = 'certifications',
  PROJECTS = 'projects',
  PUBLICATIONS = 'publications',
  CUSTOM_SECTIONS = 'customSections'
}

// Utility types for enhanced type safety
export type RoleProfileId = string & { readonly __brand: unique symbol };
export type ConfidenceScore = number & { readonly __brand: unique symbol };
export type WeightingFactor = number & { readonly __brand: unique symbol };

// Configuration interfaces
export interface RoleProfileServiceConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  enableAnalytics: boolean;
  defaultDetectionConfig: RoleDetectionConfig;
}

// Analytics and monitoring
export interface RoleDetectionMetrics {
  totalDetections: number;
  successfulMatches: number;
  averageConfidence: number;
  popularRoles: Array<{
    roleId: string;
    roleName: string;
    matchCount: number;
  }>;
  performance: {
    averageProcessingTime: number;
    cacheHitRate?: number;
  };
}