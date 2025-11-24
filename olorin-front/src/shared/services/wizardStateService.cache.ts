/**
 * Wizard State Service ETag Cache
 * Feature: 005-polling-and-persistence
 * Task: T020 - ETag caching for conditional GET requests
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Complete implementation
 * - Type-safe cache operations
 */

import { WizardState } from '../types/wizardState';

/**
 * ETag cache entry structure.
 */
export interface ETagCacheEntry {
  etag: string;
  data: WizardState;
  timestamp: number;
}

/**
 * ETag cache for conditional GET requests.
 */
export interface ETagCache {
  [investigationId: string]: ETagCacheEntry;
}

/**
 * ETag Cache Manager for wizard state service.
 */
export class ETagCacheManager {
  private readonly cache: ETagCache = {};

  /**
   * Get cached entry for investigation.
   */
  get(investigationId: string): ETagCacheEntry | undefined {
    return this.cache[investigationId];
  }

  /**
   * Update cache with new ETag and data.
   */
  set(investigationId: string, etag: string, data: WizardState): void {
    this.cache[investigationId] = {
      etag,
      data,
      timestamp: Date.now()
    };
  }

  /**
   * Remove cached entry.
   */
  remove(investigationId: string): void {
    delete this.cache[investigationId];
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    Object.keys(this.cache).forEach((key) => {
      delete this.cache[key];
    });
  }

  /**
   * Check if entry exists in cache.
   */
  has(investigationId: string): boolean {
    return investigationId in this.cache;
  }

  /**
   * Get cache size.
   */
  size(): number {
    return Object.keys(this.cache).length;
  }
}
