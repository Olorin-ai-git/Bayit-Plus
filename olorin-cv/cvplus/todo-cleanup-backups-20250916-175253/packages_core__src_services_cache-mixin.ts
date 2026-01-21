/**
 * Cache Mixin - Reusable caching functionality for services
 * 
 * Provides standardized Redis cache operations with consistent
 * error handling, metrics tracking, and performance optimization.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { redisClient } from './cache/redis-client.service';
// TODO: Import Logger type from @cvplus/logging\ntype Logger = { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; warn: (msg: string, data?: any) => void; debug: (msg: string, data?: any) => void; };

export interface CacheOptions {
  ttlSeconds?: number;
  keyPrefix?: string;
  enableMetrics?: boolean;
  fallbackOnError?: boolean;
}

export interface CacheResult<T> {
  data: T | null;
  cached: boolean;
  timestamp: Date;
}

export interface CacheMetricsData {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  responseTime: number;
}

/**
 * Cacheable Mixin - Provides standardized caching functionality
  */
export class CacheableMixin {
  protected readonly cacheOptions: Required<CacheOptions>;
  protected cacheMetrics: CacheMetricsData;

  constructor(
    protected logger: Logger,
    options: CacheOptions = {}
  ) {
    this.cacheOptions = {
      ttlSeconds: 300, // 5 minutes default
      keyPrefix: 'cvplus',
      enableMetrics: true,
      fallbackOnError: true,
      ...options
    };

    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      responseTime: 0
    };
  }

  /**
   * Get cached value with automatic JSON parsing
    */
  protected async getCached<T>(
    key: string,
    defaultValue?: T
  ): Promise<CacheResult<T>> {
    const startTime = Date.now();
    this.updateMetrics('request');

    try {
      const fullKey = this.buildCacheKey(key);
      const cached = await redisClient.get(fullKey);
      
      if (cached) {
        this.updateMetrics('hit');
        this.logger.debug('Cache hit', { key: fullKey });
        
        return {
          data: JSON.parse(cached) as T,
          cached: true,
          timestamp: new Date()
        };
      } else {
        this.updateMetrics('miss');
        this.logger.debug('Cache miss', { key: fullKey });
        
        return {
          data: defaultValue || null,
          cached: false,
          timestamp: new Date()
        };
      }
    } catch (error) {
      this.updateMetrics('error');
      this.logger.error('Cache get error', { key, error });
      
      if (this.cacheOptions.fallbackOnError) {
        return {
          data: defaultValue || null,
          cached: false,
          timestamp: new Date()
        };
      }
      
      throw error;
    } finally {
      this.updateResponseTime(Date.now() - startTime);
    }
  }

  /**
   * Set cached value with automatic JSON serialization
    */
  protected async setCached<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const fullKey = this.buildCacheKey(key);
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || this.cacheOptions.ttlSeconds;
      
      const result = await redisClient.set(fullKey, serialized, ttl);
      
      if (result) {
        this.logger.debug('Cache set', { key: fullKey, ttl });
      }
      
      return result;
    } catch (error) {
      this.updateMetrics('error');
      this.logger.error('Cache set error', { key, error });
      
      if (!this.cacheOptions.fallbackOnError) {
        throw error;
      }
      
      return false;
    }
  }

  /**
   * Delete cached value
    */
  protected async deleteCached(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildCacheKey(key);
      const result = await redisClient.del(fullKey);
      
      this.logger.debug('Cache delete', { key: fullKey, deleted: result });
      return result;
    } catch (error) {
      this.updateMetrics('error');
      this.logger.error('Cache delete error', { key, error });
      
      if (!this.cacheOptions.fallbackOnError) {
        throw error;
      }
      
      return false;
    }
  }

  /**
   * Get or set cached value with factory function
    */
  protected async getCachedOrFetch<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<CacheResult<T>> {
    // Try to get from cache first
    const cached = await this.getCached<T>(key);
    
    if (cached.cached && cached.data !== null) {
      return cached;
    }

    // Fetch fresh data
    try {
      const freshData = await factory();
      
      // Cache the fresh data
      await this.setCached(key, freshData, ttlSeconds);
      
      return {
        data: freshData,
        cached: false,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Factory function failed', { key, error });
      throw error;
    }
  }

  /**
   * Batch cache operations
    */
  protected async getCachedBatch<T>(
    keys: string[]
  ): Promise<{ [key: string]: CacheResult<T> }> {
    if (keys.length === 0) return {};

    try {
      const fullKeys = keys.map(key => this.buildCacheKey(key));
      const values = await redisClient.mget(fullKeys);
      
      const results: { [key: string]: CacheResult<T> } = {};
      
      keys.forEach((originalKey, index) => {
        const value = values[index];
        
        if (value) {
          this.updateMetrics('hit');
          results[originalKey] = {
            data: JSON.parse(value) as T,
            cached: true,
            timestamp: new Date()
          };
        } else {
          this.updateMetrics('miss');
          results[originalKey] = {
            data: null,
            cached: false,
            timestamp: new Date()
          };
        }
        
        this.updateMetrics('request');
      });
      
      return results;
    } catch (error) {
      this.updateMetrics('error', keys.length);
      this.logger.error('Batch cache get error', { keys, error });
      
      if (!this.cacheOptions.fallbackOnError) {
        throw error;
      }
      
      // Return empty results on error with fallback
      return keys.reduce((acc, key) => {
        acc[key] = {
          data: null,
          cached: false,
          timestamp: new Date()
        };
        return acc;
      }, {} as { [key: string]: CacheResult<T> });
    }
  }

  /**
   * Invalidate cache by pattern
    */
  protected async invalidateCachePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildCacheKey(pattern);
      const deleted = await redisClient.delPattern(fullPattern);
      
      this.logger.debug('Cache pattern invalidated', { pattern: fullPattern, deleted });
      return deleted;
    } catch (error) {
      this.updateMetrics('error');
      this.logger.error('Cache pattern invalidation error', { pattern, error });
      
      if (!this.cacheOptions.fallbackOnError) {
        throw error;
      }
      
      return 0;
    }
  }

  /**
   * Check if key exists in cache
    */
  protected async cacheExists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildCacheKey(key);
      return await redisClient.exists(fullKey);
    } catch (error) {
      this.updateMetrics('error');
      this.logger.error('Cache exists check error', { key, error });
      return false;
    }
  }

  /**
   * Set TTL for existing key
    */
  protected async setCacheTTL(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const fullKey = this.buildCacheKey(key);
      return await redisClient.expire(fullKey, ttlSeconds);
    } catch (error) {
      this.updateMetrics('error');
      this.logger.error('Cache TTL set error', { key, ttlSeconds, error });
      return false;
    }
  }

  /**
   * Get cache performance metrics
    */
  protected getCacheMetrics(): CacheMetricsData {
    return { ...this.cacheMetrics };
  }

  /**
   * Get cache hit rate
    */
  protected getCacheHitRate(): number {
    if (this.cacheMetrics.totalRequests === 0) return 0;
    return this.cacheMetrics.hits / this.cacheMetrics.totalRequests;
  }

  /**
   * Reset cache metrics
    */
  protected resetCacheMetrics(): void {
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      responseTime: 0
    };
  }

  // Private helper methods

  private buildCacheKey(key: string): string {
    return `${this.cacheOptions.keyPrefix}:${key}`;
  }

  private updateMetrics(type: 'hit' | 'miss' | 'error' | 'request', count: number = 1): void {
    if (!this.cacheOptions.enableMetrics) return;
    
    switch (type) {
      case 'hit':
        this.cacheMetrics.hits += count;
        break;
      case 'miss':
        this.cacheMetrics.misses += count;
        break;
      case 'error':
        this.cacheMetrics.errors += count;
        break;
      case 'request':
        this.cacheMetrics.totalRequests += count;
        break;
    }
  }

  private updateResponseTime(responseTime: number): void {
    if (!this.cacheOptions.enableMetrics) return;
    
    // Exponential moving average
    this.cacheMetrics.responseTime = 
      (this.cacheMetrics.responseTime * 0.9) + (responseTime * 0.1);
  }
}

/**
 * Factory function to create cacheable mixin
  */
export function createCacheableMixin(
  logger: Logger,
  options?: CacheOptions
): CacheableMixin {
  return new CacheableMixin(logger, options);
}