/**
 * AsyncStorage Web Shim
 *
 * Provides a localStorage-based implementation of the
 * @react-native-async-storage/async-storage API for web builds.
 * Webpack alias redirects native AsyncStorage imports here.
 */

const asyncStorageWeb = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage quota exceeded or private browsing
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore removal errors
    }
  },

  mergeItem: async (key: string, value: string): Promise<void> => {
    try {
      const existing = localStorage.getItem(key);
      if (existing) {
        const merged = { ...JSON.parse(existing), ...JSON.parse(value) };
        localStorage.setItem(key, JSON.stringify(merged));
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore merge errors
    }
  },

  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch {
      // Ignore clear errors
    }
  },

  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },

  multiGet: async (
    keys: readonly string[],
  ): Promise<readonly [string, string | null][]> => {
    try {
      return keys.map((key) => [key, localStorage.getItem(key)]);
    } catch {
      return keys.map((key) => [key, null]);
    }
  },

  multiSet: async (keyValuePairs: readonly [string, string][]): Promise<void> => {
    try {
      keyValuePairs.forEach(([key, value]) => localStorage.setItem(key, value));
    } catch {
      // Ignore errors
    }
  },

  multiRemove: async (keys: readonly string[]): Promise<void> => {
    try {
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore errors
    }
  },

  multiMerge: async (
    keyValuePairs: readonly [string, string][],
  ): Promise<void> => {
    for (const [key, value] of keyValuePairs) {
      await asyncStorageWeb.mergeItem(key, value);
    }
  },
};

export default asyncStorageWeb;
