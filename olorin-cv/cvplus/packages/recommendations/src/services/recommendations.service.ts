/**
 * @cvplus/recommendations - Recommendations Service (Refactored)
 * 
 * Main orchestrator for all recommendation operations using modular architecture.
 * Maintains backward compatibility while improving maintainability.
 * 
 * Performance Goals:
 * - Reduce timeout failures from 15% to < 2%
 * - Achieve 60%+ cache hit rate
 * - Response time < 30 seconds (from 180 seconds)
 * - Error rate < 2% (from 10%)
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { RecommendationsOrchestrator } from './recommendations/recommendations-orchestrator';
import type {
  GetRecommendationsParams,
  GetRecommendationsResponse,
  ApplyImprovementsParams,
  ApplyImprovementsResponse,
  PreviewImprovementParams,
  PreviewImprovementResponse,
  CustomizePlaceholdersParams,
  CustomizePlaceholdersResponse,
  PerformanceMetrics,
  CacheStats
} from '../types';

/**
 * Main Recommendations Service - maintains backward compatibility while using modular architecture
  */
export class RecommendationsService {
  private orchestrator: RecommendationsOrchestrator;

  constructor() {
    this.orchestrator = new RecommendationsOrchestrator();
  }

  // ============================================================================
  // PUBLIC API - DELEGATED TO ORCHESTRATOR
  // ============================================================================

  /**
   * Get recommendations with caching and retry logic
    */
  async getRecommendations(params: GetRecommendationsParams): Promise<GetRecommendationsResponse> {
    return this.orchestrator.getRecommendations(params);
  }

  /**
   * Apply improvements with validation and caching
    */
  async applyImprovements(params: ApplyImprovementsParams): Promise<ApplyImprovementsResponse> {
    return this.orchestrator.applyImprovements(params);
  }

  /**
   * Preview improvement with caching
    */
  async previewImprovement(params: PreviewImprovementParams): Promise<PreviewImprovementResponse> {
    return this.orchestrator.previewImprovement(params);
  }

  /**
   * Customize placeholders in recommendations
    */
  async customizePlaceholders(params: CustomizePlaceholdersParams): Promise<CustomizePlaceholdersResponse> {
    return this.orchestrator.customizePlaceholders(params);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Invalidate cache for specific job
    */
  async invalidateCache(jobId: string): Promise<void> {
    return this.orchestrator.invalidateCache(jobId);
  }

  /**
   * Refresh all cache
    */
  async refreshCache(): Promise<void> {
    return this.orchestrator.refreshCache();
  }

  /**
   * Get cache statistics
    */
  getCacheStats(): CacheStats {
    return this.orchestrator.getCacheStats();
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Get performance metrics
    */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.orchestrator.getPerformanceMetrics();
  }

  /**
   * Health check for the service
    */
  isHealthy(): boolean {
    return this.orchestrator.isHealthy();
  }

  /**
   * Get detailed health status
    */
  getHealthStatus() {
    return this.orchestrator.getHealthStatus();
  }

  /**
   * Reset metrics (for testing)
    */
  resetMetrics(): void {
    return this.orchestrator.resetMetrics();
  }

  /**
   * Cleanup resources
    */
  dispose(): void {
    this.orchestrator.dispose();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const recommendationsService = new RecommendationsService();