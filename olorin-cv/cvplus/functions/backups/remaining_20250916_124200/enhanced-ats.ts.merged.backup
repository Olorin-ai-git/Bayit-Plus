// @ts-ignore - Export conflicts/**
 * Enhanced ATS (Applicant Tracking System) Types
 * 
 * ATS integration types for enhanced CV features.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export interface ATSIntegration {
  id: string;
  name: string;
  provider: 'workday' | 'greenhouse' | 'lever' | 'bamboohr' | 'successfactors' | 'taleo';
  status: 'active' | 'inactive' | 'configured' | 'error';
  configuration: ATSConfiguration;
  lastSync?: Date;
}

export interface ATSConfiguration {
  apiKey: string;
  baseUrl: string;
  webhookUrl?: string;
  syncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  fieldMappings: Record<string, string>;
}

export interface ATSJobPosting {
  id: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  postedDate: Date;
  expiryDate?: Date;
  status: 'active' | 'closed' | 'paused';
}

export interface ATSApplication {
  id: string;
  jobId: string;
  candidateId: string;
  cvJobId?: string; // Reference to our CV processing job
  status: 'submitted' | 'reviewed' | 'shortlisted' | 'interviewed' | 'offered' | 'rejected';
  submittedAt: Date;
  lastUpdated: Date;
  notes?: string[];
  interviewSchedule?: Date[];
}

export interface ATSCandidate {
  id: string;
  externalId: string;
  email: string;
  name: string;
  phone?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  skills: string[];
  experience: ATSExperience[];
  education: ATSEducation[];
}

export interface ATSExperience {
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  skills: string[];
}

export interface ATSEducation {
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
}

export interface ATSMatchingScore {
  candidateId: string;
  jobId: string;
  overallScore: number;
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  locationMatch: number;
  matchingKeywords: string[];
  recommendations: string[];
}

export interface AdvancedATSScore extends ATSMatchingScore {
  semanticMatching: number;
  industryRelevance: number;
  careerProgression: number;
  culturalFit: number;
  competitorComparison: CompetitorAnalysis[];
  optimization: ATSOptimizationResult;
}

export interface PrioritizedRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'skills' | 'experience' | 'education' | 'format';
  title: string;
  description: string;
  impact: number; // 1-10
  effort: number; // 1-10
  examples?: string[];
}

export interface CompetitorAnalysis {
  competitorProfile: string;
  strengthComparison: Record<string, number>;
  weaknessAnalysis: string[];
  differentiators: string[];
}

export interface SemanticKeywordAnalysis {
  primaryKeywords: KeywordMatch[];
  secondaryKeywords: KeywordMatch[];
  missingKeywords: string[];
  overusedKeywords: string[];
  contextualRelevance: number;
}

export interface KeywordMatch {
  keyword: string;
  frequency: number;
  context: string[];
  importance: number; // 1-10
  variations: string[];
}

export interface ATSSystemSimulation {
  systemName: string;
  passLikelihood: number;
  simulationDetails: {
    keywordMatching: number;
    formatScanning: number;
    sectionParsing: number;
    overallCompatibility: number;
  };
  issues: ATSIssue[];
  suggestions: ATSSuggestion[];
}

export interface ATSOptimizationResult {
  currentScore: number;
  optimizedScore: number;
  recommendations: PrioritizedRecommendation[];
  simulationResults: ATSSystemSimulation[];
  timeToImplement: string;
}

export interface ATSIssue {
  type: 'critical' | 'warning' | 'suggestion';
  category: 'format' | 'content' | 'structure' | 'keywords';
  description: string;
  impact: number;
  solution: string;
}

export interface ATSSuggestion {
  category: string;
  priority: number;
  suggestion: string;
  expectedImprovement: number;
}