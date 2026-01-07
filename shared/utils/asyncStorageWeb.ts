// Web shim for @react-native-async-storage/async-storage
// Uses localStorage under the hood

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('AsyncStorage getItem error:', e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('AsyncStorage setItem error:', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('AsyncStorage removeItem error:', e);
    }
  },

  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('AsyncStorage clear error:', e);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return Object.keys(localStorage);
    } catch (e) {
      console.error('AsyncStorage getAllKeys error:', e);
      return [];
    }
  },

  multiGet: async (keys: string[]): Promise<[string, string | null][]> => {
    try {
      return keys.map((key) => [key, localStorage.getItem(key)]);
    } catch (e) {
      console.error('AsyncStorage multiGet error:', e);
      return keys.map((key) => [key, null]);
    }
  },

  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    try {
      keyValuePairs.forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    } catch (e) {
      console.error('AsyncStorage multiSet error:', e);
    }
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    try {
      keys.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.error('AsyncStorage multiRemove error:', e);
    }
  },
};

export default AsyncStorage;
