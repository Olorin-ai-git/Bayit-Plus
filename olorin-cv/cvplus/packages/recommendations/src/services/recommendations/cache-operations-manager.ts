/**
 * @cvplus/recommendations - Cache Operations Manager
 * 
 * Manages cache operations specific to recommendations including
 * cache invalidation patterns and key generation strategies.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type { CacheService } from '../cache.service';
import type { CacheStats } from '../../types';

export class CacheOperationsManager {
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
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
    return this.cacheService.generateRecommendationsKey(params);
  }

  /**
   * Generate cache key for previews
    */
  generatePreviewKey(jobId: string, recommendationId: string): string {
    return `preview:${jobId}:${recommendationId}`;
  }

  /**
   * Get cached recommendations
    */
  async getCachedRecommendations<T>(cacheKey: string): Promise<T | null> {
    return this.cacheService.get<T>(cacheKey);
  }

  /**
   * Cache recommendations result
    */
  async cacheRecommendations<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.cacheService.set(key, data, ttlMs);
  }

  /**
   * Cache preview result
    */
  async cachePreview<T>(key: string, data: T, ttlMs: number = 30 * 60 * 1000): Promise<void> {
    await this.cacheService.set(key, data, ttlMs);
  }

  /**
   * Invalidate cache for specific job
    */
  async invalidateJobCache(jobId: string): Promise<void> {
    try {
      // This is a simplified implementation
      // In a real system, we'd have more sophisticated cache key patterns
      const keys = [
        `rec:*:${jobId}:*`,
        `preview:${jobId}:*`
      ];
      
      for (const keyPattern of keys) {
        // Note: This is a simplified approach
        // Real implementation would need to handle pattern matching
        await this.cacheService.delete(keyPattern);
      }
      
      logger.info(`[CacheOperationsManager] Cache invalidated for job ${jobId}`);
    } catch (error) {
      logger.error(`[CacheOperationsManager] Cache invalidation failed for job ${jobId}:`, error);
    }
  }

  /**
   * Invalidate cache for specific recommendation
    */
  async invalidateRecommendationCache(jobId: string, recommendationId: string): Promise<void> {
    try {
      const keys = [
        `preview:${jobId}:${recommendationId}`,
        `customized:${jobId}:${recommendationId}`,
        `rec:*:${jobId}:*` // Invalidate all recommendations for the job
      ];
      
      for (const keyPattern of keys) {
        await this.cacheService.delete(keyPattern);
      }
      
      logger.info(`[CacheOperationsManager] Cache invalidated for recommendation ${recommendationId} in job ${jobId}`);
    } catch (error) {
      logger.error(`[CacheOperationsManager] Cache invalidation failed for recommendation ${recommendationId}:`, error);
    }
  }

  /**
   * Invalidate related cache entries for user and job
    */
  async invalidateRelatedCache(jobId: string, userId?: string): Promise<void> {
    await this.invalidateJobCache(jobId);
    // Could extend to invalidate user-specific caches if needed
  }

  /**
   * Clear all cache
    */
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
    logger.info('[CacheOperationsManager] All cache cleared');
  }

  /**
   * Get cache statistics
    */
  getCacheStats(): CacheStats {
    return this.cacheService.getStats();
  }

  /**
   * Check cache health
    */
  isCacheHealthy(): boolean {
    return this.cacheService.isHealthy();
  }
}