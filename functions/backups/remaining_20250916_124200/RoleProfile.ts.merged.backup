// @ts-ignore - Export conflicts/**
 * Role Profile-related type definitions for the CVPlus Workflow module
 */

export type RoleType = 
  | 'software-engineer'
  | 'data-scientist'
  | 'product-manager'
  | 'designer'
  | 'marketing-manager'
  | 'sales-representative'
  | 'business-analyst'
  | 'project-manager'
  | 'executive'
  | 'consultant'
  | 'researcher'
  | 'teacher'
  | 'healthcare'
  | 'finance'
  | 'legal'
  | 'operations'
  | 'hr-specialist'
  | 'customer-success'
  | 'other';

export type ExperienceLevel = 
  | 'entry-level'
  | 'junior'
  | 'mid-level'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'executive';

export interface RoleProfile {
  id: string;
  userId: string;
  roleType: RoleType;
  title: string;
  experienceLevel: ExperienceLevel;
  targetCompanies: string[];
  targetIndustries: string[];
  location: {
    preferred: string[];
    remote: boolean;
    relocate: boolean;
  };
  salary: {
    min?: number;
    max?: number;
    currency: string;
    negotiable: boolean;
  };
  skills: {
    technical: Array<{
      name: string;
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      yearsOfExperience?: number;
      certifications?: string[];
    }>;
    soft: Array<{
      name: string;
      examples?: string[];
    }>;
    languages: Array<{
      language: string;
      proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
    }>;
  };
  preferences: {
    templateCategories: string[];
    featuresEnabled: string[];
    customizations: Record<string, any>;
  };
  optimization: {
    keywords: string[];
    atsOptimization: boolean;
    industryFocus: string[];
    targetedContent: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface ProfileCustomization {
  profileId: string;
  customizationType: 'content' | 'design' | 'features' | 'keywords';
  target: RoleType | string; // Role type or specific job posting ID
  customizations: {
    contentModifications?: {
      summary?: string;
      keySkills?: string[];
      achievements?: string[];
      experienceEmphasis?: string[];
    };
    designChanges?: {
      templateId?: string;
      colorScheme?: string;
      layout?: string;
      sectionOrder?: string[];
    };
    featureSettings?: {
      enabledFeatures: string[];
      disabledFeatures: string[];
      priorities: Record<string, number>;
    };
    keywordOptimization?: {
      primaryKeywords: string[];
      secondaryKeywords: string[];
      density: number;
      placement: string[];
    };
  };
  effectiveness: {
    applicationCount: number;
    responseRate: number;
    interviewRate: number;
    rating: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRequirements {
  roleType: RoleType;
  commonSkills: string[];
  preferredExperience: ExperienceLevel[];
  typicalResponsibilities: string[];
  industryTrends: string[];
  salaryRanges: Record<ExperienceLevel, { min: number; max: number; currency: string }>;
  demandLevel: 'low' | 'medium' | 'high' | 'very-high';
  growthProjection: number; // percentage
  recommendedCertifications: string[];
  keyMetrics: string[];
  interviewTopics: string[];
}

export interface RoleAnalysis {
  profileId: string;
  targetRole: RoleType;
  matchScore: number; // 0-100
  strengths: Array<{
    category: string;
    items: string[];
    score: number;
  }>;
  gaps: Array<{
    category: string;
    items: string[];
    severity: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>;
  recommendations: Array<{
    type: 'skill' | 'experience' | 'certification' | 'content' | 'template';
    priority: 'low' | 'medium' | 'high';
    description: string;
    impact: number; // Expected improvement in match score
    timeframe: string;
  }>;
  marketInsights: {
    demandLevel: 'low' | 'medium' | 'high';
    averageSalary: number;
    topCompanies: string[];
    requiredSkills: string[];
    competitionLevel: 'low' | 'medium' | 'high';
  };
  generatedAt: Date;
}

export interface RoleOptimization {
  profileId: string;
  optimizations: Array<{
    type: 'ats' | 'keyword' | 'content' | 'format';
    changes: string[];
    expectedImpact: number;
    implemented: boolean;
    implementedAt?: Date;
  }>;
  performance: {
    beforeOptimization: {
      atsScore: number;
      keywordDensity: number;
      readabilityScore: number;
    };
    afterOptimization: {
      atsScore: number;
      keywordDensity: number;
      readabilityScore: number;
    };
    improvement: number;
  };
  tracking: {
    applicationsSubmitted: number;
    responsesReceived: number;
    interviewsScheduled: number;
    offersReceived: number;
  };
  createdAt: Date;
  lastOptimized: Date;
}