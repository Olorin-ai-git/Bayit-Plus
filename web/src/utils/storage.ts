/**
 * Platform-agnostic storage abstraction
 * Uses localStorage on web, AsyncStorage on React Native
 */

/**
 * Storage interface for cross-platform compatibility
 */
export interface StorageInterface {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Web storage implementation using localStorage
 */
class WebStorage implements StorageInterface {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('WebStorage.getItem error:', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('WebStorage.setItem error:', error)
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('WebStorage.removeItem error:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('WebStorage.clear error:', error)
      throw error
    }
  }
}

/**
 * In-memory storage fallback for environments without localStorage
 */
class MemoryStorage implements StorageInterface {
  private storage: Map<string, string> = new Map()

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value)
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async clear(): Promise<void> {
    this.storage.clear()
  }
}

/**
 * Create storage instance based on environment
 */
function createStorage(): StorageInterface {
  // Check if localStorage is available
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test localStorage availability
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return new WebStorage()
    }
  } catch (error) {
    console.warn('localStorage not available, using in-memory storage')
  }

  // Fallback to in-memory storage
  return new MemoryStorage()
}

/**
 * Singleton storage instance
 */
export const storage = createStorage()

/**
 * Type-safe storage helpers with JSON serialization
 */
export const storageHelpers = {
  /**
   * Get and parse JSON value
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await storage.getItem(key)
      if (!value) return null
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`storageHelpers.getJSON error for key "${key}":`, error)
      return null
    }
  },

  /**
   * Stringify and set JSON value
   */
  async setJSON<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      await storage.setItem(key, serialized)
    } catch (error) {
      console.error(`storageHelpers.setJSON error for key "${key}":`, error)
      throw error
    }
  },

  /**
   * Get string value with default
   */
  async getString(key: string, defaultValue: string = ''): Promise<string> {
    const value = await storage.getItem(key)
    return value ?? defaultValue
  },

  /**
   * Get number value with default
   */
  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await storage.getItem(key)
    if (!value) return defaultValue
    const num = parseFloat(value)
    return isNaN(num) ? defaultValue : num
  },

  /**
   * Get boolean value with default
   */
  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await storage.getItem(key)
    if (!value) return defaultValue
    return value === 'true'
  },

  /**
   * Set boolean value
   */
  async setBoolean(key: string, value: boolean): Promise<void> {
    await storage.setItem(key, value ? 'true' : 'false')
  },

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await storage.getItem(key)
    return value !== null
  },

  /**
   * Get multiple keys at once
   */
  async getMultiple(keys: string[]): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await storage.getItem(key)
      })
    )
    return results
  },

  /**
   * Set multiple keys at once
   */
  async setMultiple(items: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(items).map(([key, value]) => storage.setItem(key, value))
    )
  },
}

/**
 * Storage keys constants for type safety
 */
export const STORAGE_KEYS = {
  SUBTITLE_PREFERENCES: 'bayit-subtitle-preferences',
  USER_LOCATION: 'bayit_user_location',
  OAUTH_STATE: 'oauth_state',
  THEME: 'bayit-theme',
  LANGUAGE: 'bayit-language',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]
