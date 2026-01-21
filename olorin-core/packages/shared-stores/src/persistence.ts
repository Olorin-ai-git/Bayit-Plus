/**
 * Persistence utilities for Zustand stores
 *
 * Provides cross-platform storage abstraction and persistence patterns.
 */

import type { StateStorage, StorageValue } from 'zustand/middleware';

/**
 * Storage adapter interface matching Zustand's StateStorage
 */
export interface StorageAdapter extends StateStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

/**
 * Creates a web localStorage adapter
 * Safe to use in SSR environments (returns null if localStorage unavailable)
 */
export function createWebStorage(): StorageAdapter | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return {
    getItem: (name: string) => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(name, value);
      } catch {
        // Storage full or private browsing
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch {
        // Ignore errors
      }
    },
  };
}

/**
 * Creates a memory storage adapter for testing or fallback
 */
export function createMemoryStorage(): StorageAdapter {
  const storage = new Map<string, string>();

  return {
    getItem: (name: string) => storage.get(name) ?? null,
    setItem: (name: string, value: string) => {
      storage.set(name, value);
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
}

/**
 * Creates a no-op storage adapter
 * Useful for disabling persistence while keeping the same API
 */
export function createNoopStorage(): StorageAdapter {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

/**
 * Configuration for persistence
 */
export interface PersistConfig<T> {
  /** Storage key name */
  name: string;
  /** Storage adapter to use */
  storage?: StorageAdapter;
  /** Fields to persist (persist all if not specified) */
  partialize?: (state: T) => Partial<T>;
  /** Version number for migrations */
  version?: number;
  /** Migration function for version updates */
  migrate?: (persistedState: unknown, version: number) => T | Promise<T>;
  /** Called when hydration starts */
  onRehydrateStorage?: (state: T) => ((state?: T, error?: unknown) => void) | void;
}

/**
 * Creates persistence configuration for Zustand persist middleware
 *
 * @param config - Persistence configuration
 * @returns Configuration object for persist middleware
 *
 * @example
 * ```typescript
 * import { persist } from 'zustand/middleware';
 *
 * const useAuthStore = create(
 *   persist(
 *     (set) => ({
 *       user: null,
 *       token: null,
 *       setUser: (user) => set({ user }),
 *     }),
 *     createPersistConfig({
 *       name: 'auth-storage',
 *       partialize: (state) => ({ user: state.user, token: state.token }),
 *     })
 *   )
 * );
 * ```
 */
export function createPersistConfig<T>(config: PersistConfig<T>) {
  const {
    name,
    storage,
    partialize,
    version = 0,
    migrate,
    onRehydrateStorage,
  } = config;

  // Default to web storage with memory fallback
  const storageAdapter = storage ?? createWebStorage() ?? createMemoryStorage();

  return {
    name,
    version,
    storage: {
      getItem: async (key: string): Promise<StorageValue<T> | null> => {
        const value = await storageAdapter.getItem(key);
        if (!value) return null;
        try {
          return JSON.parse(value) as StorageValue<T>;
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: StorageValue<T>): Promise<void> => {
        await storageAdapter.setItem(key, JSON.stringify(value));
      },
      removeItem: async (key: string): Promise<void> => {
        await storageAdapter.removeItem(key);
      },
    },
    partialize,
    migrate,
    onRehydrateStorage,
  };
}

/**
 * Checks if storage is available
 *
 * @param type - 'localStorage' or 'sessionStorage'
 * @returns boolean indicating availability
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = typeof window !== 'undefined' ? window[type] : null;
    if (!storage) return false;

    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all persisted store data for a given prefix
 *
 * @param prefix - Key prefix to clear
 * @param storage - Storage adapter to use
 */
export async function clearPersistedStores(
  prefix: string,
  storage: StorageAdapter = createWebStorage() ?? createMemoryStorage()
): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(prefix)
    );
    for (const key of keys) {
      await storage.removeItem(key);
    }
  }
}
