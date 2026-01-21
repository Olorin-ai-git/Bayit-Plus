// Web shim for @react-native-async-storage/async-storage
// Uses localStorage under the hood
import logger from '@/utils/logger';

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      logger.error('AsyncStorage getItem error', 'AsyncStorage', e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      logger.error('AsyncStorage setItem error', 'AsyncStorage', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      logger.error('AsyncStorage removeItem error', 'AsyncStorage', e);
    }
  },

  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch (e) {
      logger.error('AsyncStorage clear error', 'AsyncStorage', e);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return Object.keys(localStorage);
    } catch (e) {
      logger.error('AsyncStorage getAllKeys error', 'AsyncStorage', e);
      return [];
    }
  },

  multiGet: async (keys: string[]): Promise<[string, string | null][]> => {
    try {
      return keys.map((key) => [key, localStorage.getItem(key)]);
    } catch (e) {
      logger.error('AsyncStorage multiGet error', 'AsyncStorage', e);
      return keys.map((key) => [key, null]);
    }
  },

  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    try {
      keyValuePairs.forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    } catch (e) {
      logger.error('AsyncStorage multiSet error', 'AsyncStorage', e);
    }
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    try {
      keys.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      logger.error('AsyncStorage multiRemove error', 'AsyncStorage', e);
    }
  },
};

export default AsyncStorage;
