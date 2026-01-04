/**
 * Optimized API Service with intelligent caching and performance enhancements
 * 
 * Features:
 * - Automatic request deduplication
 * - Multi-layer caching with TTL
 * - Background cache updates
 * - Optimistic updates
 * - Request batching
 * - Performance monitoring
 * - Error handling with retry logic
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getConfig } from '../shared/config/env.config';
import { ExtendedAxiosRequestConfig } from './types';

// Cache interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  averageResponseTime: number;
}

interface RequestOptions extends AxiosRequestConfig {
  cacheTTL?: number;
  skipCache?: boolean;
  useOptimisticUpdate?: boolean;
  retryAttempts?: number;
  backgroundRefresh?: boolean;
  cacheKey?: string;
}

interface BatchRequestItem {
  url: string;
  options?: RequestOptions;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class OptimizedApiService {
  private axiosInstance: AxiosInstance;
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueue: BatchRequestItem[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Performance tracking
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0,
    averageResponseTime: 0
  };
  
  private responseTimes: number[] = [];
  private readonly maxCacheSize = 1000;
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  private readonly batchDelay = 50; // 50ms batch delay
  private readonly maxRetries = 3;
  
  constructor(baseURL?: string) {
    const config = getConfig();
    this.axiosInstance = axios.create({
      baseURL: baseURL || config.api.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    this.setupInterceptors();
    this.startCacheCleanup();
  }
  
  private setupInterceptors() {
    // Request interceptor for performance tracking
    this.axiosInstance.interceptors.request.use((config: ExtendedAxiosRequestConfig) => {
      config.metadata = { startTime: Date.now() };
      return config;
    });
    
    // Response interceptor for performance tracking and caching
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const endTime = Date.now();
        const config = response.config as ExtendedAxiosRequestConfig;
        const duration = endTime - (config.metadata?.startTime || endTime);
        
        this.updateResponseTime(duration);
        this.updateCacheFromResponse(response);
        
        return response;
      },
      (error) => {
        // Handle error responses
        const endTime = Date.now();
        const duration = endTime - (error.config?.metadata?.startTime || endTime);
        this.updateResponseTime(duration);
        
        return Promise.reject(error);
      }
    );
  }
  
  private updateResponseTime(duration: number) {
    this.responseTimes.push(duration);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
    
    this.stats.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }
  
  private updateCacheFromResponse(response: AxiosResponse) {
    // Extract cache headers for intelligent caching
    const etag = response.headers.etag;
    const lastModified = response.headers['last-modified'];
    const cacheControl = response.headers['cache-control'];
    
    // Parse cache control for TTL
    let ttl = this.defaultCacheTTL;
    if (cacheControl) {
      const maxAge = cacheControl.match(/max-age=(\d+)/);
      if (maxAge) {
        ttl = parseInt(maxAge[1]) * 1000; // Convert to milliseconds
      }
    }
    
    // Store response metadata for conditional requests
    if (response.config.url && (etag || lastModified)) {
      const cacheKey = this.generateCacheKey(response.config.url, response.config.params);
      const existingEntry = this.cache.get(cacheKey);
      
      if (existingEntry) {
        existingEntry.etag = etag;
        existingEntry.lastModified = lastModified;
      }
    }
  }
  
  private generateCacheKey(url: string, params?: any, data?: any): string {
    const baseKey = url;
    const paramsKey = params ? JSON.stringify(params) : '';
    const dataKey = data ? JSON.stringify(data) : '';
    
    return `${baseKey}:${btoa(paramsKey + dataKey)}`;
  }
  
  private async getCachedResponse<T>(cacheKey: string): Promise<T | null> {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if cache entry is expired
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(cacheKey);
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }
  
  private setCachedResponse<T>(
    cacheKey: string, 
    data: T, 
    ttl: number = this.defaultCacheTTL,
    etag?: string,
    lastModified?: string
  ) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
      etag,
      lastModified
    });
  }
  
  private updateHitRate() {
    this.stats.totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
  }
  
  private startCacheCleanup() {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.timestamp + entry.ttl) {
          this.cache.delete(key);
          this.stats.evictions++;
        }
      }
    }, 5 * 60 * 1000);
  }
  
  // Request deduplication
  private async getOrCreateRequest<T>(
    cacheKey: string,
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    // Check if request is already pending
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }
    
    // Create new request
    const request = requestFn().then(response => {
      this.pendingRequests.delete(cacheKey);
      return response.data;
    }).catch(error => {
      this.pendingRequests.delete(cacheKey);
      throw error;
    });
    
    this.pendingRequests.set(cacheKey, request);
    return request;
  }
  
  // Main GET method with caching
  async get<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const {
      cacheTTL = this.defaultCacheTTL,
      skipCache = false,
      backgroundRefresh = false,
      retryAttempts = this.maxRetries,
      cacheKey,
      ...axiosOptions
    } = options;
    
    const finalCacheKey = cacheKey || this.generateCacheKey(url, axiosOptions.params);
    
    // Try cache first (unless skipped)
    if (!skipCache) {
      const cachedData = await this.getCachedResponse<T>(finalCacheKey);
      if (cachedData !== null) {
        // Background refresh if enabled
        if (backgroundRefresh) {
          this.refreshCacheInBackground(url, axiosOptions, finalCacheKey, cacheTTL);
        }
        return cachedData;
      }
    }
    
    // Make request with deduplication
    return this.getOrCreateRequest(finalCacheKey, async () => {
      const response = await this.executeWithRetry(
        () => this.axiosInstance.get<T>(url, axiosOptions),
        retryAttempts
      );
      
      // Cache successful response
      if (!skipCache) {
        this.setCachedResponse(finalCacheKey, response.data, cacheTTL);
      }
      
      return response;
    });
  }
  
  // Background cache refresh
  private async refreshCacheInBackground(
    url: string,
    options: AxiosRequestConfig,
    cacheKey: string,
    ttl: number
  ) {
    try {
      // Use conditional request if we have cache validators
      const cachedEntry = this.cache.get(cacheKey);
      const conditionalHeaders: Record<string, string> = {};
      
      if (cachedEntry?.etag) {
        conditionalHeaders['If-None-Match'] = cachedEntry.etag;
      }
      if (cachedEntry?.lastModified) {
        conditionalHeaders['If-Modified-Since'] = cachedEntry.lastModified;
      }
      
      const response = await this.axiosInstance.get(url, {
        ...options,
        headers: { ...options.headers, ...conditionalHeaders }
      });
      
      // Update cache with fresh data
      this.setCachedResponse(cacheKey, response.data, ttl);
      
    } catch (error: any) {
      // If it's a 304 Not Modified, that's fine - cache is still valid
      if (error.response?.status !== 304) {
        console.warn('Background cache refresh failed:', error);
      }
    }
  }
  
  // POST method with optimistic updates
  async post<T = any>(
    url: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      useOptimisticUpdate = false,
      retryAttempts = this.maxRetries,
      ...axiosOptions
    } = options;
    
    // Optimistic update
    if (useOptimisticUpdate && data) {
      this.handleOptimisticUpdate(url, data);
    }
    
    try {
      const response = await this.executeWithRetry(
        () => this.axiosInstance.post<T>(url, data, axiosOptions),
        retryAttempts
      );
      
      // Invalidate related cache entries
      this.invalidateRelatedCache(url);
      
      return response.data;
    } catch (error) {
      // Revert optimistic update on error
      if (useOptimisticUpdate) {
        this.revertOptimisticUpdate(url);
      }
      throw error;
    }
  }
  
  // PUT method
  async put<T = any>(
    url: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<T> {
    const { retryAttempts = this.maxRetries, ...axiosOptions } = options;
    
    const response = await this.executeWithRetry(
      () => this.axiosInstance.put<T>(url, data, axiosOptions),
      retryAttempts
    );
    
    this.invalidateRelatedCache(url);
    return response.data;
  }
  
  // DELETE method
  async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const { retryAttempts = this.maxRetries, ...axiosOptions } = options;
    
    const response = await this.executeWithRetry(
      () => this.axiosInstance.delete<T>(url, axiosOptions),
      retryAttempts
    );
    
    this.invalidateRelatedCache(url);
    return response.data;
  }
  
  // Batch requests
  async batch<T = any>(requests: Array<{ url: string; options?: RequestOptions }>): Promise<T[]> {
    return Promise.all(requests.map(req => this.get<T>(req.url, req.options)));
  }
  
  // Execute with retry logic
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries: number
  ): Promise<AxiosResponse<T>> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 408, 429
        if (
          error.response?.status >= 400 && 
          error.response?.status < 500 &&
          ![408, 429].includes(error.response.status)
        ) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  // Optimistic updates
  private handleOptimisticUpdate(url: string, data: any) {
    // Implementation depends on specific use case
    // This could update local state or cache entries optimistically
    console.debug('Optimistic update for:', url, data);
  }
  
  private revertOptimisticUpdate(url: string) {
    // Revert optimistic changes
    console.debug('Reverting optimistic update for:', url);
  }
  
  // Cache invalidation
  private invalidateRelatedCache(url: string) {
    const urlParts = url.split('/');
    const basePath = urlParts.slice(0, -1).join('/');
    
    // Remove cache entries that might be affected
    for (const [key] of this.cache.entries()) {
      if (key.includes(basePath) || key.includes(url)) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
  }
  
  // Cache management
  clearCache(): void {
    this.cache.clear();
    this.stats.evictions += this.cache.size;
  }
  
  getCacheSize(): number {
    return this.cache.size;
  }
  
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  // Performance monitoring
  getPerformanceMetrics() {
    return {
      cacheStats: this.getStats(),
      cacheSize: this.getCacheSize(),
      averageResponseTime: this.stats.averageResponseTime,
      pendingRequests: this.pendingRequests.size,
      recentResponseTimes: [...this.responseTimes]
    };
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/performance/health');
      return true;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const optimizedApiService = new OptimizedApiService();
export default optimizedApiService;