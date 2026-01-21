/**
 * Phase 2 Enhanced Data Models (Legacy Compatibility)
 * 
 * This file now serves as a compatibility layer for the refactored Phase 2 types.
 * The original monolithic type definitions have been split into focused modules
 * for better maintainability and modularity.
 * 
 * Original file: 798 lines -> Current file: <200 lines (75% reduction)
  */

// Re-export all types from the modular type definitions
export type {
  // Success Prediction Types
  SuccessPrediction,
  SalaryPrediction,
  TimeToHirePrediction,
  PredictiveRecommendation,
  PredictionTypes,
  
  // User Outcomes Types
  UserOutcome,
  OutcomeEvent,
  
  // Analytics Types
  AnalyticsEvent,
  AnalyticsMetrics,
  AnalyticsTypes,
  
  // Industry Specialization Types
  IndustryModel,
  SkillDefinition,
  CareerPath,
  CareerLevel,
  CompanyProfile,
  IndustryTypes,
  
  // Regional Localization Types
  RegionalConfiguration,
  RegionalTypes,
  
  // ML Pipeline Types
  MLModelMetadata,
  FeatureVector,
  Phase2APIResponse,
  PredictionResponse,
  AnalyticsResponse,
  IndustryOptimizationResponse,
  RegionalOptimizationResponse,
  MLTrainingConfig,
  
  // Comprehensive type unions
  AllPredictionTypes,
  AllAnalyticsTypes,
  AllIndustryTypes,
  AllRegionalTypes
} from './phase2';

/**
 * Migration Guide:
 * 
 * The types are now organized in the following modules:
 * - success-prediction.ts: Success predictions, salary predictions, time to hire
 * - user-outcomes.ts: User outcome tracking and events
 * - analytics.ts: Analytics events and metrics (MIGRATED TO @cvplus/analytics)
 * - industry-specialization.ts: Industry models, skills, career paths
 * - regional-localization.ts: Regional configurations and localization
 * - ml-pipeline.ts: ML models, feature vectors, API responses
 * 
 * For new code, prefer importing directly from the specific modules:
 * 
 * // Instead of:
 * import { SuccessPrediction } from './types/phase2-models';
 * 
 * // Use:
 * import { SuccessPrediction } from './types/success-prediction';
 * 
 * This provides better tree-shaking and clearer dependencies.
  */

/**
 * Validation utilities for Phase 2 types
  */
export class Phase2TypeValidator {
  static isValidSuccessPrediction(obj: any): obj is import('./success-prediction').SuccessPrediction {
    return (
      obj &&
      typeof obj.predictionId === 'string' &&
      typeof obj.userId === 'string' &&
      typeof obj.jobId === 'string' &&
      typeof obj.interviewProbability === 'number' &&
      obj.interviewProbability >= 0 &&
      obj.interviewProbability <= 1
    );
  }

  static isValidAnalyticsEvent(obj: any): obj is { id: string; type: string; timestamp: Date; data: Record<string, any>; } {
    return (
      obj &&
      typeof obj.eventId === 'string' &&
      typeof obj.userId === 'string' &&
      typeof obj.eventType === 'string' &&
      typeof obj.eventCategory === 'string' &&
      obj.timestamp instanceof Date
    );
  }

  static isValidIndustryModel(obj: any): obj is import('./industry-specialization').IndustryModel {
    return (
      obj &&
      typeof obj.industryId === 'string' &&
      typeof obj.industryName === 'string' &&
      typeof obj.industryCategory === 'string' &&
      Array.isArray(obj.coreSkills) &&
      Array.isArray(obj.careerPaths)
    );
  }

  static isValidRegionalConfiguration(obj: any): obj is import('./regional-localization').RegionalConfiguration {
    return (
      obj &&
      typeof obj.regionId === 'string' &&
      typeof obj.regionName === 'string' &&
      typeof obj.countryCode === 'string' &&
      typeof obj.languageCode === 'string' &&
      typeof obj.currency === 'string'
    );
  }

  static isValidFeatureVector(obj: any): obj is import('./ml-pipeline').FeatureVector {
    return (
      obj &&
      typeof obj.vectorId === 'string' &&
      typeof obj.userId === 'string' &&
      obj.timestamp instanceof Date &&
      typeof obj.rawFeatures === 'object' &&
      typeof obj.engineeredFeatures === 'object'
    );
  }
}

/**
 * Factory functions for creating Phase 2 type instances with sensible defaults
  */
export class Phase2TypeFactory {
  static createEmptySuccessPrediction(_userId: string, _jobId: string): Partial<import('./success-prediction').SuccessPrediction> {
    return {
      // predictionId: `pred_${Date.now()}`,
      // userId,
      // jobId,
      score: 0,
      confidence: 0,
      factors: [],
      recommendations: [],
      timeline: {
        shortTerm: { period: '1-3 months', probability: 0, outcomes: [] },
        mediumTerm: { period: '3-6 months', probability: 0, outcomes: [] },
        longTerm: { period: '6+ months', probability: 0, outcomes: [] }
      }
    };
  }

  static createEmptyAnalyticsEvent(_userId: string, eventType: string): Partial<{ id: string; type: string; timestamp: Date; data: Record<string, any>; }> {
    return {
      id: `evt_${Date.now()}`,
      type: eventType,
      timestamp: new Date(),
      data: {
        action: 'unknown',
        properties: {}
      }
    };
  }
}