/**
 * Platform-agnostic storage abstraction
 * Uses localStorage on web, AsyncStorage on React Native
 * Includes Zod validation for type-safe data retrieval
 */

import { z } from 'zod'
import logger from '@/utils/logger'

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
      logger.error('WebStorage.getItem error', 'storage', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      logger.error('WebStorage.setItem error', 'storage', error)
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      logger.error('WebStorage.removeItem error', 'storage', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear()
    } catch (error) {
      logger.error('WebStorage.clear error', 'storage', error)
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
    logger.warn('localStorage not available, using in-memory storage', 'storage', error)
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
   * Get and parse JSON value (unvalidated - use getValidatedJSON for type safety)
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await storage.getItem(key)
      if (!value) return null
      return JSON.parse(value) as T
    } catch (error) {
      logger.error(`storageHelpers.getJSON error for key "${key}"`, 'storage', error)
      return null
    }
  },

  /**
   * Get and parse JSON value with Zod schema validation
   * Ensures type safety and data integrity
   */
  async getValidatedJSON<T>(key: string, schema: z.ZodSchema<T>): Promise<T | null> {
    try {
      const value = await storage.getItem(key)
      if (!value) return null

      const parsed = JSON.parse(value)
      const result = schema.safeParse(parsed)

      if (result.success) {
        return result.data
      } else {
        logger.warn(`storageHelpers.getValidatedJSON validation failed for key "${key}"`, 'storage', {
          errors: result.error.errors,
        })
        // Remove invalid data from storage
        await storage.removeItem(key)
        return null
      }
    } catch (error) {
      logger.error(`storageHelpers.getValidatedJSON error for key "${key}"`, 'storage', error)
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
      logger.error(`storageHelpers.setJSON error for key "${key}"`, 'storage', error)
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

/**
 * Zod schemas for common storage types
 */
export const StorageSchemas = {
  SubtitlePreferences: z.object({
    enabled: z.boolean(),
    language: z.string().nullable(),
    hebrew_mode: z.enum(['regular', 'nikud', 'shoresh']).optional(),
    settings: z.object({
      fontSize: z.enum(['small', 'medium', 'large']),
      position: z.enum(['top', 'bottom']),
      backgroundColor: z.string(),
      textColor: z.string(),
    }),
  }),

  UserLocation: z.object({
    country: z.string(),
    region: z.string().optional(),
    city: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),

  Theme: z.enum(['light', 'dark', 'auto']),

  Language: z.string().min(2).max(5), // e.g., 'en', 'he', 'en-US'
}
