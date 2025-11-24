/**
 * Local Storage Utility
 * Feature: 002-visualization-microservice
 *
 * Configuration-driven localStorage wrapper with type safety and error handling.
 *
 * @module shared/utils/storage
 */

const STORAGE_PREFIX = process.env.REACT_APP_STORAGE_PREFIX || 'olorin_';

/**
 * Local storage wrapper with type safety
 */
export const storage = {
  /**
   * Get value from localStorage
   */
  get<T>(key: string, defaultValue: T): T {
    try {
      const prefixedKey = STORAGE_PREFIX + key;
      const item = localStorage.getItem(prefixedKey);

      if (item === null) {
        return defaultValue;
      }

      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`[Storage] Error reading key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Set value in localStorage
   */
  set<T>(key: string, value: T): void {
    try {
      const prefixedKey = STORAGE_PREFIX + key;
      localStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch (error) {
      console.error(`[Storage] Error setting key "${key}":`, error);

      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Storage] localStorage quota exceeded, clearing old data...');
        this.clear();

        // Retry after clearing
        try {
          const prefixedKey = STORAGE_PREFIX + key;
          localStorage.setItem(prefixedKey, JSON.stringify(value));
        } catch (retryError) {
          console.error(`[Storage] Failed to set key "${key}" after clearing:`, retryError);
        }
      }
    }
  },

  /**
   * Remove value from localStorage
   */
  remove(key: string): void {
    try {
      const prefixedKey = STORAGE_PREFIX + key;
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`[Storage] Error removing key "${key}":`, error);
    }
  },

  /**
   * Clear all prefixed items from localStorage
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
    }
  },

  /**
   * Check if key exists in localStorage
   */
  has(key: string): boolean {
    try {
      const prefixedKey = STORAGE_PREFIX + key;
      return localStorage.getItem(prefixedKey) !== null;
    } catch (error) {
      console.error(`[Storage] Error checking key "${key}":`, error);
      return false;
    }
  }
};
