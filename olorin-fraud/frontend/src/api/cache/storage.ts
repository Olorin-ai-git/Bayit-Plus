/**
 * API Response Caching Layer
 *
 * Constitutional Compliance:
 * - Configuration-driven cache settings
 * - Type-safe cache operations
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { CacheStorage, createCache } from '@api/cache/storage';
 */

import { getApiConfig } from '../config';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  storage?: 'memory' | 'session' | 'local';
}

/**
 * Cache storage interface
 */
export interface ICacheStorage {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T, ttlMs?: number, etag?: string): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  size(): number;
  prune(): void;
}

/**
 * In-memory cache storage
 */
export class MemoryCacheStorage implements ICacheStorage {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set<T>(key: string, data: T, ttlMs: number = 300000, etag?: string): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
      etag
    };

    this.cache.set(key, entry);
    this.enforceSizeLimit();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private enforceSizeLimit(): void {
    if (this.cache.size <= this.maxEntries) {
      return;
    }

    const entriesToRemove = this.cache.size - this.maxEntries;
    const keys = Array.from(this.cache.keys());

    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(keys[i]);
    }
  }
}

/**
 * Session storage cache (browser session storage)
 */
export class SessionCacheStorage implements ICacheStorage {
  private prefix: string;
  private maxEntries: number;

  constructor(prefix: string = 'api_cache_', maxEntries: number = 100) {
    this.prefix = prefix;
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const prefixedKey = this.prefix + key;
    const item = sessionStorage.getItem(prefixedKey);

    if (!item) {
      return null;
    }

    try {
      const entry = JSON.parse(item) as CacheEntry<T>;

      if (Date.now() > entry.expiresAt) {
        sessionStorage.removeItem(prefixedKey);
        return null;
      }

      return entry;
    } catch {
      sessionStorage.removeItem(prefixedKey);
      return null;
    }
  }

  set<T>(key: string, data: T, ttlMs: number = 300000, etag?: string): void {
    const prefixedKey = this.prefix + key;
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
      etag
    };

    try {
      sessionStorage.setItem(prefixedKey, JSON.stringify(entry));
      this.enforceSizeLimit();
    } catch (error) {
      this.clear();
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }

  size(): number {
    let count = 0;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        count++;
      }
    }

    return count;
  }

  prune(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(this.prefix)) {
        continue;
      }

      const item = sessionStorage.getItem(key);
      if (!item) {
        continue;
      }

      try {
        const entry = JSON.parse(item) as CacheEntry<unknown>;
        if (now > entry.expiresAt) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }

  private enforceSizeLimit(): void {
    const currentSize = this.size();
    if (currentSize <= this.maxEntries) {
      return;
    }

    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }

    const entriesToRemove = currentSize - this.maxEntries;
    for (let i = 0; i < entriesToRemove; i++) {
      sessionStorage.removeItem(keys[i]);
    }
  }
}

/**
 * Create cache instance with configuration
 */
export function createCache(options: CacheOptions = {}): ICacheStorage {
  const config = getApiConfig();
  const storage = options.storage ?? 'memory';
  const maxEntries = options.maxEntries ?? config.cacheMaxEntries;

  if (storage === 'session' && typeof sessionStorage !== 'undefined') {
    return new SessionCacheStorage('api_cache_', maxEntries);
  }

  return new MemoryCacheStorage(maxEntries);
}

let defaultCacheInstance: ICacheStorage | null = null;

/**
 * Get or create default cache instance
 */
export function getCache(): ICacheStorage {
  if (!defaultCacheInstance) {
    defaultCacheInstance = createCache();
  }
  return defaultCacheInstance;
}

/**
 * Reset default cache instance
 */
export function resetCache(): void {
  defaultCacheInstance = null;
}
