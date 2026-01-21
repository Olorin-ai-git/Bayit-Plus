/**
 * Root-Enhanced Services Index
 * Re-exports all services migrated from the root functions directory
 * These services provide advanced orchestration and validation capabilities
 * 
 * @author Gil Klainert
 * @migrated 2025-08-29
  */

// Core orchestration services
export { ActionOrchestrator } from './ActionOrchestrator';
export { ImprovementOrchestrator } from './ImprovementOrchestrator';
export { RecommendationOrchestrator } from './RecommendationOrchestrator';
export { RecommendationGenerator } from './RecommendationGenerator';

// Content processing and validation
export { ContentProcessor } from './ContentProcessor';
export { CVAnalyzer } from './CVAnalyzer';
export { ValidationEngine } from '../validation/ValidationEngine';
export { TransformationApplier } from './TransformationApplier';

// Caching and performance (migrated to Core)
export { CacheManager } from '@cvplus/core/services/cache/CacheManager';
export { CacheKeyManager } from '@cvplus/core/services/cache/CacheKeyManager';
export { CircuitBreaker, CircuitBreakerManager } from '@cvplus/core/utils/resilience/CircuitBreakerCore';
export { RetryManager } from '@cvplus/core/utils/resilience/RetryManager';
export { TimeoutManager } from '@cvplus/core/utils/resilience/TimeoutManager';

// Re-export common services for backward compatibility
export { AIIntegrationService } from '../ai-integration.service';
export { RecommendationEngineService } from '../recommendation-engine.service';
export { CareerDevelopmentService } from '../career-development.service';