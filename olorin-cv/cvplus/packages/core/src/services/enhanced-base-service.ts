/**
 * Enhanced Base Service - Improved base service with integrated mixins
 * 
 * Extends the original BaseService with integrated caching, database,
 * and API client functionality through composition patterns.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { BaseService, ServiceConfig, ServiceHealth } from './base-service';
import { CacheableMixin, CacheOptions, CacheResult } from './cache-mixin';
import { DatabaseMixin, DatabaseOptions, QueryResult, QueryFilter } from './database-mixin';
import { ApiClientMixin, ApiClientOptions, ApiResponse } from './api-client-mixin';

export interface EnhancedServiceConfig extends ServiceConfig {
  cache?: CacheOptions;
  database?: DatabaseOptions;
  apiClient?: ApiClientOptions;
  enableMixins?: {
    cache?: boolean;
    database?: boolean;
    apiClient?: boolean;
  };
}

/**
 * Enhanced Base Service with integrated mixins
  */
export abstract class EnhancedBaseService extends BaseService {
  protected cacheService?: CacheableMixin;
  protected databaseService?: DatabaseMixin;
  protected apiClientService?: ApiClientMixin;
  protected enhancedConfig: EnhancedServiceConfig;

  constructor(config: EnhancedServiceConfig) {
    super(config);
    this.enhancedConfig = config;
    
    // Initialize mixins based on configuration
    this.initializeMixins();
  }

  /**
   * Initialize mixins based on configuration
    */
  private initializeMixins(): void {
    const enableMixins = this.enhancedConfig.enableMixins || {
      cache: true,
      database: true,
      apiClient: true
    };

    if (enableMixins.cache) {
      this.cacheService = new CacheableMixin(
        this.logger, 
        {
          keyPrefix: `${this.config.name.toLowerCase()}`,
          ...this.enhancedConfig.cache
        }
      );
    }

    if (enableMixins.database) {
      this.databaseService = new DatabaseMixin(
        this.logger, 
        this.enhancedConfig.database
      );
    }

    if (enableMixins.apiClient) {
      this.apiClientService = new ApiClientMixin(
        this.logger, 
        this.enhancedConfig.apiClient
      );
    }
  }

  // Cache service proxy methods

  /**
   * Get cached value with automatic JSON parsing
    */
  protected async getCached<T>(key: string, defaultValue?: T): Promise<CacheResult<T>> {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['getCached'](key, defaultValue);
  }

  /**
   * Set cached value with automatic JSON serialization
    */
  protected async setCached<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['setCached'](key, value, ttlSeconds);
  }

  /**
   * Get or set cached value with factory function
    */
  protected async getCachedOrFetch<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<CacheResult<T>> {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['getCachedOrFetch'](key, factory, ttlSeconds);
  }

  /**
   * Delete cached value
    */
  protected async deleteCached(key: string): Promise<boolean> {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['deleteCached'](key);
  }

  /**
   * Invalidate cache by pattern
    */
  protected async invalidateCachePattern(pattern: string): Promise<number> {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['invalidateCachePattern'](pattern);
  }

  /**
   * Get cache performance metrics
    */
  protected getCacheMetrics() {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['getCacheMetrics']();
  }

  /**
   * Get cache hit rate
    */
  protected getCacheHitRate(): number {
    if (!this.cacheService) {
      throw new Error('Cache service not enabled. Set enableMixins.cache = true in config.');
    }
    return this.cacheService['getCacheHitRate']();
  }

  // Database service proxy methods

  /**
   * Get document by ID with optional caching
    */
  protected async getDocument<T>(
    collection: string,
    documentId: string,
    useCache: boolean = false
  ): Promise<T | null> {
    if (!this.databaseService) {
      throw new Error('Database service not enabled. Set enableMixins.database = true in config.');
    }
    return this.databaseService['getDocument'](collection, documentId, useCache);
  }

  /**
   * Create document with auto-generated or custom ID
    */
  protected async createDocument<T>(
    collection: string,
    data: Partial<T>,
    documentId?: string
  ): Promise<{ id: string; data: T }> {
    if (!this.databaseService) {
      throw new Error('Database service not enabled. Set enableMixins.database = true in config.');
    }
    return this.databaseService['createDocument'](collection, data, documentId);
  }

  /**
   * Update document with optimistic locking
    */
  protected async updateDocument<T>(
    collection: string,
    documentId: string,
    updates: Partial<T>,
    useTransaction: boolean = false
  ): Promise<T> {
    if (!this.databaseService) {
      throw new Error('Database service not enabled. Set enableMixins.database = true in config.');
    }
    return this.databaseService['updateDocument'](collection, documentId, updates, useTransaction);
  }

  /**
   * Delete document
    */
  protected async deleteDocument(
    collection: string,
    documentId: string,
    softDelete: boolean = false
  ): Promise<boolean> {
    if (!this.databaseService) {
      throw new Error('Database service not enabled. Set enableMixins.database = true in config.');
    }
    return this.databaseService['deleteDocument'](collection, documentId, softDelete);
  }

  /**
   * Query documents with pagination
    */
  protected async queryDocuments<T>(
    collection: string,
    filters?: QueryFilter[],
    orderBy?: { field: string; direction: 'asc' | 'desc' }[],
    limit?: number,
    startAfter?: any
  ): Promise<QueryResult<T>> {
    if (!this.databaseService) {
      throw new Error('Database service not enabled. Set enableMixins.database = true in config.');
    }
    return this.databaseService['queryDocuments'](collection, filters, orderBy, limit, startAfter);
  }

  /**
   * Count documents matching query
    */
  protected async countDocuments(
    collection: string,
    filters?: QueryFilter[]
  ): Promise<number> {
    if (!this.databaseService) {
      throw new Error('Database service not enabled. Set enableMixins.database = true in config.');
    }
    return this.databaseService['countDocuments'](collection, filters);
  }

  // API client service proxy methods

  /**
   * GET request with retry and rate limiting
    */
  protected async apiGet<T = any>(url: string, options?: any): Promise<ApiResponse<T>> {
    if (!this.apiClientService) {
      throw new Error('API client service not enabled. Set enableMixins.apiClient = true in config.');
    }
    return this.apiClientService['apiGet'](url, options);
  }

  /**
   * POST request with retry and rate limiting
    */
  protected async apiPost<T = any>(url: string, data?: any, options?: any): Promise<ApiResponse<T>> {
    if (!this.apiClientService) {
      throw new Error('API client service not enabled. Set enableMixins.apiClient = true in config.');
    }
    return this.apiClientService['apiPost'](url, data, options);
  }

  /**
   * PUT request with retry and rate limiting
    */
  protected async apiPut<T = any>(url: string, data?: any, options?: any): Promise<ApiResponse<T>> {
    if (!this.apiClientService) {
      throw new Error('API client service not enabled. Set enableMixins.apiClient = true in config.');
    }
    return this.apiClientService['apiPut'](url, data, options);
  }

  /**
   * DELETE request with retry and rate limiting
    */
  protected async apiDelete<T = any>(url: string, options?: any): Promise<ApiResponse<T>> {
    if (!this.apiClientService) {
      throw new Error('API client service not enabled. Set enableMixins.apiClient = true in config.');
    }
    return this.apiClientService['apiDelete'](url, options);
  }

  /**
   * Enhanced health check including mixin health
    */
  async healthCheck(): Promise<ServiceHealth> {
    const baseHealth = await super.healthCheck();
    
    try {
      const mixinHealth: any = {};
      
      if (this.cacheService) {
        mixinHealth.cache = this.getCacheMetrics();
      }
      
      if (this.apiClientService) {
        mixinHealth.rateLimit = this.apiClientService['getRateLimitStatus']();
      }
      
      return {
        ...baseHealth,
        metrics: {
          ...baseHealth.metrics,
          mixins: mixinHealth
        }
      };
    } catch (error) {
      this.logger.error('Mixin health check failed', { error });
      return {
        ...baseHealth,
        status: 'degraded',
        errors: [...(baseHealth.errors || []), 'Mixin health check failed']
      };
    }
  }

  /**
   * Warm cache with common data patterns
    */
  protected async warmCache(patterns: string[]): Promise<void> {
    if (!this.cacheService) {
      this.logger.warn('Cache service not enabled, skipping cache warm-up');
      return;
    }
    
    this.logger.info('Warming cache', { patterns });
    
    for (const pattern of patterns) {
      try {
        await this.warmCachePattern(pattern);
      } catch (error) {
        this.logger.warn('Failed to warm cache pattern', { pattern, error });
      }
    }
  }

  /**
   * Abstract method for cache warming - implement in concrete services
    */
  protected async warmCachePattern(pattern: string): Promise<void> {
    // Default implementation does nothing
    // Override in concrete services to implement specific warm-up logic
    this.logger.debug('No cache warm-up implementation for pattern', { pattern });
  }

  /**
   * Get service status summary
    */
  getServiceStatus(): {
    name: string;
    version: string;
    initialized: boolean;
    enabled: boolean;
    mixins: {
      cache: boolean;
      database: boolean;
      apiClient: boolean;
    };
  } {
    return {
      name: this.name,
      version: this.version,
      initialized: this.isInitialized,
      enabled: this.isEnabled,
      mixins: {
        cache: !!this.cacheService,
        database: !!this.databaseService,
        apiClient: !!this.apiClientService
      }
    };
  }
}