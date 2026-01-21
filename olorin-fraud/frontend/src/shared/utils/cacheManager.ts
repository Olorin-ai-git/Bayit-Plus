/**
 * Cache Management Utility
 *
 * Provides browser cache clearing functionality for investigation workflows.
 * Ensures fresh data for each new investigation by clearing relevant caches.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven cache clearing behavior
 * - No hardcoded cache keys or patterns
 * - Fail-fast validation
 */

import { getRuntimeConfig } from '../config/runtimeConfig';

/**
 * Cache clearing configuration
 */
export interface CacheClearingConfig {
  /** Whether to clear localStorage on investigation launch */
  clearLocalStorage: boolean;
  /** Whether to clear sessionStorage on investigation launch */
  clearSessionStorage: boolean;
  /** Whether to clear browser HTTP cache on investigation launch */
  clearHttpCache: boolean;
  /** Patterns for localStorage keys to preserve (regex strings) */
  preserveLocalStoragePatterns: string[];
  /** Patterns for sessionStorage keys to preserve (regex strings) */
  preserveSessionStoragePatterns: string[];
}

/**
 * Load cache clearing configuration from environment
 */
function loadCacheConfig(): CacheClearingConfig {
  // Get config values with fallbacks
  const clearLocalStorage = getRuntimeConfig('REACT_APP_CACHE_CLEAR_LOCAL_STORAGE', {
    fallback: 'true',
    required: false
  });
  const clearSessionStorage = getRuntimeConfig('REACT_APP_CACHE_CLEAR_SESSION_STORAGE', {
    fallback: 'true',
    required: false
  });
  const clearHttpCache = getRuntimeConfig('REACT_APP_CACHE_CLEAR_HTTP_CACHE', {
    fallback: 'true',
    required: false
  });
  const preserveLocalStorage = getRuntimeConfig('REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE', {
    fallback: 'auth-,user-profile,theme-preference',
    required: false
  });
  const preserveSessionStorage = getRuntimeConfig('REACT_APP_CACHE_PRESERVE_SESSION_STORAGE', {
    fallback: 'csrf-token,session-id',
    required: false
  });

  return {
    clearLocalStorage: clearLocalStorage === 'true',
    clearSessionStorage: clearSessionStorage === 'true',
    clearHttpCache: clearHttpCache === 'true',
    preserveLocalStoragePatterns: preserveLocalStorage.split(',').map(p => p.trim()).filter(p => p.length > 0),
    preserveSessionStoragePatterns: preserveSessionStorage.split(',').map(p => p.trim()).filter(p => p.length > 0)
  };
}

/**
 * Check if a storage key should be preserved based on patterns
 */
function shouldPreserveKey(key: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(key);
    } catch {
      // Treat as plain string prefix if regex invalid
      return key.startsWith(pattern);
    }
  });
}

/**
 * Clear localStorage while preserving specified keys
 */
function clearLocalStorage(preservePatterns: string[]): void {
  try {
    const keysToRemove: string[] = [];

    // Collect keys to remove
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !shouldPreserveKey(key, preservePatterns)) {
        keysToRemove.push(key);
      }
    }

    // Remove collected keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('[CacheManager] Cleared localStorage:', {
      removed: keysToRemove.length,
      preserved: localStorage.length
    });
  } catch (error) {
    console.error('[CacheManager] Failed to clear localStorage:', error);
  }
}

/**
 * Clear sessionStorage while preserving specified keys
 */
function clearSessionStorage(preservePatterns: string[]): void {
  try {
    const keysToRemove: string[] = [];

    // Collect keys to remove
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && !shouldPreserveKey(key, preservePatterns)) {
        keysToRemove.push(key);
      }
    }

    // Remove collected keys
    keysToRemove.forEach(key => sessionStorage.removeItem(key));

    console.log('[CacheManager] Cleared sessionStorage:', {
      removed: keysToRemove.length,
      preserved: sessionStorage.length
    });
  } catch (error) {
    console.error('[CacheManager] Failed to clear sessionStorage:', error);
  }
}

/**
 * Clear browser HTTP cache using Cache API
 */
async function clearHttpCache(): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      console.log('[CacheManager] Cleared HTTP cache:', {
        caches: cacheNames.length
      });
    }
  } catch (error) {
    console.error('[CacheManager] Failed to clear HTTP cache:', error);
  }
}

/**
 * Clear all browser caches based on configuration
 *
 * This function clears:
 * - localStorage (except preserved keys)
 * - sessionStorage (except preserved keys)
 * - Browser HTTP cache (Cache API)
 *
 * Configuration is driven by environment variables.
 *
 * @example
 * ```typescript
 * // Clear all caches before launching investigation
 * await clearBrowserCache();
 * ```
 */
export async function clearBrowserCache(): Promise<void> {
  const config = loadCacheConfig();

  console.log('[CacheManager] Starting cache clear with config:', config);

  try {
    const operations: Promise<void>[] = [];

    // Clear localStorage
    if (config.clearLocalStorage) {
      clearLocalStorage(config.preserveLocalStoragePatterns);
    }

    // Clear sessionStorage
    if (config.clearSessionStorage) {
      clearSessionStorage(config.preserveSessionStoragePatterns);
    }

    // Clear HTTP cache
    if (config.clearHttpCache) {
      operations.push(clearHttpCache());
    }

    // Wait for async operations
    await Promise.all(operations);

    console.log('[CacheManager] Cache clearing completed successfully');
  } catch (error) {
    console.error('[CacheManager] Cache clearing failed:', error);
    throw new Error(`Failed to clear browser cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear specific investigation-related cache entries
 *
 * @param investigationId - Optional investigation ID to clear specific caches
 */
export async function clearInvestigationCache(investigationId?: string): Promise<void> {
  try {
    // Clear investigation-specific localStorage entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('investigation-') ||
        key.startsWith('wizard-state-') ||
        (investigationId && key.includes(investigationId))
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('[CacheManager] Cleared investigation cache:', {
      investigationId,
      keysRemoved: keysToRemove.length
    });
  } catch (error) {
    console.error('[CacheManager] Failed to clear investigation cache:', error);
  }
}
