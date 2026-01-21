/**
 * Offline Content Caching Service
 *
 * Provides persistent caching of content for offline availability
 * Complements React Query's in-memory caching with device storage persistence
 *
 * STRATEGY:
 * - Cache content metadata (featured, categories, search results)
 * - Cache user data (continue watching, favorites, watchlist)
 * - Cache live channel information
 * - Automatically expire stale data
 * - Prioritize cache space for frequently accessed content
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache version for invalidation (increment when cache structure changes)
const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = '@bayit_offline_cache_';
const CACHE_INDEX_KEY = '@bayit_cache_index';
const CACHE_METADATA_KEY = '@bayit_cache_metadata';

// Max cache size per category (in bytes)
const CACHE_LIMITS = {
  featured: 1024 * 500, // 500 KB
  categories: 1024 * 200, // 200 KB
  search: 1024 * 300, // 300 KB
  continueWatching: 1024 * 100, // 100 KB
  favorites: 1024 * 100, // 100 KB
  watchlist: 1024 * 100, // 100 KB
  liveChannels: 1024 * 150, // 150 KB
};

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  featured: 1000 * 60 * 60, // 1 hour
  categories: 1000 * 60 * 60 * 4, // 4 hours
  search: 1000 * 60 * 30, // 30 minutes
  continueWatching: 1000 * 60 * 5, // 5 minutes
  favorites: 1000 * 60 * 60, // 1 hour
  watchlist: 1000 * 60 * 60, // 1 hour
  liveChannels: 1000 * 60 * 2, // 2 minutes
};

interface CacheEntry {
  key: string;
  category: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  size: number;
}

interface CacheMetadata {
  version: string;
  createdAt: number;
  entries: Record<string, Omit<CacheEntry, 'data'>>;
}

/**
 * Offline cache service for persisting content
 */
export const offlineCacheService = {
  /**
   * Cache content data for offline access
   */
  async set(
    key: string,
    data: any,
    category: keyof typeof CACHE_LIMITS = 'featured'
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${category}:${key}`;
      const dataSize = JSON.stringify(data).length;

      // Check size limits
      if (dataSize > CACHE_LIMITS[category]) {
        console.warn(
          `Cache data for ${key} (${dataSize} bytes) exceeds limit for category ${category}`
        );
        return;
      }

      // Store data
      const cacheEntry: CacheEntry = {
        key,
        category,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY[category],
        size: dataSize,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

      // Update index
      await this._updateCacheIndex(cacheEntry);
    } catch (error) {
      console.error(`Failed to cache ${key}:`, error);
      // Don't throw - caching failures should not break the app
    }
  },

  /**
   * Retrieve cached content
   * Returns null if not cached, expired, or on error
   */
  async get(
    key: string,
    category: keyof typeof CACHE_LIMITS = 'featured'
  ): Promise<any | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${category}:${key}`;
      const cachedStr = await AsyncStorage.getItem(cacheKey);

      if (!cachedStr) {
        return null;
      }

      const cacheEntry: CacheEntry = JSON.parse(cachedStr);

      // Check if expired
      if (Date.now() > cacheEntry.expiresAt) {
        // Delete expired cache
        await this.delete(key, category);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error(`Failed to retrieve cache for ${key}:`, error);
      return null;
    }
  },

  /**
   * Delete specific cache entry
   */
  async delete(
    key: string,
    category: keyof typeof CACHE_LIMITS = 'featured'
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${category}:${key}`;
      await AsyncStorage.removeItem(cacheKey);

      // Update index
      await this._removeFromCacheIndex(key, category);
    } catch (error) {
      console.error(`Failed to delete cache for ${key}:`, error);
    }
  },

  /**
   * Clear all cached data for a category
   */
  async clearCategory(category: keyof typeof CACHE_LIMITS): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const categoryPrefix = `${CACHE_PREFIX}${category}:`;
      const keysToRemove = keys.filter((k) => k.startsWith(categoryPrefix));

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // Update index
      const metadata = (await AsyncStorage.getItem(CACHE_METADATA_KEY)) as any;
      if (metadata) {
        const parsed: CacheMetadata = JSON.parse(metadata);
        Object.keys(parsed.entries).forEach((k) => {
          if (parsed.entries[k].category === category) {
            delete parsed.entries[k];
          }
        });
        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(parsed));
      }
    } catch (error) {
      console.error(`Failed to clear cache category ${category}:`, error);
    }
  },

  /**
   * Clear all offline cache
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((k) => k.startsWith(CACHE_PREFIX));

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // Remove metadata
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalSize: number;
    entriesCount: number;
    byCategory: Record<string, { count: number; size: number }>;
  }> {
    try {
      const metadata = (await AsyncStorage.getItem(CACHE_METADATA_KEY)) as any;

      if (!metadata) {
        return { totalSize: 0, entriesCount: 0, byCategory: {} };
      }

      const parsed: CacheMetadata = JSON.parse(metadata);
      const byCategory: Record<string, { count: number; size: number }> = {};

      let totalSize = 0;
      let entriesCount = 0;

      Object.values(parsed.entries).forEach((entry) => {
        if (!byCategory[entry.category]) {
          byCategory[entry.category] = { count: 0, size: 0 };
        }

        byCategory[entry.category].count += 1;
        byCategory[entry.category].size += entry.size;
        totalSize += entry.size;
        entriesCount += 1;
      });

      return {
        totalSize,
        entriesCount,
        byCategory,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalSize: 0, entriesCount: 0, byCategory: {} };
    }
  },

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const metadata = (await AsyncStorage.getItem(CACHE_METADATA_KEY)) as any;

      if (!metadata) {
        return 0;
      }

      const parsed: CacheMetadata = JSON.parse(metadata);
      const now = Date.now();
      let removed = 0;

      const keysToRemove: string[] = [];

      Object.entries(parsed.entries).forEach(([key, entry]) => {
        if (now > entry.expiresAt) {
          keysToRemove.push(`${CACHE_PREFIX}${entry.category}:${entry.key}`);
          delete parsed.entries[key];
          removed += 1;
        }
      });

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // Update metadata
      if (Object.keys(parsed.entries).length > 0) {
        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(parsed));
      } else {
        await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      }

      return removed;
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return 0;
    }
  },

  /**
   * Internal: Update cache index metadata
   */
  async _updateCacheIndex(entry: CacheEntry): Promise<void> {
    try {
      let metadata: CacheMetadata | null = null;
      const existing = await AsyncStorage.getItem(CACHE_METADATA_KEY);

      if (existing) {
        metadata = JSON.parse(existing);
      } else {
        metadata = {
          version: CACHE_VERSION,
          createdAt: Date.now(),
          entries: {},
        };
      }

      // Update entry
      const { data, ...entryWithoutData } = entry;
      metadata.entries[`${entry.category}:${entry.key}`] = entryWithoutData;

      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to update cache index:', error);
    }
  },

  /**
   * Internal: Remove from cache index
   */
  async _removeFromCacheIndex(
    key: string,
    category: string
  ): Promise<void> {
    try {
      const metadata = (await AsyncStorage.getItem(CACHE_METADATA_KEY)) as any;

      if (!metadata) {
        return;
      }

      const parsed: CacheMetadata = JSON.parse(metadata);
      delete parsed.entries[`${category}:${key}`];

      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Failed to remove from cache index:', error);
    }
  },
};

/**
 * Integration with React Query
 *
 * Use this service alongside React Query caching:
 * - React Query: In-memory cache (fast access during session)
 * - Offline Cache Service: Persistent storage (survives app restart)
 *
 * Example usage in components:
 *
 * ```typescript
 * const { data, isLoading } = useFeaturedContent();
 *
 * useEffect(() => {
 *   if (data) {
 *     // Cache successful API response for offline access
 *     offlineCacheService.set('featured', data, 'featured');
 *   }
 * }, [data]);
 *
 * // On app startup, pre-load from offline cache while fetching fresh data
 * ```
 *
 * Benefits:
 * - Instant app startup from cached data
 * - Better UX during poor network conditions
 * - Reduced API calls
 * - User can browse cached content offline
 */
