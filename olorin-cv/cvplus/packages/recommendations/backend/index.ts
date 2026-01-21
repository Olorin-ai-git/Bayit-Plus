/**
 * CVPlus Recommendations Backend Index
 * 
 * Main backend entry point for the @cvplus/recommendations package.
 * Exports all Firebase Functions and backend services.
 * 
 * @author Gil Klainert
 * @version 1.1.0
 * @migrated 2025-08-29 - Enhanced with root functions implementation
  */

// Export all Firebase Functions
export {
  getRecommendations,
  applyImprovements,
  previewImprovement,
  customizePlaceholders,
  recommendationsHealthCheck,
  firebaseFunctionsAdapter,
  MIGRATION_CONFIG
} from './functions';

// Export backend services for direct use
export {
  AIIntegrationService,
  RecommendationEngineService,
  CareerDevelopmentService,
  ValidationEngine,
  ImprovementOrchestrator,
  ActionOrchestrator,
  RecommendationOrchestrator,
  RecommendationGenerator,
  ContentProcessor,
  CVAnalyzer,
  TransformationApplier,
  CacheManager,
  CacheKeyManager,
  CircuitBreakerCore,
  RetryManager,
  TimeoutManager
} from '../src/services/root-enhanced';