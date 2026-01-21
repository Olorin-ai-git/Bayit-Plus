// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Industry Specialization Types
 * Extracted from phase2-models.ts for better modularity
 * 
 * Industry models, skill definitions, career paths, and company profiles.
 */

// ===============================
// INDUSTRY SPECIALIZATION MODELS
// ===============================

export interface IndustryModel {
  industryId?: string;
  industryName?: string;
  industryCategory?: string;
  // Alias for backward compatibility
  industry?: string;
  
  // Service-specific properties
  subIndustries?: string[];
  priority?: number;
  atsPreferences?: {
    keywordDensity?: number;
    preferredSections?: string[];
    sectionOrder?: string[];
    commonRejectionReasons?: string[];
    successPatterns?: string[];
  };
  marketIntelligence?: {
    growthRate?: number;
    jobDemand?: string;
    competitionLevel?: string;
    automation_risk?: number;
    remote_friendliness?: number;
    trends?: {
      emerging?: string[];
      declining?: string[];
      stable?: string[];
    };
  };
  
  // Market data
  marketSize?: number;
  growthRate?: number;
  averageSalary?: {
    entry: number;
    mid: number;
    senior: number;
    executive: number;
  };
  
  // Skills and requirements
  coreSkills?: SkillDefinition[];
  emergingSkills?: SkillDefinition[];
  
  // Career progression
  careerPaths?: CareerPath[];
  typicalProgression?: CareerLevel[];
  
  // Hiring trends
  hiringTrends?: {
    demandLevel: 'low' | 'moderate' | 'high' | 'very_high';
    seasonalPatterns: Array<{
      month: number;
      relativeActivity: number; // 0-1
    }>;
    remoteWorkPrevalence: number; // 0-1
    contractVsFullTime: {
      contract: number;
      fullTime: number;
    };
  };
  
  // Geographic data
  topRegions?: Array<{
    region: string;
    jobCount: number;
    averageSalary: number;
    competitionLevel: number;
  }>;
  
  // Key companies
  leadingCompanies?: CompanyProfile[];
  
  // Industry-specific requirements
  commonRequirements?: {
    education: string[];
    certifications: string[];
    experience: {
      minimum: number;
      preferred: number;
    };
    softSkills: string[];
    technicalSkills: string[];
  };
  
  // Trends and predictions
  futureOutlook?: {
    automationRisk: number; // 0-1
    growthPotential: number; // 0-1
    skillEvolution: Array<{
      skill: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      timeframe: string;
    }>;
  };
  
  // Additional properties used by services
  knowledgeBase?: {
    keyTerms?: string[];
    commonSkills?: string[];
    industryStandards?: string[];
    certifications?: string[];
    companies?: string[];
    skills?: any[];
    salaryBenchmarks?: any;
    [key: string]: any; // Allow additional dynamic properties
  };
  
  modelConfig?: {
    algorithms?: string[];
    parameters?: Record<string, any>;
    weights?: Record<string, number>;
    successFactorWeights?: Record<string, number>;
    featureImportance?: any[];
  };
}

export interface IndustryTemplate {
  name: string;
  requirements: string[];
  keywords?: string[];
  bestPractices?: string[];
  commonSections?: string[];
}

export interface SkillDefinition {
  skillId: string;
  skillName: string;
  skillCategory: 'technical' | 'soft' | 'domain' | 'certification';
  
  // Classification
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  priority: 'essential' | 'important' | 'nice_to_have';
  
  // Market data
  demandLevel: number; // 0-1
  salaryImpact: number; // percentage increase
  
  // Learning information
  learningPath: {
    estimatedHours: number;
    difficulty: 'easy' | 'medium' | 'hard';
    prerequisites: string[];
    resources: string[];
  };
  
  // Related skills
  relatedSkills: string[];
  complementarySkills: string[];
  
  // Industry relevance
  relevantIndustries: string[];
  relevantRoles: string[];
  
  // Additional properties used by services
  name?: string;
  alternativeNames?: string[];
}

export interface CareerPath {
  pathId: string;
  pathName: string;
  industryId: string;
  
  // Path progression
  levels: CareerLevel[];
  averageProgressionTime: number; // years
  
  // Requirements
  entryRequirements: {
    education: string[];
    skills: string[];
    experience: number;
  };
  
  // Outcomes
  outcomes: {
    averageSalaryProgression: number[];
    jobSatisfaction: number;
    marketDemand: number;
    workLifeBalance: number;
  };
  
  // Transitions
  commonTransitions: Array<{
    fromLevel: string;
    toLevel: string;
    averageTime: number;
    successRate: number;
  }>;
}

export interface CareerLevel {
  levelId: string;
  levelName: string;
  seniority: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  
  // Compensation
  salaryRange: {
    min: number;
    max: number;
    median: number;
  };
  
  // Responsibilities
  keyResponsibilities: string[];
  managementLevel: number; // 0 = individual contributor, 1+ = people management
  
  // Requirements
  requirements: {
    yearsExperience: {
      min: number;
      max: number;
    };
    education: string[];
    skills: SkillDefinition[];
    certifications: string[];
  };
}

export interface CompanyProfile {
  companyId: string;
  companyName: string;
  industryId: string;
  
  // Company details
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  founded: number;
  headquarters: string;
  
  // Hiring data
  hiringData: {
    averageTimeToHire: number;
    interviewProcess: string[];
    hiringVolume: number;
    retentionRate: number;
  };
  
  // Compensation
  compensationData: {
    salaryCompetitiveness: number; // vs market average
    benefitsRating: number;
    equityOffered: boolean;
    bonusStructure: string;
  };
  
  // Culture
  cultureMetrics: {
    workLifeBalance: number;
    careerGrowth: number;
    diversity: number;
    innovation: number;
  };
  
  // Requirements
  typicalRequirements: {
    preferredBackground: string[];
    commonSkills: string[];
    culturefit: string[];
  };
}

// Type unions for easier handling
export type IndustryTypes = IndustryModel | SkillDefinition | CareerPath;