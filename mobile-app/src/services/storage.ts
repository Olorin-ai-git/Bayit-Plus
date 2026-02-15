import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from '@bayit/shared-services/logger.native'

const STORAGE_KEYS = {
  PLAYBACK_SPEED: 'playback_speed',
  PLAYBACK_POSITION: 'playback_position',
  LANGUAGE: 'language',
  THEME: 'theme',
  BETA_CREDITS: 'beta_credits',
  DOWNLOADS_QUEUE: 'downloads_queue',
  LAST_PLAYED: 'last_played',
} as const

interface PlaybackPosition {
  contentId: string
  contentType: 'podcast' | 'audiobook'
  position: number
  duration: number
  updatedAt: string
}

interface LastPlayed {
  contentId: string
  contentType: string
  title: string
  cover?: string
  timestamp: string
}

export const storage = {
  async getPlaybackSpeed(): Promise<number> {
    try {
      const speed = await AsyncStorage.getItem(STORAGE_KEYS.PLAYBACK_SPEED)
      return speed ? parseFloat(speed) : 1.0
    } catch (error: unknown) {
      log.error('Failed to get playback speed', { error })
      return 1.0
    }
  },

  async setPlaybackSpeed(speed: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYBACK_SPEED, speed.toString())
    } catch (error: unknown) {
      log.error('Failed to set playback speed', { error })
    }
  },

  async getPlaybackPosition(contentId: string): Promise<PlaybackPosition | null> {
    try {
      const positions = await AsyncStorage.getItem(STORAGE_KEYS.PLAYBACK_POSITION)
      if (!positions) return null

      const parsed = JSON.parse(positions) as Record<string, PlaybackPosition>
      return parsed[contentId] || null
    } catch (error: unknown) {
      log.error('Failed to get playback position', { error })
      return null
    }
  },

  async setPlaybackPosition(position: PlaybackPosition): Promise<void> {
    try {
      const positions = await AsyncStorage.getItem(STORAGE_KEYS.PLAYBACK_POSITION)
      const parsed = positions ? JSON.parse(positions) : {}

      parsed[position.contentId] = position

      await AsyncStorage.setItem(STORAGE_KEYS.PLAYBACK_POSITION, JSON.stringify(parsed))
    } catch (error: unknown) {
      log.error('Failed to set playback position', { error })
    }
  },

  async getLanguage(): Promise<string> {
    try {
      const language = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE)
      return language || 'en'
    } catch (error: unknown) {
      log.error('Failed to get language', { error })
      return 'en'
    }
  },

  async setLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language)
    } catch (error: unknown) {
      log.error('Failed to set language', { error })
    }
  },

  async getLastPlayed(): Promise<LastPlayed[]> {
    try {
      const lastPlayed = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PLAYED)
      return lastPlayed ? JSON.parse(lastPlayed) : []
    } catch (error: unknown) {
      log.error('Failed to get last played', { error })
      return []
    }
  },

  async addLastPlayed(item: LastPlayed): Promise<void> {
    try {
      const lastPlayed = await this.getLastPlayed()

      const filtered = lastPlayed.filter(i => i.contentId !== item.contentId)
      const updated = [item, ...filtered].slice(0, 10)

      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PLAYED, JSON.stringify(updated))
    } catch (error: unknown) {
      log.error('Failed to add last played', { error })
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear()
      log.info('Storage cleared successfully')
    } catch (error: unknown) {
      log.error('Failed to clear storage', { error })
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value)
    } catch (error: unknown) {
      log.error('Failed to set item', { key, error })
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch (error: unknown) {
      log.error('Failed to get item', { key, error })
      return null
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error: unknown) {
      log.error('Failed to remove item', { key, error })
    }
  },
}
