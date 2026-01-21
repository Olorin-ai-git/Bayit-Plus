/**
 * @cvplus/recommendations - Cache Service (Refactored)
 * 
 * High-performance three-tier caching system for recommendations.
 * Now uses modular architecture for better maintainability.
 * 
 * Performance Goals:
 * - 60%+ cache hit rate
 * - < 10ms cache lookup time
 * - Automatic cache invalidation
 * - Memory usage < 100MB
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { CacheCoreService } from './cache/cache-core-service';
import type { 
  CacheConfiguration,
  CacheStats, 
  PerformanceMetrics 
} from '../types';

/**
 * Main Cache Service - maintains backward compatibility while using modular architecture
  */
export class CacheService {
  private coreService: CacheCoreService;

  constructor(config: Partial<CacheConfiguration> = {}) {
    this.coreService = new CacheCoreService(config);
  }

  // ============================================================================
  // PUBLIC API - DELEGATED TO CORE SERVICE
  // ============================================================================

  /**
   * Get value from cache with three-tier lookup
    */
  async get<T>(key: string): Promise<T | null> {
    return this.coreService.get<T>(key);
  }

  /**
   * Set value in all cache tiers
    */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.coreService.set(key, value, ttl);
  }

  /**
   * Delete from all cache tiers
    */
  async delete(key: string): Promise<void> {
    return this.coreService.delete(key);
  }

  /**
   * Clear all cache tiers
    */
  async clear(): Promise<void> {
    return this.coreService.clear();
  }

  /**
   * Generate cache key for recommendations
    */
  generateRecommendationsKey(params: {
    userId: string;
    jobId: string;
    targetRole?: string;
    industryKeywords?: string[];
    version?: string;
  }): string {
    return this.coreService.generateRecommendationsKey(params);
  }

  // ============================================================================
  // STATS & MONITORING
  // ============================================================================

  /**
   * Get cache statistics
    */
  getStats(): CacheStats {
    return this.coreService.getStats();
  }

  /**
   * Get performance metrics
    */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return this.coreService.getPerformanceMetrics();
  }

  /**
   * Check if caching is healthy (for circuit breaker patterns)
    */
  isHealthy(): boolean {
    return this.coreService.isHealthy();
  }

  /**
   * Get detailed health status
    */
  getHealthStatus() {
    return this.coreService.getHealthStatus();
  }

  /**
   * Cleanup resources
    */
  dispose(): void {
    this.coreService.dispose();
  }
}