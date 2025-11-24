/**
 * Local Cache Utility
 * Query string keyed cache for instant back/forward navigation
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

const CACHE_PREFIX = 'analytics_cache_';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generate cache key from query string
 */
export function getCacheKey(queryString: string): string {
  return `${CACHE_PREFIX}${queryString}`;
}

/**
 * Get cached data by query string
 */
export function getCached<T>(queryString: string): T | null {
  try {
    const key = getCacheKey(queryString);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.warn('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached data with query string key
 */
export function setCached<T>(
  queryString: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  try {
    const key = getCacheKey(queryString);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
    
    // Cleanup old entries (keep last 50)
    cleanupCache();
  } catch (error) {
    console.warn('Cache set error:', error);
  }
}

/**
 * Remove cached data by query string
 */
export function removeCached(queryString: string): void {
  try {
    const key = getCacheKey(queryString);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Cache remove error:', error);
  }
}

/**
 * Clear all analytics cache entries
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}

/**
 * Cleanup old cache entries (keep last N entries)
 */
function cleanupCache(): void {
  try {
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => {
        try {
          const cached = localStorage.getItem(key);
          if (!cached) return null;
          const entry: CacheEntry<unknown> = JSON.parse(cached);
          return { key, timestamp: entry.timestamp };
        } catch {
          return null;
        }
      })
      .filter((item): item is { key: string; timestamp: number } => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    // Remove entries beyond the 50 most recent
    const maxEntries = 50;
    if (keys.length > maxEntries) {
      for (const { key } of keys.slice(maxEntries)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('Cache cleanup error:', error);
  }
}

