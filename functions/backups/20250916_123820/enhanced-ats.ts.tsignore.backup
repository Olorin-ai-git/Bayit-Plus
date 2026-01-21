// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enhanced ATS Optimization Types
 * 
 * ATS (Applicant Tracking System) optimization and analysis types.
 * Extracted from enhanced-models.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { ParsedCV } from './job';

/**
 * Advanced ATS compatibility score
 */
export interface AdvancedATSScore {
  overall: number;
  breakdown: {
    parsing: number;
    formatting: number;
    keywords: number;
    content: number;
    specificity: number;
    experience: number;
    education: number;
    skills: number;
    achievements: number;
  };
  recommendations: PrioritizedRecommendation[];
  competitorAnalysis: CompetitorAnalysis;
  semanticKeywords: SemanticKeywordAnalysis;
  industryBenchmark: number;
  estimatedPassRate: number;
  simulationResults: ATSSystemSimulation[];
}

/**
 * Prioritized improvement recommendation
 */
export interface PrioritizedRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number;
  effort: 'low' | 'medium' | 'high';
  timeEstimate: string;
  implementation: string[];
  examples?: string[];
  beforeAfter?: {
    before: string;
    after: string;
  };
  // Additional optional properties for compatibility
  estimatedScoreImprovement?: number;
  actionRequired?: 'add' | 'modify' | 'remove' | 'replace' | 'reformat';
  section?: string;
  keywords?: string[];
  atsSystemsAffected?: string[];
  currentValue?: string;
  targetValue?: string;
  timeToImplement?: string;
}

/**
 * Competitor analysis data
 */
export interface CompetitorAnalysis {
  similarProfiles: number;
  keywordGaps: string[];
  strengthsVsCompetitors: string[];
  improvementOpportunities: string[];
  marketPositioning: string;
  competitiveAdvantage: string[];
  benchmarkScore: number;
}

/**
 * Semantic keyword analysis
 */
export interface SemanticKeywordAnalysis {
  primaryKeywords: KeywordMatch[];
  secondaryKeywords: KeywordMatch[];
  missingKeywords: string[];
  keywordDensity: Record<string, number>;
  synonyms: Record<string, string[]>;
  contextualRelevance: Record<string, number>;
  industryTerms: string[];
  trendingKeywords: string[];
}

/**
 * Keyword match analysis
 */
export interface KeywordMatch {
  keyword: string;
  frequency: number;
  context: string[];
  importance: number;
  variations: string[];
}

/**
 * ATS system simulation results
 */
export interface ATSSystemSimulation {
  systemName: string;
  version: string;
  passRate: number;
  issues: ATSIssue[];
  suggestions: ATSSuggestion[];
  processingTime: number;
  confidence: number;
}

/**
 * ATS optimization result
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
    formatting: number;
    keywords: number;
    content: number;
    specificity: number;
    experience: number;
    education: number;
    skills: number;
    achievements: number;
  }; // Score breakdown by category
  keywords: {
    found: string[];
    missing: string[];
    recommended: string[];
    density?: number; // Keyword density score
    suggestions?: string[]; // Used by ContentOptimizationService
  };
  originalScore: number;
  optimizedScore: number;
  improvement: number;
  changesApplied: string[];
  timeToOptimize: number;
  beforeAfterComparison: {
    keywordMatches: { before: number; after: number };
    formatIssues: { before: number; after: number };
    readabilityScore: { before: number; after: number };
  };
  industryAlignment: number;
  roleSpecificOptimizations: string[];
  nextSteps: string[];
  maintenanceSchedule: {
    nextReview: Date;
    frequency: 'weekly' | 'monthly' | 'quarterly';
    autoOptimization: boolean;
  };
  // New advanced fields (optional for backward compatibility)
  advancedScore?: AdvancedATSScore;
  semanticAnalysis?: SemanticKeywordAnalysis;
  systemSimulations?: ATSSystemSimulation[];
  competitorBenchmark?: CompetitorAnalysis; // Used by ATSOptimizationOrchestrator
  processingMetadata?: any; // Used by ContentOptimizationService
  verificationResults?: any; // Used by ATSOptimizationOrchestrator
}

/**
 * ATS parsing issue
 */
export interface ATSIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location: string;
}

/**
 * ATS improvement suggestion
 */
export interface ATSSuggestion {
  category: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
}