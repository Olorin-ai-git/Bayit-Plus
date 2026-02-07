/**
 * Offline Cache Helpers - Internal cache index management (tvOS)
 * Extracted from offlineCacheService.ts for file size compliance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import {
  CACHE_VERSION,
  CACHE_PREFIX,
  CACHE_METADATA_KEY,
  type CacheEntry,
  type CacheMetadata,
  type CacheStats,
} from '../types/offlineCache';

/**
 * Update cache index metadata with a new entry
 */
export async function updateCacheIndex(entry: CacheEntry): Promise<void> {
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

    const { data, ...entryWithoutData } = entry;
    metadata!.entries[`${entry.category}:${entry.key}`] = entryWithoutData;

    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    logger.error('Failed to update cache index', {
      module: 'OfflineCache',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Remove an entry from cache index
 */
export async function removeFromCacheIndex(key: string, category: string): Promise<void> {
  try {
    const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    if (!metadata) return;

    const parsed: CacheMetadata = JSON.parse(metadata);
    delete parsed.entries[`${category}:${key}`];

    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(parsed));
  } catch (error) {
    logger.error('Failed to remove from cache index', {
      module: 'OfflineCache',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    if (!metadata) return { totalSize: 0, entriesCount: 0, byCategory: {} };

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

    return { totalSize, entriesCount, byCategory };
  } catch (error) {
    logger.error('Failed to get cache stats', {
      module: 'OfflineCache',
      error: error instanceof Error ? error.message : String(error),
    });
    return { totalSize: 0, entriesCount: 0, byCategory: {} };
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpired(): Promise<number> {
  try {
    const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    if (!metadata) return 0;

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

    if (Object.keys(parsed.entries).length > 0) {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(parsed));
    } else {
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
    }

    return removed;
  } catch (error) {
    logger.error('Failed to cleanup expired cache', {
      module: 'OfflineCache',
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
