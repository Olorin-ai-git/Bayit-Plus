/**
 * Prompt Engine Types
 *
 * Core types and interfaces for the Enhanced Prompt Engine system.
 * Extracted from enhanced-prompt-engine.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

export interface VideoGenerationOptions {
  duration?: 'short' | 'medium' | 'long';
  style?: 'professional' | 'friendly' | 'energetic';
  avatarStyle?: 'realistic' | 'illustrated' | 'corporate';
  background?: 'office' | 'modern' | 'gradient' | 'custom';
  includeSubtitles?: boolean;
  includeNameCard?: boolean;
}

export interface PromptEngineOptions extends VideoGenerationOptions {
  targetIndustry?: string;
  customPersonality?: PersonalityProfile;
  optimizationLevel?: 'basic' | 'enhanced' | 'premium';
}

export interface PersonalityProfile {
  communicationStyle: 'direct' | 'collaborative' | 'analytical' | 'creative';
  leadershipType: 'visionary' | 'operational' | 'servant' | 'strategic';
  technicalDepth: 'specialist' | 'generalist' | 'architect' | 'manager';
  industryFocus: string;
  careerStage: 'early' | 'mid' | 'senior' | 'executive';
  personalityTraits: string[];
}

export interface ScriptQualityMetrics {
  overallScore: number; // 0-10 scale
  engagementScore: number; // 0-10 scale
  industryAlignment: number; // 0-1 scale
  personalityMatch: number; // 0-1 scale
  technicalAccuracy: number; // 0-1 scale
  deliveryOptimization: number; // 0-1 scale
  professionalImpact: number; // 0-1 scale
  feedback: string[];
}

export interface EnhancedScriptResult {
  script: string;
  quality: ScriptQualityMetrics;
  personalityProfile: PersonalityProfile;
  metadata: {
    generationTime: number;
    tokensUsed: number;
    optimizationLevel: string;
    layersApplied: string[];
    fallbacksUsed?: number;
  };
}

export enum PromptEngineErrorType {
  CONTEXT_ANALYSIS_FAILED = 'CONTEXT_ANALYSIS_FAILED',
  OPTIMIZATION_FAILED = 'OPTIMIZATION_FAILED',
  PRODUCTION_FAILED = 'PRODUCTION_FAILED',
  QUALITY_ASSESSMENT_FAILED = 'QUALITY_ASSESSMENT_FAILED',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT'
}

export class PromptEngineError extends Error {
  constructor(
    message: string,
    public type: PromptEngineErrorType,
    public context?: any,
    public originalError?: any
  ) {
    super(message);
    this.name = 'PromptEngineError';
  }
}