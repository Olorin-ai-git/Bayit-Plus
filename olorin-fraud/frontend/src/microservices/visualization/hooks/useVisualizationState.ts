/**
 * Visualization State Persistence Hook
 *
 * React hook for state persistence using localStorage with TTL support.
 * Configuration-driven storage provider, key prefix, and TTL.
 *
 * NO HARDCODED VALUES - All settings from configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { visualizationConfig } from '../config/environment';

/**
 * Storage provider types
 */
type StorageProvider = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'none';

/**
 * Stored value with metadata
 */
interface StoredValue<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Hook options
 */
interface UseVisualizationStateOptions<T> {
  key: string;
  initialValue: T;
  ttl?: number;
  provider?: StorageProvider;
}

/**
 * Visualization State Persistence Hook
 *
 * @param options - Configuration options
 * @returns [state, setState, clearState]
 */
export function useVisualizationState<T>(
  options: UseVisualizationStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const config = visualizationConfig?.storage || {};
  const provider = options.provider || config.provider || 'localStorage';
  const keyPrefix = config.keyPrefix || 'olorin:visualization:';
  const ttl = options.ttl || config.stateTTLMs || 86400000;
  const storageKey = `${keyPrefix}${options.key}`;

  const [state, setState] = useState<T>(() => {
    if (provider === 'none' || !config.enablePersistence) {
      return options.initialValue;
    }

    try {
      const stored = getStorageProvider(provider).getItem(storageKey);
      if (!stored) return options.initialValue;

      const parsed: StoredValue<T> = JSON.parse(stored);
      const now = Date.now();

      if (now - parsed.timestamp > parsed.ttl) {
        getStorageProvider(provider).removeItem(storageKey);
        return options.initialValue;
      }

      return parsed.data;
    } catch (error) {
      console.error('[useVisualizationState] Error loading state:', error);
      return options.initialValue;
    }
  });

  useEffect(() => {
    if (provider === 'none' || !config.enablePersistence) {
      return;
    }

    try {
      const storedValue: StoredValue<T> = {
        data: state,
        timestamp: Date.now(),
        ttl
      };
      getStorageProvider(provider).setItem(storageKey, JSON.stringify(storedValue));
    } catch (error) {
      console.error('[useVisualizationState] Error saving state:', error);
    }
  }, [state, storageKey, ttl, provider, config.enablePersistence]);

  const clearState = useCallback(() => {
    if (provider === 'none') {
      setState(options.initialValue);
      return;
    }

    try {
      getStorageProvider(provider).removeItem(storageKey);
      setState(options.initialValue);
    } catch (error) {
      console.error('[useVisualizationState] Error clearing state:', error);
    }
  }, [storageKey, provider, options.initialValue]);

  return [state, setState, clearState];
}

/**
 * Get storage provider instance
 */
function getStorageProvider(provider: StorageProvider): Storage {
  switch (provider) {
    case 'localStorage':
      return window.localStorage;
    case 'sessionStorage':
      return window.sessionStorage;
    case 'none':
      return createNoOpStorage();
    default:
      console.warn(`[useVisualizationState] Unknown provider: ${provider}, using localStorage`);
      return window.localStorage;
  }
}

/**
 * Create no-op storage for when persistence is disabled
 */
function createNoOpStorage(): Storage {
  return {
    length: 0,
    clear: () => {},
    getItem: () => null,
    key: () => null,
    removeItem: () => {},
    setItem: () => {}
  };
}

/**
 * Clear all visualization state from storage
 */
export function clearAllVisualizationState(): void {
  const config = visualizationConfig?.storage || {};
  const provider = config.provider || 'localStorage';
  const keyPrefix = config.keyPrefix || 'olorin:visualization:';

  if (provider === 'none') return;

  try {
    const storage = getStorageProvider(provider);
    const keys: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(keyPrefix)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.error('[useVisualizationState] Error clearing all state:', error);
  }
}

export default useVisualizationState;
