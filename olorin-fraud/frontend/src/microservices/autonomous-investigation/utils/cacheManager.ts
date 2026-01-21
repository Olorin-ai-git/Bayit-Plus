/**
 * Cache Manager
 * Advanced caching strategies for large investigation datasets
 */

import { Investigation, Evidence, Domain } from '../types';

// Cache configuration
interface CacheConfig {
  maxMemoryMB: number;
  maxItems: number;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  ttlMinutes: number;
  cleanupIntervalMinutes: number;
}

// Cache item metadata
interface CacheItem<T = any> {
  key: string;
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  sizeBytes: number;
  compressed: boolean;
  ttl?: number;
}

// Cache statistics
interface CacheStats {
  totalItems: number;
  totalSizeBytes: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsageMB: number;
  oldestItemAge: number;
  mostAccessedKey: string;
}

/**
 * Advanced cache manager with compression and intelligent eviction
 */
export class CacheManager {
  private cache = new Map<string, CacheItem>();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private config: CacheConfig) {
    this.startCleanupTimer();
  }

  /**
   * Store item in cache with optional compression
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      compress?: boolean;
    } = {}
  ): Promise<void> {
    const now = Date.now();
    let processedData = data;
    let compressed = false;
    let sizeBytes = this.estimateSize(data);

    // Compress large items if enabled
    if (
      (options.compress ?? this.config.compressionEnabled) &&
      sizeBytes > 10 * 1024 // 10KB threshold
    ) {
      try {
        processedData = await this.compress(data);
        compressed = true;
        sizeBytes = this.estimateSize(processedData);
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    const item: CacheItem<T> = {
      key,
      data: processedData,
      timestamp: now,
      lastAccessed: now,
      accessCount: 0,
      sizeBytes,
      compressed,
      ttl: options.ttl,
    };

    // Check if we need to evict items first
    await this.ensureCapacity(sizeBytes);

    this.cache.set(key, item);

    // Persist to localStorage if enabled
    if (this.config.persistenceEnabled) {
      this.persistItem(key, item);
    }
  }

  /**
   * Retrieve item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      this.stats.misses++;

      // Try to load from persistence
      if (this.config.persistenceEnabled) {
        const persistedItem = await this.loadPersistedItem<T>(key);
        if (persistedItem) {
          this.cache.set(key, persistedItem);
          return this.processGetResult(persistedItem);
        }
      }

      return null;
    }

    // Check TTL
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return this.processGetResult(item);
  }

  /**
   * Get multiple items with batch optimization
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missingKeys: string[] = [];

    // Check cache first
    for (const key of keys) {
      const item = this.cache.get(key) as CacheItem<T> | undefined;

      if (item && !this.isExpired(item)) {
        const data = await this.processGetResult(item);
        if (data !== null) {
          results.set(key, data);
        }
      } else {
        missingKeys.push(key);
      }
    }

    // Try to load missing items from persistence
    if (this.config.persistenceEnabled && missingKeys.length > 0) {
      const persistedItems = await Promise.all(
        missingKeys.map(key => this.loadPersistedItem<T>(key))
      );

      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i];
        const item = persistedItems[i];

        if (item) {
          this.cache.set(key, item);
          const data = await this.processGetResult(item);
          if (data !== null) {
            results.set(key, data);
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && !this.isExpired(item);
  }

  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (this.config.persistenceEnabled) {
      this.removePersistedItem(key);
    }

    return deleted;
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };

    if (this.config.persistenceEnabled) {
      this.clearPersistedItems();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const items = Array.from(this.cache.values());
    const totalSizeBytes = items.reduce((sum, item) => sum + item.sizeBytes, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    let oldestItemAge = 0;
    let mostAccessedKey = '';
    let maxAccessCount = 0;

    const now = Date.now();
    items.forEach(item => {
      const age = now - item.timestamp;
      if (age > oldestItemAge) {
        oldestItemAge = age;
      }

      if (item.accessCount > maxAccessCount) {
        maxAccessCount = item.accessCount;
        mostAccessedKey = item.key;
      }
    });

    return {
      totalItems: this.cache.size,
      totalSizeBytes,
      hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsageMB: totalSizeBytes / (1024 * 1024),
      oldestItemAge,
      mostAccessedKey,
    };
  }

  /**
   * Manually trigger cleanup
   */
  cleanup(): void {
    const now = Date.now();
    const itemsToDelete: string[] = [];

    for (const [key, item] of this.cache) {
      if (this.isExpired(item)) {
        itemsToDelete.push(key);
      }
    }

    itemsToDelete.forEach(key => this.delete(key));

    // Additional memory pressure cleanup
    const stats = this.getStats();
    if (stats.memoryUsageMB > this.config.maxMemoryMB) {
      this.evictLeastRecentlyUsed(stats.memoryUsageMB - this.config.maxMemoryMB);
    }
  }

  /**
   * Invalidate items by pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  /**
   * Preload data into cache
   */
  async preload<T>(items: Array<{ key: string; data: T }>): Promise<void> {
    const promises = items.map(({ key, data }) => this.set(key, data));
    await Promise.all(promises);
  }

  private async processGetResult<T>(item: CacheItem<T>): Promise<T> {
    // Update access metadata
    item.lastAccessed = Date.now();
    item.accessCount++;

    let data = item.data;

    // Decompress if needed
    if (item.compressed) {
      try {
        data = await this.decompress(data);
      } catch (error) {
        console.error('Decompression failed:', error);
        this.delete(item.key);
        return null as T;
      }
    }

    return data;
  }

  private isExpired(item: CacheItem): boolean {
    if (!item.ttl) {
      // Use global TTL if no item-specific TTL
      const globalTtl = this.config.ttlMinutes * 60 * 1000;
      return Date.now() - item.timestamp > globalTtl;
    }

    return Date.now() - item.timestamp > item.ttl;
  }

  private async ensureCapacity(newItemSize: number): Promise<void> {
    const stats = this.getStats();
    const projectedSize = stats.totalSizeBytes + newItemSize;
    const maxSizeBytes = this.config.maxMemoryMB * 1024 * 1024;

    // Check item count limit
    if (this.cache.size >= this.config.maxItems) {
      this.evictLeastRecentlyUsed(0);
    }

    // Check memory limit
    if (projectedSize > maxSizeBytes) {
      const excessMB = (projectedSize - maxSizeBytes) / (1024 * 1024);
      this.evictLeastRecentlyUsed(excessMB);
    }
  }

  private evictLeastRecentlyUsed(targetFreeMB: number): void {
    const items = Array.from(this.cache.values());

    // Sort by last accessed time (oldest first)
    items.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedMB = 0;
    const targetFreeBytes = targetFreeMB * 1024 * 1024;

    for (const item of items) {
      this.delete(item.key);
      freedMB += item.sizeBytes / (1024 * 1024);

      if (freedMB * 1024 * 1024 >= targetFreeBytes && this.cache.size < this.config.maxItems) {
        break;
      }
    }
  }

  private async compress<T>(data: T): Promise<T> {
    // Simple JSON string compression using built-in compression
    const jsonString = JSON.stringify(data);

    if ('CompressionStream' in window) {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(jsonString));
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])) as unknown as T;
    }

    // Fallback: return original data if compression not available
    return data;
  }

  private async decompress<T>(compressedData: T): Promise<T> {
    if ('DecompressionStream' in window && compressedData instanceof Uint8Array) {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(compressedData);
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[]));
      const jsonString = new TextDecoder().decode(decompressed);
      return JSON.parse(jsonString);
    }

    return compressedData;
  }

  private estimateSize(data: any): number {
    // Rough estimation of memory usage
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  private persistItem<T>(key: string, item: CacheItem<T>): void {
    try {
      const serialized = JSON.stringify({
        ...item,
        data: item.compressed ? Array.from(item.data as any) : item.data,
      });
      localStorage.setItem(`cache:${key}`, serialized);
    } catch (error) {
      console.warn('Failed to persist cache item:', error);
    }
  }

  private async loadPersistedItem<T>(key: string): Promise<CacheItem<T> | null> {
    try {
      const serialized = localStorage.getItem(`cache:${key}`);
      if (!serialized) return null;

      const item = JSON.parse(serialized);

      // Restore Uint8Array if compressed
      if (item.compressed && Array.isArray(item.data)) {
        item.data = new Uint8Array(item.data);
      }

      return item;
    } catch (error) {
      console.warn('Failed to load persisted cache item:', error);
      return null;
    }
  }

  private removePersistedItem(key: string): void {
    localStorage.removeItem(`cache:${key}`);
  }

  private clearPersistedItems(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache:')) {
        localStorage.removeItem(key);
      }
    });
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMinutes * 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Specialized cache for investigation data
 */
export class InvestigationCacheManager extends CacheManager {
  constructor() {
    super({
      maxMemoryMB: 100, // 100MB limit
      maxItems: 1000,
      compressionEnabled: true,
      persistenceEnabled: true,
      ttlMinutes: 30, // 30 minutes TTL
      cleanupIntervalMinutes: 5,
    });
  }

  /**
   * Cache investigation with all related data
   */
  async cacheInvestigation(
    investigation: Investigation,
    evidence: Evidence[],
    domains: Domain[]
  ): Promise<void> {
    const baseKey = `investigation:${investigation.id}`;

    await Promise.all([
      this.set(`${baseKey}:main`, investigation),
      this.set(`${baseKey}:evidence`, evidence),
      this.set(`${baseKey}:domains`, domains),
      this.set(`${baseKey}:metadata`, {
        cached_at: Date.now(),
        evidence_count: evidence.length,
        domain_count: domains.length,
        risk_score: investigation.risk_score,
      }),
    ]);
  }

  /**
   * Get complete investigation data
   */
  async getInvestigation(investigationId: string): Promise<{
    investigation: Investigation | null;
    evidence: Evidence[] | null;
    domains: Domain[] | null;
  }> {
    const baseKey = `investigation:${investigationId}`;

    const [investigation, evidence, domains] = await Promise.all([
      this.get<Investigation>(`${baseKey}:main`),
      this.get<Evidence[]>(`${baseKey}:evidence`),
      this.get<Domain[]>(`${baseKey}:domains`),
    ]);

    return { investigation, evidence, domains };
  }

  /**
   * Invalidate all data for an investigation
   */
  invalidateInvestigation(investigationId: string): number {
    return this.invalidatePattern(`^investigation:${investigationId}:`);
  }

  /**
   * Cache transformed graph data
   */
  async cacheGraphData(
    investigationId: string,
    format: 'd3' | 'reactflow',
    data: any
  ): Promise<void> {
    await this.set(`graph:${investigationId}:${format}`, data, {
      ttl: 10 * 60 * 1000, // 10 minutes for graph data
      compress: true,
    });
  }

  /**
   * Get cached graph data
   */
  async getGraphData(
    investigationId: string,
    format: 'd3' | 'reactflow'
  ): Promise<any> {
    return this.get(`graph:${investigationId}:${format}`);
  }
}

// Export singleton instance
export const investigationCache = new InvestigationCacheManager();