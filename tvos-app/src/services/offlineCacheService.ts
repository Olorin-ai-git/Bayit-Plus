/**
 * Offline Content Caching Service (tvOS)
 *
 * Provides persistent caching of content for offline availability.
 * Complements React Query's in-memory caching with device storage persistence.
 *
 * tvOS-specific considerations:
 * - Larger cache limits (tvOS has more storage than mobile)
 * - TV-optimized expiry times (users expect instant launch)
 * - Multi-window state caching (4 concurrent windows)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import {
  CACHE_PREFIX,
  CACHE_INDEX_KEY,
  CACHE_METADATA_KEY,
  CACHE_LIMITS,
  CACHE_EXPIRY,
  type CacheCategory,
  type CacheEntry,
  type CacheMetadata,
  type CacheStats,
} from '../types/offlineCache';
import { updateCacheIndex, removeFromCacheIndex, getCacheStats, cleanupExpired } from './offlineCacheHelpers';

// Re-export types for backward compatibility
export type { CacheCategory, CacheEntry, CacheMetadata, CacheStats } from '../types/offlineCache';

export const offlineCacheService = {
  /**
   * Cache content data for offline access
   */
  async set(key: string, data: any, category: CacheCategory = 'featured'): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${category}:${key}`;
      const dataSize = JSON.stringify(data).length;

      if (dataSize > CACHE_LIMITS[category]) {
        logger.warn('Cache data exceeds limit for category', {
          module: 'OfflineCache', key, dataSize, category, limit: CACHE_LIMITS[category],
        });
        return;
      }

      const cacheEntry: CacheEntry = {
        key, category, data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY[category],
        size: dataSize,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      await updateCacheIndex(cacheEntry);
    } catch (error) {
      logger.error('Failed to cache entry', {
        module: 'OfflineCache', key, category,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Retrieve cached content. Returns null if not cached, expired, or on error.
   */
  async get(key: string, category: CacheCategory = 'featured'): Promise<any | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${category}:${key}`;
      const cachedStr = await AsyncStorage.getItem(cacheKey);

      if (!cachedStr) return null;

      const cacheEntry: CacheEntry = JSON.parse(cachedStr);

      if (Date.now() > cacheEntry.expiresAt) {
        await this.delete(key, category);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      logger.error('Failed to retrieve cache entry', {
        module: 'OfflineCache', key, category,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },

  /**
   * Delete specific cache entry
   */
  async delete(key: string, category: CacheCategory = 'featured'): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${category}:${key}`;
      await AsyncStorage.removeItem(cacheKey);
      await removeFromCacheIndex(key, category);
    } catch (error) {
      logger.error('Failed to delete cache entry', {
        module: 'OfflineCache', key, category,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Clear all cached data for a category
   */
  async clearCategory(category: CacheCategory): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const categoryPrefix = `${CACHE_PREFIX}${category}:`;
      const keysToRemove = keys.filter((k) => k.startsWith(categoryPrefix));

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (metadata) {
        const parsed: CacheMetadata = JSON.parse(metadata);
        Object.keys(parsed.entries).forEach((k) => {
          if (parsed.entries[k].category === category) delete parsed.entries[k];
        });
        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(parsed));
      }
    } catch (error) {
      logger.error('Failed to clear cache category', {
        module: 'OfflineCache', category,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Clear all offline cache
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    } catch (error) {
      logger.error('Failed to clear all caches', {
        module: 'OfflineCache',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  getStats: getCacheStats,
  cleanupExpired,
};
