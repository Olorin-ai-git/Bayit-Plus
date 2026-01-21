// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Regional CV Processing Types
 * Moved from i18n module to correct cv-processing domain
 */

// Enhanced ParsedCV interface for regional CV processing
export interface ParsedCV {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    photo?: string;
    age?: number;
    nationality?: string;
    maritalStatus?: string;
    gender?: string;
    linkedIn?: string;
    website?: string;
  };
  experience?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
    location?: string;
    achievements?: string[];
    skills?: string[];
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
    grade?: string;
    location?: string;
    fieldOfStudy?: string;
    honors?: string[];
  }>;
  skills?: string[];
  languages?: Array<{
    language: string;
    level: string;
    proficiency?: 'basic' | 'conversational' | 'fluent' | 'native';
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  publications?: Array<{
    title: string;
    publication: string;
    date: string;
    url?: string;
    authors?: string[];
  }>;
  awards?: Array<{
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  references?: Array<{
    name: string;
    title: string;
    company: string;
    email?: string;
    phone?: string;
    relationship: string;
  }>;
  [key: string]: any;
}

// Comprehensive regional configuration interface
export interface RegionalConfiguration {
  regionId: string;
  regionName?: string;
  countryCode?: string;
  languageCode?: string;
  currency?: string;

  // Legal and compliance
  legalRestrictions?: {
    prohibitedInfo?: string[];
    photoRequired?: boolean;
    ageDisclosureRequired?: boolean;
    genderDisclosureRequired?: boolean;
    maritalStatusDisclosureRequired?: boolean;
    nationalityRequired?: boolean;
    workPermitRequired?: boolean;
    discriminationLaws?: string[];
    dataPrivacyRegulations?: string[];
  };

  // Cultural factors
  culturalFactors?: {
    networkingImportance?: number;
    workCulture?: 'hierarchical' | 'flat' | 'mixed';
    communicationStyle?: 'direct' | 'indirect' | 'context_dependent';
    businessFormality?: 'formal' | 'casual' | 'flexible';
    interviewStyle?: 'behavioral' | 'technical' | 'case_study' | 'mixed';
    dresscode?: 'formal' | 'business_casual' | 'casual';
    referralImpact?: number;
  };

  // CV format preferences
  formatPreferences?: {
    photoRequired?: boolean;
    preferredLength?: number;
    dateFormat?: string;
    addressFormat?: string;
    phoneFormat?: string;
    cvFormat?: 'chronological' | 'functional' | 'combination' | 'creative';
    fileFormats?: string[];
    colorPreference?: 'conservative' | 'moderate' | 'creative';
    fontPreference?: 'traditional' | 'modern' | 'creative';
  };

  // Content guidelines
  contentGuidelines?: {
    requiredSections?: string[];
    discouragedSections?: string[];
    preferredSectionOrder?: string[];
    personalStatementRequired?: boolean;
    objectiveRequired?: boolean;
    referencesRequired?: boolean;
    portfolioExpected?: boolean;
    coverLetterRequired?: boolean;
  };

  // Language guidelines
  languageGuidelines?: {
    formalityLevel?: 'very_formal' | 'formal' | 'casual' | 'very_casual';
    preferredTerminology?: string[];
    cvTerminology?: string;
    businessLanguage?: string;
    proficiencyExpectations?: Record<string, 'basic' | 'conversational' | 'fluent' | 'native'>;
  };

  // Market data
  marketData?: {
    unemploymentRate?: number;
    averageSalary?: number;
    costOfLiving?: number;
    economicGrowth?: number;
    inflationRate?: number;
    averageJobSearchDuration?: number;
    competitiveness?: number;
    topIndustries?: Array<{
      industry: string;
      marketShare: number;
      growth: number;
    }>;
    skillsInDemand?: Array<{
      skill: string;
      demandLevel: number;
      salaryPremium: number;
    }>;
  };

  // Application process
  applicationPreferences?: {
    applicationMethods?: string[];
    followUpCulture?: 'expected' | 'discouraged' | 'neutral';
    responseTime?: {
      average: number;
      acceptable: number;
    };
    interviewProcess?: {
      rounds: number;
      typicalDuration: number;
      commonFormats: string[];
    };
  };

  [key: string]: any;
}

export interface RegionalOptimizationRequest {
  userId: string;
  cvData: ParsedCV;
  targetRegion: string;
  targetCountry?: string;
  industry?: string;
  jobRole?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  preferences?: {
    conservativeApproach?: boolean;
    emphasizeInternationalExperience?: boolean;
    includePersonalInfo?: boolean;
  };
}

export interface RegionalOptimizationResult {
  regionScore: number;
  culturalFit: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  legalCompliance: {
    compliant: boolean;
    issues: ComplianceIssue[];
    recommendations: string[];
    criticalViolations: ComplianceIssue[];
  };
  culturalOptimization: {
    formatAdjustments: FormatAdjustment[];
    contentAdjustments: ContentAdjustment[];
    languageOptimization: LanguageOptimization[];
    structuralChanges: StructuralChange[];
  };
  marketInsights: {
    popularIndustries: string[];
    averageJobSearchDuration: number;
    networkingImportance: 'low' | 'medium' | 'high';
    remoteWorkAdoption: number;
    salaryExpectations: SalaryExpectations;
    competitiveAdvantages: string[];
    marketChallenges: string[];
  };
  localizedRecommendations: LocalizedRecommendation[];
  optimizedCV?: ParsedCV;
  confidence: number;
  processingMetadata: {
    processedAt: Date;
    version: string;
    processingTime: number;
  };
}

export interface ComplianceIssue {
  type: 'photo' | 'age' | 'gender' | 'marital_status' | 'personal_info' | 'nationality' | 'work_permit';
  severity: 'critical' | 'error' | 'warning' | 'info';
  description: string;
  solution: string;
  countries: string[];
  legalBasis?: string;
  consequences?: string;
  autoFixAvailable?: boolean;
}

export interface FormatAdjustment {
  aspect: 'photo' | 'length' | 'color' | 'font' | 'date_format' | 'address_format' | 'phone_format' | 'layout' | 'spacing';
  current: string;
  recommended: string;
  reason: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  culturalContext?: string;
  examples?: string[];
  autoApplyAvailable?: boolean;
}

export interface ContentAdjustment {
  section: string;
  type: 'add' | 'remove' | 'modify' | 'reorder' | 'merge' | 'split';
  description: string;
  culturalReason: string;
  impact: number; // 0-1
  priority: 'critical' | 'high' | 'medium' | 'low';
  examples?: string[];
  autoApplyAvailable?: boolean;
}

export interface LanguageOptimization {
  aspect: 'formality' | 'tone' | 'terminology' | 'structure' | 'cultural_sensitivity';
  suggestion: string;
  examples: Array<{
    before: string;
    after: string;
    context?: string;
  }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  culturalContext?: string;
}

export interface StructuralChange {
  type: 'section_order' | 'section_grouping' | 'emphasis_shift' | 'detail_level';
  description: string;
  rationale: string;
  impact: number; // 0-1
  regions: string[];
}

export interface SalaryExpectations {
  expectationLevel: 'conservative' | 'market_rate' | 'aggressive';
  currencyPreference: string;
  negotiationCulture: 'avoid' | 'subtle' | 'direct';
  benefitsImportance: number; // 0-1
  salaryTransparency: 'required' | 'optional' | 'discouraged';
  equityExpectations?: number;
  bonusExpectations?: number;
}

export interface LocalizedRecommendation {
  category: 'cultural' | 'legal' | 'market' | 'networking' | 'format' | 'language' | 'strategy';
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  actionItems: string[];
  culturalContext: string;
  impact: number; // 0-1
  difficulty: 'easy' | 'moderate' | 'difficult';
  timeToImplement: 'immediate' | 'short' | 'medium' | 'long';
  resources?: string[];
}

// Regional scoring types
export interface RegionalScore {
  overall: number;
  categories: {
    legal: number;
    cultural: number;
    format: number;
    content: number;
    language: number;
  };
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
}

// CV analysis types
export interface CVAnalysisResult {
  sections: SectionAnalysis[];
  overallQuality: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  readabilityScore: number;
  atsCompatibility: number;
  estimatedLength: number;
}

export interface SectionAnalysis {
  section: string;
  present: boolean;
  quality: number;
  issues: string[];
  suggestions: string[];
  wordCount: number;
  relevanceScore: number;
}