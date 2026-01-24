// Web shim for @react-native-async-storage/async-storage
// Uses localStorage under the hood

import logger from './logger';

const storageLogger = logger.scope('AsyncStorage');

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      storageLogger.error('getItem error', e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      storageLogger.error('setItem error', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      storageLogger.error('removeItem error', e);
    }
  },

  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch (e) {
      storageLogger.error('clear error', e);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return Object.keys(localStorage);
    } catch (e) {
      storageLogger.error('getAllKeys error', e);
      return [];
    }
  },

  multiGet: async (keys: string[]): Promise<[string, string | null][]> => {
    try {
      return keys.map((key) => [key, localStorage.getItem(key)]);
    } catch (e) {
      storageLogger.error('multiGet error', e);
      return keys.map((key) => [key, null]);
    }
  },

  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    try {
      keyValuePairs.forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    } catch (e) {
      storageLogger.error('multiSet error', e);
    }
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    try {
      keys.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      storageLogger.error('multiRemove error', e);
    }
  },
};

export default AsyncStorage;
