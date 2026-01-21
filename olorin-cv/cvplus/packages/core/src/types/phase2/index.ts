/**
 * Phase 2 Types Index
 * Centralized exports for all Phase 2 type definitions
 * 
 * This replaces the monolithic phase2-models.ts with modular type definitions
  */

// Success Prediction Types
export type { 
  SuccessPrediction, 
  SalaryPrediction, 
  TimeToHirePrediction, 
  PredictiveRecommendation,
  PredictionTypes 
} from '../success-prediction';

// User Outcomes Types
export type { 
  UserOutcome, 
  OutcomeEvent 
} from '../user-outcomes';

// Analytics Types - Temporary local definitions for compilation
export interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface AnalyticsMetrics {
  events: AnalyticsEvent[];
  aggregations: Record<string, number>;
}

export type AnalyticsTypes = 'user_action' | 'system_event' | 'performance_metric';

export type AllAnalyticsTypes = AnalyticsTypes;

// Industry Specialization Types
export type { 
  IndustryModel, 
  SkillDefinition, 
  CareerPath, 
  CareerLevel, 
  CompanyProfile,
  IndustryTypes 
} from '../industry-specialization';

// Regional Localization Types
export type { 
  RegionalConfiguration,
  RegionalTypes 
} from '../regional-localization';

// ML Pipeline Types
export type { 
  MLModelMetadata, 
  FeatureVector, 
  Phase2APIResponse, 
  PredictionResponse, 
  AnalyticsResponse, 
  IndustryOptimizationResponse, 
  RegionalOptimizationResponse, 
  MLTrainingConfig 
} from '../ml-pipeline';

// Convenience type unions for comprehensive type handling
export type AllPredictionTypes = import('../success-prediction').PredictionTypes;
// export type AllAnalyticsTypes = import('../analytics').AnalyticsTypes; // MIGRATED TO @cvplus/analytics
export type AllIndustryTypes = import('../industry-specialization').IndustryTypes;
export type AllRegionalTypes = import('../regional-localization').RegionalTypes;