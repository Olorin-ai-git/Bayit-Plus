/**
 * Cache Utilities
 * 
 * In-memory caching utilities for authentication data.
  */

import { logger } from './logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestItem?: number;
  newestItem?: number;
}

/**
 * Enhanced in-memory cache with TTL and size limits
  */
export class EnhancedCache<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private options: Required<CacheOptions>;
  private stats = { hits: 0, misses: 0 };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize || 1000, // 1000 items default
      cleanupInterval: options.cleanupInterval || 60 * 1000 // 1 minute default
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Set an item in the cache
    */
  set(key: string, value: T, ttl?: number): void {
    try {
      const now = Date.now();
      const itemTtl = ttl || this.options.ttl;

      // Remove oldest items if cache is full
      if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
        this.evictOldestItems(Math.floor(this.options.maxSize * 0.1)); // Remove 10% of items
      }

      const item: CacheItem<T> = {
        data: value,
        timestamp: now,
        ttl: itemTtl,
        accessCount: 0,
        lastAccessed: now
      };

      this.cache.set(key, item);
      
      logger.debug('Item cached', { 
        key, 
        ttl: itemTtl, 
        cacheSize: this.cache.size 
      });
    } catch (error) {
      logger.error('Failed to cache item:', error);
    }
  }

  /**
   * Get an item from the cache
    */
  get(key: string): T | null {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        return null;
      }

      const now = Date.now();
      
      // Check if item has expired
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        logger.debug('Expired item removed from cache', { key });
        return null;
      }

      // Update access stats
      item.accessCount++;
      item.lastAccessed = now;
      this.stats.hits++;

      return item.data;
    } catch (error) {
      logger.error('Failed to get item from cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if an item exists in the cache (without updating access stats)
    */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an item from the cache
    */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      logger.debug('Item removed from cache', { key });
    }
    return result;
  }

  /**
   * Clear all items from the cache
    */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    
    logger.debug('Cache cleared', { previousSize });
  }

  /**
   * Get cache statistics
    */
  getStats(): CacheStats {
    const items = Array.from(this.cache.values());
    const timestamps = items.map(item => item.timestamp);
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }

  /**
   * Get all cache keys
    */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
    */
  size(): number {
    return this.cache.size;
  }

  /**
   * Manually trigger cleanup of expired items
    */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug('Cache cleanup completed', { 
        removedCount, 
        remainingItems: this.cache.size 
      });
    }
    
    return removedCount;
  }

  /**
   * Update TTL for an existing item
    */
  updateTtl(key: string, newTtl: number): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Check if not expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    item.ttl = newTtl;
    return true;
  }

  /**
   * Get item metadata without updating access stats
    */
  getMetadata(key: string): Pick<CacheItem<T>, 'timestamp' | 'ttl' | 'accessCount' | 'lastAccessed'> | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    return {
      timestamp: item.timestamp,
      ttl: item.ttl,
      accessCount: item.accessCount,
      lastAccessed: item.lastAccessed
    };
  }

  /**
   * Private method to start periodic cleanup
    */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Private method to evict oldest items when cache is full
    */
  private evictOldestItems(count: number): void {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, timestamp: item.timestamp, accessCount: item.accessCount }))
      .sort((a, b) => {
        // Sort by access count (ascending) then by timestamp (ascending)
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.timestamp - b.timestamp;
      });
    
    const itemsToRemove = items.slice(0, count);
    
    itemsToRemove.forEach(({ key }) => {
      this.cache.delete(key);
    });
    
    logger.debug('Evicted oldest items from cache', { 
      evictedCount: itemsToRemove.length,
      remainingItems: this.cache.size 
    });
  }

  /**
   * Destroy the cache and stop cleanup timer
    */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.clear();
    logger.debug('Cache destroyed');
  }
}

/**
 * Cache specifically for authentication tokens
  */
export class TokenCache extends EnhancedCache<string> {
  constructor() {
    super({
      ttl: 50 * 60 * 1000, // 50 minutes (less than typical 1-hour token expiry)
      maxSize: 100, // Reasonable for auth tokens
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    });
  }

  /**
   * Set a token with custom expiry time
    */
  setToken(userId: string, token: string, expiresAt: number): void {
    const ttl = Math.max(0, expiresAt - Date.now() - (5 * 60 * 1000)); // 5 minute buffer
    this.set(userId, token, ttl);
  }

  /**
   * Get a token if it's still valid
    */
  getToken(userId: string): string | null {
    return this.get(userId);
  }

  /**
   * Check if a token exists and is valid
    */
  hasValidToken(userId: string): boolean {
    return this.has(userId);
  }

  /**
   * Remove a specific user's token
    */
  removeToken(userId: string): boolean {
    return this.delete(userId);
  }
}

/**
 * Cache for session data
  */
export class SessionCache extends EnhancedCache<any> {
  constructor() {
    super({
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 50, // Smaller cache for session data
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    });
  }
}

/**
 * Cache for permission data
  */
export class PermissionCache extends EnhancedCache<any> {
  constructor() {
    super({
      ttl: 15 * 60 * 1000, // 15 minutes (permissions can change)
      maxSize: 200, // Room for many users' permissions
      cleanupInterval: 3 * 60 * 1000 // 3 minutes
    });
  }
}

// Default cache instances
export const tokenCache = new TokenCache();
export const sessionCache = new SessionCache();
export const permissionCache = new PermissionCache();

/**
 * Get overall cache statistics
  */
export function getAllCacheStats(): {
  tokens: CacheStats;
  sessions: CacheStats;
  permissions: CacheStats;
} {
  return {
    tokens: tokenCache.getStats(),
    sessions: sessionCache.getStats(),
    permissions: permissionCache.getStats()
  };
}

/**
 * Clear all caches
  */
export function clearAllCaches(): void {
  tokenCache.clear();
  sessionCache.clear();
  permissionCache.clear();
  
  logger.info('All authentication caches cleared');
}

/**
 * Cleanup all caches
  */
export function cleanupAllCaches(): { tokens: number; sessions: number; permissions: number } {
  return {
    tokens: tokenCache.cleanup(),
    sessions: sessionCache.cleanup(),
    permissions: permissionCache.cleanup()
  };
}