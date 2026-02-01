/**
 * Platform-agnostic storage adapter for Zustand persist middleware
 * Uses localStorage on web, AsyncStorage on React Native
 */

import { StateStorage } from 'zustand/middleware';

// Detect platform - works without React Native imports
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Web storage implementation using localStorage
 */
const webStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Storage quota exceeded or private browsing
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore errors
    }
  },
};

/**
 * Async wrapper for web storage (for compatibility with AsyncStorage API)
 */
const webStorageAsync: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return webStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    webStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    webStorage.removeItem(name);
  },
};

/**
 * Get the appropriate storage for the current platform
 * Returns a StateStorage compatible with Zustand persist middleware
 */
export function getPlatformStorage(): StateStorage {
  if (isWeb) {
    return webStorageAsync;
  }

  // For React Native, dynamically import AsyncStorage
  // This ensures the import only happens on native platforms
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return {
      getItem: async (name: string): Promise<string | null> => {
        return AsyncStorage.getItem(name);
      },
      setItem: async (name: string, value: string): Promise<void> => {
        await AsyncStorage.setItem(name, value);
      },
      removeItem: async (name: string): Promise<void> => {
        await AsyncStorage.removeItem(name);
      },
    };
  } catch {
    // Fallback to web storage if AsyncStorage is not available
    return webStorageAsync;
  }
}

/**
 * Check if running on web platform
 */
export function isWebPlatform(): boolean {
  return isWeb;
}

/**
 * Check if running on React Native
 */
export function isNativePlatform(): boolean {
  return !isWeb;
}

export default getPlatformStorage;
