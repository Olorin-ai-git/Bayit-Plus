/**
 * Storage Utilities
 * 
 * Utilities for managing local storage, session storage, and IndexedDB.
  */

import { encryptSensitiveData, decryptSensitiveData } from './encryption';
import { logger } from './logger';

interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  prefix?: string;
}

interface StorageItem<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
}

/**
 * Enhanced localStorage wrapper with encryption and TTL support
  */
export class EnhancedStorage {
  protected prefix: string;
  protected defaultEncrypt: boolean;

  constructor(prefix = 'cvplus_auth_', defaultEncrypt = false) {
    this.prefix = prefix;
    this.defaultEncrypt = defaultEncrypt;
  }

  /**
   * Store data in localStorage
    */
  setItem<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    if (typeof window === 'undefined') {
      logger.warn('localStorage not available in server environment');
      return false;
    }

    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl,
        encrypted: options.encrypt ?? this.defaultEncrypt
      };

      let serializedItem = JSON.stringify(item);
      
      if (item.encrypted) {
        serializedItem = encryptSensitiveData(serializedItem);
      }

      const storageKey = `${options.prefix || this.prefix}${key}`;
      localStorage.setItem(storageKey, serializedItem);
      
      logger.debug('Item stored in localStorage', { 
        key: storageKey, 
        encrypted: item.encrypted,
        ttl: options.ttl 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to store item in localStorage:', error);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage
    */
  getItem<T>(key: string, options: Pick<StorageOptions, 'prefix'> = {}): T | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const storageKey = `${options.prefix || this.prefix}${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return null;
      }

      let serializedItem = stored;
      
      // Try to decrypt if it appears to be encrypted
      try {
        const testParse = JSON.parse(stored);
        if (!testParse.data && !testParse.timestamp) {
          // Likely encrypted
          serializedItem = decryptSensitiveData(stored);
        }
      } catch {
        // Might be encrypted
        serializedItem = decryptSensitiveData(stored);
      }

      const item: StorageItem<T> = JSON.parse(serializedItem);
      
      // Check if item has expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(storageKey);
        logger.debug('Expired item removed from localStorage', { key: storageKey });
        return null;
      }

      return item.data;
    } catch (error) {
      logger.error('Failed to retrieve item from localStorage:', error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
    */
  removeItem(key: string, options: Pick<StorageOptions, 'prefix'> = {}): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const storageKey = `${options.prefix || this.prefix}${key}`;
      localStorage.removeItem(storageKey);
      logger.debug('Item removed from localStorage', { key: storageKey });
      return true;
    } catch (error) {
      logger.error('Failed to remove item from localStorage:', error);
      return false;
    }
  }

  /**
   * Clear all items with the current prefix
    */
  clear(options: Pick<StorageOptions, 'prefix'> = {}): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const prefix = options.prefix || this.prefix;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      logger.debug('LocalStorage cleared', { 
        prefix, 
        removedCount: keysToRemove.length 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  /**
   * Get all keys with the current prefix
    */
  getKeys(options: Pick<StorageOptions, 'prefix'> = {}): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const prefix = options.prefix || this.prefix;
      const keys: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length));
        }
      }
      
      return keys;
    } catch (error) {
      logger.error('Failed to get keys from localStorage:', error);
      return [];
    }
  }

  /**
   * Clean up expired items
    */
  cleanup(options: Pick<StorageOptions, 'prefix'> = {}): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    let removedCount = 0;
    const prefix = options.prefix || this.prefix;
    
    try {
      const keysToCheck: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToCheck.push(key);
        }
      }
      
      keysToCheck.forEach(storageKey => {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            let serializedItem = stored;
            
            // Handle potential encryption
            try {
              const testParse = JSON.parse(stored);
              if (!testParse.data && !testParse.timestamp) {
                serializedItem = decryptSensitiveData(stored);
              }
            } catch {
              serializedItem = decryptSensitiveData(stored);
            }
            
            const item: StorageItem<any> = JSON.parse(serializedItem);
            
            if (item.ttl && Date.now() - item.timestamp > item.ttl) {
              localStorage.removeItem(storageKey);
              removedCount++;
            }
          }
        } catch (error) {
          // If we can't parse an item, it might be corrupted - remove it
          localStorage.removeItem(storageKey);
          removedCount++;
        }
      });
      
      logger.debug('LocalStorage cleanup completed', { 
        prefix, 
        removedCount 
      });
      
    } catch (error) {
      logger.error('Failed to cleanup localStorage:', error);
    }
    
    return removedCount;
  }
}

/**
 * SessionStorage wrapper (same interface as EnhancedStorage)
  */
export class EnhancedSessionStorage extends EnhancedStorage {
  setItem<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    if (typeof window === 'undefined') {
      logger.warn('sessionStorage not available in server environment');
      return false;
    }

    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl,
        encrypted: options.encrypt ?? this.defaultEncrypt
      };

      let serializedItem = JSON.stringify(item);
      
      if (item.encrypted) {
        serializedItem = encryptSensitiveData(serializedItem);
      }

      const storageKey = `${options.prefix || this.prefix}${key}`;
      sessionStorage.setItem(storageKey, serializedItem);
      
      return true;
    } catch (error) {
      logger.error('Failed to store item in sessionStorage:', error);
      return false;
    }
  }

  getItem<T>(key: string, options: Pick<StorageOptions, 'prefix'> = {}): T | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const storageKey = `${options.prefix || this.prefix}${key}`;
      const stored = sessionStorage.getItem(storageKey);
      
      if (!stored) {
        return null;
      }

      let serializedItem = stored;
      
      // Handle potential encryption
      try {
        const testParse = JSON.parse(stored);
        if (!testParse.data && !testParse.timestamp) {
          serializedItem = decryptSensitiveData(stored);
        }
      } catch {
        serializedItem = decryptSensitiveData(stored);
      }

      const item: StorageItem<T> = JSON.parse(serializedItem);
      
      // Check if item has expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        sessionStorage.removeItem(storageKey);
        return null;
      }

      return item.data;
    } catch (error) {
      logger.error('Failed to retrieve item from sessionStorage:', error);
      return null;
    }
  }

  removeItem(key: string, options: Pick<StorageOptions, 'prefix'> = {}): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const storageKey = `${options.prefix || this.prefix}${key}`;
      sessionStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      logger.error('Failed to remove item from sessionStorage:', error);
      return false;
    }
  }
}

// Default instances
export const authStorage = new EnhancedStorage('cvplus_auth_', true);
export const sessionStore = new EnhancedSessionStorage('cvplus_session_', false);

/**
 * Check if storage is available
  */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage usage information
  */
export function getStorageInfo(): {
  localStorage: { used: number; available: boolean };
  sessionStorage: { used: number; available: boolean };
} {
  const info = {
    localStorage: { used: 0, available: false },
    sessionStorage: { used: 0, available: false }
  };
  
  if (typeof window === 'undefined') {
    return info;
  }
  
  // Check localStorage
  try {
    info.localStorage.available = isStorageAvailable('localStorage');
    if (info.localStorage.available) {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          used += key.length + (localStorage.getItem(key) || '').length;
        }
      }
      info.localStorage.used = used;
    }
  } catch (error) {
    logger.error('Failed to get localStorage info:', error);
  }
  
  // Check sessionStorage
  try {
    info.sessionStorage.available = isStorageAvailable('sessionStorage');
    if (info.sessionStorage.available) {
      let used = 0;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          used += key.length + (sessionStorage.getItem(key) || '').length;
        }
      }
      info.sessionStorage.used = used;
    }
  } catch (error) {
    logger.error('Failed to get sessionStorage info:', error);
  }
  
  return info;
}